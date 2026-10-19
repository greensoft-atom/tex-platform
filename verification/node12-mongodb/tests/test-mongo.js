// Runs on Node 12.4.0 with mongodb@3.7.4 against a MongoDB 4.4 / 5.0 replica set.
'use strict';
const { MongoClient, ObjectId, Long } = require('mongodb');
const m1 = require('../migrations/001-core-schema.js');
const m2 = require('../migrations/002-db-roles.js');
const { submitTechnologyForReview } = require('../dist/submit-technology.service.js');

let pass = 0; let fail = 0;
const ok = (name, cond) => { cond ? pass++ : fail++; console.log((cond ? 'PASS ' : 'FAIL ') + name); };
async function rejects(name, fn) { try { await fn(); ok(name + ' (expected rejection)', false); } catch (e) { ok(name, true); } }

(async () => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  const db = client.db('tex');
  await db.dropDatabase(); await client.db('tex_audit').dropDatabase();
  const info = await client.db('admin').command({ buildInfo: 1 });
  console.log('node', process.version, '| mongod', info.version);

  await m1.up(db, client); await m1.up(db, client); await m2.up(db, client); await m2.up(db, client);
  ok('migrations idempotent', true);

  const now = new Date();
  const userId = new ObjectId(); const orgA = new ObjectId(); const orgB = new ObjectId(); const techId = new ObjectId();
  await db.collection('users').insertOne({ displayName: 'Li', status: 'active', phoneE164: '+8613800000000', createdAt: now, updatedAt: now, rev: 0 });
  await rejects('user bad phone', () => db.collection('users').insertOne({ displayName: 'X', status: 'active', phoneE164: '13800000000', createdAt: now, updatedAt: now, rev: 0 }));
  await rejects('duplicate phone', () => db.collection('users').insertOne({ displayName: 'Y', status: 'active', phoneE164: '+8613800000000', createdAt: now, updatedAt: now, rev: 0 }));
  await db.collection('organizations').insertOne({ _id: orgA, ref: 'ORG-000001', legalName: 'Uni', displayName: 'Uni', organizationType: 'university', jurisdictionCode: 'CN', registrationNumber: '12100000400000624D', verification: { status: 'verified' }, status: 'active', createdAt: now, updatedAt: now, rev: 0 });
  await rejects('duplicate USCC', () => db.collection('organizations').insertOne({ ref: 'ORG-000002', legalName: 'U2', displayName: 'U2', organizationType: 'university', jurisdictionCode: 'CN', registrationNumber: '12100000400000624D', verification: { status: 'pending' }, status: 'active', createdAt: now, updatedAt: now, rev: 0 }));
  await db.collection('technologies').insertOne({ _id: techId, ref: 'TEC-000001', ownerOrganizationId: orgA, technologyType: 'process', lifecycleStatus: 'draft', visibility: 'private', currentVersion: 1, publishedVersion: null, createdBy: userId, createdAt: now, updatedAt: now, rev: 0 });
  await db.collection('technology_versions').insertOne({ technologyId: techId, version: 1, title: { zh: '光学检测技术', en: 'Optical inspection' }, claimedTrl: 6, frozen: false, createdBy: userId, createdAt: now });
  await rejects('TRL 10', () => db.collection('technology_versions').insertOne({ technologyId: techId, version: 2, title: { zh: 'x' }, claimedTrl: 10, frozen: false, createdBy: userId, createdAt: now }));
  await rejects('title without zh', () => db.collection('technology_versions').insertOne({ technologyId: techId, version: 3, title: { en: 'x' }, frozen: false, createdBy: userId, createdAt: now }));
  await rejects('bad lifecycle status', () => db.collection('technologies').insertOne({ ref: 'TEC-000002', ownerOrganizationId: orgA, technologyType: 'p', lifecycleStatus: 'live', visibility: 'private', currentVersion: 1, createdBy: userId, createdAt: now, updatedAt: now, rev: 0 }));
  await db.collection('technology_offers').insertOne({ ref: 'OFR-000001', technologyId: techId, technologyVersion: 1, supplierOrganizationId: orgA, transactionType: 'license', offerStatus: 'draft', exclusivity: 'non_exclusive', price: { type: 'indicative', indicative: { currency: 'CNY', amountMinor: Long.fromNumber(30000000) } }, validFrom: new Date('2026-01-01'), validUntil: new Date('2027-01-01'), createdBy: userId, createdAt: now, updatedAt: now, rev: 0 });
  await rejects('offer validUntil before validFrom', () => db.collection('technology_offers').insertOne({ ref: 'OFR-000002', technologyId: techId, technologyVersion: 1, supplierOrganizationId: orgA, transactionType: 'license', offerStatus: 'draft', exclusivity: 'non_exclusive', price: { type: 'negotiable' }, validFrom: new Date('2027-01-01'), validUntil: new Date('2026-01-01'), createdBy: userId, createdAt: now, updatedAt: now, rev: 0 }));
  await rejects('money as double', () => db.collection('technology_offers').insertOne({ ref: 'OFR-000003', technologyId: techId, technologyVersion: 1, supplierOrganizationId: orgA, transactionType: 'license', offerStatus: 'draft', exclusivity: 'non_exclusive', price: { type: 'fixed', indicative: { currency: 'CNY', amountMinor: 300000.5 } }, createdBy: userId, createdAt: now, updatedAt: now, rev: 0 }));
  const demandId = new ObjectId();
  await db.collection('demand_versions').insertOne({ demandId, version: 1, title: { zh: '需求' }, problemStatement: { zh: '检测' }, budget: { currency: 'CNY', minMinor: Long.fromNumber(100), maxMinor: Long.fromNumber(200) }, createdBy: userId, createdAt: now });
  await db.collection('demand_versions').insertOne({ demandId, version: 2, title: { zh: '需求' }, problemStatement: { zh: '检测' }, budget: { currency: 'CNY', minMinor: Long.fromNumber(100) }, createdBy: userId, createdAt: now });
  await rejects('budget min > max', () => db.collection('demand_versions').insertOne({ demandId, version: 3, title: { zh: '需求' }, problemStatement: { zh: '检测' }, budget: { currency: 'CNY', minMinor: Long.fromNumber(300), maxMinor: Long.fromNumber(200) }, createdBy: userId, createdAt: now }));
  const match = { demandId, demandVersion: 1, offerId: new ObjectId(), technologyId: techId, technologyVersion: 1, retrievalMethod: 'full_text', rankingVersion: 'v1', score: 84.5, eligibilityStatus: 'eligible', reviewStatus: 'pending', createdAt: now };
  await db.collection('matches').insertOne(Object.assign({}, match));
  await rejects('duplicate match', () => db.collection('matches').insertOne(Object.assign({}, match)));
  await rejects('intro buyer == supplier', () => db.collection('introduction_requests').insertOne({ ref: 'INT-000001', matchId: new ObjectId(), buyerOrganizationId: orgA, supplierOrganizationId: orgA, requestedBy: userId, status: 'requested', createdAt: now, updatedAt: now, rev: 0 }));
  const introId = new ObjectId();
  const deal = { introductionRequestId: introId, dealType: 'ip_license', status: 'opportunity', name: 'D', parties: [{ organizationId: orgA, role: 'supplier', status: 'active' }, { organizationId: orgB, role: 'buyer', status: 'active' }], createdBy: userId, createdAt: now, updatedAt: now, rev: 0 };
  await db.collection('deals').insertOne(Object.assign({ ref: 'DEAL-000001' }, deal));
  await rejects('second deal for same introduction', () => db.collection('deals').insertOne(Object.assign({ ref: 'DEAL-000002' }, deal)));
  await rejects('deal with one party', () => db.collection('deals').insertOne(Object.assign({}, deal, { ref: 'DEAL-000003', introductionRequestId: new ObjectId(), parties: [deal.parties[0]] })));
  await db.collection('idempotency_keys').insertOne({ actorUserId: userId, key: 'k1', requestHash: 'a'.repeat(64), createdAt: now, expiresAt: new Date(Date.now() + 86400000) });
  await rejects('idempotency key reuse', () => db.collection('idempotency_keys').insertOne({ actorUserId: userId, key: 'k1', requestHash: 'b'.repeat(64), createdAt: now, expiresAt: now }));

  const r = await submitTechnologyForReview(client, { userId, organizationIds: [orgA] }, techId, 0, 'corr-1');
  ok('submit transaction returns case ref ' + r.reviewCaseRef, r.reviewCaseRef === 'CASE-000001');
  const t = await db.collection('technologies').findOne({ _id: techId });
  ok('technology submitted, rev incremented', t.lifecycleStatus === 'submitted' && t.rev === 1);
  ok('version frozen', (await db.collection('technology_versions').findOne({ technologyId: techId, version: 1 })).frozen === true);
  ok('outbox + audit written (cross-database transaction)', (await db.collection('outbox_events').countDocuments()) === 1 && (await client.db('tex_audit').collection('audit_events').countDocuments()) === 1);
  await rejects('resubmit with stale rev', () => submitTechnologyForReview(client, { userId, organizationIds: [orgA] }, techId, 0, 'corr-2'));
  await rejects('other tenant cannot submit', () => submitTechnologyForReview(client, { userId, organizationIds: [orgB] }, techId, 1, 'corr-3'));
  ok('failed attempts left no partial writes', (await db.collection('review_cases').countDocuments()) === 1 && (await db.collection('outbox_events').countDocuments()) === 1);
  const role = await client.db('admin').command({ rolesInfo: 'texApp', showPrivileges: true });
  const auditPriv = role.roles[0].privileges.find((p) => p.resource.db === 'tex_audit');
  ok('texApp role: audit insert-only', JSON.stringify(auditPriv.actions.sort()) === '["find","insert"]');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await client.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
