// src/modules/workflow/history.ts — the three records every state change writes in its own transaction:
// the transition (history), the outbox event (side effects after commit) and the audit event.
import { ClientSession, Types } from 'mongoose';
import { SYSTEM_USER_ID } from '../../core/actor';
import { AuditEvent } from '../audit/audit-event.model';
import { OutboxEvent, WorkflowTransition } from './workflow.model';

export interface ChangeRecord {
  actorUserId: Types.ObjectId;                     // SYSTEM_USER_ID for the worker
  correlationId: string;
  resource: { type: string; id: Types.ObjectId };
  organizationId?: Types.ObjectId;                 // owner of the resource, for the audit trail
  action: string;                                  // transition verb, e.g. approve_revision
  fromStatus: string;
  toStatus: string;
  eventType?: string;                              // outbox event, e.g. technology.revision_approved
  payload?: Record<string, unknown>;
  reason?: string;
}

export async function recordChange(session: ClientSession, change: ChangeRecord): Promise<void> {
  const isSystem = String(change.actorUserId) === String(SYSTEM_USER_ID);
  await new WorkflowTransition({
    resource: change.resource, fromStatus: change.fromStatus, toStatus: change.toStatus, action: change.action,
    actorUserId: change.actorUserId, reason: change.reason, correlationId: change.correlationId,
  }).save({ session });
  if (change.eventType) {
    await new OutboxEvent({ eventType: change.eventType, aggregate: change.resource, payload: change.payload || {} }).save({ session });
  }
  await new AuditEvent({
    actor: isSystem ? { type: 'system' } : { type: 'user', userId: change.actorUserId },
    organizationId: change.organizationId,
    action: `${change.resource.type}.${change.action}`,
    resource: change.resource,
    correlationId: change.correlationId,
    reason: change.reason,
  }).save({ session });
}
