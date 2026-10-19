// src/core/db/immutability.plugins.ts — immutable history enforced in the model layer.
// (The database role adds a second line of defence for the audit trail: texApp may only insert there.)
import { Document, Model, Query, Schema } from 'mongoose';

export class ImmutableRecordError extends Error {
  constructor(message: string) { super(message); this.name = 'ImmutableRecordError'; }
}

const UPDATE_HOOKS = ['update', 'updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'];
const DELETE_HOOKS = ['remove', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndRemove'];

const modelName = (doc: Document) => (doc.constructor as Model<Document>).modelName;

/** Records that are inserted once and never changed or deleted: audit events, workflow transitions. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function appendOnlyPlugin(schema: Schema<any>): void {
  schema.pre('save', function (this: Document) {
    if (!this.isNew) throw new ImmutableRecordError(`${modelName(this)}: append-only, cannot be modified`);
  });
  for (const hook of [...UPDATE_HOOKS, ...DELETE_HOOKS]) {
    schema.pre(hook, { document: false, query: true }, function (this: Query<unknown, unknown>) {
      throw new ImmutableRecordError(`${this.model.modelName}: append-only, cannot be updated or deleted`);
    });
  }
  schema.pre(['deleteOne', 'remove'], { document: true, query: false }, function (this: Document) {
    throw new ImmutableRecordError(`${modelName(this)}: append-only, cannot be deleted`);
  });
}

/**
 * Versions that can be edited as drafts and become immutable once `frozen` (on submission).
 * Document API: save() of a frozen version throws. Query API: updates never match a frozen version.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function freezablePlugin(schema: Schema<any>): void {
  schema.add({ frozen: { type: Boolean, default: false } });
  schema.post('init', function (this: Document & { frozen: boolean }) {
    this.$locals.wasFrozen = this.frozen;                      // state as loaded from the database
  });
  schema.pre('save', function (this: Document) {
    if (!this.isNew && this.$locals.wasFrozen) throw new ImmutableRecordError('frozen version cannot be modified');
  });
  for (const hook of UPDATE_HOOKS) {
    schema.pre(hook, { document: false, query: true }, function (this: Query<unknown, unknown>) {
      this.and([{ frozen: { $ne: true } }]);
    });
  }
}
