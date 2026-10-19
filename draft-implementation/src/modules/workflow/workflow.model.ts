// src/modules/workflow/workflow.model.ts — review cases, state-transition history, the transactional
// outbox and human-readable reference counters.
import { ClientSession, Document, Model, Schema, Types, model } from 'mongoose';
import { appendOnlyPlugin } from '../../core/db/immutability.plugins';
import { entityOptions, enumOf, int, recordOptions, ref, refPattern } from '../../core/db/schema-helpers';

// ---------- review_cases ----------
export const CASE_TYPES = ['organization_verification', 'technology_review', 'ip_verification', 'demand_review', 'introduction_review', 'dispute'] as const;
export const CASE_STATUSES = [
  'open', 'assigned', 'in_review', 'waiting_for_submitter', 'awaiting_check', 'approved', 'rejected', 'escalated', 'closed',
] as const;
export type CaseStatus = typeof CASE_STATUSES[number];
// How a case ended (06 §6.7): approved and rejected are decisions on the resource; the others close the case.
export const CASE_DECISIONS = ['approve', 'reject', 'request_changes', 'withdrawn', 'superseded'] as const;

export interface ResourceRef { type: string; id: Types.ObjectId; version?: number }

export interface ReviewCaseDoc extends Document {
  _id: Types.ObjectId;
  ref: string;
  caseType: typeof CASE_TYPES[number];
  resource: ResourceRef;                           // the exact version under review
  status: CaseStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: Types.ObjectId;
  decision?: typeof CASE_DECISIONS[number];
  decisionReason?: string;
  checkRequired: boolean;                          // maker-checker case type (FR-ADM-02)
  proposedDecision?: 'approve' | 'reject';         // the maker's decision, waiting for the checker
  proposedBy?: Types.ObjectId;
  checkedBy?: Types.ObjectId;
  previousCaseId?: Types.ObjectId;                 // the case of the previous submission round
  dueAt?: Date | null;                             // null: the calendar year is not published yet (06 §6.10)
  pausedAt?: Date | null;                          // waiting for the submitter: the SLA clock stops
  pausedWorkingDays: number;
  closedAt?: Date;
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const resourceRef = (withVersion: boolean) => new Schema<ResourceRef>({
  type: { type: String, required: true },
  id: { type: Schema.Types.ObjectId, required: true },
  ...(withVersion ? { version: int({ min: 1 }) } : {}),
}, { _id: false, strict: 'throw' });

const ReviewCaseSchema = new Schema<ReviewCaseDoc>({
  ref: { type: String, required: true, immutable: true, match: refPattern('CASE') },
  caseType: enumOf(CASE_TYPES, { required: true }),
  resource: { type: resourceRef(true), required: true },
  status: enumOf(CASE_STATUSES, { required: true, default: 'open' }),
  priority: enumOf(['low', 'normal', 'high', 'urgent'] as const, { required: true, default: 'normal' }),
  assignedTo: ref('User'),
  decision: enumOf(CASE_DECISIONS),
  decisionReason: String,
  checkRequired: { type: Boolean, required: true, default: false },
  proposedDecision: enumOf(['approve', 'reject'] as const),
  proposedBy: ref('User'),
  checkedBy: ref('User'),
  previousCaseId: ref('ReviewCase'),
  dueAt: Date,
  pausedAt: Date,
  pausedWorkingDays: int({ required: true, default: 0, min: 0 }),
  closedAt: Date,
}, entityOptions('review_cases'));

ReviewCaseSchema.index({ ref: 1 }, { unique: true });
ReviewCaseSchema.index({ status: 1, priority: 1, dueAt: 1 });
ReviewCaseSchema.index({ assignedTo: 1, status: 1 });
ReviewCaseSchema.index({ 'resource.type': 1, 'resource.id': 1 });

export const ReviewCase = model<ReviewCaseDoc>('ReviewCase', ReviewCaseSchema);

// ---------- workflow_transitions: every state change, append-only ----------
export interface WorkflowTransitionDoc extends Document {
  _id: Types.ObjectId;
  resource: ResourceRef;
  fromStatus: string;
  toStatus: string;
  action: string;
  actorUserId: Types.ObjectId;
  reason?: string;
  correlationId: string;
  occurredAt: Date;
}

const WorkflowTransitionSchema = new Schema<WorkflowTransitionDoc>({
  resource: { type: resourceRef(false), required: true },
  fromStatus: { type: String, required: true },
  toStatus: { type: String, required: true },
  action: { type: String, required: true },
  actorUserId: ref('User', { required: true }),
  reason: String,
  correlationId: { type: String, required: true },
}, recordOptions('workflow_transitions', 'occurredAt'));

WorkflowTransitionSchema.index({ 'resource.type': 1, 'resource.id': 1, occurredAt: 1 });
WorkflowTransitionSchema.plugin(appendOnlyPlugin);

export const WorkflowTransition = model<WorkflowTransitionDoc>('WorkflowTransition', WorkflowTransitionSchema);

// ---------- outbox_events: written in the business transaction, relayed by the worker after commit ----------
export interface OutboxEventDoc extends Document {
  _id: Types.ObjectId;
  eventType: string;                               // e.g. technology.submitted
  aggregate: { type: string; id: Types.ObjectId };
  payload: Record<string, unknown>;
  status: 'pending' | 'published' | 'failed';
  attempts: number;
  lockedUntil?: Date;
  lastError?: string;
  createdAt: Date;
  publishedAt?: Date;
  expireAt?: Date;                                 // set when relayed; the TTL index removes the event later
}

const OutboxEventSchema = new Schema<OutboxEventDoc>({
  eventType: { type: String, required: true },
  aggregate: { type: resourceRef(false), required: true },
  payload: { type: Schema.Types.Mixed, required: true, default: () => ({}) },
  status: enumOf(['pending', 'published', 'failed'] as const, { required: true, default: 'pending' }),
  attempts: int({ required: true, default: 0 }),
  lockedUntil: Date,
  lastError: String,
  publishedAt: Date,
  expireAt: Date,
}, { ...recordOptions('outbox_events'), minimize: false });   // keep `payload: {}` (required by the validator)

OutboxEventSchema.index({ createdAt: 1 }, { partialFilterExpression: { status: 'pending' } });
OutboxEventSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const OutboxEvent = model<OutboxEventDoc>('OutboxEvent', OutboxEventSchema);

// ---------- counters: atomic sequences for references such as TEC-000123 ----------
export interface CounterDoc extends Document { _id: string; seq: number }
export interface CounterModel extends Model<CounterDoc> {
  /** Next human-readable reference, e.g. nextRef('CASE', session) -> 'CASE-000042'. */
  nextRef(prefix: string, session?: ClientSession): Promise<string>;
}

const CounterSchema = new Schema<CounterDoc, CounterModel>({
  _id: { type: String, required: true },
  seq: int({ required: true, default: 0 }),
}, { collection: 'counters', versionKey: false, strict: 'throw' });

CounterSchema.statics.nextRef = async function (this: CounterModel, prefix: string, session?: ClientSession) {
  const counter = await this.findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session },          // Mongoose returns the document (driver 3 returns { value })
  );
  return `${prefix}-${String(counter!.seq).padStart(6, '0')}`;
};

export const Counter = model<CounterDoc, CounterModel>('Counter', CounterSchema);
