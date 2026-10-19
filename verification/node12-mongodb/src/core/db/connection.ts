// src/core/db/connection.ts — one Mongoose connection per process (API instance or worker).
// Mongoose 5.13.x bundles MongoDB driver 3.7.4, the newest driver that runs on Node 12.4
// (Mongoose 6+ uses driver 4+, which needs Node >= 12.9).
import { Connection } from 'mongoose';
import mongoose from './mongoose-settings';

export interface DatabaseOptions {
  poolSize?: number;
}

/** The URI names the database and carries w=majority (4.4 defaults to w:1), e.g. mongodb://…/tex?replicaSet=rs0&w=majority */
export async function connectDatabase(uri: string, options: DatabaseOptions = {}): Promise<Connection> {
  await mongoose.connect(uri, {
    poolSize: options.poolSize || 10,
    serverSelectionTimeoutMS: 10000,
  });
  return mongoose.connection;
}

/**
 * The append-only audit trail lives in a separate database (`tex_audit`) on the same connection,
 * so it can join the business transaction while having its own, insert-only role privileges.
 */
export const auditDb = (): Connection => mongoose.connection.useDb('tex_audit', { useCache: true });

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
