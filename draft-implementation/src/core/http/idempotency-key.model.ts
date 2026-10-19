// src/core/http/idempotency-key.model.ts — stored results of retriable commands (Idempotency-Key header).
import { Document, Schema, Types, model } from 'mongoose';
import { int, recordOptions, ref } from '../db/schema-helpers';

export interface IdempotencyKeyDoc extends Document {
  _id: Types.ObjectId;
  actorUserId: Types.ObjectId;
  key: string;
  requestHash: string;                             // detects reuse of a key with a different payload
  responseCode?: number;
  responseBody?: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
}

const IdempotencyKeySchema = new Schema<IdempotencyKeyDoc>({
  actorUserId: ref('User', { required: true }),
  key: { type: String, required: true, maxlength: 100 },
  requestHash: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
  responseCode: int(),
  responseBody: Schema.Types.Mixed,
  expiresAt: { type: Date, required: true },
}, recordOptions('idempotency_keys'));

IdempotencyKeySchema.index({ actorUserId: 1, key: 1 }, { unique: true });
IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });   // TTL: MongoDB deletes expired keys

export const IdempotencyKey = model<IdempotencyKeyDoc>('IdempotencyKey', IdempotencyKeySchema);
