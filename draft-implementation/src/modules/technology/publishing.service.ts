// src/modules/technology/publishing.service.ts — the publishing service (06 §6.8): builds the approved public
// snapshot (technology_publications), swaps it with the old one, withdraws it on suspension, and keeps the
// search index and public pages in line with it. Snapshot changes happen in transactions; search and pages
// are updated afterwards by idempotent jobs that always read the current live snapshot.
import { ForbiddenError } from '@casl/ability';
import { Types } from 'mongoose';
import { Actor, SYSTEM_USER_ID } from '../../core/actor';
import { inTransaction } from '../../core/db/transaction';
import { JobHandler, PermanentJobError } from '../../core/jobs/job-queue';
import { InvalidTransitionError, NotFoundError, VersionConflictError } from '../../core/service-errors';
import { TechnologyOffer } from '../offers/offer.model';
import { Organization } from '../organizations/organization.model';
import { recordChange } from '../workflow/history';
import { ReviewCase } from '../workflow/workflow.model';
import { IpAsset, Technology, TechnologyPublication, TechnologyPublicationDoc, TechnologyVersion } from './technology.model';

const PUBLISHING = { crossTenant: { reason: 'publishing service' } };
const GRANTED_PATENT_TYPES = ['invention_patent', 'utility_model', 'design_patent'];
const unique = <T>(values: T[]) => Array.from(new Set(values));

/** Which events start which jobs (the worker passes this to relayOutbox). */
export const PUBLISHING_SUBSCRIPTIONS: Record<string, string[]> = {
  'technology.approved': ['technology.publish'],
  'technology.revision_approved': ['technology.publish'],
  'technology.reinstated': ['technology.publish'],
  'technology.published': ['search.sync_technology', 'page.sync_technology'],
  'technology.suspended': ['search.sync_technology', 'page.sync_technology'],
  'technology.archived': ['search.sync_technology', 'page.sync_technology'],
};

/**
 * Makes version `version` the live snapshot. Idempotent and safe to run late or twice: it does nothing when
 * that version (or a newer one) is already live, or when the technology was suspended or archived meanwhile.
 * Preconditions that retrying cannot fix raise PermanentJobError (the job goes to the dead-letter state).
 */
