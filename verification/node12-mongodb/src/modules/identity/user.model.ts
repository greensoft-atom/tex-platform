// src/modules/identity/user.model.ts — people, login identities and platform staff roles.
import { Document, Schema, Types, model } from 'mongoose';
import { entityOptions, enumOf, ref } from '../../core/db/schema-helpers';

export const USER_STATUSES = ['pending', 'active', 'suspended', 'closed'] as const;
export const REAL_NAME_STATUSES = ['none', 'pending', 'verified', 'failed'] as const;
export const LOCALES = ['zh-CN', 'en'] as const;

export interface UserDoc extends Document {
  _id: Types.ObjectId;
  emailNormalized?: string;
  phoneE164?: string;
  displayName: string;
  authSubject?: string;
  passwordHash?: string;
  status: typeof USER_STATUSES[number];
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  realName: { status: typeof REAL_NAME_STATUSES[number]; verifiedAt?: Date };
  locale: typeof LOCALES[number];
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>({
  emailNormalized: { type: String, lowercase: true, trim: true },
  phoneE164: { type: String, match: /^\+[1-9][0-9]{6,14}$/ },          // +8613800000000
  displayName: { type: String, required: true, trim: true, maxlength: 100 },
  authSubject: String,                                                  // subject at an external IdP, if used
  passwordHash: { type: String, select: false },                       // bcryptjs hash; never returned by default
  status: enumOf(USER_STATUSES, { required: true, default: 'pending' }),
  emailVerifiedAt: Date,
  phoneVerifiedAt: Date,
  realName: {
    status: enumOf(REAL_NAME_STATUSES, { default: 'none' }),
    verifiedAt: Date,
  },
  locale: enumOf(LOCALES, { default: 'zh-CN' }),
}, entityOptions('users'));

// Unique only when present: a user may register with a phone number and add an e-mail later.
UserSchema.index({ emailNormalized: 1 }, { unique: true, partialFilterExpression: { emailNormalized: { $type: 'string' } } });
UserSchema.index({ phoneE164: 1 }, { unique: true, partialFilterExpression: { phoneE164: { $type: 'string' } } });
UserSchema.index({ authSubject: 1 }, { unique: true, partialFilterExpression: { authSubject: { $type: 'string' } } });

export const User = model<UserDoc>('User', UserSchema);

// ---------- Platform staff roles (separate from organization roles) ----------
export const PLATFORM_ROLES = [
  'system_admin', 'security_admin', 'operations_manager', 'listing_reviewer', 'verification_reviewer',
  'platform_technology_manager', 'compliance_officer', 'finance_officer', 'support_agent',
] as const;
export type PlatformRole = typeof PLATFORM_ROLES[number];

export interface PlatformRoleAssignmentDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  roleCode: PlatformRole;
  grantedBy: Types.ObjectId;
  reason: string;
  expiresAt?: Date;                                                     // temporary roles expire (FR-ADM-10)
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformRoleAssignmentSchema = new Schema<PlatformRoleAssignmentDoc>({
  userId: ref('User', { required: true }),
  roleCode: enumOf(PLATFORM_ROLES, { required: true }),
  grantedBy: ref('User', { required: true }),
  reason: { type: String, required: true },
  expiresAt: Date,
}, entityOptions('platform_role_assignments'));
PlatformRoleAssignmentSchema.index({ userId: 1, roleCode: 1 }, { unique: true });

export const PlatformRoleAssignment = model<PlatformRoleAssignmentDoc>('PlatformRoleAssignment', PlatformRoleAssignmentSchema);
