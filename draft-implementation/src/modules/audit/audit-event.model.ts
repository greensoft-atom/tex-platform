// src/modules/audit/audit-event.model.ts — append-only audit trail in the separate `tex_audit` database.
// The model is bound to auditDb(), which shares the main connection, so audit events join business
// transactions; the texApp role allows only find + insert on this collection.
import { Document, Schema, Types } from 'mongoose';
import { auditDb } from '../../core/db/connection';
import { appendOnlyPlugin } from '../../core/db/immutability.plugins';
import { enumOf, recordOptions, ref } from '../../core/db/schema-helpers';

export interface AuditEventDoc extends Document {
  _id: Types.ObjectId;
  actor: { type: 'user' | 'system' | 'integration'; userId?: Types.ObjectId };
  organizationId?: Types.ObjectId;
  action: string;                                  // e.g. technology.submit, document.download
  resource: { type: string; id: Types.ObjectId };
  correlationId?: string;
  reason?: string;                                 // required by policy for staff cross-tenant access
  details?: Record<string, unknown>;
  occurredAt: Date;
}

const AuditEventSchema = new Schema<AuditEventDoc>({
  actor: {
    type: enumOf(['user', 'system', 'integration'] as const, { required: true }),
    userId: ref('User'),
  },
  organizationId: ref('Organization'),
  action: { type: String, required: true },
  resource: {
    type: { type: String, required: true },
    id: { type: Schema.Types.ObjectId, required: true },
  },
  correlationId: String,
  reason: String,
  details: Schema.Types.Mixed,
}, recordOptions('audit_events', 'occurredAt'));

AuditEventSchema.index({ 'resource.type': 1, 'resource.id': 1, occurredAt: -1 });
AuditEventSchema.index({ 'actor.userId': 1, occurredAt: -1 });
AuditEventSchema.plugin(appendOnlyPlugin);

export const AuditEvent = auditDb().model<AuditEventDoc>('AuditEvent', AuditEventSchema);