export function publishTechnologyVersion(
  technologyId: Types.ObjectId, version: number, correlationId: string,
): Promise<{ published?: number; superseded?: number | null; skipped?: string }> {
  return inTransaction(async (session) => {
    const tech = await Technology.findById(technologyId).setOptions(PUBLISHING).session(session);
    if (!tech) throw new PermanentJobError('Technology not found');
    if (!['approved', 'published', 'update_pending'].includes(tech.lifecycleStatus)) return { skipped: `status ${tech.lifecycleStatus}` };
    const live = await TechnologyPublication.findOne({ technologyId, status: 'live' }).session(session);
    if (live && live.version >= version) return { skipped: `version ${live.version} is already live` };

    // Preconditions: an approved review of exactly this version, frozen content, a verified owner.
    const approval = await ReviewCase.findOne({
      caseType: 'technology_review', 'resource.id': technologyId, 'resource.version': version, status: 'approved',
    }).select('ref').session(session).lean();
    if (!approval) throw new PermanentJobError(`Version ${version} has no approved review`);
    const content = await TechnologyVersion.findOne({ technologyId, version, frozen: true }).session(session).lean();
    if (!content || !content.publicSummary) throw new PermanentJobError(`Version ${version} is missing, not frozen or has no public summary`);
    const owner = await Organization.findById(tech.ownerOrganizationId).session(session).lean();
    if (!owner || owner.verification.status !== 'verified') throw new PermanentJobError('Owner organization is not verified');

    // Offers submitted with this version (or earlier) become active; bulk changes bump rev explicitly.
    await TechnologyOffer.updateMany(
      { technologyId, offerStatus: 'submitted', technologyVersion: { $lte: version } },
      { $set: { offerStatus: 'active' }, $inc: { rev: 1 } },
    ).setOptions(PUBLISHING).session(session);
    const offers = await TechnologyOffer.find({ technologyId, offerStatus: 'active' })
      .select('transactionType territoryCodes price.type').setOptions(PUBLISHING).session(session).lean();
    const assets = await IpAsset.find({ technologyId, rightsStatus: { $nin: ['expired', 'invalidated'] } })
      .select('assetType').setOptions(PUBLISHING).session(session).lean();
    const priceTypes = unique(offers.map((o) => o.price.type));

    if (live) {                                    // at most one live snapshot (unique partial index): retire first
      live.set({ status: 'superseded' });
      await live.save({ session });
    }
    await new TechnologyPublication({
      technologyId, version, ref: tech.ref, status: 'live',
      owner: { organizationId: owner._id, displayName: owner.displayName, type: owner.organizationType, verified: true },
      title: content.title, summary: content.publicSummary,
      keywords: [], industryCodes: content.industryCodes || [],
      trl: { claimed: content.claimedTrl, assessed: content.assessedTrl },
      offerTypes: unique(offers.map((o) => o.transactionType)),
      territories: unique(offers.reduce((all: string[], o) => all.concat(o.territoryCodes || []), [])),
      ipSummary: {
        grantedPatents: assets.filter((a) => GRANTED_PATENT_TYPES.includes(a.assetType)).length,
        pendingApplications: assets.filter((a) => a.assetType === 'patent_application').length,
      },
      badges: content.assessedTrl ? ['verified_holder', 'trl_assessed'] : ['verified_holder'],
      price: { type: priceTypes.length === 1 ? priceTypes[0] : 'negotiable' },
      publishedAt: new Date(),
    }).save({ session });

    const from = tech.lifecycleStatus;
    tech.publishedVersion = version;
    if (from === 'approved') tech.lifecycleStatus = 'published';
    // After a reinstatement nothing on the technology changes. An unmodified save() would run an
    // existence query without tenant options, which the tenant-scope plugin rightly refuses.
    if (tech.isModified()) await tech.save();
    await recordChange(session, {
      actorUserId: SYSTEM_USER_ID, correlationId, resource: { type: 'technology', id: tech._id },
      organizationId: tech.ownerOrganizationId, action: 'publish', fromStatus: from, toStatus: tech.lifecycleStatus,
      eventType: 'technology.published',
      payload: { ref: tech.ref, version, supersededVersion: live ? live.version : null, reviewCaseRef: approval.ref },
    });
    return { published: version, superseded: live ? live.version : null };
  });
}

/** Compliance suspends a published listing: the snapshot is withdrawn in the same transaction (FR-TEC-12). */
export function suspendTechnology(actor: Actor, id: Types.ObjectId, expectedRev: number, reason: string): Promise<{ rev: number }> {
  return inTransaction(async (session) => {
    if (!reason) throw new InvalidTransitionError('suspend needs a reason');
    const tech = await Technology.findById(id).setOptions({ crossTenant: { reason } }).session(session);
    if (!tech) throw new NotFoundError('Technology not found');
    if (tech.rev !== expectedRev) throw new VersionConflictError(`Technology changed since it was read (rev ${tech.rev})`);
    ForbiddenError.from(actor.ability).throwUnlessCan('suspend', tech);
    const from = tech.lifecycleStatus;
    tech.lifecycleStatus = 'suspended';
    await tech.save();
    await TechnologyPublication.updateOne({ technologyId: id, status: 'live' }, { $set: { status: 'withdrawn', withdrawnAt: new Date() } }).session(session);
    await recordChange(session, {
      actorUserId: actor.userId, correlationId: actor.correlationId, resource: { type: 'technology', id },
      organizationId: tech.ownerOrganizationId, action: 'suspend', fromStatus: from, toStatus: 'suspended', reason,
      eventType: 'technology.suspended', payload: { ref: tech.ref },
    });
    return { rev: tech.rev };
  });
}

