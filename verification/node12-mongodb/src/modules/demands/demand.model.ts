// src/modules/demands/demand.model.ts — buyer needs (需求) and their versions.
import { Document, Schema, Types, model } from 'mongoose';
import { freezablePlugin } from '../../core/db/immutability.plugins';
import { I18nText, Int64, Long, crossField, entityOptions, enumOf, i18nText, int, recordOptions, ref, refPattern } from '../../core/db/schema-helpers';
import { tenantScopePlugin } from '../../core/db/tenant-scope.plugin';

export const DEMAND_STATUSES = [
  'draft', 'submitted', 'clarification', 'approved', 'rejected', 'matching', 'shortlisted',
  'no_candidates', 'introduction', 'in_evaluation', 'negotiation', 'fulfilled', 'withdrawn', 'expired',
] as const;
export const DEMAND_VISIBILITIES = ['private', 'anonymous_public', 'verified_users', 'broker_only'] as const;

export interface DemandDoc extends Document {
  _id: Types.ObjectId;
  ref: string;
  buyerOrganizationId: Types.ObjectId;
  status: typeof DEMAND_STATUSES[number];
  visibility: typeof DEMAND_VISIBILITIES[number];
  currentVersion: number;
  assignedManagerId?: Types.ObjectId;              // technology manager (技术经理人) who rewrites and follows up
  closureReason?: string;
  createdBy: Types.ObjectId;
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const DemandSchema = new Schema<DemandDoc>({
  ref: { type: String, required: true, immutable: true, match: refPattern('DEM') },
  buyerOrganizationId: ref('Organization', { required: true, immutable: true }),
  status: enumOf(DEMAND_STATUSES, { required: true, default: 'draft' }),
  visibility: enumOf(DEMAND_VISIBILITIES, { required: true, default: 'private' }),
  currentVersion: int({ required: true, min: 1, default: 1 }),
  assignedManagerId: ref('User'),
  closureReason: String,
  createdBy: ref('User', { required: true, immutable: true }),
}, entityOptions('demands'));

DemandSchema.index({ ref: 1 }, { unique: true });
DemandSchema.index({ buyerOrganizationId: 1, status: 1 });
DemandSchema.index({ assignedManagerId: 1, status: 1 });
DemandSchema.plugin(tenantScopePlugin, { fields: ['buyerOrganizationId'] });

export const Demand = model<DemandDoc>('Demand', DemandSchema);

// ---------- demand_versions ----------
export interface Budget { currency: string; minMinor?: Long; maxMinor?: Long }

export interface DemandVersionDoc extends Document {
  _id: Types.ObjectId;
  demandId: Types.ObjectId;
  version: number;
  title: I18nText;
  problemStatement: I18nText;
  hardConstraints?: Record<string, unknown>;       // filters that candidates must meet
  preferredAttributes?: Record<string, unknown>;   // ranking preferences
  industryCodes: string[];
  transactionTypes: string[];
  budget?: Budget;
  targetDate?: Date;
  frozen: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const nonNegative = { validator: (v: Long | null) => v == null || !v.isNegative(), message: '{PATH} must not be negative' };

const BudgetSchema = new Schema<Budget>({
  currency: { type: String, required: true, match: /^[A-Z]{3}$/, default: 'CNY' },
  minMinor: { type: Int64, validate: nonNegative },
  maxMinor: { type: Int64, validate: nonNegative },
}, { _id: false, strict: 'throw' });
BudgetSchema.path('maxMinor').validate(crossField<Budget>(
  (budget, max: Long | null) => max == null || budget.minMinor == null || budget.minMinor.lessThanOrEqual(max),
  'budget.minMinor must not exceed budget.maxMinor',
));

const DemandVersionSchema = new Schema<DemandVersionDoc>({
  demandId: ref('Demand', { required: true, immutable: true }),
  version: int({ required: true, min: 1, immutable: true }),
  title: { type: i18nText, required: true },
  problemStatement: { type: i18nText, required: true },
  hardConstraints: Schema.Types.Mixed,
  preferredAttributes: Schema.Types.Mixed,
  industryCodes: [String],
  transactionTypes: [String],
  budget: BudgetSchema,
  targetDate: Date,
  createdBy: ref('User', { required: true }),
}, recordOptions('demand_versions'));

DemandVersionSchema.index({ demandId: 1, version: 1 }, { unique: true });
DemandVersionSchema.plugin(freezablePlugin);

export const DemandVersion = model<DemandVersionDoc>('DemandVersion', DemandVersionSchema);
