// src/core/jobs/job-queue.ts — enqueue, lease, renew, complete and fail jobs (06 §6.9).
// Every handler must be idempotent: a job can run more than once (a worker may die after the side effect
// and before it records success; its lease then expires and another worker runs the job again).
import { randomBytes } from 'crypto';
import { ClientSession, Types } from 'mongoose';
import { Job, JobDoc } from './job.model';

export interface EnqueueSpec {
  type: string;
  key: string;
  payload?: Record<string, unknown>;
  runAt?: Date;
  priority?: number;
  maxAttempts?: number;
}

/** A failure that retrying cannot fix (invalid payload, missing record, rule violation): the job dies at once. */
export class PermanentJobError extends Error {
  constructor(m: string) { super(m); this.name = 'PermanentJobError'; }
}

export const SUCCEEDED_RETENTION_MS = 30 * 24 * 3600 * 1000;   // succeeded jobs are kept 30 days, dead jobs until handled

/** Documents matched by an update: `n` with driver 3 (Mongoose 5), `matchedCount` with driver 4 (Mongoose 6). */
function matched(res: unknown): number {
  const r = res as { n?: number; matchedCount?: number };
  return r.matchedCount != null ? r.matchedCount : (r.n || 0);
}

/**
 * Idempotent enqueue: one job per key. Can run inside a business transaction (pass the session), so
 * scheduling a job commits or rolls back with the change that caused it. Returns false if the key existed.
 */
export async function enqueueJob(spec: EnqueueSpec, session?: ClientSession): Promise<boolean> {
  const now = new Date();
  const res = await Job.updateOne(
    { key: spec.key },
    {
      $setOnInsert: {
        type: spec.type, key: spec.key, payload: spec.payload || {}, status: 'queued',
        priority: spec.priority || 0, runAt: spec.runAt || now, attempts: 0, maxAttempts: spec.maxAttempts || 8,
      },
    },
    { upsert: true, session },
  );
  const raw = res as unknown as { upserted?: unknown[]; upsertedCount?: number };
  return Boolean((raw.upserted && raw.upserted.length) || raw.upsertedCount);
}

/**
 * Leases the next due job: a queued job whose runAt has passed, or a running job whose lease expired
 * (its worker died). One atomic findOneAndUpdate, so two workers can never hold the same lease.
 * Taking over an expired lease counts as a new attempt.
 */
export function leaseJob(options: { leaseMs: number; types?: string[]; now?: Date }): Promise<JobDoc | null> {
  const now = options.now || new Date();
  const filter: Record<string, unknown> = {
    $or: [{ status: 'queued', runAt: { $lte: now } }, { status: 'running', lockedUntil: { $lt: now } }],
  };
  if (options.types) filter.type = { $in: options.types };
  return Job.findOneAndUpdate(
    filter,
    {
      $set: { status: 'running', leaseToken: randomBytes(12).toString('hex'), lockedUntil: new Date(now.getTime() + options.leaseMs) },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { priority: -1, runAt: 1 } },
  ).exec();
}

/** Renews the lease of a long job. False means the lease was lost: stop working and discard the result. */
export async function renewLease(job: JobDoc, leaseMs: number): Promise<boolean> {
  const res = await Job.updateOne(
    { _id: job._id, status: 'running', leaseToken: job.leaseToken },
    { $set: { lockedUntil: new Date(Date.now() + leaseMs) } },
  );
  return matched(res) === 1;
}

/** Records success, but only while the lease is still held. */
export async function completeJob(job: JobDoc, result?: Record<string, unknown>): Promise<boolean> {
  const now = new Date();
  const res = await Job.updateOne(
    { _id: job._id, status: 'running', leaseToken: job.leaseToken },
    {
      $set: { status: 'succeeded', finishedAt: now, expireAt: new Date(now.getTime() + SUCCEEDED_RETENTION_MS), ...(result ? { result } : {}) },
      $unset: { leaseToken: 1, lockedUntil: 1 },
    },
  );
  return matched(res) === 1;
}

/** Exponential backoff: 30 s, 1 min, 2 min … capped at 1 h, plus up to 10% jitter so retries spread out. */
export function backoffMs(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(30 * 1000 * Math.pow(2, Math.max(attempt - 1, 0)), 3600 * 1000);
  return Math.round(base * (1 + 0.1 * random()));
}

/**
 * Records a failure while the lease is held: back to `queued` with backoff, or `dead` (the dead-letter
 * state) after the last attempt or on a PermanentJobError. Dead jobs stay until an operator retries or
 * discards them (06 §6.9); the operations dashboard alerts on them.
 */
export async function failJob(job: JobDoc, error: Error, now = new Date()): Promise<'retry' | 'dead' | 'lease_lost'> {
  const message = `${error.name}: ${error.message}`.slice(0, 1000);
  const dead = error instanceof PermanentJobError || job.attempts >= job.maxAttempts;
  const update = dead
    ? { $set: { status: 'dead', lastError: message, finishedAt: now }, $unset: { leaseToken: 1, lockedUntil: 1 } }
    : { $set: { status: 'queued', lastError: message, runAt: new Date(now.getTime() + backoffMs(job.attempts)) }, $unset: { leaseToken: 1, lockedUntil: 1 } };
  const res = await Job.updateOne({ _id: job._id, status: 'running', leaseToken: job.leaseToken }, update);
  if (matched(res) !== 1) return 'lease_lost';
  return dead ? 'dead' : 'retry';
}

/** Operator action on a dead job (audited by the caller): run it again from attempt 0. */
export async function retryDeadJob(jobId: Types.ObjectId): Promise<boolean> {
  const res = await Job.updateOne(
    { _id: jobId, status: 'dead' },
    { $set: { status: 'queued', attempts: 0, runAt: new Date() }, $unset: { finishedAt: 1 } },
  );
  return matched(res) === 1;
}

export type JobHandler = (job: JobDoc) => Promise<Record<string, unknown> | void>;

/**
 * Runs due jobs until none is left (the worker calls this in a loop with a short sleep; tests call it
 * directly). The lease is renewed every third of its length while a handler runs.
 */
export async function runDueJobs(
  handlers: Record<string, JobHandler>, options: { leaseMs?: number; max?: number } = {},
): Promise<{ succeeded: number; retried: number; dead: number }> {
  const leaseMs = options.leaseMs || 5 * 60 * 1000;
  const stats = { succeeded: 0, retried: 0, dead: 0 };
  for (let i = 0; i < (options.max || 1000); i++) {
    const job = await leaseJob({ leaseMs, types: Object.keys(handlers) });
    if (!job) break;
    if (job.attempts > job.maxAttempts) {          // its lease expired too often: a crash loop, not a slow job
      await failJob(job, new PermanentJobError('lease expired more often than maxAttempts'));
      stats.dead++;
      continue;
    }
    const timer = setInterval(() => { renewLease(job, leaseMs).catch(() => undefined); }, Math.max(leaseMs / 3, 1000));
    try {
      const result = await handlers[job.type](job);
      if (await completeJob(job, result || undefined)) stats.succeeded++;
    } catch (e) {
      const outcome = await failJob(job, e as Error);
      if (outcome === 'dead') stats.dead++; else if (outcome === 'retry') stats.retried++;
    } finally {
      clearInterval(timer);
    }
  }
  return stats;
}
