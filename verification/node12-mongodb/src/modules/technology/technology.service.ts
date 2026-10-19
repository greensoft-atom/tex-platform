// src/modules/technology/technology.service.ts — technology listing use cases with the Mongoose
// Document API: new Model() + save(), findById() + set() + save(), deleteOne(), lean() reads.
// Every write runs in a transaction together with its workflow transition, outbox event and audit event.
import { ClientSession, Types } from 'mongoose';
import { ForbiddenError } from '@casl/ability';
import { inTransaction } from '../../core/db/transaction';
import { TenantContext } from '../../core/db/tenant-scope.plugin';
import { AuditEvent } from '../audit/audit-event.model';
import { AppAbility } from '../identity/abilities';
import { Counter, OutboxEvent, ReviewCase, WorkflowTransition } from '../workflow/workflow.model';
import { Technology, TechnologyDoc, TechnologyStatus, TechnologyVersion, TechnologyVersionDoc } from './technology.model';

export class NotFoundError extends Error { constructor(m: string) { super(m); this.name = 'NotFoundError'; } }               // 404
export class VersionConflictError extends Error { constructor(m: string) { super(m); this.name = 'VersionConflictError'; } } // 409
export class InvalidTransitionError extends Error { constructor(m: string) { super(m); this.name = 'InvalidTransitionError'; } } // 409

export interface Actor extends TenantContext {
  userId: Types.ObjectId;
  ability: AppAbility;
  correlationId: string;                           // request ID, propagated to transitions and audit events
}

export interface TechnologyContent {
  title?: { zh: string; en?: string };
  publicSummary?: { zh: string; en?: string };
  technicalDescription?: { zh: string; en?: string };
  industryCodes?: string[];
  applicationCodes?: string[];
  claimedTrl?: number | null;
  technicalAttributes?: Record<string, unknown>;
}
const CONTENT_FIELDS: (keyof TechnologyContent)[] = [
  'title', 'publicSummary', 'technicalDescription', 'industryCodes', 'applicationCodes', 'claimedTrl', 'technicalAttributes',
];

// Allowed submissions (06 §6.1): a draft or a revised listing goes to review; a revision of a published
// listing goes to `update_pending` while the old snapshot stays public.
const SUBMIT_TARGET: Partial<Record<TechnologyStatus, TechnologyStatus>> = {
  draft: 'submitted', changes_requested: 'submitted', published: 'update_pending',
};
const REVIEW_SLA_MS = 5 * 24 * 3600 * 1000;       // first review within 5 days (business days in production, FR-ADM-09)

/**
 * Loads a technology for a state change. The tenant scope makes another organization's technology
 * indistinguishable from a missing one; `expectedRev` comes from the If-Match header.
 */
async function loadForChange(actor: Actor, id: Types.ObjectId, expectedRev: number, session: ClientSession): Promise<TechnologyDoc> {
  const tech = await Technology.findById(id).setOptions({ tenant: actor }).session(session);
  if (!tech) throw new NotFoundError('Technology not found');
  if (tech.rev !== expectedRev) throw new VersionConflictError(`Technology changed since it was read (rev ${tech.rev})`);
  return tech;
}

/** Transition record, outbox event and audit event: written in the same transaction as the change. */
async function record(
  session: ClientSession, actor: Actor, tech: TechnologyDoc, action: string,
  fromStatus: string, toStatus: string, payload: Record<string, unknown> = {},
): Promise<void> {
  const resource = { type: 'technology', id: tech._id };
  await new WorkflowTransition({
    resource, fromStatus, toStatus, action, actorUserId: actor.userId, correlationId: actor.correlationId,
  }).save({ session });
  await new OutboxEvent({
    eventType: `technology.${action}`, aggregate: resource, payload: { ref: tech.ref, version: tech.currentVersion, ...payload },
  }).save({ session });
  await new AuditEvent({
    actor: { type: 'user', userId: actor.userId }, organizationId: tech.ownerOrganizationId,
    action: `technology.${action}`, resource, correlationId: actor.correlationId,
  }).save({ session });
}

/** Create: a draft technology with version 1. */
export function createTechnologyDraft(
  actor: Actor, input: { organizationId: Types.ObjectId; technologyType: string; content: TechnologyContent },
): Promise<{ id: Types.ObjectId; ref: string; rev: number }> {
  return inTransaction(async (session) => {
    const tech = new Technology({
      ownerOrganizationId: input.organizationId,
      technologyType: input.technologyType,
      createdBy: actor.userId,
    });
    // CASL checks the unsaved document: only technology roles of the owning organization may create.
    ForbiddenError.from(actor.ability).throwUnlessCan('create', tech);
    const version = new TechnologyVersion({ technologyId: tech._id, version: 1, createdBy: actor.userId, ...input.content });
    await version.validate();                      // report content errors before consuming a reference number

    tech.ref = await Counter.nextRef('TEC', session);
    await tech.save({ session });
    await version.save({ session });
    await record(session, actor, tech, 'created', 'none', tech.lifecycleStatus);
    return { id: tech._id, ref: tech.ref, rev: tech.rev };
  });
}

