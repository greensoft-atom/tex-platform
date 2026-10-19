// src/core/db/transaction.ts — every multi-document business change runs through this helper.
import mongoose, { ClientSession } from 'mongoose';

const TRANSACTION_OPTIONS = { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } } as const;

/**
 * Runs `work` in a transaction and returns its result.
 * - Driver 3.7 (Mongoose 5): withTransaction() resolves to the commit result, not the callback's value,
 *   so the result is captured here.
 * - withTransaction() retries the callback on transient errors (e.g. a primary election): load documents
 *   inside the callback and keep side effects (SMS, search, HTTP) out of it; they go through the outbox.
 * - Mongoose 5.13's connection.transaction() helper is not used: it never ends its session.
 */
export async function inTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  let result: T | undefined;
  try {
    await session.withTransaction(async () => {
      result = await work(session);
    }, TRANSACTION_OPTIONS);
    return result as T;
  } finally {
    session.endSession();
  }
}
