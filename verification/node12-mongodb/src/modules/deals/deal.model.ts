// src/modules/deals/deal.model.ts — managed negotiations and transactions; parties are embedded.
import { Document, Schema, Types, model } from 'mongoose';
import { I18nText, Money, entityOptions, enumOf, i18nText, money, ref, refPattern } from '../../core/db/schema-helpers';
import { tenantScopePlugin } from '../../core/db/tenant-scope.plugin';

export const DEAL_TYPES = [
  'ip_license', 'ip_assignment', 'technical_service', 'technology_consulting', 'rnd_collaboration',
  'technology_supply', 'commercialization', 'investment', 'joint_venture',
] as const;
export const DEAL_STATUSES = [
  'opportunity', 'qualified', 'due_diligence', 'negotiation', 'contract_draft', 'approval',
  'signed', 'conditions_pending', 'ready_to_complete', 'completed', 'on_hold', 'lost', 'disputed',
] as const;
export const PARTY_ROLES = ['buyer', 'supplier', 'broker', 'licensor', 'licensee', 'investor', 'other'] as const;

export interface DealParty { organizationId: Types.ObjectId; role: typeof PARTY_ROLES[number]; status: 'active' | 'withdrawn' }

export interface DealDoc extends Document {
  _id: Types.ObjectId;
  ref: string;
  introductionRequestId?: Types.ObjectId;
  dealType: typeof DEAL_TYPES[number];
  status: typeof DEAL_STATUSES[number];
  name: string;
  parties: Types.DocumentArray<DealParty & Document>;
  assignedManagerId?: Types.ObjectId;
  expectedCloseDate?: Date;
  estimatedValue?: Money;
  lossReason?: string;
  createdBy: Types.ObjectId;
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const DealPartySchema = new Schema<DealParty>({
  organizationId: ref('Organization', { required: true }),
  role: enumOf(PARTY_ROLES, { required: true }),
  status: enumOf(['active', 'withdrawn'] as const, { required: true, default: 'active' }),
}, { _id: false, strict: 'throw' });

const DealSchema = new Schema<DealDoc>({
  ref: { type: String, required: true, immutable: true, match: refPattern('DEAL') },
  introductionRequestId: ref('IntroductionRequest', { immutable: true }),
  dealType: enumOf(DEAL_TYPES, { required: true }),
  status: enumOf(DEAL_STATUSES, { required: true, default: 'opportunity' }),
  name: { type: String, required: true, trim: true, maxlength: 200 },
  parties: {
    type: [DealPartySchema],
    validate: [
      { validator: (v: DealParty[]) => v.length >= 2 && v.length <= 10, message: 'a deal needs 2 to 10 parties' },
      {
        validator: (v: DealParty[]) => new Set(v.map((p) => String(p.organizationId))).size === v.length,
        message: 'an organization can appear only once among the parties',
      },
    ],
  },
  assignedManagerId: ref('User'),
  expectedCloseDate: Date,
  estimatedValue: money,
  lossReason: String,
  createdBy: ref('User', { required: true, immutable: true }),
}, entityOptions('deals'));

DealSchema.index({ ref: 1 }, { unique: true });
// One deal per introduction (idempotent conversion).
DealSchema.index({ introductionRequestId: 1 }, { unique: true, partialFilterExpression: { introductionRequestId: { $type: 'objectId' } } });
DealSchema.index({ 'parties.organizationId': 1, status: 1 });
DealSchema.index({ assignedManagerId: 1, status: 1 });
DealSchema.plugin(tenantScopePlugin, { fields: ['parties.organizationId'] });

export const Deal = model<DealDoc>('Deal', DealSchema);

// ---------- deal_milestones: deliverables, conditions and payment milestones ----------
export interface DealMilestoneDoc extends Document {
  _id: Types.ObjectId;
  dealId: Types.ObjectId;
  kind: 'deliverable' | 'condition' | 'payment';
  name: I18nText;
  dueDate?: Date;
  amount?: Money;
  status: 'pending' | 'submitted' | 'accepted' | 'rejected' | 'waived';
  evidenceDocumentIds: Types.ObjectId[];
  completedAt?: Date;
  rev: number;
  createdAt: Date;
  updatedAt: Date;
}

const DealMilestoneSchema = new Schema<DealMilestoneDoc>({
  dealId: ref('Deal', { required: true, immutable: true }),
  kind: enumOf(['deliverable', 'condition', 'payment'] as const, { required: true }),
  name: { type: i18nText, required: true },
  dueDate: Date,
  amount: money,
  status: enumOf(['pending', 'submitted', 'accepted', 'rejected', 'waived'] as const, { required: true, default: 'pending' }),
  evidenceDocumentIds: [ref('DocumentFile')],
  completedAt: Date,
}, entityOptions('deal_milestones'));

DealMilestoneSchema.index({ dealId: 1, dueDate: 1 });
DealMilestoneSchema.index({ status: 1, dueDate: 1 });

export const DealMilestone = model<DealMilestoneDoc>('DealMilestone', DealMilestoneSchema);
