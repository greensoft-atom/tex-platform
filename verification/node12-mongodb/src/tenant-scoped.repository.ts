// src/core/data/tenant-scoped.repository.ts — MongoDB has no row-level security,
// so every query on tenant-owned data goes through this wrapper. Services never receive raw collections.
import { ClientSession, Collection, FilterQuery, ObjectId, UpdateQuery } from 'mongodb';

export interface TenantContext { organizationIds: ObjectId[] }

export class TenantScopeError extends Error {}

export class TenantScopedRepository<T extends { _id: ObjectId }> {
  constructor(
    private readonly col: Collection<T>,
    private readonly tenantField: keyof T & string,     // e.g. 'ownerOrganizationId'
  ) {}

  private scoped(ctx: TenantContext, filter: FilterQuery<T>): FilterQuery<T> {
    if (!ctx.organizationIds.length) throw new TenantScopeError('Tenant scope is required');
    return { $and: [filter, { [this.tenantField]: { $in: ctx.organizationIds } }] } as FilterQuery<T>;
  }

  findOne(ctx: TenantContext, filter: FilterQuery<T>, session?: ClientSession) {
    return this.col.findOne(this.scoped(ctx, filter), { session });
  }

  findPage(ctx: TenantContext, filter: FilterQuery<T>, limit: number, afterId?: ObjectId) {
    const page = afterId ? { $and: [filter, { _id: { $gt: afterId } }] } as FilterQuery<T> : filter;
    return this.col.find(this.scoped(ctx, page)).sort({ _id: 1 }).limit(Math.min(limit, 100)).toArray();
  }

  /** Optimistic concurrency: the update only applies if `rev` still matches. */
  async updateWithRev(ctx: TenantContext, id: ObjectId, rev: number, update: UpdateQuery<T>, session?: ClientSession) {
    const res = await this.col.updateOne(
      this.scoped(ctx, { _id: id, rev } as FilterQuery<T>),
      // Merge the rev increment into any $inc the caller already supplied.
      ({ ...update, $inc: { ...(update.$inc || {}), rev: 1 } } as unknown) as UpdateQuery<T>,
      { session },
    );
    return res.modifiedCount === 1;                 // false -> 409 VERSION_CONFLICT (or 404 if not visible)
  }
}
