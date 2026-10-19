// src/core/actor.ts — who performs a service call: the user, their tenant context and their CASL ability.
import { Types } from 'mongoose';
import type { TenantContext } from './db/tenant-scope.plugin';
import type { AppAbility } from '../modules/identity/abilities';

export interface Actor extends TenantContext {
  userId: Types.ObjectId;
  ability: AppAbility;
  correlationId: string;                           // request ID, propagated to transitions and audit events
}

/**
 * The worker acts as this reserved user (a `users` document created by migration 003), so transition
 * records always name an actor. Audit events mark it as actor type `system`.
 */
// (The Mongoose 5.13 typings declare the ObjectId constructor without arguments; at runtime it takes a hex string.)
const ObjectIdFromHex = Types.ObjectId as unknown as new (hex: string) => Types.ObjectId;
export const SYSTEM_USER_ID = new ObjectIdFromHex('000000000000000000000001');
