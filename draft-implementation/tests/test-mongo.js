// Mongoose schemas, database validators, indexes, immutability, concurrency and transactions.
// Runs on Node 12.4.0 with mongoose@5.13.23 (driver 3.7.4) against a MongoDB 4.4 / 5.0 replica set,
// after `migrate-mongo up` and `sync-indexes` (see run.sh).
'use strict';
const mongoose = require('mongoose');
const { ok, rejects, is, connect, clearAll, run } = require('./helpers');
const M = require('../dist/models');
const { syncIndexes } = require('../dist/scripts/sync-indexes');
const { inTransaction } = require('../dist/core/db/transaction');
const fs = require('fs');
const path = require('path');
const migrationsDir = path.join(__dirname, '..', 'migrations');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.js')).sort().map((f) => require(path.join(migrationsDir, f)));

const { ObjectId } = mongoose.Types;
const { Long } = mongoose.mongo;

run(async () => {
  const conn = await connect();
  const client = conn.getClient();
  await clearAll();

  // ---------- Schema control ----------
  for (const m of migrations) await m.up(conn.db, client);       // all of them, in order: later ones refine earlier validators
  ok('migrations re-run safely (' + migrations.length + ' files: validators, roles, system user)', migrations.length >= 3);
  ok('migration 003: the worker\'s system user exists', !!(await M.User.findById(require('../dist/core/actor').SYSTEM_USER_ID).lean()));
  const drift = (await syncIndexes(true)).filter((r) => r.toCreate.length || r.toDrop.length);
  ok('indexes of all ' + M.allModels.length + ' models match their schemas', drift.length === 0, JSON.stringify(drift));
  const ttl = (await M.IdempotencyKey.listIndexes()).find((i) => i.name === 'expiresAt_1');
  ok('TTL index on idempotency_keys.expiresAt', !!ttl && ttl.expireAfterSeconds === 0);

  const userId = new ObjectId(); const orgA = new ObjectId(); const orgB = new ObjectId();
  const created = [];
  const save = async (doc) => { await doc.save(); created.push(doc.constructor.modelName); return doc; };

  // ---------- Mongoose validation: rejected before anything is sent ----------
  await save(new M.User({ displayName: 'Li Wei', status: 'active', phoneE164: '+8613800000000' }));
  await rejects('user: phone not in E.164', () => new M.User({ displayName: 'X', phoneE164: '13800000000' }).save(), is.validation);
  await save(new M.Organization({ _id: orgA, ref: 'ORG-000001', legalName: '某某大学', displayName: '某某大学', organizationType: 'university', jurisdictionCode: 'CN', registrationNumber: '12100000400000624D', verification: { status: 'verified', level: 2 } }));
  await save(new M.Organization({ _id: orgB, ref: 'ORG-000002', legalName: '某某科技有限公司', displayName: '某某科技', organizationType: 'company', jurisdictionCode: 'CN' }));

  const tech = await save(new M.Technology({ ref: 'TEC-000001', ownerOrganizationId: orgA, technologyType: 'process', createdBy: userId }));
  ok('defaults applied (status draft, private, version 1, rev 0)', tech.lifecycleStatus === 'draft' && tech.visibility === 'private' && tech.currentVersion === 1 && tech.rev === 0);
  await save(new M.TechnologyVersion({ technologyId: tech._id, version: 1, title: { zh: '光学检测技术', en: 'Optical inspection' }, claimedTrl: 6, industryCodes: ['C384'], createdBy: userId }));
  await rejects('version: TRL 10', () => new M.TechnologyVersion({ technologyId: tech._id, version: 2, title: { zh: 'x' }, claimedTrl: 10, createdBy: userId }).save(), is.validation);
  await rejects('version: title without Chinese', () => new M.TechnologyVersion({ technologyId: tech._id, version: 3, title: { en: 'x' }, createdBy: userId }).save(), is.validation);
  await rejects('technology: unknown lifecycle status', () => new M.Technology({ ref: 'TEC-000002', ownerOrganizationId: orgA, technologyType: 'p', lifecycleStatus: 'live', createdBy: userId }).save(), is.validation);
  await rejects('technology: unknown field (strict: throw)', async () => new M.Technology({ ref: 'TEC-000003', ownerOrganizationId: orgA, technologyType: 'p', createdBy: userId, colour: 'red' }), is.strict);
  await rejects('query: unknown filter path (strictQuery: throw)', () => M.Organization.findOne({ registrationNo: 'x' }), is.strict);
  await rejects('query update validated against the schema (runValidators)', () => M.Technology.updateOne({ _id: tech._id }, { $set: { lifecycleStatus: 'live' } }).setOptions({ tenant: { organizationIds: [orgA] } }), is.validation);

  const offer = { technologyId: tech._id, technologyVersion: 1, supplierOrganizationId: orgA, transactionType: 'license', exclusivity: 'non_exclusive', createdBy: userId };
  await save(new M.TechnologyOffer(Object.assign({ ref: 'OFR-000001', price: { type: 'indicative', indicative: { currency: 'CNY', amountMinor: '300000000000' } }, validFrom: new Date('2026-01-01'), validUntil: new Date('2027-01-01') }, offer)));
  await rejects('offer: validUntil before validFrom', () => new M.TechnologyOffer(Object.assign({ ref: 'OFR-000002', price: { type: 'negotiable' }, validFrom: new Date('2027-01-01'), validUntil: new Date('2026-01-01') }, offer)).save(), is.validation);
  await rejects('offer: money with a fraction of a fen', () => new M.TechnologyOffer(Object.assign({ ref: 'OFR-000003', price: { type: 'fixed', indicative: { currency: 'CNY', amountMinor: 300000.5 } } }, offer)).save(), is.validation);

  const demandId = new ObjectId();
  await save(new M.DemandVersion({ demandId, version: 1, title: { zh: '需求' }, problemStatement: { zh: '电极缺陷检测' }, budget: { minMinor: 100, maxMinor: 200 }, createdBy: userId }));
  await rejects('demand: budget min > max', () => new M.DemandVersion({ demandId, version: 2, title: { zh: '需求' }, problemStatement: { zh: '检测' }, budget: { minMinor: 300, maxMinor: 200 }, createdBy: userId }).save(), is.validation);
  await rejects('introduction: buyer = supplier', () => new M.IntroductionRequest({ ref: 'INT-000001', matchId: new ObjectId(), buyerOrganizationId: orgA, supplierOrganizationId: orgA, requestedBy: userId }).save(), is.validation);
  const deal = { dealType: 'ip_license', name: '电极缺陷检测技术 普通许可', parties: [{ organizationId: orgA, role: 'licensor' }, { organizationId: orgB, role: 'licensee' }], createdBy: userId };
  await rejects('deal: one party only', () => new M.Deal(Object.assign({}, deal, { ref: 'DEAL-000009', parties: [deal.parties[0]] })).save(), is.validation);

  // ---------- Unique indexes (concurrency-safe invariants) ----------
  await rejects('duplicate phone number', () => new M.User({ displayName: 'Y', phoneE164: '+8613800000000' }).save(), is.duplicate);
  await rejects('duplicate unified social credit code', () => new M.Organization({ ref: 'ORG-000003', legalName: 'U2', displayName: 'U2', organizationType: 'university', jurisdictionCode: 'CN', registrationNumber: '12100000400000624D' }).save(), is.duplicate);
  const match = { demandId, demandVersion: 1, offerId: new ObjectId(), technologyId: tech._id, technologyVersion: 1, retrievalMethod: 'full_text', rankingVersion: 'v1', score: 84.5, eligibilityStatus: 'eligible' };
  await save(new M.Match(match));
  await rejects('duplicate match for the same ranking version', () => new M.Match(match).save(), is.duplicate);
  const introId = new ObjectId();
  await save(new M.Deal(Object.assign({ ref: 'DEAL-000001', introductionRequestId: introId }, deal)));
  await rejects('second deal for the same introduction', () => new M.Deal(Object.assign({ ref: 'DEAL-000002', introductionRequestId: introId }, deal)).save(), is.duplicate);
  await save(new M.IdempotencyKey({ actorUserId: userId, key: 'k1', requestHash: 'a'.repeat(64), expiresAt: new Date(Date.now() + 86400000) }));
  await rejects('idempotency key reused', () => new M.IdempotencyKey({ actorUserId: userId, key: 'k1', requestHash: 'b'.repeat(64), expiresAt: new Date() }).save(), is.duplicate);

  // ---------- Database validators: the safety net for writes that bypass Mongoose ----------
  const now = new Date();
  await rejects('raw insert: unknown status (DB validator)', () => M.Technology.collection.insertOne({ ref: 'TEC-000009', ownerOrganizationId: orgA, technologyType: 'p', lifecycleStatus: 'live', visibility: 'private', currentVersion: 1, createdBy: userId, createdAt: now, updatedAt: now, rev: 0 }), is.dbValidator);
  await rejects('raw insert: money as double (DB validator)', () => M.TechnologyOffer.collection.insertOne(Object.assign({ ref: 'OFR-000009', offerStatus: 'draft', price: { type: 'fixed', indicative: { currency: 'CNY', amountMinor: 300000.5 } }, createdAt: now, updatedAt: now, rev: 0 }, offer)), is.dbValidator);
  await rejects('raw insert: buyer = supplier ($expr validator)', () => M.IntroductionRequest.collection.insertOne({ ref: 'INT-000009', matchId: new ObjectId(), buyerOrganizationId: orgA, supplierOrganizationId: orgA, requestedBy: userId, status: 'requested', createdAt: now, updatedAt: now, rev: 0 }), is.dbValidator);
  ok('every document saved through Mongoose passed the database validators (' + created.length + ' documents, ' + new Set(created).size + ' models)', created.length >= 10);

  // ---------- BSON types ----------
  const [types] = await M.TechnologyOffer.aggregate([{ $match: { ref: 'OFR-000001' } }, { $project: { amount: { $type: '$price.indicative.amountMinor' }, rev: { $type: '$rev' }, version: { $type: '$technologyVersion' } } }])
    .option({ tenant: { organizationIds: [orgA] } });
  ok('money stored as BSON long, counters as int', types.amount === 'long' && types.rev === 'int' && types.version === 'int', JSON.stringify(types));
  const offerDoc = await M.TechnologyOffer.findOne({ ref: 'OFR-000001' }).setOptions({ tenant: { organizationIds: [orgA] } });
  ok('RMB 3,000,000,000.00 round-trips exactly as Int64', offerDoc.price.indicative.amountMinor.toString() === '300000000000');
  ok('money serializes to JSON as a decimal string', JSON.parse(JSON.stringify(offerDoc)).price.indicative.amountMinor === '300000000000', JSON.stringify(offerDoc.toJSON().price));
  ok('Int64 query casting ($gte with a string)', (await M.TechnologyOffer.countDocuments({ 'price.indicative.amountMinor': { $gte: '299999999999' } }).setOptions({ tenant: { organizationIds: [orgA] } })) === 1);

  // ---------- Optimistic concurrency with the Document API ----------
  const a = await M.Organization.findById(orgB); const b = await M.Organization.findById(orgB);
  a.displayName = '某某科技（上海）'; await a.save();
  b.websiteUrl = 'https://example.cn';
  await rejects('stale document save() -> VersionError (409)', () => b.save(), is.version);
  ok('rev incremented on save()', a.rev === 1);

  // ---------- Immutability ----------
  const v1 = await M.TechnologyVersion.findOne({ technologyId: tech._id, version: 1 });
  v1.frozen = true; await v1.save();
  const frozen = await M.TechnologyVersion.findById(v1._id);
  frozen.title.zh = '改写';
  await rejects('frozen version: save() refused', () => frozen.save(), is.named('ImmutableRecordError'));
  const upd = await M.TechnologyVersion.updateOne({ _id: v1._id }, { $set: { claimedTrl: 7 } });
  ok('frozen version: query update matches nothing', upd.n === 0 && (await M.TechnologyVersion.findById(v1._id)).claimedTrl === 6);
  await M.TechnologyVersion.findOneAndReplace({ _id: v1._id }, { technologyId: tech._id, version: 1, title: { zh: '替换' }, createdBy: userId, frozen: true });
  ok('frozen version: findOneAndReplace matches nothing', (await M.TechnologyVersion.findById(v1._id)).title.zh !== '替换');
  const tr = await save(new M.WorkflowTransition({ resource: { type: 'technology', id: tech._id }, fromStatus: 'draft', toStatus: 'submitted', action: 'submit', actorUserId: userId, correlationId: 'c1' }));
  await rejects('transition history: updateOne refused', () => M.WorkflowTransition.updateOne({ _id: tr._id }, { $set: { action: 'x' } }), is.named('ImmutableRecordError'));
  await rejects('transition history: document deleteOne() refused', () => tr.deleteOne(), is.named('ImmutableRecordError'));
  await rejects('transition history: findOneAndReplace refused', () => M.WorkflowTransition.findOneAndReplace({ _id: tr._id }, { action: 'x' }), is.named('ImmutableRecordError'));
  const role = await conn.db.admin().command({ rolesInfo: 'texApp', showPrivileges: true });
  const auditPriv = role.roles[0].privileges.find((p) => p.resource.db === 'tex_audit');
  ok('texApp role: audit trail is insert-only in the database too', JSON.stringify(auditPriv.actions.sort()) === '["find","insert"]');

  // ---------- Transactions across collections and databases ----------
  await rejects('failed transaction rolls back every write', () => inTransaction(async (session) => {
    await new M.ReviewCase({ ref: 'CASE-999999', caseType: 'technology_review', resource: { type: 'technology', id: tech._id, version: 1 } }).save({ session });
    await new M.AuditEvent({ actor: { type: 'user', userId }, action: 'test.rollback', resource: { type: 'technology', id: tech._id } }).save({ session });
    throw new Error('simulated failure after writes');
  }), (e) => e.message === 'simulated failure after writes');
  ok('no partial writes in tex or tex_audit', (await M.ReviewCase.countDocuments({ ref: 'CASE-999999' })) === 0 && (await M.AuditEvent.countDocuments({ action: 'test.rollback' })) === 0);
  const result = await inTransaction(async (session) => {
    const ref = await M.Counter.nextRef('CASE', session);
    await new M.ReviewCase({ ref, caseType: 'technology_review', resource: { type: 'technology', id: tech._id, version: 1 } }).save({ session });
    await new M.AuditEvent({ actor: { type: 'user', userId }, action: 'test.commit', resource: { type: 'technology', id: tech._id } }).save({ session });
    return ref;
  });
  ok('committed transaction returns the callback result (' + result + ')', /^CASE-\d{6}$/.test(result) && (await M.AuditEvent.countDocuments({ action: 'test.commit' })) === 1);

  // ---------- Login sessions share the Mongoose connection (express-session + connect-mongo 3) ----------
  const session = require('express-session');
  const MongoStore = require('connect-mongo')(session);
  // autoRemove 'disabled': the app user cannot create indexes; migration 001 creates the TTL index on `expires`.
  const store = new MongoStore({ mongooseConnection: conn, collection: 'sessions', autoRemove: 'disabled', stringify: false });
  const call = (fn, ...args) => new Promise((resolve, reject) => fn.call(store, ...args, (e, d) => (e ? reject(e) : resolve(d))));
  await call(store.set, 'sid-test', { cookie: { maxAge: 3600000 }, userId: String(userId) });
  const stored = await call(store.get, 'sid-test');
  const sessionTtl = (await conn.db.collection('sessions').indexes()).find((i) => i.name === 'expires_1');
  ok('sessions stored through the Mongoose connection; TTL index from the migration', stored.userId === String(userId) && !!sessionTtl && sessionTtl.expireAfterSeconds === 0);
});
