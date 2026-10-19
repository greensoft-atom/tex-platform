// src/modules/matching/match.model.ts — scored demand <-> offer candidates, reproducible per ranking version.
import { Document, Schema, Types, model } from 'mongoose';
import { enumOf, int, recordOptions, ref } from '../../core/db/schema-helpers';

export interface MatchDoc extends Document {
  _id: Types.ObjectId;
  demandId: Types.ObjectId;
  demandVersion: number;
  offerId: Types.ObjectId;
  technologyId: Types.ObjectId;
  technologyVersion: number;
  retrievalMethod: 'structured' | 'full_text' | 'semantic' | 'manual';
  rankingVersion: string;
  score?: number | null;
  scoreComponents?: Record<string, number>;
  explanation?: Record<string, unknown>;
  eligibilityStatus: 'eligible' | 'ineligible' | 'needs_review';
  reviewStatus: 'pending' | 'accepted' | 'rejected' | 'shortlisted';
  rejectionReason?: string;
  createdAt: Date;
}

const MatchSchema = new Schema<MatchDoc>({
  demandId: ref('Demand', { required: true }),
  demandVersion: int({ required: true, min: 1 }),
  offerId: ref('TechnologyOffer', { required: true }),
  technologyId: ref('Technology', { required: true }),
  technologyVersion: int({ required: true, min: 1 }),
  retrievalMethod: enumOf(['structured', 'full_text', 'semantic', 'manual'] as const, { required: true }),
  rankingVersion: { type: String, required: true },
  score: { type: Number, min: 0, max: 100, default: null },
  scoreComponents: Schema.Types.Mixed,
  explanation: Schema.Types.Mixed,
  eligibilityStatus: enumOf(['eligible', 'ineligible', 'needs_review'] as const, { required: true }),
  reviewStatus: enumOf(['pending', 'accepted', 'rejected', 'shortlisted'] as const, { required: true, default: 'pending' }),
  rejectionReason: String,
}, recordOptions('matches'));

// Re-running the same matching job must not create duplicates.
MatchSchema.index({ demandId: 1, demandVersion: 1, offerId: 1, rankingVersion: 1 }, { unique: true });
MatchSchema.index({ demandId: 1, demandVersion: 1, score: -1 });
MatchSchema.index({ offerId: 1 });

export const Match = model<MatchDoc>('Match', MatchSchema);
