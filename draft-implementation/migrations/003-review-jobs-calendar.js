// migrations/003-review-jobs-calendar.js — release migration for the designs in 06 §6.7–§6.10:
// - review_cases: maker-checker status `awaiting_check`, decision values, SLA pause fields;
// - jobs: leased background jobs; calendar_days / calendar_years: the working-day calendar;
// - outbox_events: `expireAt` (retention after relay); technology_offers: `reservation`, `closureReason`;
// - the reserved system user that the worker acts as.
// Expand-only: existing documents stay valid. Indexes (including the TTL indexes) come from the schemas.

const STR = { bsonType: 'string' };
const OID = { bsonType: 'objectId' };
const DATE = { bsonType: 'date' };
const INT = { bsonType: 'int' };
const BOOL = { bsonType: 'bool' };
const enumOf = (...values) => ({ bsonType: 'string', enum: values });
const nullable = (schema) => ({ ...schema, bsonType: [schema.bsonType, 'null'] });

const SYSTEM_USER_ID = '000000000000000000000001';   // src/core/actor.ts

/** Adds optional properties to an existing $jsonSchema validator (plain or inside $and). */
async function addProperties(db, name, properties) {
  const validator = (await db.listCollections({ name }).next()).options.validator;
  const schema = validator.$jsonSchema || validator.$and.find((part) => part.$jsonSchema).$jsonSchema;
  Object.assign(schema.properties, properties);
  await db.command({ collMod: name, validator });
}

async function setValidator(db, name, jsonSchema) {
  const validator = { $jsonSchema: jsonSchema };
  const exists = await db.listCollections({ name }).hasNext();
  if (exists) await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
  else await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
}

module.exports = {
  async up(db) {
    await setValidator(db, 'review_cases', {
      bsonType: 'object',
      required: ['ref', 'caseType', 'resource', 'status', 'priority', 'createdAt'],
      properties: {
        ref: { bsonType: 'string', pattern: '^CASE-[0-9]{6,}$' },
        caseType: enumOf('organization_verification', 'technology_review', 'ip_verification', 'demand_review', 'introduction_review', 'dispute'),
        resource: { bsonType: 'object', required: ['type', 'id'], properties: { type: STR, id: OID, version: INT } },
        status: enumOf('open', 'assigned', 'in_review', 'waiting_for_submitter', 'awaiting_check', 'approved', 'rejected', 'escalated', 'closed'),
        priority: enumOf('low', 'normal', 'high', 'urgent'),
        assignedTo: OID,
        decision: enumOf('approve', 'reject', 'request_changes', 'withdrawn', 'superseded'),
        decisionReason: STR,
        checkRequired: BOOL,
        proposedDecision: enumOf('approve', 'reject'),
        proposedBy: OID,
        checkedBy: OID,
        previousCaseId: OID,
        dueAt: nullable(DATE),
        pausedAt: nullable(DATE),
        pausedWorkingDays: { bsonType: 'int', minimum: 0 },
        createdAt: DATE,
        closedAt: DATE,
      },
    });

    await setValidator(db, 'jobs', {
      bsonType: 'object',
      required: ['type', 'key', 'payload', 'status', 'priority', 'runAt', 'attempts', 'maxAttempts', 'createdAt'],
      properties: {
        type: STR,
        key: STR,
        payload: { bsonType: 'object' },
        status: enumOf('queued', 'running', 'succeeded', 'dead'),
        priority: INT,
        runAt: DATE,
        attempts: { bsonType: 'int', minimum: 0 },
        maxAttempts: { bsonType: 'int', minimum: 1 },
        leaseToken: STR,
        lockedUntil: DATE,
        lastError: STR,
        finishedAt: DATE,
        expireAt: DATE,
      },
    });

    await setValidator(db, 'calendar_days', {
      bsonType: 'object',
      required: ['_id', 'year', 'kind', 'createdBy', 'createdAt'],
      properties: {
        _id: { bsonType: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' },
        year: { bsonType: 'int', minimum: 2000, maximum: 2100 },
        kind: enumOf('holiday', 'makeup_workday'),
        createdBy: OID,
        createdAt: DATE,
      },
    });

    await setValidator(db, 'calendar_years', {
      bsonType: 'object',
      required: ['_id', 'status', 'source', 'preparedBy', 'createdAt', 'updatedAt', 'rev'],
      properties: {
        _id: { bsonType: 'int', minimum: 2000, maximum: 2100 },
        status: enumOf('draft', 'published'),
        source: STR,
        preparedBy: OID,
        checkedBy: OID,
        publishedAt: DATE,
      },
    });
    // A year may only be published by a second administrator (also enforced in calendar.model.ts).
    await db.command({
      collMod: 'calendar_years',
      validator: {
        $and: [
          (await db.listCollections({ name: 'calendar_years' }).next()).options.validator,
          { $expr: { $or: [{ $ne: ['$status', 'published'] }, { $and: [{ $gt: ['$checkedBy', null] }, { $ne: ['$checkedBy', '$preparedBy'] }] }] } },
        ],
      },
    });

    // outbox_events: the retention timestamp set by the relay. technology_offers: reservation and closure (06 §6.6).
    await addProperties(db, 'outbox_events', { expireAt: DATE });
    await addProperties(db, 'technology_offers', {
      reservation: {
        bsonType: 'object',
        required: ['reason'],
        properties: { reason: enumOf('exclusive_talks', 'venue_listing'), until: DATE, dealId: OID },
      },
      closureReason: enumOf('deal_completed', 'withdrawn', 'technology_archived', 'replaced'),
    });

    // The worker's identity for transition records (src/core/actor.ts SYSTEM_USER_ID).
    const now = new Date();
    const { ObjectId } = require('mongodb');
    await db.collection('users').updateOne(
      { _id: new ObjectId(SYSTEM_USER_ID) },
      { $setOnInsert: { displayName: '系统 (system)', status: 'active', createdAt: now, updatedAt: now, rev: 0 } },
      { upsert: true },
    );
  },

  async down() {
    // Forward-only, like 001 and 002.
  },
};
