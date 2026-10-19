// src/modules/workflow/review-case.service.ts — review-case lifecycle (06 §6.7): queue, claim, review,
// questions with the SLA clock paused, maker-checker, decisions and their effect on the reviewed resource,
// and escalation of overdue cases. The allowed transitions are data (CASE_TRANSITIONS).
import { ForbiddenError } from '@casl/ability';
import { ClientSession, Types } from 'mongoose';
import { Actor, SYSTEM_USER_ID } from '../../core/actor';
import { loadCurrentCalendar } from '../../core/calendar/calendar.model';
import { addWorkingDays, CalendarMissingError, extendByWorkingDays, workingDaysBetween } from '../../core/calendar/working-days';
import { inTransaction } from '../../core/db/transaction';
import {
  ConflictOfInterestError, ForbiddenActionError, InvalidTransitionError, NotFoundError, VersionConflictError,
} from '../../core/service-errors';
import { Organization } from '../organizations/organization.model';
import { Technology, TechnologyStatus } from '../technology/technology.model';
import { recordChange } from './history';
import { CASE_TYPES, CaseStatus, Counter, ReviewCase, ReviewCaseDoc } from './workflow.model';

export type CaseType = typeof CASE_TYPES[number];

/** First-review targets in working days (06 §14: proposed initial values, configurable later). */
export const REVIEW_SLA_WORKING_DAYS: Record<CaseType, number> = {
  organization_verification: 3, technology_review: 5, ip_verification: 5, demand_review: 3, introduction_review: 2, dispute: 5,
};

/** Case types decided by two people: the maker proposes, a different checker confirms (FR-ADM-02). */
export const CHECK_REQUIRED: CaseType[] = ['organization_verification'];

export type CaseAction =
  | 'claim' | 'assign' | 'release' | 'start' | 'ask' | 'answer' | 'propose' | 'return'
  | 'approve' | 'reject' | 'request_changes' | 'escalate';

export const CASE_TRANSITIONS: Record<CaseAction, { from: CaseStatus[]; to: CaseStatus }> = {
  claim: { from: ['open'], to: 'assigned' },                                    // reviewer takes it from the queue
  assign: { from: ['open', 'assigned', 'escalated'], to: 'assigned' },          // operations lead (re)assigns
  release: { from: ['assigned'], to: 'open' },                                  // back to the queue
  start: { from: ['assigned'], to: 'in_review' },
  ask: { from: ['in_review'], to: 'waiting_for_submitter' },                    // SLA clock stops
  answer: { from: ['waiting_for_submitter'], to: 'in_review' },                 // submitter answers; clock resumes
  propose: { from: ['in_review'], to: 'awaiting_check' },                       // maker-checker case types only
  return: { from: ['awaiting_check'], to: 'in_review' },                        // checker disagrees
  approve: { from: ['in_review', 'awaiting_check'], to: 'approved' },
  reject: { from: ['in_review', 'awaiting_check'], to: 'rejected' },
  request_changes: { from: ['in_review'], to: 'closed' },                       // resubmission opens a new case
  escalate: { from: ['open', 'assigned', 'in_review', 'waiting_for_submitter'], to: 'escalated' },
};

interface Effect { action: string; event: string; to: string }

// Effect of a case action on the technology under review (06 §6.1). A revision of a published listing is
// reviewed in `update_pending`; requesting changes on it rejects the revision (the old snapshot stays live).
const TECHNOLOGY_EFFECTS: Partial<Record<CaseAction, Partial<Record<TechnologyStatus, Effect>>>> = {
  claim: { submitted: { action: 'assign', event: 'technology.review_started', to: 'in_review' } },
  assign: { submitted: { action: 'assign', event: 'technology.review_started', to: 'in_review' } },
  approve: {
    in_review: { action: 'approve', event: 'technology.approved', to: 'approved' },
    update_pending: { action: 'approve_revision', event: 'technology.revision_approved', to: 'published' },
  },
  reject: {
    in_review: { action: 'reject', event: 'technology.rejected', to: 'rejected' },
    update_pending: { action: 'reject_revision', event: 'technology.revision_rejected', to: 'published' },
  },
  request_changes: {
    in_review: { action: 'request_changes', event: 'technology.changes_requested', to: 'changes_requested' },
    update_pending: { action: 'reject_revision', event: 'technology.revision_rejected', to: 'published' },
  },
};

