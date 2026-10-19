// Technology use cases through the Mongoose Document API (src/modules/technology/technology.service.ts):
// create, read (lean + populate), update, submit, revise a published listing, discard; concurrency and tenancy.
'use strict';
const mongoose = require('mongoose');
const { ok, rejects, is, connect, clearAll, run } = require('./helpers');
const M = require('../dist/models');
const svc = require('../dist/modules/technology/technology.service');
const { defineAbilityFor } = require('../dist/modules/identity/abilities');

const { ObjectId } = mongoose.Types;

function actorFor(orgId, roleCodes) {
  const userId = new ObjectId();
  const ability = defineAbilityFor({ userId, memberships: [{ organizationId: orgId, roleCodes, status: 'active' }], platformRoles: [], accessGrants: [] });
  return { userId, organizationIds: [orgId], ability, correlationId: 'req-' + userId.toHexString().slice(-6) };
}
const count = (model, filter) => model.countDocuments(filter);

run(async () => {
  await connect();
  await clearAll();
  const orgA = new ObjectId(); const orgB = new ObjectId();
  await M.Organization.create([
    { _id: orgA, ref: 'ORG-000101', legalName: '某某大学', displayName: '某某大学', organizationType: 'university', jurisdictionCode: 'CN' },
    { _id: orgB, ref: 'ORG-000102', legalName: '某某电池有限公司', displayName: '某某电池', organizationType: 'company', jurisdictionCode: 'CN' },
  ]);
  const manager = actorFor(orgA, ['technology_manager']);
  const viewer = actorFor(orgA, ['viewer']);
  const outsider = actorFor(orgB, ['technology_manager']);

  // ---------- Create: new Model() + save() in one transaction ----------
  const content = { title: { zh: '锂电池极片缺陷在线检测技术', en: 'Inline electrode defect detection' }, industryCodes: ['C384'], claimedTrl: 6 };
  const created = await svc.createTechnologyDraft(manager, { organizationId: orgA, technologyType: 'process_technology', content });
  ok('create: draft with reference ' + created.ref + ', rev 0', /^TEC-\d{6}$/.test(created.ref) && created.rev === 0);
  ok('create: version 1 + transition + outbox + audit written together',
    (await count(M.TechnologyVersion, { technologyId: created.id, version: 1 })) === 1
    && (await count(M.WorkflowTransition, { 'resource.id': created.id, action: 'created' })) === 1
    && (await count(M.OutboxEvent, { eventType: 'technology.created', 'aggregate.id': created.id })) === 1
    && (await count(M.AuditEvent, { action: 'technology.created', 'resource.id': created.id })) === 1);
  await rejects('create: viewer role is forbidden (403)', () => svc.createTechnologyDraft(viewer, { organizationId: orgA, technologyType: 'p', content }), is.named('ForbiddenError'));
  await rejects('create: for another organization is forbidden', () => svc.createTechnologyDraft(outsider, { organizationId: orgA, technologyType: 'p', content }), is.named('ForbiddenError'));
  await rejects('create: invalid content (TRL 12) -> 422', () => svc.createTechnologyDraft(manager, { organizationId: orgA, technologyType: 'p', content: Object.assign({}, content, { claimedTrl: 12 }) }), is.validation);
  ok('create: rejected attempts consumed no reference numbers', (await M.Counter.findById('TEC')).seq === 1);

  // ---------- Update: findById() + set() + save() with If-Match ----------
  const u1 = await svc.updateTechnologyContent(manager, created.id, 0, { publicSummary: { zh: '基于机器视觉的实时检测，准确率超过99%。' }, claimedTrl: 7 });
  ok('update draft in place: rev 0 -> 1, still version 1', u1.rev === 1 && u1.version === 1);
  const v = await M.TechnologyVersion.findOne({ technologyId: created.id, version: 1 }).lean();
  ok('update: fields changed on the version document', v.claimedTrl === 7 && v.publicSummary.zh.startsWith('基于'));
  await rejects('update with stale If-Match rev -> 409', () => svc.updateTechnologyContent(manager, created.id, 0, { claimedTrl: 5 }), is.named('VersionConflictError'));
  await rejects('update with invalid value -> 422, nothing saved', () => svc.updateTechnologyContent(manager, created.id, 1, { claimedTrl: 0 }), is.validation);
  await rejects('update another organization\'s technology -> 404 (not 403)', () => svc.updateTechnologyContent(outsider, created.id, 1, { claimedTrl: 5 }), is.named('NotFoundError'));
  const same = await svc.updateTechnologyContent(manager, created.id, 1, { claimedTrl: 7 });
  ok('update without real change keeps rev', same.rev === 1);

  // Two editors with the same If-Match value: exactly one wins (Promise.allSettled is not in Node 12.4).
  const settle = (p) => p.then((r) => ({ ok: true, r }), (e) => ({ ok: false, e }));
  const race = await Promise.all([
    settle(svc.updateTechnologyContent(manager, created.id, 1, { applicationCodes: ['battery'] })),
    settle(svc.updateTechnologyContent(manager, created.id, 1, { applicationCodes: ['solar'] })),
  ]);
  const winners = race.filter((x) => x.ok).length;
  const losers = race.filter((x) => !x.ok && ['VersionConflictError', 'VersionError'].includes(x.e.name)).length;
  ok('concurrent edits with the same rev: one succeeds, one gets 409', winners === 1 && losers === 1, JSON.stringify(race.map((x) => (x.ok ? 'ok' : x.e.name))));

  // ---------- Read: lean() list with populate() through the tenant scope and CASL rules ----------
  const page = await svc.listTechnologies(manager, { limit: 10 });
  ok('list: lean objects with populated organization name', page.length === 1 && page[0].ownerOrganizationId.displayName === '某某大学' && typeof page[0].save === 'undefined');
  ok('list: other organization sees nothing', (await svc.listTechnologies(outsider, {})).length === 0);

  // ---------- Submit: freeze version, review case, transition, outbox, audit ----------
  const rev = (await M.Technology.findById(created.id).setOptions({ tenant: manager })).rev;
  const sub = await svc.submitTechnologyForReview(manager, created.id, rev);
  const t1 = await M.Technology.findById(created.id).setOptions({ tenant: manager }).lean();
  ok('submit: ' + sub.reviewCaseRef + ', status submitted, rev incremented', /^CASE-\d{6}$/.test(sub.reviewCaseRef) && t1.lifecycleStatus === 'submitted' && t1.rev === rev + 1);
  ok('submit: version 1 frozen; review case points at it', (await M.TechnologyVersion.findOne({ technologyId: created.id, version: 1 })).frozen === true
    && (await count(M.ReviewCase, { ref: sub.reviewCaseRef, 'resource.version': 1 })) === 1);
  await rejects('submit again -> 403 (state rule)', () => svc.submitTechnologyForReview(manager, created.id, t1.rev), is.named('ForbiddenError'));
  await rejects('edit while in review -> 403 (state rule)', () => svc.updateTechnologyContent(manager, created.id, t1.rev, { claimedTrl: 8 }), is.named('ForbiddenError'));
  await rejects('submit by another organization -> 404', () => svc.submitTechnologyForReview(outsider, created.id, t1.rev), is.named('NotFoundError'));

  // Staff publish (simplified review outcome) through the audited cross-tenant path.
  const staffDoc = await M.Technology.findById(created.id).setOptions({ crossTenant: { reason: sub.reviewCaseRef } });
  staffDoc.set({ lifecycleStatus: 'published', publishedVersion: 1, visibility: 'public' });
  await staffDoc.save();

  // ---------- Revise a published listing: new version, old one stays public ----------
  const r1 = await svc.updateTechnologyContent(manager, created.id, staffDoc.rev, { claimedTrl: 8 });
  const t2 = await M.Technology.findById(created.id).setOptions({ tenant: manager }).lean();
  ok('edit published listing: version 2 started, version 1 untouched', r1.version === 2 && t2.currentVersion === 2 && t2.publishedVersion === 1
    && (await M.TechnologyVersion.findOne({ technologyId: created.id, version: 1 }).lean()).claimedTrl === 7);
  const sub2 = await svc.submitTechnologyForReview(manager, created.id, r1.rev);
  ok('submit revision: status update_pending (snapshot stays live)', sub2.status === 'update_pending');

  // ---------- Delete: discard a never-submitted draft ----------
  const d = await svc.createTechnologyDraft(manager, { organizationId: orgA, technologyType: 'material', content: { title: { zh: '固态电解质' } } });
  await rejects('discard by viewer -> 403', () => svc.discardTechnologyDraft(viewer, d.id, d.rev), is.named('ForbiddenError'));
  await svc.discardTechnologyDraft(manager, d.id, d.rev);
  ok('discard: technology and draft version deleted, transition recorded',
    (await count(M.Technology, { _id: d.id }).setOptions({ tenant: manager })) === 0
    && (await count(M.TechnologyVersion, { technologyId: d.id })) === 0
    && (await count(M.WorkflowTransition, { 'resource.id': d.id, toStatus: 'discarded' })) === 1);
  await rejects('discard a submitted technology -> 403', () => svc.discardTechnologyDraft(manager, created.id, r1.rev + 1), is.named('ForbiddenError'));
});
