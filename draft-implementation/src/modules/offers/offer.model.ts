// src/modules/offers/offer.model.ts — licence, assignment, partnership, pilot and investment offers.
import { Document, Schema, Types, model } from 'mongoose';
import { Money, crossField, entityOptions, enumOf, int, money, ref, refPattern } from '../../core/db/schema-helpers';
import { tenantScopePlugin } from '../../core/db/tenant-scope.plugin';

export const TRANSACTION_TYPES = ['license', 'assignment', 'partnership', 'joint_development', 'pilot', 'evaluation', 'equity_investment'] as const;
export const OFFER_STATUSES = ['draft', 'submitted', 'active', 'paused', 'under_negotiation', 'closed', 'expired', 'rejected'] as const;
export const EXCLUSIVITIES = ['exclusive', 'sole', 'non_exclusive', 'unspecified'] as const;   // 独占 / 排他 / 普通
export const PRICE_TYPES = ['fixed', 'indicative', 'negotiable', 'royalty_based', 'milestone_based', 'undisclosed'] as const;
// 06 §6.6: why an offer is reserved (under_negotiation) and why it was closed.
export const RESERVATION_REASONS = ['exclusive_talks', 'venue_listing'] as const;
export const CLOSURE_REASONS = ['deal_completed', 'withdrawn', 'technology_archived', 'replaced'] as const;

export interface TechnologyOfferDoc extends Document {
  _id: Types.ObjectId;
  ref: string;
  technologyId: Types.ObjectId;
  technologyVersion: number;
  supplierOrganizationId: Types.ObjectId;
  transactionType: typeof TRANSACTION_TYPES[number];
  offerStatus: typeof OFFER_STATUSES[number];
  rightsScope?: Record<string, unknown>;
  territoryCodes: string[];
  fieldOfUse?: string;
  exclusivity: typeof EXCLUSIVITIES[number];
  price: { type: typeof PRICE_TYPES[number]; indicative?: Money };
  validFrom?: Date;
  validUntil?: Date;
  reservation?: { reason: typeof RESERVATION_REASONS[number]; until?: Date; dealId?: Types.ObjectId };
  closureReason?: typeof CLOSURE_REASONS[number];
  createdBy: Types.ObjectId;
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const TechnologyOfferSchema = new Schema<TechnologyOfferDoc>({
  ref: { type: String, required: true, immutable: true, match: refPattern('OFR') },
  technologyId: ref('Technology', { required: true, immutable: true }),
  technologyVersion: int({ required: true, min: 1 }),
  supplierOrganizationId: ref('Organization', { required: true, immutable: true }),
  transactionType: enumOf(TRANSACTION_TYPES, { required: true }),
  offerStatus: enumOf(OFFER_STATUSES, { required: true, default: 'draft' }),
  rightsScope: Schema.Types.Mixed,
  territoryCodes: [{ type: String, match: /^[A-Z]{2}$/ }],
  fieldOfUse: String,
  exclusivity: enumOf(EXCLUSIVITIES, { required: true, default: 'unspecified' }),
  price: {
    type: enumOf(PRICE_TYPES, { required: true }),
    indicative: money,
  },
  validFrom: Date,
  validUntil: {
    type: Date,
    validate: crossField<TechnologyOfferDoc>(
      (offer, until: Date | null) => until == null || offer.validFrom == null || until > offer.validFrom,
      'validUntil must be after validFrom',
    ),
  },
  reservation: {
    type: new Schema({
      reason: enumOf(RESERVATION_REASONS, { required: true }),
      until: Date,                                 // exclusivity of negotiation ends; a daily job lifts it
      dealId: ref('Deal'),
    }, { _id: false, strict: 'throw' }),
    default: undefined,
  },
  closureReason: enumOf(CLOSURE_REASONS),
  createdBy: ref('User', { required: true }),
}, entityOptions('technology_offers'));

TechnologyOfferSchema.index({ ref: 1 }, { unique: true });
TechnologyOfferSchema.index({ technologyId: 1, offerStatus: 1 });
TechnologyOfferSchema.index({ supplierOrganizationId: 1, offerStatus: 1 });
TechnologyOfferSchema.plugin(tenantScopePlugin, { fields: ['supplierOrganizationId'] });

export const TechnologyOffer = model<TechnologyOfferDoc>('TechnologyOffer', TechnologyOfferSchema);
