// src/modules/documents/document.model.ts — file metadata (the bytes live in file storage) and access grants.
// The model is called DocumentFile to avoid confusion with Mongoose's own Document class.
import { Document, Schema, Types, model } from 'mongoose';
import { entityOptions, enumOf, int, ref } from '../../core/db/schema-helpers';
import { tenantScopePlugin } from '../../core/db/tenant-scope.plugin';

export const CLASSIFICATIONS = ['public', 'organization_only', 'deal_restricted', 'highly_confidential'] as const;
export const LINK_RESOURCE_TYPES = ['organization', 'technology', 'ip_asset', 'demand', 'deal', 'review_case'] as const;
export const LINK_PURPOSES = ['evidence', 'data_room', 'contract', 'verification', 'deliverable', 'other'] as const;

export interface DocumentLink { resourceType: typeof LINK_RESOURCE_TYPES[number]; resourceId: Types.ObjectId; purpose: typeof LINK_PURPOSES[number] }

export interface DocumentFileDoc extends Document {
  _id: Types.ObjectId;
  ownerOrganizationId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  storageKey: string;
  originalFilename: string;
  mediaType: string;
  byteSize: number;
  sha256?: string;
  classification: typeof CLASSIFICATIONS[number];
  scanStatus: 'pending' | 'clean' | 'infected' | 'failed';
  lifecycleStatus: 'quarantined' | 'available' | 'suspended' | 'deleted';
  links: DocumentLink[];
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentLinkSchema = new Schema<DocumentLink>({
  resourceType: enumOf(LINK_RESOURCE_TYPES, { required: true }),
  resourceId: { type: Schema.Types.ObjectId, required: true },
  purpose: enumOf(LINK_PURPOSES, { required: true }),
}, { _id: false, strict: 'throw' });

const DocumentFileSchema = new Schema<DocumentFileDoc>({
  ownerOrganizationId: ref('Organization', { required: true, immutable: true }),
  uploadedBy: ref('User', { required: true, immutable: true }),
  storageKey: { type: String, required: true, immutable: true },
  originalFilename: { type: String, required: true, maxlength: 255 },
  mediaType: { type: String, required: true },
  byteSize: int({ required: true, min: 0, max: 2147483647 }),         // upload limit is far below 2 GB
  sha256: { type: String, match: /^[a-f0-9]{64}$/ },
  classification: enumOf(CLASSIFICATIONS, { required: true, default: 'organization_only' }),
  scanStatus: enumOf(['pending', 'clean', 'infected', 'failed'] as const, { required: true, default: 'pending' }),
  lifecycleStatus: enumOf(['quarantined', 'available', 'suspended', 'deleted'] as const, { required: true, default: 'quarantined' }),
  links: [DocumentLinkSchema],
}, entityOptions('documents'));

DocumentFileSchema.index({ storageKey: 1 }, { unique: true });
DocumentFileSchema.index({ 'links.resourceType': 1, 'links.resourceId': 1 });
DocumentFileSchema.index({ ownerOrganizationId: 1, createdAt: -1 });
DocumentFileSchema.plugin(tenantScopePlugin, { fields: ['ownerOrganizationId'] });

export const DocumentFile = model<DocumentFileDoc>('DocumentFile', DocumentFileSchema);

// ---------- document_access_grants: per-document access for another organization (e.g. NDA data room) ----------
export interface DocumentAccessGrantDoc extends Document {
  _id: Types.ObjectId;
  documentId: Types.ObjectId;
  dealId?: Types.ObjectId;
  granteeOrganizationId: Types.ObjectId;
  permissions: ('view' | 'download' | 'print')[];
  watermark: boolean;
  expiresAt?: Date;
  revokedAt?: Date;
  grantedBy: Types.ObjectId;
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentAccessGrantSchema = new Schema<DocumentAccessGrantDoc>({
  documentId: ref('DocumentFile', { required: true }),
  dealId: ref('Deal'),
  granteeOrganizationId: ref('Organization', { required: true }),
  permissions: { type: [enumOf(['view', 'download', 'print'] as const)], default: ['view'] },
  watermark: { type: Boolean, default: true },
  expiresAt: Date,
  revokedAt: Date,
  grantedBy: ref('User', { required: true }),
}, entityOptions('document_access_grants'));

DocumentAccessGrantSchema.index({ documentId: 1, granteeOrganizationId: 1 });
DocumentAccessGrantSchema.index({ dealId: 1 });

export const DocumentAccessGrant = model<DocumentAccessGrantDoc>('DocumentAccessGrant', DocumentAccessGrantSchema);