/** An authorized reviewer reinstates a suspended listing: the latest approved version is published again. */
export function reinstateTechnology(actor: Actor, id: Types.ObjectId, expectedRev: number, reason: string): Promise<{ rev: number; version: number }> {
  return inTransaction(async (session) => {
    if (!reason) throw new InvalidTransitionError('reinstate needs a reason');
    const tech = await Technology.findById(id).setOptions({ crossTenant: { reason } }).session(session);
    if (!tech) throw new NotFoundError('Technology not found');
    if (tech.rev !== expectedRev) throw new VersionConflictError(`Technology changed since it was read (rev ${tech.rev})`);
    ForbiddenError.from(actor.ability).throwUnlessCan('reinstate', tech);
    const approved = await ReviewCase.findOne({ caseType: 'technology_review', 'resource.id': id, status: 'approved' })
      .sort({ 'resource.version': -1 }).select('resource.version').session(session).lean();
    if (!approved || !approved.resource.version) throw new InvalidTransitionError('No approved version to reinstate');
    tech.lifecycleStatus = 'published';
    await tech.save();
    // The snapshot was withdrawn, so the publish job creates a new live one for this version.
    await recordChange(session, {
      actorUserId: actor.userId, correlationId: actor.correlationId, resource: { type: 'technology', id },
      organizationId: tech.ownerOrganizationId, action: 'reinstate', fromStatus: 'suspended', toStatus: 'published', reason,
      eventType: 'technology.reinstated', payload: { ref: tech.ref, version: approved.resource.version },
    });
    return { rev: tech.rev, version: approved.resource.version };
  });
}

// ---------- Consumers: search index and public pages ----------

export interface SearchIndex {                     // Meilisearch documents API in production (11 §6)
  upsert(doc: Record<string, unknown>): Promise<void>;
  remove(technologyId: string): Promise<void>;
}
export interface PageStore {                       // pre-rendered HTML files served by Nginx in production (11 §7)
  write(ref: string, html: string): Promise<void>;
  remove(ref: string): Promise<void>;              // production: replace with a "withdrawn" page (HTTP 410)
}

const liveSnapshot = (technologyId: Types.ObjectId) =>
  TechnologyPublication.findOne({ technologyId, status: 'live' }).lean<TechnologyPublicationDoc>();

/** The search document is built only from the live snapshot, never from drafts or private fields. */
export function toSearchDocument(p: TechnologyPublicationDoc, visibility: string): Record<string, unknown> {
  return {
    id: String(p.technologyId), ref: p.ref, version: p.version, visibility,
    title_zh: p.title.zh, title_en: p.title.en, summary_zh: p.summary.zh, summary_en: p.summary.en,
    owner: p.owner.displayName, industryCodes: p.industryCodes, trl: p.trl.assessed || p.trl.claimed,
    offerTypes: p.offerTypes, territories: p.territories, badges: p.badges, priceType: p.price.type,
    publishedAt: p.publishedAt.toISOString(),
  };
}

/**
 * Job handlers. Each reads the *current* state when it runs, so it does not matter how often, how late or
 * in which order the events arrive: the index and pages converge on the live snapshot.
 */
export function publishingHandlers(index: SearchIndex, pages: PageStore, render: (p: TechnologyPublicationDoc) => string): Record<string, JobHandler> {
  const technologyIdOf = (payload: Record<string, unknown>) => (payload.aggregate as { id: Types.ObjectId }).id;
  return {
    'technology.publish': async (job) => {
      const version = job.payload.version as number;
      if (!Number.isInteger(version)) throw new PermanentJobError('payload.version missing');
      return publishTechnologyVersion(technologyIdOf(job.payload), version, `job-${String(job._id)}`);
    },
    'search.sync_technology': async (job) => {
      const id = technologyIdOf(job.payload);
      const [snapshot, tech] = await Promise.all([
        liveSnapshot(id), Technology.findById(id).select('visibility').setOptions(PUBLISHING).lean(),
      ]);
      if (snapshot && tech && tech.visibility !== 'private') {
        await index.upsert(toSearchDocument(snapshot, tech.visibility));
        return { indexed: snapshot.version };
      }
      await index.remove(String(id));
      return { removed: true };
    },
    'page.sync_technology': async (job) => {
      const id = technologyIdOf(job.payload);
      const [snapshot, tech] = await Promise.all([
        liveSnapshot(id), Technology.findById(id).select('ref visibility').setOptions(PUBLISHING).lean(),
      ]);
      if (!tech) throw new PermanentJobError('Technology not found');
      if (snapshot && tech.visibility === 'public') {
        await pages.write(tech.ref, render(snapshot));
        return { rendered: snapshot.version };
      }
      await pages.remove(tech.ref);
      return { removed: true };
    },
  };
}
