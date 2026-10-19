// src/core/jobs/job.model.ts — leased background jobs in MongoDB (06 §6.9). No Redis: the worker leases a
// job with one atomic findOneAndUpdate, renews the lease while it works, and finishes only if it still holds it.
import { Document, Schema, Types, model } from 'mongoose';
import { enumOf, int } from '../db/schema-helpers';

export const JOB_STATUSES = ['queued', 'running', 'succeeded', 'dead'] as const;
export type JobStatus = typeof JOB_STATUSES[number];

export interface JobDoc extends Document {
  _id: Types.ObjectId;
  type: string;                                    // handler name, e.g. technology.publish
  key: string;                                     // idempotency key: one job per key, ever (e.g. `<eventId>:<handler>`)
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;                                // higher runs first
  runAt: Date;                                     // not before this time (scheduling and retry backoff)
  attempts: number;                                // leases taken so far
  maxAttempts: number;
  leaseToken?: string;                             // who holds the lease; changes with every lease
  lockedUntil?: Date;                              // lease expiry; an expired running job can be taken over
  lastError?: string;
  progress?: { done: number; total: number };      // bulk operations (FR-ADM-06)
  result?: Record<string, unknown>;
  finishedAt?: Date;
  expireAt?: Date;                                 // set when the job succeeds; the TTL index removes it later
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<JobDoc>({
  type: { type: String, required: true },
  key: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true, default: () => ({}) },
  status: enumOf(JOB_STATUSES, { required: true, default: 'queued' }),
  priority: int({ required: true, default: 0 }),
  runAt: { type: Date, required: true, default: () => new Date() },
  attempts: int({ required: true, default: 0, min: 0 }),
  maxAttempts: int({ required: true, default: 8, min: 1 }),
  leaseToken: String,
  lockedUntil: Date,
  lastError: String,
  progress: { done: int({ min: 0 }), total: int({ min: 0 }) },
  result: Schema.Types.Mixed,
  finishedAt: Date,
  expireAt: Date,
}, { collection: 'jobs', timestamps: true, versionKey: false, strict: 'throw', minimize: false });

JobSchema.index({ key: 1 }, { unique: true });
JobSchema.index({ status: 1, runAt: 1 });                  // due queued jobs
JobSchema.index({ status: 1, lockedUntil: 1 });            // expired leases
JobSchema.index({ type: 1, status: 1 });                   // dashboard: backlog and dead jobs per type
JobSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const Job = model<JobDoc>('Job', JobSchema);
