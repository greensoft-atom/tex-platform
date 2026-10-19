// src/core/db/tenant-scope.plugin.ts — MongoDB has no row-level security, so every query on a
// tenant-owned model must say whose data it may touch. Forgetting to do so is an error, never a leak.
//
//   Technology.find(filter).setOptions({ tenant: ctx })                    // organization users
//   Technology.find(filter).setOptions({ crossTenant: { reason: 'CASE-000123' } })   // staff, audited by the caller
//   Technology.aggregate(pipeline).option({ tenant: ctx })
import { Aggregate, Query, Schema, Types } from 'mongoose';

export interface TenantContext { organizationIds: Types.ObjectId[] }
export interface CrossTenantAccess { reason: string }
export interface TenantScopeOptions { tenant?: TenantContext; crossTenant?: CrossTenantAccess }

// Lets TypeScript accept query.setOptions({ tenant }) and { crossTenant }.
declare module 'mongoose' {
  interface QueryOptions { tenant?: TenantContext; crossTenant?: CrossTenantAccess }
}

export class TenantScopeError extends Error {
  constructor(message: string) { super(message); this.name = 'TenantScopeError'; }
}

const QUERY_HOOKS = [
  'count', 'countDocuments', 'distinct', 'estimatedDocumentCount', 'find', 'findOne', 'findOneAndDelete',
  'findOneAndRemove', 'findOneAndReplace', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'remove', 'replaceOne',
  'update', 'updateOne', 'updateMany',
];
const SCOPED = Symbol('tenantScoped');

/** Builds the filter for the tenant, or returns null for audited cross-tenant (staff) access. */
function scopeFilter(model: string, fields: string[], options: TenantScopeOptions) {
  if (options.crossTenant) {
    if (!options.crossTenant.reason) throw new TenantScopeError(`${model}: cross-tenant access needs a reason`);
    return null;
  }
  const ids = options.tenant && options.tenant.organizationIds;
  if (!ids || ids.length === 0) throw new TenantScopeError(`${model}: tenant scope is required`);
  const clauses = fields.map((field) => ({ [field]: { $in: ids } }));
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

/** `fields`: the organization reference(s) that own a document, e.g. ['ownerOrganizationId']. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tenantScopePlugin(schema: Schema<any>, opts: { fields: string[] }): void {
  // One registration per hook: the 5.13 typings omit some query hooks (countDocuments, replaceOne).
  for (const hook of QUERY_HOOKS) schema.pre(hook, { document: false, query: true }, applyScope);

  function applyScope(this: Query<unknown, unknown>) {
    const query = this as Query<unknown, unknown> & { [SCOPED]?: boolean };
    if (query[SCOPED]) return;                                    // re-executed query: already scoped
    const options = query.getOptions() as TenantScopeOptions;
    // estimatedDocumentCount() ignores filters, so it cannot be scoped: staff only (use countDocuments otherwise).
    if ((query as unknown as { op: string }).op === 'estimatedDocumentCount' && !options.crossTenant) {
      throw new TenantScopeError(`${query.model.modelName}: estimatedDocumentCount cannot be tenant-scoped; use countDocuments`);
    }
    const filter = scopeFilter(query.model.modelName, opts.fields, options);
    if (filter) query.and([filter]);
    delete options.tenant;                                        // never forwarded to the driver
    delete options.crossTenant;
    query[SCOPED] = true;
  }

  schema.pre('aggregate', function (this: Aggregate<unknown>) {
    const aggregate = this as Aggregate<unknown> & { options: TenantScopeOptions; model(): { modelName: string } };
    const options = aggregate.options || {};
    const filter = scopeFilter(aggregate.model().modelName, opts.fields, options);
    if (filter) aggregate.pipeline().unshift({ $match: filter });
    delete options.tenant;
    delete options.crossTenant;
  });
}
