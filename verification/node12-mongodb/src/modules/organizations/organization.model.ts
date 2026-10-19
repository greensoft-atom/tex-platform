// src/modules/organizations/organization.model.ts — legal participants, memberships, delegated authority.
import { Document, Schema, Types, model } from 'mongoose';
import { I18nText, Long, Int64, entityOptions, enumOf, i18nText, int, ref, refPattern } from '../../core/db/schema-helpers';

export const ORGANIZATION_TYPES = ['university', 'research_institute', 'company', 'startup', 'government', 'service_provider', 'individual'] as const;
export const VERIFICATION_STATUSES = ['pending', 'in_review', 'verified', 'rejected', 'expired', 'suspended'] as const;

export interface OrganizationDoc extends Document {
  _id: Types.ObjectId;
  ref: string;
  legalName: string;
  displayName: string;
  organizationType: typeof ORGANIZATION_TYPES[number];
  jurisdictionCode: string;
  registrationNumber?: string;                    // unified social credit code (统一社会信用代码) in China
  websiteUrl?: string;
  description?: I18nText;
  verification: {
    status: typeof VERIFICATION_STATUSES[number];
    level?: number;
    verifiedAt?: Date;
    expiresAt?: Date;
    caseId?: Types.ObjectId;
  };
  status: 'active' | 'suspended' | 'closed';
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<OrganizationDoc>({
  ref: { type: String, required: true, match: refPattern('ORG') },
  legalName: { type: String, required: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  organizationType: enumOf(ORGANIZATION_TYPES, { required: true }),
  jurisdictionCode: { type: String, required: true, match: /^[A-Z]{2}$/ },     // ISO 3166-1 alpha-2
  registrationNumber: { type: String, trim: true },
  websiteUrl: String,
  description: i18nText,
  verification: {
    status: enumOf(VERIFICATION_STATUSES, { required: true, default: 'pending' }),
    level: int({ min: 0, max: 3 }),
    verifiedAt: Date,
    expiresAt: Date,
    caseId: ref('ReviewCase'),
  },
  status: enumOf(['active', 'suspended', 'closed'] as const, { required: true, default: 'active' }),
}, entityOptions('organizations'));

OrganizationSchema.index({ ref: 1 }, { unique: true });
OrganizationSchema.index(
  { jurisdictionCode: 1, registrationNumber: 1 },
  { unique: true, partialFilterExpression: { registrationNumber: { $type: 'string' } } },
);
OrganizationSchema.index({ 'verification.status': 1, createdAt: 1 });

export const Organization = model<OrganizationDoc>('Organization', OrganizationSchema);

// ---------- Memberships: user <-> organization with organization roles ----------
export const ORGANIZATION_ROLES = ['org_owner', 'org_admin', 'technology_manager', 'demand_manager', 'deal_manager', 'viewer'] as const;
export type OrganizationRole = typeof ORGANIZATION_ROLES[number];

export interface OrganizationMembershipDoc extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  roleCodes: OrganizationRole[];
  status: 'invited' | 'active' | 'revoked';
  invitedBy?: Types.ObjectId;
  acceptedAt?: Date;
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationMembershipSchema = new Schema<OrganizationMembershipDoc>({
  organizationId: ref('Organization', { required: true }),
  userId: ref('User', { required: true }),
  roleCodes: {
    type: [enumOf(ORGANIZATION_ROLES)],
    validate: {
      validator: (v: string[]) => v.length > 0 && new Set(v).size === v.length,
      message: 'roleCodes must be a non-empty list without duplicates',
    },
  },
  status: enumOf(['invited', 'active', 'revoked'] as const, { required: true, default: 'invited' }),
  invitedBy: ref('User'),
  acceptedAt: Date,
}, entityOptions('organization_memberships'));
OrganizationMembershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
OrganizationMembershipSchema.index({ userId: 1, status: 1 });

export const OrganizationMembership = model<OrganizationMembershipDoc>('OrganizationMembership', OrganizationMembershipSchema);

// ---------- Delegated authority: who may sign or approve for the organization (07 §2, 08 §2.3) ----------
export const AUTHORIZATION_SCOPES = ['sign_contract', 'approve_payment', 'approve_disclosure', 'submit_to_venue'] as const;

export interface OrganizationAuthorizationDoc extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  scope: typeof AUTHORIZATION_SCOPES[number];
  limitMinor?: Long;                               // e.g. may approve payments up to this amount (fen)
  validUntil?: Date;
  evidenceDocumentId?: Types.ObjectId;             // board resolution, power of attorney (授权委托书)
  status: 'active' | 'revoked' | 'expired';
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationAuthorizationSchema = new Schema<OrganizationAuthorizationDoc>({
  organizationId: ref('Organization', { required: true }),
  userId: ref('User', { required: true }),
  scope: enumOf(AUTHORIZATION_SCOPES, { required: true }),
  limitMinor: { type: Int64 },
  validUntil: Date,
  evidenceDocumentId: ref('DocumentFile'),
  status: enumOf(['active', 'revoked', 'expired'] as const, { required: true, default: 'active' }),
}, entityOptions('organization_authorizations'));
OrganizationAuthorizationSchema.index({ organizationId: 1, userId: 1, scope: 1, status: 1 });

export const OrganizationAuthorization = model<OrganizationAuthorizationDoc>('OrganizationAuthorization', OrganizationAuthorizationSchema);
