// src/modules/technology/submit-technology.service.ts
// Target runtime: Node.js 12.x, MongoDB Node driver 3.7.x, MongoDB server 4.4 / 5.0 replica set.
// Compiled by TypeScript to ES2019 / CommonJS (no optional chaining or ?? reaches Node 12).
import { MongoClient, ObjectId, ClientSession } from 'mongodb';

export class InvalidTransitionError extends Error {}

export interface Actor { userId: ObjectId; organizationIds: ObjectId[] }

export async function submitTechnologyForReview(
  client: MongoClient,
  actor: Actor,
  technologyId: ObjectId,
  expectedRev: number,                 // from the If-Match header / request body
  correlationId: string,
): Promise<{ reviewCaseRef: string }> {
  const db = client.db('tex');
  const auditDb = client.db('tex_audit');
  const session: ClientSession = client.startSession();
  // Driver 3.x: withTransaction() resolves to the commit result, NOT the callback's value,
  // so the outcome is captured in a closure variable.
  let reviewCaseRef = '';
  try {
    await session.withTransaction(async () => {
      const now = new Date();

      // 1. Tenant scope + allowed state + optimistic concurrency in ONE filter.
      const res = await db.collection('technologies').findOneAndUpdate(
        {
          _id: technologyId,
          ownerOrganizationId: { $in: actor.organizationIds },  // never query tenant data without scope
          lifecycleStatus: { $in: ['draft', 'changes_requested'] },
          rev: expectedRev,
        },
        { $set: { lifecycleStatus: 'submitted', updatedAt: now }, $inc: { rev: 1 } },
        { session, returnOriginal: false },                        // driver 3.x option name
      );
      const tech = res.value;
      if (!tech) {
        // Same error for "not yours" and "not found": do not reveal other tenants' data.
        throw new InvalidTransitionError('Technology not found, not submittable, or changed since read');
      }

      // 2. Freeze the submitted version (immutable from now on).
      await db.collection('technology_versions').updateOne(
        { technologyId, version: tech.currentVersion },
        { $set: { frozen: true } },
        { session },
      );

      // 3. Human-readable case reference from an atomic counter.
      const counter = await db.collection('counters').findOneAndUpdate(
        { _id: 'review_case' },
        { $inc: { seq: 1 } },
        { session, upsert: true, returnOriginal: false },
      );
      reviewCaseRef = 'CASE-' + String(counter.value.seq).padStart(6, '0');

      // 4. Review case, transition record, outbox event and audit event in the same transaction.
      await db.collection('review_cases').insertOne({
        ref: reviewCaseRef,
        caseType: 'technology_review',
        resource: { type: 'technology', id: technologyId, version: tech.currentVersion },
        status: 'open',
        priority: 'normal',
        createdAt: now,
        dueAt: new Date(now.getTime() + 5 * 24 * 3600 * 1000),   // SLA: first review within 5 days
      }, { session });
      await db.collection('workflow_transitions').insertOne({
        resource: { type: 'technology', id: technologyId },
        fromStatus: 'draft', toStatus: 'submitted', action: 'submit',
        actorUserId: actor.userId, correlationId, occurredAt: now,
      }, { session });
      await db.collection('outbox_events').insertOne({
        eventType: 'technology.submitted',
        aggregate: { type: 'technology', id: technologyId },
        payload: { version: tech.currentVersion, reviewCaseRef },
        status: 'pending', attempts: 0, createdAt: now,
      }, { session });
      await auditDb.collection('audit_events').insertOne({
        actor: { type: 'user', userId: actor.userId },
        organizationId: tech.ownerOrganizationId,
        action: 'technology.submit',
        resource: { type: 'technology', id: technologyId },
        correlationId, occurredAt: now,
      }, { session });
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return { reviewCaseRef };
  } finally {
    session.endSession();
  }
}
