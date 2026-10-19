// CASL policy (plain objects and Mongoose documents), accessibleBy() filters, and the tenant-scope plugin.
'use strict';
const mongoose = require('mongoose');
const { subject } = require('@casl/ability');
const { ok, rejects, is, connect, clearAll, run } = require('./helpers');
const M = require('../dist/models');
const { defineAbilityFor } = require('../dist/modules/identity/abilities');

const { ObjectId } = mongoose.Types;

run(async () => {
  await connect();
  await clearAll();
  const orgA = new ObjectId(); const orgB = new ObjectId(); const orgC = new ObjectId(); const u = new ObjectId();
  const member = (org, roleCodes) => ({ userId: u, memberships: [{ organizationId: org, roleCodes, status: 'active' }], platformRoles: [], accessGrants: [] });
  const mgr = defineAbilityFor(member(orgA, ['technology_manager']));
  const viewer = defineAbilityFor(member(orgA, ['viewer']));
  const anon = defineAbilityFor(null);
  const reviewer = defineAbilityFor({ userId: u, memberships: [], platformRoles: ['listing_reviewer'], accessGrants: [] });

  // ---------- Policy on plain objects ----------
  const t = (o) => subject('Technology', Object.assign({ _id: new ObjectId(), ownerOrganizationId: orgA, visibility: 'private', lifecycleStatus: 'draft', currentVersion: 1 }, o));
  ok('manager can submit own draft', mgr.can('submit', t({})));
  ok('manager cannot submit a listing already in review', !mgr.can('submit', t({ lifecycleStatus: 'submitted' })));
  ok('manager can submit a revision of a published listing', mgr.can('submit', t({ lifecycleStatus: 'published' })));
  ok('manager cannot edit while an update is pending or an approval awaits publication', !mgr.can('update', t({ lifecycleStatus: 'update_pending' })) && !mgr.can('update', t({ lifecycleStatus: 'approved' })));
  ok('manager cannot update another organization', !mgr.can('update', t({ ownerOrganizationId: orgB })));
  ok('viewer can read but not submit', viewer.can('read', t({})) && !viewer.can('submit', t({})));
  ok('anonymous reads published public listings only', anon.can('read', t({ lifecycleStatus: 'published', visibility: 'public' })) && !anon.can('read', t({})));
  ok('reviewer can review submitted, not drafts', reviewer.can('review', t({ lifecycleStatus: 'submitted' })) && !reviewer.can('review', t({})));
  ok('only never-submitted drafts can be deleted', mgr.can('delete', t({})) && !mgr.can('delete', t({ currentVersion: 2 })));

  // ---------- Policy on Mongoose documents (subject type = model name) ----------
  const doc = new M.Technology({ ref: 'TEC-000201', ownerOrganizationId: orgA, technologyType: 'p', createdBy: u });
  ok('Mongoose document recognised as Technology without subject()', mgr.can('create', doc) && !viewer.can('create', doc));

  // ---------- Data: technologies of three organizations ----------
  const seed = [[orgA, 'draft'], [orgA, 'submitted'], [orgA, 'published'], [orgB, 'submitted'], [orgB, 'draft'], [orgC, 'published']];
  await M.Technology.insertMany(seed.map(([org, status], i) => ({ ref: 'TEC-00030' + i, ownerOrganizationId: org, technologyType: 'p', lifecycleStatus: status, createdBy: u })));
  const scopeA = { tenant: { organizationIds: [orgA] } };

  // ---------- Tenant-scope plugin ----------
  const anyB = await M.Technology.findOne({ ownerOrganizationId: orgB }).setOptions({ crossTenant: { reason: 'test' } });
  ok('own tenant can read', (await M.Technology.find({}).setOptions(scopeA)).length === 3);
  ok('other tenant\'s document is simply not found', (await M.Technology.findById(anyB._id).setOptions(scopeA)) === null);
  await rejects('query without tenant scope throws', () => M.Technology.find({}), is.named('TenantScopeError'));
  await rejects('findById without tenant scope throws', () => M.Technology.findById(anyB._id), is.named('TenantScopeError'));
  await rejects('cross-tenant access without a reason throws', () => M.Technology.find({}).setOptions({ crossTenant: { reason: '' } }), is.named('TenantScopeError'));
  const upd = await M.Technology.updateMany({}, { $set: { visibility: 'restricted' } }).setOptions(scopeA);
  ok('updateMany touches only the tenant\'s documents', upd.nModified === 3 && (await M.Technology.countDocuments({ visibility: 'restricted' }).setOptions({ crossTenant: { reason: 'test' } })) === 3);
  ok('countDocuments and distinct are scoped', (await M.Technology.countDocuments({}).setOptions(scopeA)) === 3
    && (await M.Technology.distinct('ownerOrganizationId').setOptions(scopeA)).length === 1);
  const agg = await M.Technology.aggregate([{ $group: { _id: '$ownerOrganizationId', n: { $sum: 1 } } }]).option(scopeA);
  ok('aggregate gets the tenant $match prepended', agg.length === 1 && String(agg[0]._id) === String(orgA) && agg[0].n === 3);
  await rejects('aggregate without tenant scope throws', () => M.Technology.aggregate([{ $match: {} }]), is.named('TenantScopeError'));
  const del = await M.Technology.deleteMany({ ownerOrganizationId: orgB }).setOptions(scopeA);
  ok('deleteMany cannot reach another tenant even when asked to', del.deletedCount === 0);

  const intro = await M.IntroductionRequest.create({ ref: 'INT-000301', matchId: new ObjectId(), buyerOrganizationId: orgB, supplierOrganizationId: orgA, requestedBy: u });
  const sees = async (org) => !!(await M.IntroductionRequest.findById(intro._id).setOptions({ tenant: { organizationIds: [org] } }));
  ok('introduction visible to buyer and supplier, not to a third organization', (await sees(orgA)) && (await sees(orgB)) && !(await sees(orgC)));
  await M.Deal.create({ ref: 'DEAL-000301', dealType: 'ip_license', name: 'D', parties: [{ organizationId: orgA, role: 'licensor' }, { organizationId: orgB, role: 'licensee' }], createdBy: u });
  ok('deal visible to its parties only', (await M.Deal.countDocuments({}).setOptions({ tenant: { organizationIds: [orgB] } })) === 1
    && (await M.Deal.countDocuments({}).setOptions({ tenant: { organizationIds: [orgC] } })) === 0);

  // ---------- accessibleBy(): CASL rules as a MongoDB filter ----------
  const editable = await M.Technology.accessibleBy(mgr, 'update').setOptions(scopeA);
  ok('accessibleBy(update): own drafts and published, not in review', editable.length === 2 && editable.every((x) => x.lifecycleStatus !== 'submitted'));
  const queue = await M.Technology.accessibleBy(reviewer, 'review').setOptions({ crossTenant: { reason: 'review-queue' } }).sort({ ref: 1 });
  ok('accessibleBy(review): reviewer queue spans organizations', queue.length === 2 && queue.every((x) => x.lifecycleStatus === 'submitted'));
  await rejects('accessibleBy with no matching rule -> ForbiddenError', () => M.Technology.accessibleBy(viewer, 'update').setOptions(scopeA).exec(), is.named('ForbiddenError'));
});
