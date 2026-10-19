// src/modules/technology/technology.model.ts — technology identity, immutable versions,
// the approved public snapshot, and IP assets.
import { Document, Model, Schema, Types, model } from 'mongoose';
import { AccessibleRecordModel, accessibleRecordsPlugin } from '@casl/mongoose';
import { freezablePlugin } from '../../core/db/immutability.plugins';
import { I18nText, entityOptions, enumOf, i18nText, int, recordOptions, ref, refPattern } from '../../core/db/schema-helpers';
import { tenantScopePlugin } from '../../core/db/tenant-scope.plugin';

export const TECHNOLOGY_STATUSES = [
  'draft', 'submitted', 'in_review', 'changes_requested', 'approved',
  'rejected', 'published', 'update_pending', 'suspended', 'archived',
] as const;
export type TechnologyStatus = typeof TECHNOLOGY_STATUSES[number];
export const VISIBILITIES = ['private', 'public', 'restricted'] as const;

// ---------- technologies: identity and lifecycle (small, frequently updated) ----------
export interface TechnologyDoc extends Document {
  _id: Types.ObjectId;
  ref: string;
  ownerOrganizationId: Types.ObjectId;
  technologyType: string;                          // validated against the taxonomy by the service
  lifecycleStatus: TechnologyStatus;
  visibility: typeof VISIBILITIES[number];
  currentVersion: number;                          // version being edited or reviewed…
  publishedVersion: number | null;                 // …while this one stays public
  createdBy: Types.ObjectId;
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const TechnologySchema = new Schema<TechnologyDoc>({
  ref: { type: String, required: true, immutable: true, match: refPattern('TEC') },
  ownerOrganizationId: ref('Organization', { required: true, immutable: true }),
  technologyType: { type: String, required: true },
  lifecycleStatus: enumOf(TECHNOLOGY_STATUSES, { required: true, default: 'draft' }),
  visibility: enumOf(VISIBILITIES, { required: true, default: 'private' }),
  currentVersion: int({ required: true, min: 1, default: 1 }),
  publishedVersion: int({ default: null }),
  createdBy: ref('User', { required: true, immutable: true }),
}, entityOptions('technologies'));

TechnologySchema.index({ ref: 1 }, { unique: true });
TechnologySchema.index({ ownerOrganizationId: 1, lifecycleStatus: 1 });
TechnologySchema.plugin(tenantScopePlugin, { fields: ['ownerOrganizationId'] });
TechnologySchema.plugin(accessibleRecordsPlugin);          // Technology.accessibleBy(ability, action)

export type TechnologyModel = AccessibleRecordModel<TechnologyDoc>;
export const Technology = model<TechnologyDoc, TechnologyModel>('Technology', TechnologySchema);

// ---------- technology_versions: content revisions, immutable once frozen (on submission) ----------
export interface TechnologyVersionDoc extends Document {
  _id: Types.ObjectId;
  technologyId: Types.ObjectId;
  version: number;
  title: I18nText;
  publicSummary?: I18nText;
  technicalDescription?: I18nText;
  industryCodes: string[];                         // GB/T 4754-2017, e.g. C384
  applicationCodes: string[];
  claimedTrl?: number | null;
  assessedTrl?: number | null;
  technicalAttributes?: Record<string, unknown>;   // sector-specific fields, validated per technologyType
  frozen: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const trl = () => int({ min: 1, max: 9, default: null });

const TechnologyVersionSchema = new Schema<TechnologyVersionDoc>({
  technologyId: ref('Technology', { required: true, immutable: true }),
  version: int({ required: true, min: 1, immutable: true }),
  title: { type: i18nText, required: true },
  publicSummary: i18nText,
  technicalDescription: i18nText,
  industryCodes: [{ type: String, match: /^[A-T][0-9]{0,4}$/ }],
  applicationCodes: [String],
  claimedTrl: trl(),
  assessedTrl: trl(),
  technicalAttributes: Schema.Types.Mixed,
  createdBy: ref('User', { required: true }),
}, recordOptions('technology_versions'));

TechnologyVersionSchema.index({ technologyId: 1, version: 1 }, { unique: true });
TechnologyVersionSchema.plugin(freezablePlugin);          // adds `frozen`; frozen versions cannot change

export const TechnologyVersion = model<TechnologyVersionDoc>('TechnologyVersion', TechnologyVersionSchema);

// ---------- technology_publications: approved public snapshot (search index and public pages) ----------
export interface TechnologyPublicationDoc extends Document {
  _id: Types.ObjectId;
  technologyId: Types.ObjectId;
  version: number;
  ref: string;
  status: 'live' | 'superseded' | 'withdrawn';
  owner: { organizationId: Types.ObjectId; displayName: string; type: string; verified: boolean };
  title: I18nText;
  summary: I18nText;
  keywords: string[];
  industryCodes: string[];
  trl: { claimed?: number | null; assessed?: number | null };
  offerTypes: string[];
  territories: string[];
  ipSummary: { grantedPatents: number; pendingApplications: number };
  badges: string[];
  price: { type: string };
  publishedAt: Date;
  withdrawnAt?: Date;
}

const TechnologyPublicationSchema = new Schema<TechnologyPublicationDoc>({
  technologyId: ref('Technology', { required: true }),
  version: int({ required: true, min: 1 }),
  ref: { type: String, required: true, match: refPattern('TEC') },
  status: enumOf(['live', 'superseded', 'withdrawn'] as const, { required: true, default: 'live' }),
  owner: {
    organizationId: ref('Organization', { required: true }),
    displayName: { type: String, required: true },
    type: { type: String, required: true },
    verified: { type: Boolean, default: false },
  },
  title: { type: i18nText, required: true },
  summary: { type: i18nText, required: true },
  keywords: [String],
  industryCodes: [String],
  trl: { claimed: int({ min: 1, max: 9 }), assessed: int({ min: 1, max: 9 }) },
  offerTypes: [String],
  territories: [String],
  ipSummary: { grantedPatents: int({ default: 0 }), pendingApplications: int({ default: 0 }) },
  badges: [String],
  price: { type: { type: String, required: true } },     // `type` as a field name needs the nested form
  publishedAt: { type: Date, required: true },
  withdrawnAt: Date,
}, { collection: 'technology_publications', versionKey: false, strict: 'throw' });

// At most one live snapshot per technology.
TechnologyPublicationSchema.index({ technologyId: 1 }, { unique: true, partialFilterExpression: { status: 'live' } });
TechnologyPublicationSchema.index({ status: 1, industryCodes: 1, 'trl.claimed': 1 });

export const TechnologyPublication: Model<TechnologyPublicationDoc> = model<TechnologyPublicationDoc>('TechnologyPublication', TechnologyPublicationSchema);

// ---------- ip_assets: patents, applications, software copyrights, know-how claims ----------
export const IP_ASSET_TYPES = [
  'invention_patent', 'utility_model', 'design_patent', 'patent_application',
  'software_copyright', 'ic_layout', 'plant_variety', 'know_how', 'trademark',
] as const;

export interface IpAssetDoc extends Document {
  _id: Types.ObjectId;
  technologyId: Types.ObjectId;
  ownerOrganizationId: Types.ObjectId;
  assetType: typeof IP_ASSET_TYPES[number];
  jurisdictionCode: string;
  identifier?: string;                             // e.g. ZL202310000000.0
  title?: string;
  rightsStatus: 'claimed' | 'verified' | 'disputed' | 'expired' | 'invalidated';
  legalStatusCheckedAt?: Date;
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const IpAssetSchema = new Schema<IpAssetDoc>({
  technologyId: ref('Technology', { required: true }),
  ownerOrganizationId: ref('Organization', { required: true }),
  assetType: enumOf(IP_ASSET_TYPES, { required: true }),
  jurisdictionCode: { type: String, required: true, match: /^[A-Z]{2}$/ },     // CN, US, EP, WO …
  identifier: { type: String, trim: true },
  title: String,
  rightsStatus: enumOf(['claimed', 'verified', 'disputed', 'expired', 'invalidated'] as const, { required: true, default: 'claimed' }),
  legalStatusCheckedAt: Date,
}, entityOptions('ip_assets'));

IpAssetSchema.index({ technologyId: 1 });
IpAssetSchema.index({ jurisdictionCode: 1, identifier: 1 });   // duplicate detection across technologies
IpAssetSchema.plugin(tenantScopePlugin, { fields: ['ownerOrganizationId'] });

export const IpAsset = model<IpAssetDoc>('IpAsset', IpAssetSchema);
