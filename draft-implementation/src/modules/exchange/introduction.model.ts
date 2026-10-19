// src/modules/exchange/introduction.model.ts — consent-based introductions between buyer and supplier.
import { Document, Schema, Types, model } from 'mongoose';
import { crossField, entityOptions, enumOf, ref, refPattern } from '../../core/db/schema-helpers';
import { tenantScopePlugin } from '../../core/db/tenant-scope.plugin';

export const INTRODUCTION_STATUSES = [
  'requested', 'under_review', 'supplier_pending', 'approved', 'rejected', 'withdrawn', 'introduced', 'converted_to_deal',
] as const;

export interface IntroductionRequestDoc extends Document {
  _id: Types.ObjectId;
  ref: string;
  matchId: Types.ObjectId;
  buyerOrganizationId: Types.ObjectId;
  supplierOrganizationId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  status: typeof INTRODUCTION_STATUSES[number];
  buyerMessage?: string;
  supplierResponse?: string;
  disclosureScope?: Record<string, unknown>;
  assignedManagerId?: Types.ObjectId;
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const IntroductionRequestSchema = new Schema<IntroductionRequestDoc>({
  ref: { type: String, required: true, immutable: true, match: refPattern('INT') },
  matchId: ref('Match', { required: true }),
  buyerOrganizationId: ref('Organization', { required: true, immutable: true }),
  supplierOrganizationId: {
    ...ref('Organization', { required: true, immutable: true }),
    validate: crossField<IntroductionRequestDoc>(
      (intro, supplier: Types.ObjectId) => String(supplier) !== String(intro.buyerOrganizationId),
      'buyer and supplier must be different organizations',
    ),
  },
  requestedBy: ref('User', { required: true }),
  status: enumOf(INTRODUCTION_STATUSES, { required: true, default: 'requested' }),
  buyerMessage: { type: String, maxlength: 2000 },
  supplierResponse: { type: String, maxlength: 2000 },
  disclosureScope: Schema.Types.Mixed,
  assignedManagerId: ref('User'),
}, entityOptions('introduction_requests'));

IntroductionRequestSchema.index({ ref: 1 }, { unique: true });
IntroductionRequestSchema.index({ supplierOrganizationId: 1, status: 1 });
IntroductionRequestSchema.index({ buyerOrganizationId: 1, status: 1 });
IntroductionRequestSchema.index({ matchId: 1 });
// Both sides may see the request: the scope matches either organization.
IntroductionRequestSchema.plugin(tenantScopePlugin, { fields: ['buyerOrganizationId', 'supplierOrganizationId'] });

export const IntroductionRequest = model<IntroductionRequestDoc>('IntroductionRequest', IntroductionRequestSchema);