/**
 * Update content. A draft version is edited in place; when the current version is frozen (submitted,
 * approved or published), a new draft version is started from it, so published content never changes.
 */
export function updateTechnologyContent(
  actor: Actor, id: Types.ObjectId, expectedRev: number, changes: TechnologyContent,
): Promise<{ rev: number; version: number }> {
  return inTransaction(async (session) => {
    const tech = await loadForChange(actor, id, expectedRev, session);
    ForbiddenError.from(actor.ability).throwUnlessCan('update', tech);

    const current = await TechnologyVersion.findOne({ technologyId: tech._id, version: tech.currentVersion })
      .session(session)
      .orFail(() => new NotFoundError('Current version missing'));
    let draft: TechnologyVersionDoc = current;
    if (current.frozen) {
      draft = new TechnologyVersion({ technologyId: tech._id, version: current.version + 1, createdBy: actor.userId });
      for (const field of CONTENT_FIELDS) draft.set(field, current.get(field));
      tech.currentVersion = draft.version;
    }
    draft.set(changes);
    if (!draft.isNew && !draft.isModified()) return { rev: tech.rev, version: draft.version };   // nothing changed

    await draft.save({ session });
    tech.increment();                              // content changed: bump rev even if no technology field changed
    await tech.save();                             // the document remembers its session; save() checks rev again
    return { rev: tech.rev, version: tech.currentVersion };
  });
}

/** Submit for review: freeze the version, open a review case, record transition, outbox and audit events. */
export function submitTechnologyForReview(
  actor: Actor, id: Types.ObjectId, expectedRev: number,
): Promise<{ reviewCaseRef: string; status: TechnologyStatus }> {
  return inTransaction(async (session) => {
    const tech = await loadForChange(actor, id, expectedRev, session);
    ForbiddenError.from(actor.ability).throwUnlessCan('submit', tech);
    const target = SUBMIT_TARGET[tech.lifecycleStatus];
    if (!target) throw new InvalidTransitionError(`Cannot submit a technology in status ${tech.lifecycleStatus}`);

    const version = await TechnologyVersion.findOne({ technologyId: tech._id, version: tech.currentVersion })
      .session(session)
      .orFail(() => new NotFoundError('Current version missing'));
    if (version.frozen) throw new InvalidTransitionError('No unsubmitted changes');
    version.frozen = true;                         // immutable from now on (freezablePlugin)
    await version.save();

    const fromStatus = tech.lifecycleStatus;
    tech.lifecycleStatus = target;
    await tech.save();                             // optimistic concurrency: VersionError if rev changed meanwhile

    const now = new Date();
    const reviewCase = new ReviewCase({
      ref: await Counter.nextRef('CASE', session),
      caseType: 'technology_review',
      resource: { type: 'technology', id: tech._id, version: version.version },
      dueAt: new Date(now.getTime() + REVIEW_SLA_MS),
    });
    await reviewCase.save({ session });
    await record(session, actor, tech, 'submitted', fromStatus, tech.lifecycleStatus, { reviewCaseRef: reviewCase.ref });
    return { reviewCaseRef: reviewCase.ref, status: tech.lifecycleStatus };
  });
}

/** Delete: only a never-submitted draft can be discarded; everything else is archived instead. */
export function discardTechnologyDraft(actor: Actor, id: Types.ObjectId, expectedRev: number): Promise<void> {
  return inTransaction(async (session) => {
    const tech = await loadForChange(actor, id, expectedRev, session);
    ForbiddenError.from(actor.ability).throwUnlessCan('delete', tech);
    // Query API on versions: freezablePlugin and the tenant-scoped parent make this safe.
    await TechnologyVersion.deleteMany({ technologyId: tech._id, frozen: false }).session(session);
    await tech.deleteOne();
    await record(session, actor, tech, 'discarded', tech.lifecycleStatus, 'discarded');
  });
}

/** Read: one page of the organization's technologies the actor may read, as plain objects (lean). */
export function listTechnologies(
  actor: Actor, filter: { status?: TechnologyStatus; afterId?: Types.ObjectId; limit?: number },
) {
  const query = Technology.accessibleBy(actor.ability, 'read').setOptions({ tenant: actor });
  if (filter.status) query.where({ lifecycleStatus: filter.status });
  if (filter.afterId) query.where({ _id: { $lt: filter.afterId } });             // keyset pagination
  return query
    .sort({ _id: -1 })
    .limit(Math.min(filter.limit || 20, 100))
    .populate('ownerOrganizationId', 'displayName ref')
    .select('ref ownerOrganizationId lifecycleStatus visibility currentVersion publishedVersion rev updatedAt')
    .lean();
}
