// Workflow infrastructure designed in 06 §6.7–§6.10: working-day calendar, leased jobs with retries and dead
// letters, outbox fan-out, review cases (claim, questions with the SLA clock paused, maker-checker,
// escalation) and the publishing service (snapshot swap, suspension, reinstatement, search and page sync).
'use strict';
const mongoose = require('mongoose');
const { ok, rejects, is, connect, clearAll, run } = require('./helpers');
const M = require('../dist/models');
const wd = require('../dist/core/calendar/working-days');
const cal = require('../dist/core/calendar/calendar.model');
const q = require('../dist/core/jobs/job-queue');
const { relayOutbox } = require('../dist/core/jobs/outbox-relay');
const { inTransaction } = require('../dist/core/db/transaction');
const { SYSTEM_USER_ID } = require('../dist/core/actor');
const tech = require('../dist/modules/technology/technology.service');
const pub = require('../dist/modules/technology/publishing.service');
const rcs = require('../dist/modules/workflow/review-case.service');
const { defineAbilityFor } = require('../dist/modules/identity/abilities');

const { ObjectId } = mongoose.Types;
const DAY = 24 * 3600 * 1000;
const at = (local) => new Date(local + '+08:00');        // an instant written in Asia/Shanghai time
const iso = (d) => (d ? d.toISOString() : String(d));

function member(orgId, roleCodes) {
  const userId = new ObjectId();
  return { userId, organizationIds: [orgId], correlationId: 'req-' + userId.toHexString().slice(-6),
    ability: defineAbilityFor({ userId, memberships: [{ organizationId: orgId, roleCodes, status: 'active' }], platformRoles: [], accessGrants: [] }) };
}
function staff(platformRoles, memberships) {
  const userId = new ObjectId();
  const ms = memberships || [];
  return { userId, organizationIds: ms.map((m) => m.organizationId), correlationId: 'req-' + userId.toHexString().slice(-6),
    ability: defineAbilityFor({ userId, memberships: ms, platformRoles, accessGrants: [] }) };
}
const rev = async (id) => (await M.ReviewCase.findById(id).lean()).rev;
const techRev = async (id) => (await M.Technology.findById(id).setOptions({ crossTenant: { reason: 'test' } }).lean()).rev;