// Effect on an organization's verification (FR-ORG-02).
const ORGANIZATION_EFFECTS: Partial<Record<CaseAction, Partial<Record<string, Effect>>>> = {
  claim: { pending: { action: 'start_verification', event: 'organization.verification_started', to: 'in_review' } },
  assign: { pending: { action: 'start_verification', event: 'organization.verification_started', to: 'in_review' } },
  approve: { in_review: { action: 'verify', event: 'organization.verified', to: 'verified' } },
  reject: { in_review: { action: 'reject_verification', event: 'organization.verification_rejected', to: 'rejected' } },
  request_changes: { in_review: { action: 'request_documents', event: 'organization.documents_requested', to: 'pending' } },
};

const DECISIONS: CaseAction[] = ['approve', 'reject', 'request_changes'];
const same = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);

/** SLA deadline for a new case; null when the calendar year is not published (never guessed, 06 §6.10). */
export async function caseDueAt(caseType: CaseType, from: Date, extraWorkingDays = 0): Promise<Date | null> {
  try {
    return addWorkingDays(await loadCurrentCalendar(from), from, REVIEW_SLA_WORKING_DAYS[caseType] + extraWorkingDays);
  } catch (e) {
    if (e instanceof CalendarMissingError) return null;
    throw e;
  }
}

/** Opens a case for one submitted version, linked to the previous round's case. Runs in the caller's transaction. */
export async function openReviewCase(
  session: ClientSession,
  input: { caseType: CaseType; resource: { type: string; id: Types.ObjectId; version?: number }; priority?: ReviewCaseDoc['priority'] },
): Promise<ReviewCaseDoc> {
  const previous = await ReviewCase.findOne({ 'resource.type': input.resource.type, 'resource.id': input.resource.id })
    .sort({ createdAt: -1 }).select('_id').session(session).lean();
  const reviewCase = new ReviewCase({
    ref: await Counter.nextRef('CASE', session),
    caseType: input.caseType,
    resource: input.resource,
    priority: input.priority || 'normal',
    checkRequired: CHECK_REQUIRED.includes(input.caseType),
    previousCaseId: previous ? previous._id : undefined,
    dueAt: await caseDueAt(input.caseType, new Date()),
  });
  await reviewCase.save({ session });
  return reviewCase;
}

export interface CaseActionInput {
  reason?: string;                                 // question, decision reason or escalation reason
  assigneeId?: Types.ObjectId;                     // assign
  decision?: 'approve' | 'reject';                 // propose
}

