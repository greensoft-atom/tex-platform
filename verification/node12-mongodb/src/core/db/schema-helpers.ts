// src/core/db/schema-helpers.ts — field types and options shared by every Mongoose schema.
import { Document, Schema, SchemaOptions } from 'mongoose';
import type { Long } from 'mongodb';
import './mongoose-settings';                    // global settings first: they apply when models compile
import { Int64 } from './int64.schema-type';

export { Int64 };
export type { Long };

/** Bilingual text: Chinese required, English optional (machine translations are reviewed). */
export interface I18nText { zh: string; en?: string }
export const i18nText = new Schema<I18nText>({
  zh: { type: String, required: true, trim: true },
  en: { type: String, trim: true },
}, { _id: false, strict: 'throw' });

/** Money in minor units (fen for CNY) stored as BSON Int64. Never floating point. */
export interface Money { currency: string; amountMinor: Long }
export const money = new Schema<Money>({
  currency: { type: String, required: true, match: /^[A-Z]{3}$/, default: 'CNY' },
  amountMinor: { type: Int64, required: true },
}, { _id: false, strict: 'throw' });

/** Integer stored as BSON int (JS numbers that are integers within 32 bits are serialized as int). */
export function int(extra: Record<string, unknown> = {}) {
  return {
    type: Number,
    validate: { validator: (v: unknown) => v == null || Number.isInteger(v), message: '{PATH} must be an integer' },
    ...extra,
  };
}

export function enumOf<T extends readonly string[]>(values: T, extra: Record<string, unknown> = {}) {
  return { type: String, enum: values as unknown as string[], ...extra };
}

export function ref(model: string, extra: Record<string, unknown> = {}) {
  return { type: Schema.Types.ObjectId, ref: model, ...extra };
}

export const refPattern = (prefix: string) => new RegExp(`^${prefix}-[0-9]{6,}$`);

/**
 * Cross-field validator that needs the whole document. In update validators (runValidators on
 * updateOne / findOneAndUpdate) `this` is not the document, so the rule is skipped there and the
 * database $expr validator enforces it instead.
 */
export function crossField<T>(rule: (doc: T, value: any) => boolean, message: string) {   // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    validator(this: unknown, value: unknown) { return this instanceof Document ? rule(this as unknown as T, value) : true; },
    message,
  };
}

/**
 * Mutable business entities: createdAt/updatedAt, `rev` as the version key with optimistic concurrency
 * (every save() checks and increments it), unknown fields rejected instead of silently dropped.
 */
export function entityOptions(collection: string): SchemaOptions {
  return { collection, timestamps: true, versionKey: 'rev', optimisticConcurrency: true, strict: 'throw' };
}

/** Records that are written once (versions, matches, events): createdAt only, no version key. */
export function recordOptions(collection: string, createdAt = 'createdAt'): SchemaOptions {
  return { collection, timestamps: { createdAt, updatedAt: false }, versionKey: false, strict: 'throw' };
}