run(async () => {
  await connect();
  await clearAll();

  // =============== 1. Working-day calendar: pure algorithm ===============
  // National Day 2025 as published by the State Council (国办发明电〔2024〕12号): 1–8 Oct off, Sun 28 Sep and Sat 11 Oct worked.
  const c2025 = {
    years: new Set([2025]),
    holidays: new Set(['2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08']),
    makeupWorkdays: new Set(['2025-09-28', '2025-10-11']),
  };
  ok('calendar: make-up Saturday 11 Oct is a working day, holiday Monday 6 Oct is not, plain Sunday 12 Oct is not',
    wd.isWorkingDay(c2025, '2025-10-11') && !wd.isWorkingDay(c2025, '2025-10-06') && !wd.isWorkingDay(c2025, '2025-10-12') && wd.isWorkingDay(c2025, '2025-09-28'));
  const d5 = wd.addWorkingDays(c2025, at('2025-09-30T10:00:00'), 5);
  ok('calendar: 5 WD from 30 Sep = end of Tue 14 Oct (9, 10, 11 make-up, 13, 14)', iso(d5) === '2025-10-14T16:00:00.000Z', iso(d5));
  ok('calendar: the start day is not counted, even late in the evening (Civil Code Art. 201)',
    iso(wd.addWorkingDays(c2025, at('2025-10-09T23:30:00'), 1)) === '2025-10-10T16:00:00.000Z');
  ok('calendar: days are Asia/Shanghai days (17:00 UTC on 9 Oct is already 10 Oct)',
    iso(wd.addWorkingDays(c2025, new Date('2025-10-09T17:00:00Z'), 1)) === '2025-10-11T16:00:00.000Z');
  ok('calendar: a cut-off time ends the last day at 17:00 instead of 24:00',
    iso(wd.addWorkingDays(c2025, at('2025-10-09T09:00:00'), 1, { cutoffMinutes: 17 * 60 })) === '2025-10-10T09:00:00.000Z');
  const n15 = wd.addCalendarDays(c2025, at('2025-09-20T12:00:00'), 15);
  ok('calendar: 15-day notice ending on holiday 5 Oct moves to the next working day, 9 Oct (Civil Code Art. 203)', iso(n15) === '2025-10-09T16:00:00.000Z', iso(n15));
  ok('calendar: without extension the notice ends on 5 Oct',
    iso(wd.addCalendarDays(c2025, at('2025-09-20T12:00:00'), 15, { extendIfRestDay: false })) === '2025-10-05T16:00:00.000Z');
  ok('calendar: working days waited 30 Sep → 10 Oct = 2; a same-day pause = 0',
    wd.workingDaysBetween(c2025, at('2025-09-30T10:00:00'), at('2025-10-10T09:00:00')) === 2
    && wd.workingDaysBetween(c2025, at('2025-10-10T09:00:00'), at('2025-10-10T18:00:00')) === 0);
  ok('calendar: extending a deadline (end of 30 Sep) by 2 WD gives end of 10 Oct',
    iso(wd.extendByWorkingDays(c2025, wd.endOfLocalDay('2025-09-30'), 2)) === '2025-10-10T16:00:00.000Z');
  await rejects('calendar: a period that runs into an unpublished year fails instead of guessing',
    async () => wd.addWorkingDays(c2025, at('2025-12-29T10:00:00'), 5), is.named('CalendarMissingError'));

  // =============== 2. Calendar maintenance: maker-checker ===============
  const adminA = new ObjectId(); const adminB = new ObjectId();
  await M.CalendarYear.create({ _id: 2025, source: '国办发明电〔2024〕12号', preparedBy: adminA });
  await M.CalendarDay.insertMany([...c2025.holidays].map((d) => ({ _id: d, year: 2025, kind: 'holiday', name: { zh: '国庆节、中秋节' }, createdBy: adminA }))
    .concat([...c2025.makeupWorkdays].map((d) => ({ _id: d, year: 2025, kind: 'makeup_workday', createdBy: adminA }))));
  ok('calendar: an unpublished year is not used', (await cal.loadWorkingCalendar([2025])).years.size === 0);
  await rejects('calendar: the preparer cannot publish their own year', () => cal.publishCalendarYear(2025, adminA, 0), is.named('CalendarCheckError'));
  await rejects('calendar: database validator also refuses checkedBy = preparedBy',
    () => M.CalendarYear.collection.updateOne({ _id: 2025 }, { $set: { status: 'published', checkedBy: adminA } }), is.dbValidator);
  await cal.publishCalendarYear(2025, adminB, 0);
  const loaded = await cal.loadWorkingCalendar([2025, 2026]);
  ok('calendar: published by a second admin and loaded (8 holidays, 2 make-up days, only 2025)',
    loaded.years.has(2025) && loaded.holidays.size === 8 && loaded.makeupWorkdays.size === 2 && iso(wd.addWorkingDays(loaded, at('2025-09-30T10:00:00'), 5)) === iso(d5));
  // The other tests run "now": publish the surrounding years as plain weekday calendars (synthetic test data).
  const Y = new Date().getUTCFullYear();
  for (const y of [Y - 1, Y, Y + 1]) {
    if (y === 2025) continue;
    await M.CalendarYear.create({ _id: y, source: 'synthetic test calendar (weekends only)', preparedBy: adminA });
    await cal.publishCalendarYear(y, adminB, 0);
  }
  const now = await cal.loadCurrentCalendar();

  // =============== 3. Leased jobs: idempotent enqueue, leases, retries, dead letters ===============
  ok('jobs: enqueue is idempotent per key', (await q.enqueueJob({ type: 't.ok', key: 'k1' })) === true && (await q.enqueueJob({ type: 't.ok', key: 'k1' })) === false
    && (await M.Job.countDocuments({ key: 'k1' })) === 1);
  const leases = await Promise.all([1, 2, 3, 4, 5].map(() => q.leaseJob({ leaseMs: 60000, types: ['t.ok'] })));
  ok('jobs: five workers race for one job, exactly one gets the lease', leases.filter(Boolean).length === 1);
  await q.enqueueJob({ type: 't.later', key: 'k2', runAt: new Date(Date.now() + 3600 * 1000) });
  ok('jobs: a job is not leased before runAt', (await q.leaseJob({ leaseMs: 60000, types: ['t.later'] })) === null);

  await q.enqueueJob({ type: 't.crash', key: 'k3' });
  const first = await q.leaseJob({ leaseMs: 1000, types: ['t.crash'] });
  const second = await q.leaseJob({ leaseMs: 60000, types: ['t.crash'], now: new Date(Date.now() + 5000) });
  ok('jobs: an expired lease (dead worker) is taken over as attempt 2', second && String(second._id) === String(first._id) && second.attempts === 2 && second.leaseToken !== first.leaseToken);
  ok('jobs: the old worker can no longer complete or renew it', (await q.completeJob(first)) === false && (await q.renewLease(first, 1000)) === false);
  ok('jobs: the new lease holder completes it; success expires later (TTL)', (await q.completeJob(second, { n: 1 })) === true
    && (await M.Job.findById(second._id).lean()).status === 'succeeded' && (await M.Job.findById(second._id).lean()).expireAt > new Date());

  ok('jobs: backoff 30 s, 60 s … capped at 1 h, with ≤ 10% jitter',
    q.backoffMs(1, () => 0) === 30000 && q.backoffMs(2, () => 0) === 60000 && q.backoffMs(20, () => 0) === 3600000 && q.backoffMs(1, () => 1) === 33000);
  await q.enqueueJob({ type: 't.flaky', key: 'k4', maxAttempts: 2 });
  let j = await q.leaseJob({ leaseMs: 60000, types: ['t.flaky'] });
  ok('jobs: a failure is retried later', (await q.failJob(j, new Error('timeout'))) === 'retry'
    && (await M.Job.findById(j._id).lean()).status === 'queued' && (await M.Job.findById(j._id).lean()).runAt > new Date(Date.now() + 25000));
  j = await q.leaseJob({ leaseMs: 60000, types: ['t.flaky'], now: new Date(Date.now() + 3600 * 1000) });
  ok('jobs: after maxAttempts the job goes to the dead-letter state', (await q.failJob(j, new Error('timeout'))) === 'dead'
    && /timeout/.test((await M.Job.findById(j._id).lean()).lastError));
  await q.enqueueJob({ type: 't.bad', key: 'k5' });
  j = await q.leaseJob({ leaseMs: 60000, types: ['t.bad'] });
  ok('jobs: a PermanentJobError dies at once', (await q.failJob(j, new q.PermanentJobError('missing record'))) === 'dead' && j.attempts === 1);
  ok('jobs: an operator retries a dead job from attempt 0', (await q.retryDeadJob(j._id)) === true
    && (await M.Job.findById(j._id).lean()).status === 'queued' && (await M.Job.findById(j._id).lean()).attempts === 0);
  await M.Job.deleteMany({});
  await rejects('jobs: enqueue inside a business transaction rolls back with it', () => inTransaction(async (session) => {
    await q.enqueueJob({ type: 't.tx', key: 'k6' }, session);
    throw new Error('business rule failed');
  }), (e) => e.message === 'business rule failed');
  ok('jobs: … and leaves no job behind', (await M.Job.countDocuments({ key: 'k6' })) === 0);

  // =============== 4. Outbox relay: one job per subscribed handler ===============
  const agg = { type: 'technology', id: new ObjectId() };
  await M.OutboxEvent.create([{ eventType: 'demo.a', aggregate: agg, payload: { n: 1 } }, { eventType: 'demo.none', aggregate: agg, payload: {} }]);
  const subs = { 'demo.a': ['h.search', 'h.page'] };
  let relayed = await relayOutbox(subs);
  ok('outbox: 2 events relayed, 2 jobs for the subscribed one, none for the other', relayed.relayed === 2 && relayed.jobs === 2
    && (await M.OutboxEvent.countDocuments({ status: 'published', expireAt: { $gt: new Date() } })) === 2);
  const ev = await M.OutboxEvent.create({ eventType: 'demo.a', aggregate: agg, payload: {} });
  await q.enqueueJob({ type: 'h.search', key: ev._id.toHexString() + ':h.search' });   // the relay died after this job
  relayed = await relayOutbox(subs);
  ok('outbox: relaying again after a crash creates only the missing job', relayed.jobs === 1 && (await M.Job.countDocuments({ key: new RegExp('^' + ev._id.toHexString()) })) === 2);
  const stats = await q.runDueJobs({ 'h.search': async () => ({ ok: 1 }), 'h.page': async () => { throw new q.PermanentJobError('template missing'); } });
  ok('outbox: handlers run independently (2 succeeded, 2 dead letters)', stats.succeeded === 2 && stats.dead === 2, JSON.stringify(stats));
  await M.Job.deleteMany({}); await M.OutboxEvent.deleteMany({});

  // =============== 5. Review cases and the publishing service ===============
  const orgA = new ObjectId(); const orgB = new ObjectId(); const orgC = new ObjectId();
  await M.Organization.create([
    { _id: orgA, ref: 'ORG-000201', legalName: '某某大学', displayName: '某某大学', organizationType: 'university', jurisdictionCode: 'CN', verification: { status: 'verified', level: 3 } },
    { _id: orgB, ref: 'ORG-000202', legalName: '某某电池有限公司', displayName: '某某电池', organizationType: 'company', jurisdictionCode: 'CN' },
    { _id: orgC, ref: 'ORG-000203', legalName: '某某研究院', displayName: '某某研究院', organizationType: 'research_institute', jurisdictionCode: 'CN' },
  ]);
  const owner = member(orgA, ['technology_manager']);
  const outsider = member(orgB, ['technology_manager']);
  const r1 = staff(['listing_reviewer']); const r2 = staff(['listing_reviewer']);
  const conflicted = staff(['listing_reviewer'], [{ organizationId: orgA, roleCodes: ['viewer'], status: 'active' }]);
  const compliance = staff(['compliance_officer']); const ops = staff(['operations_manager']);
  const v1 = staff(['verification_reviewer']); const v2 = staff(['verification_reviewer']);
  const index = new Map(); const pages = new Map();
  const handlers = pub.publishingHandlers(
    { upsert: async (d) => { index.set(d.id, d); }, remove: async (id) => { index.delete(id); } },
    { write: async (ref, html) => { pages.set(ref, html); }, remove: async (ref) => { pages.delete(ref); } },
    (p) => '<h1>' + p.title.zh + '</h1>');
  const drain = async () => { let n = 0; for (let i = 0; i < 5; i++) { n += (await relayOutbox(pub.PUBLISHING_SUBSCRIPTIONS)).jobs; await q.runDueJobs(handlers); } return n; };

  const t = await tech.createTechnologyDraft(owner, { organizationId: orgA, technologyType: 'process_technology',
    content: { title: { zh: '锂电池极片缺陷在线检测技术' }, publicSummary: { zh: '基于机器视觉的实时检测。' }, technicalDescription: { zh: '内部算法细节（不公开）' }, industryCodes: ['C384'], claimedTrl: 6 } });
  await M.TechnologyOffer.create({ ref: 'OFR-000001', technologyId: t.id, technologyVersion: 1, supplierOrganizationId: orgA, transactionType: 'license',
    offerStatus: 'submitted', exclusivity: 'non_exclusive', price: { type: 'negotiable' }, territoryCodes: ['CN'], createdBy: owner.userId });
  const tdoc = await M.Technology.findById(t.id).setOptions({ crossTenant: { reason: 'test setup' } });
  tdoc.visibility = 'public'; await tdoc.save();                    // owner's disclosure setting (wizard step 5)
  const sub1 = await tech.submitTechnologyForReview(owner, t.id, await techRev(t.id));
  const case1 = await M.ReviewCase.findOne({ ref: sub1.reviewCaseRef });
  ok('review: submission opens a case due in 5 WD on the published calendar', case1.status === 'open' && case1.checkRequired === false
    && iso(case1.dueAt) === iso(wd.addWorkingDays(now, case1.createdAt, 5)), iso(case1.dueAt));
  await rejects('review: a reviewer who belongs to the owner organization cannot claim (conflict of interest)',
    () => rcs.actOnCase(conflicted, case1._id, 0, 'claim'), is.named('ConflictOfInterestError'));
  await rejects('review: an organization user cannot claim', () => rcs.actOnCase(owner, case1._id, 0, 'claim'), is.named('ForbiddenError'));
  let res = await rcs.actOnCase(r1, case1._id, 0, 'claim');
  ok('review: claim assigns the case; technology submitted → in_review', res.status === 'assigned' && res.resourceStatus === 'in_review'
    && (await M.WorkflowTransition.countDocuments({ 'resource.id': case1._id, action: 'claim' })) === 1
    && (await M.WorkflowTransition.countDocuments({ 'resource.id': t.id, action: 'assign', toStatus: 'in_review' })) === 1);
  await rejects('review: another reviewer cannot act on an assigned case', () => rcs.actOnCase(r2, case1._id, res.rev, 'start'), is.named('ForbiddenActionError'));
  await rejects('review: stale rev → 409', () => rcs.actOnCase(r1, case1._id, 0, 'start'), is.named('VersionConflictError'));
  res = await rcs.actOnCase(r1, case1._id, res.rev, 'start');
  await rejects('review: a question needs its text', () => rcs.actOnCase(r1, case1._id, res.rev, 'ask'), is.named('InvalidTransitionError'));
  res = await rcs.actOnCase(r1, case1._id, res.rev, 'ask', { reason: '请补充检测准确率的测试报告' });
  ok('review: asking the submitter stops the SLA clock', res.status === 'waiting_for_submitter' && (await M.ReviewCase.findById(case1._id).lean()).pausedAt instanceof Date);
  await rejects('review: another organization cannot answer (tenant scope: not found)', () => rcs.actOnCase(outsider, case1._id, res.rev, 'answer'), is.named('NotFoundError'));
  res = await rcs.actOnCase(owner, case1._id, res.rev, 'answer', { reason: '已上传测试报告' });
  const afterAnswer = await M.ReviewCase.findById(case1._id).lean();
  ok('review: the answer restarts the clock; a same-day pause moves the deadline by 0 WD', res.status === 'in_review' && afterAnswer.pausedAt === null
    && afterAnswer.pausedWorkingDays === 0 && iso(afterAnswer.dueAt) === iso(case1.dueAt));
  await rejects('review: technology_review has no second check', () => rcs.actOnCase(r1, case1._id, res.rev, 'propose', { decision: 'approve' }), is.named('InvalidTransitionError'));
  res = await rcs.actOnCase(r1, case1._id, res.rev, 'approve', { reason: '资料齐全' });
  ok('review: approve closes the case; technology → approved; outbox technology.approved', res.status === 'approved' && res.resourceStatus === 'approved'
    && (await M.OutboxEvent.countDocuments({ eventType: 'technology.approved', 'aggregate.id': t.id })) === 1);

  await drain();
  let live = await M.TechnologyPublication.find({ technologyId: t.id, status: 'live' }).lean();
  let tAfter = await M.Technology.findById(t.id).setOptions({ crossTenant: { reason: 'test' } }).lean();
  ok('publish: the worker creates the live snapshot; technology → published (system actor)', live.length === 1 && live[0].version === 1
    && tAfter.lifecycleStatus === 'published' && tAfter.publishedVersion === 1
    && (await M.WorkflowTransition.countDocuments({ 'resource.id': t.id, action: 'publish', actorUserId: SYSTEM_USER_ID })) === 1);
  const offer = await M.TechnologyOffer.findOne({ ref: 'OFR-000001' }).setOptions({ crossTenant: { reason: 'test' } }).lean();
  ok('publish: the submitted offer became active (rev bumped) and appears in the snapshot', offer.offerStatus === 'active' && offer.rev === 1
    && live[0].offerTypes.join() === 'license' && live[0].territories.join() === 'CN' && live[0].owner.verified === true);
  await rejects('offer: a reservation needs a known reason (database validator, migration 003)',
    () => M.TechnologyOffer.collection.updateOne({ ref: 'OFR-000001' }, { $set: { offerStatus: 'under_negotiation', reservation: { reason: 'because' } } }), is.dbValidator);
  const sdoc = index.get(String(t.id));
  ok('publish: search index and public page follow the snapshot', sdoc && sdoc.version === 1 && pages.get(tAfter.ref) === '<h1>锂电池极片缺陷在线检测技术</h1>');
  ok('publish: the search document holds only snapshot fields (no internal description)', !JSON.stringify(sdoc).includes('内部算法'));
  await q.enqueueJob({ type: 'technology.publish', key: 'manual-repeat', payload: { aggregate: { type: 'technology', id: t.id }, version: 1 } });
  await q.runDueJobs(handlers);
  ok('publish: running the publish job again changes nothing (idempotent)', (await M.Job.findOne({ key: 'manual-repeat' }).lean()).result.skipped === 'version 1 is already live'
    && (await M.TechnologyPublication.countDocuments({ technologyId: t.id })) === 1);

  // Revision of a published listing: old snapshot stays live until the new one is approved and published.
  await tech.updateTechnologyContent(owner, t.id, await techRev(t.id), { publicSummary: { zh: '基于机器视觉的实时检测，准确率超过99%。' }, claimedTrl: 7 });
  const sub2 = await tech.submitTechnologyForReview(owner, t.id, await techRev(t.id));
  const case2 = await M.ReviewCase.findOne({ ref: sub2.reviewCaseRef }).lean();
  ok('revision: submitting opens a new case linked to the previous round', sub2.status === 'update_pending' && String(case2.previousCaseId) === String(case1._id));
  res = await rcs.actOnCase(r1, case2._id, 0, 'claim');
  ok('revision: claiming does not change update_pending', res.resourceStatus === 'update_pending');
  res = await rcs.actOnCase(r1, case2._id, res.rev, 'start');
  res = await rcs.actOnCase(r1, case2._id, res.rev, 'approve');
  ok('revision: approval sets the technology back to published (approve_revision)', res.resourceStatus === 'published'
    && (await M.OutboxEvent.countDocuments({ eventType: 'technology.revision_approved' })) === 1);
  await drain();
  live = await M.TechnologyPublication.find({ technologyId: t.id, status: 'live' }).lean();
  ok('revision: version 2 is live, version 1 superseded, still exactly one live snapshot', live.length === 1 && live[0].version === 2
    && (await M.TechnologyPublication.findOne({ technologyId: t.id, version: 1 }).lean()).status === 'superseded' && index.get(String(t.id)).version === 2);

  await tech.updateTechnologyContent(owner, t.id, await techRev(t.id), { claimedTrl: 8 });
  const sub3 = await tech.submitTechnologyForReview(owner, t.id, await techRev(t.id));
  const case3 = await M.ReviewCase.findOne({ ref: sub3.reviewCaseRef }).lean();
  res = await rcs.actOnCase(r1, case3._id, 0, 'claim');
  res = await rcs.actOnCase(r1, case3._id, res.rev, 'start');
  res = await rcs.actOnCase(r1, case3._id, res.rev, 'request_changes', { reason: 'TRL 8 需要量产证据' });
  ok('revision: requesting changes closes the case and rejects the revision; version 2 stays live', res.status === 'closed'
    && (await M.ReviewCase.findById(case3._id).lean()).decision === 'request_changes' && res.resourceStatus === 'published'
    && (await M.TechnologyPublication.findOne({ technologyId: t.id, status: 'live' }).lean()).version === 2);

  // Suspension and reinstatement (FR-TEC-12, UAT-12).
  await rejects('suspend: a reviewer without the compliance role cannot suspend', async () => pub.suspendTechnology(r1, t.id, await techRev(t.id), '权属争议'), is.named('ForbiddenError'));
  await pub.suspendTechnology(compliance, t.id, await techRev(t.id), '权属争议投诉 CASE-000999');
  ok('suspend: the snapshot is withdrawn in the same transaction', (await M.TechnologyPublication.countDocuments({ technologyId: t.id, status: 'live' })) === 0
    && (await M.TechnologyPublication.findOne({ technologyId: t.id, version: 2 }).lean()).status === 'withdrawn');
  await drain();
  ok('suspend: search entry and public page removed by the jobs', !index.has(String(t.id)) && !pages.has(tAfter.ref));
  const reinstated = await pub.reinstateTechnology(r1, t.id, await techRev(t.id), '争议已解决，证据见 CASE-000999');
  await drain();
  live = await M.TechnologyPublication.find({ technologyId: t.id, status: 'live' }).lean();
  ok('reinstate: the latest approved version (2) is published again and indexed', reinstated.version === 2 && live.length === 1 && live[0].version === 2
    && index.get(String(t.id)).version === 2 && pages.has(tAfter.ref));

  // Publish preconditions: the job dies (dead letter) instead of publishing something unapproved.
  await q.enqueueJob({ type: 'technology.publish', key: 'unapproved', payload: { aggregate: { type: 'technology', id: t.id }, version: 3 } });
  await q.runDueJobs(handlers);
  const deadJob = await M.Job.findOne({ key: 'unapproved' }).lean();
  ok('publish: a version without approved review → dead letter, nothing published', deadJob.status === 'dead' && /no approved review/.test(deadJob.lastError)
    && (await M.TechnologyPublication.findOne({ technologyId: t.id, status: 'live' }).lean()).version === 2);

  // Pause across several working days moves the deadline by exactly those days.
  await tech.updateTechnologyContent(owner, t.id, await techRev(t.id), { claimedTrl: 7, applicationCodes: ['battery'] });
  const sub4 = await tech.submitTechnologyForReview(owner, t.id, await techRev(t.id));
  const case4 = await M.ReviewCase.findOne({ ref: sub4.reviewCaseRef }).lean();
  res = await rcs.actOnCase(r1, case4._id, 0, 'claim');
  res = await rcs.actOnCase(r1, case4._id, res.rev, 'start');
  res = await rcs.actOnCase(r1, case4._id, res.rev, 'ask', { reason: '请说明应用场景' });
  const pausedAt = new Date(Date.now() - 7 * DAY);
  await M.ReviewCase.collection.updateOne({ _id: case4._id }, { $set: { pausedAt } });
  const waited = wd.workingDaysBetween(now, pausedAt, new Date());
  const before = (await M.ReviewCase.findById(case4._id).lean()).dueAt;
  res = await rcs.actOnCase(owner, case4._id, res.rev, 'answer', { reason: '用于产线在线检测' });
  const c4 = await M.ReviewCase.findById(case4._id).lean();
  ok('review: a 7-day pause moves the deadline by the working days waited (' + waited + ')', waited >= 4 && c4.pausedWorkingDays === waited
    && iso(c4.dueAt) === iso(wd.extendByWorkingDays(now, before, waited)));

  // Maker-checker: organization verification needs two people (FR-ADM-02).
  const vcase = await inTransaction((session) => rcs.openReviewCase(session, { caseType: 'organization_verification', resource: { type: 'organization', id: orgC } }));
  ok('maker-checker: organization verification cases require a second check, due in 3 WD', vcase.checkRequired === true
    && iso(vcase.dueAt) === iso(wd.addWorkingDays(now, vcase.createdAt, 3)));
  res = await rcs.actOnCase(v1, vcase._id, 0, 'claim');
  ok('maker-checker: claim starts the verification', res.resourceStatus === 'in_review');
  await rejects('maker-checker: a listing reviewer cannot take a verification case', () => rcs.actOnCase(r2, vcase._id, res.rev, 'start'), is.named('ForbiddenError'));
  res = await rcs.actOnCase(v1, vcase._id, res.rev, 'start');
  await rejects('maker-checker: the maker cannot approve directly', () => rcs.actOnCase(v1, vcase._id, res.rev, 'approve'), is.named('InvalidTransitionError'));
  res = await rcs.actOnCase(v1, vcase._id, res.rev, 'propose', { decision: 'approve' });
  await rejects('maker-checker: the maker cannot check their own proposal', () => rcs.actOnCase(v1, vcase._id, res.rev, 'approve'), is.named('ForbiddenActionError'));
  await rejects('maker-checker: the checker cannot silently flip the decision', () => rcs.actOnCase(v2, vcase._id, res.rev, 'reject', { reason: 'x' }), is.named('InvalidTransitionError'));
  res = await rcs.actOnCase(v2, vcase._id, res.rev, 'approve');
  const orgCAfter = await M.Organization.findById(orgC).lean();
  const vAfter = await M.ReviewCase.findById(vcase._id).lean();
  ok('maker-checker: a second person approves; organization verified', res.status === 'approved' && String(vAfter.checkedBy) === String(v2.userId)
    && String(vAfter.proposedBy) === String(v1.userId) && orgCAfter.verification.status === 'verified' && orgCAfter.verification.level === 3);

  // Assignment and SLA escalation (FR-ADM-03).
  const acase = await inTransaction((session) => rcs.openReviewCase(session, { caseType: 'demand_review', resource: { type: 'demand', id: new ObjectId() } }));
  await rejects('assign: only operations can assign', () => rcs.actOnCase(r1, acase._id, 0, 'assign', { assigneeId: r2.userId }), is.named('ForbiddenError'));
  res = await rcs.actOnCase(ops, acase._id, 0, 'assign', { assigneeId: r2.userId });
  ok('assign: operations assigns a case to a reviewer', res.status === 'assigned' && String((await M.ReviewCase.findById(acase._id).lean()).assignedTo) === String(r2.userId));
  await M.ReviewCase.collection.updateOne({ _id: acase._id }, { $set: { dueAt: new Date(Date.now() - 1000) } });
  await M.ReviewCase.collection.updateOne({ _id: case4._id }, { $set: { dueAt: new Date(Date.now() - 1000), status: 'waiting_for_submitter' } });
  const escalated = await rcs.escalateOverdueCases(new Date());
  ok('escalation: the overdue case is escalated by the system; a case waiting for the submitter is not', escalated === 1
    && (await M.ReviewCase.findById(acase._id).lean()).status === 'escalated'
    && (await M.WorkflowTransition.countDocuments({ 'resource.id': acase._id, action: 'escalate', actorUserId: SYSTEM_USER_ID })) === 1);

  // No published calendar → no guessed deadline; filled in once the year is published.
  ok('calendar: a deadline in an unpublished year is null, not guessed', (await rcs.caseDueAt('technology_review', new Date('2099-03-02T02:00:00Z'))) === null);
  await M.ReviewCase.collection.updateOne({ _id: acase._id }, { $set: { dueAt: null, status: 'assigned' } });
  ok('calendar: missing deadlines are filled when the calendar is available', (await rcs.fillMissingDueDates()) === 1
    && (await M.ReviewCase.findById(acase._id).lean()).dueAt instanceof Date);
});