/** Applies one case action, its effect on the reviewed resource, and the history records, in one transaction. */
export function actOnCase(
  actor: Actor, caseId: Types.ObjectId, expectedRev: number, action: CaseAction, input: CaseActionInput = {},
): Promise<{ status: CaseStatus; rev: number; resourceStatus?: string }> {
  return inTransaction(async (session) => {
    const rc = await ReviewCase.findById(caseId).session(session);
    if (!rc) throw new NotFoundError('Review case not found');
    if (rc.rev !== expectedRev) throw new VersionConflictError(`Review case changed since it was read (rev ${rc.rev})`);
    const rule = CASE_TRANSITIONS[action];
    if (!rule.from.includes(rc.status)) throw new InvalidTransitionError(`Cannot ${action} a case in status ${rc.status}`);
    const now = new Date();
    const fromStatus = rc.status;

    // ---- who may act ----
    const owner = await resourceOwner(rc, session);
    if (action === 'answer') {
      if (rc.resource.type !== 'technology') throw new InvalidTransitionError('Answers are recorded on the resource type');
      const tech = await Technology.findById(rc.resource.id).setOptions({ tenant: actor }).session(session);
      if (!tech) throw new NotFoundError('Technology not found');
      ForbiddenError.from(actor.ability).throwUnlessCan('respond', tech);
    } else if (action === 'assign') {
      ForbiddenError.from(actor.ability).throwUnlessCan('assign', rc);
      if (!input.assigneeId) throw new InvalidTransitionError('assign needs an assignee');
    } else {
      ForbiddenError.from(actor.ability).throwUnlessCan('review', rc);
      if (actor.organizationIds.some((id) => same(id, owner))) {
        throw new ConflictOfInterestError('A reviewer cannot review a resource of their own organization');
      }
      if (rc.status === 'awaiting_check') {
        if (same(rc.proposedBy, actor.userId)) throw new ForbiddenActionError('The checker must be a different person from the maker');
        if (action !== 'return' && action !== rc.proposedDecision) {
          throw new InvalidTransitionError(`The proposed decision is ${rc.proposedDecision}; return the case to change it`);
        }
      } else if (action !== 'claim' && !same(rc.assignedTo, actor.userId)) {
        throw new ForbiddenActionError('Only the assigned reviewer can act on this case');
      }
      if (rc.checkRequired && rc.status === 'in_review' && (action === 'approve' || action === 'reject')) {
        throw new InvalidTransitionError('This case type needs a second person: propose the decision for checking');
      }
      if (!rc.checkRequired && action === 'propose') throw new InvalidTransitionError('This case type has no second check');
      if (['ask', 'return', 'reject', 'request_changes', 'escalate'].includes(action) && !input.reason) {
        throw new InvalidTransitionError(`${action} needs a reason`);
      }
    }

    // ---- the case itself ----
    rc.status = rule.to;
    switch (action) {
      case 'claim': rc.assignedTo = actor.userId; break;
      case 'assign': rc.assignedTo = input.assigneeId; break;
      case 'release': rc.assignedTo = undefined; break;
      case 'ask': rc.pausedAt = now; break;
      case 'answer': await resumeClock(rc, now); break;
      case 'propose':
        if (input.decision !== 'approve' && input.decision !== 'reject') throw new InvalidTransitionError('propose needs a decision');
        rc.set({ proposedDecision: input.decision, proposedBy: actor.userId });
        break;
      case 'return': rc.set({ proposedDecision: undefined, proposedBy: undefined }); break;
      default: break;
    }
    if (DECISIONS.includes(action)) {
      rc.set({ decision: action, decisionReason: input.reason, closedAt: now });
      if (fromStatus === 'awaiting_check') rc.checkedBy = actor.userId;
    }
    await rc.save({ session });
    await recordChange(session, {
      actorUserId: actor.userId, correlationId: actor.correlationId, resource: { type: 'review_case', id: rc._id },
      organizationId: owner, action, fromStatus, toStatus: rc.status, reason: input.reason,
      eventType: `review_case.${action}`, payload: { ref: rc.ref, caseType: rc.caseType, assignedTo: rc.assignedTo },
    });

    // ---- effect on the reviewed resource ----
    const resourceStatus = await applyEffect(session, actor, rc, action, owner, input.reason);
    return { status: rc.status, rev: rc.rev, resourceStatus };
  });
}

async function resourceOwner(rc: ReviewCaseDoc, session: ClientSession): Promise<Types.ObjectId | undefined> {
  if (rc.resource.type === 'technology') {
    const tech = await Technology.findById(rc.resource.id).setOptions({ crossTenant: { reason: rc.ref } })
      .select('ownerOrganizationId').session(session).lean();
    return tech ? tech.ownerOrganizationId : undefined;
  }
  if (rc.resource.type === 'organization') return rc.resource.id;
  return undefined;
}

/** Ends a pause: the deadline moves by the working days spent waiting for the submitter. */
async function resumeClock(rc: ReviewCaseDoc, now: Date): Promise<void> {
  if (!rc.pausedAt) return;
  try {
    const calendar = await loadCurrentCalendar(now);
    const waited = workingDaysBetween(calendar, rc.pausedAt, now);
    rc.pausedWorkingDays += waited;
    if (rc.dueAt) rc.dueAt = extendByWorkingDays(calendar, rc.dueAt, waited);
  } catch (e) {
    if (!(e instanceof CalendarMissingError)) throw e;
    rc.dueAt = null;                               // recomputed by fillMissingDueDates() once the year is published
  }
  rc.pausedAt = null;
}

