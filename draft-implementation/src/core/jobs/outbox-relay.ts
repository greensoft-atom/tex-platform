// src/core/jobs/outbox-relay.ts — turns committed outbox events into one job per subscribed handler (06 §6.9).
// Fan-out keeps retries independent: a failing SMS does not re-run search indexing. The relay needs no
// transaction: if it dies after creating some jobs, the event's lease expires, the event is relayed again and
// enqueueJob() ignores the keys that already exist.
import { OutboxEvent, OutboxEventDoc } from '../../modules/workflow/workflow.model';
import { enqueueJob } from './job-queue';

/** eventType → handler (job type) names. '*' subscribes a handler to every event (e.g. a webhook relay). */
export type Subscriptions = Record<string, string[]>;

export const OUTBOX_RETENTION_MS = 30 * 24 * 3600 * 1000;
const MAX_RELAY_ATTEMPTS = 10;

export async function relayOutbox(
  subscriptions: Subscriptions, options: { leaseMs?: number; max?: number } = {},
): Promise<{ relayed: number; jobs: number; failed: number }> {
  const leaseMs = options.leaseMs || 60 * 1000;
  const stats = { relayed: 0, jobs: 0, failed: 0 };
  for (let i = 0; i < (options.max || 1000); i++) {
    const now = new Date();
    const event: OutboxEventDoc | null = await OutboxEvent.findOneAndUpdate(
      { status: 'pending', $or: [{ lockedUntil: { $exists: false } }, { lockedUntil: { $lt: now } }] },   // the relay $unsets locks
      { $set: { lockedUntil: new Date(now.getTime() + leaseMs) }, $inc: { attempts: 1 } },
      { new: true, sort: { createdAt: 1 } },
    ).exec();
    if (!event) break;
    try {
      const handlers = (subscriptions[event.eventType] || []).concat(subscriptions['*'] || []);
      for (const handler of handlers) {
        const created = await enqueueJob({
          type: handler,
          key: `${String(event._id)}:${handler}`,
          payload: { eventId: event._id, eventType: event.eventType, aggregate: event.aggregate, ...event.payload },
        });
        if (created) stats.jobs++;
      }
      await OutboxEvent.updateOne(
        { _id: event._id },
        { $set: { status: 'published', publishedAt: new Date(), expireAt: new Date(Date.now() + OUTBOX_RETENTION_MS) }, $unset: { lockedUntil: 1 } },
      );
      stats.relayed++;
    } catch (e) {
      const err = e as Error;
      const failed = event.attempts >= MAX_RELAY_ATTEMPTS;
      await OutboxEvent.updateOne(
        { _id: event._id },
        { $set: { lastError: `${err.name}: ${err.message}`.slice(0, 1000), ...(failed ? { status: 'failed' } : {}) } },
      );
      if (failed) stats.failed++;
    }
  }
  return stats;
}