async function applyEffect(
  session: ClientSession, actor: Actor, rc: ReviewCaseDoc, action: CaseAction, owner: Types.ObjectId | undefined, reason?: string,
): Promise<string | undefined> {
  if (rc.caseType === 'technology_review') {
    const tech = await Technology.findById(rc.resource.id).setOptions({ crossTenant: { reason: rc.ref } }).session(session);
    if (!tech) throw new NotFoundError('Technology not found');
    const effect = (TECHNOLOGY_EFFECTS[action] || {})[tech.lifecycleStatus];
    if (!effect) {
      if (DECISIONS.includes(action)) throw new InvalidTransitionError(`Technology is ${tech.lifecycleStatus}; the decision cannot apply`);
      return tech.lifecycleStatus;
    }
    if (tech.currentVersion !== rc.resource.version) throw new InvalidTransitionError('The case is not for the current version');
    const from = tech.lifecycleStatus;
    tech.lifecycleStatus = effect.to as TechnologyStatus;
    await tech.save();
    await recordChange(session, {
      actorUserId: actor.userId, correlationId: actor.correlationId, resource: { type: 'technology', id: tech._id },
      organizationId: tech.ownerOrganizationId, action: effect.action, fromStatus: from, toStatus: effect.to, reason,
      eventType: effect.event, payload: { ref: tech.ref, version: rc.resource.version, reviewCaseRef: rc.ref },
    });
    return effect.to;
  }
  if (rc.caseType === 'organization_verification') {
    const org = await Organization.findById(rc.resource.id).session(session);
    if (!org) throw new NotFoundError('Organization not found');
    const effect = (ORGANIZATION_EFFECTS[action] || {})[org.verification.status];
    if (!effect) {
      if (DECISIONS.includes(action)) throw new InvalidTransitionError(`Verification is ${org.verification.status}; the decision cannot apply`);
      return org.verification.status;
    }
    const from = org.verification.status;
    org.set('verification.status', effect.to);
    if (effect.to === 'verified') org.set({ 'verification.level': 3, 'verification.verifiedAt': new Date() });
    await org.save({ session });
    await recordChange(session, {
      actorUserId: actor.userId, correlationId: actor.correlationId, resource: { type: 'organization', id: org._id },
      organizationId: owner, action: effect.action, fromStatus: from, toStatus: effect.to, reason,
      eventType: effect.event, payload: { ref: org.ref, reviewCaseRef: rc.ref },
    });
    return effect.to;
  }
  return undefined;                                // other case types: decisions are recorded on the case only (draft)
}

/** Scheduled job (every 15 min): overdue open, assigned or in-review cases are escalated to the lead (FR-ADM-03). */
export async function escalateOverdueCases(now = new Date()): Promise<number> {
  const overdue = await ReviewCase.find({ status: { $in: ['open', 'assigned', 'in_review'] }, dueAt: { $ne: null, $lt: now } })
    .select('_id').lean();
  let escalated = 0;
  for (const { _id } of overdue) {
    const done = await inTransaction(async (session) => {
      const rc = await ReviewCase.findById(_id).session(session);
      if (!rc || !['open', 'assigned', 'in_review'].includes(rc.status) || !rc.dueAt || rc.dueAt >= now) return false;
      const from = rc.status;
      rc.status = 'escalated';
      await rc.save({ session });
      await recordChange(session, {
        actorUserId: SYSTEM_USER_ID, correlationId: `sla-${now.toISOString()}`, resource: { type: 'review_case', id: rc._id },
        action: 'escalate', fromStatus: from, toStatus: 'escalated', reason: 'SLA deadline passed',
        eventType: 'review_case.escalated', payload: { ref: rc.ref, caseType: rc.caseType, assignedTo: rc.assignedTo },
      });
      return true;
    });
    if (done) escalated++;
  }
  return escalated;
}

/** Job run after a calendar year is published: fills the deadlines that could not be computed before. */
export async function fillMissingDueDates(): Promise<number> {
  const cases = await ReviewCase.find({ dueAt: null, status: { $nin: ['approved', 'rejected', 'closed'] } });
  let filled = 0;
  for (const rc of cases) {
    const due = await caseDueAt(rc.caseType, rc.createdAt, rc.pausedWorkingDays);
    if (due) { rc.dueAt = due; await rc.save(); filled++; }
  }
  return filled;
}
