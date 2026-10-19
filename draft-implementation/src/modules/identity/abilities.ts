// src/modules/identity/abilities.ts — RBAC + ABAC policy with CASL 5 (verified on Node 12.4).
// CASL recognises a Mongoose document by its model name, so services check loaded documents directly:
//   ForbiddenError.from(ability).throwUnlessCan('submit', tech)
// and list endpoints turn the same rules into a MongoDB filter:
//   Technology.accessibleBy(ability, 'update')
import { Ability, AbilityBuilder, AbilityClass, ForcedSubject } from '@casl/ability';
import { Types } from 'mongoose';
import type { DealDoc } from '../deals/deal.model';
import type { DemandDoc } from '../demands/demand.model';
import type { DocumentFileDoc } from '../documents/document.model';
import type { TechnologyDoc } from '../technology/technology.model';
import type { ReviewCaseDoc } from '../workflow/workflow.model';

export type Action =
  | 'create' | 'read' | 'update' | 'submit' | 'review' | 'suspend' | 'reinstate' | 'delete'
  | 'respond'                                        // answer a reviewer's question (06 §6.7)
  | 'assign';                                        // assign or reassign a review case
export type SubjectName = 'Technology' | 'Demand' | 'Deal' | 'DocumentFile' | 'ReviewCase';

// Plain objects (e.g. API payloads, tests) can be checked with subject('Technology', obj).
type PlainSubject = ForcedSubject<SubjectName> & Record<string, unknown>;
export type AppSubject = SubjectName | TechnologyDoc | DemandDoc | DealDoc | DocumentFileDoc | ReviewCaseDoc | PlainSubject;
export type AppAbility = Ability<[Action, AppSubject]>;
const AppAbility = Ability as AbilityClass<AppAbility>;

export interface SessionUser {
  userId: Types.ObjectId;
  memberships: { organizationId: Types.ObjectId; roleCodes: string[]; status: 'active' | 'invited' | 'revoked' }[];
  platformRoles: string[];                                            // from platform_role_assignments
  accessGrants: { resourceType: SubjectName; resourceId: Types.ObjectId }[];   // explicit grants (e.g. NDA-covered)
}

const MANAGES_TECHNOLOGY = ['org_owner', 'org_admin', 'technology_manager'];
// 06 §6.1: drafts and revised listings are submitted for review; a published listing submits a revision.
const SUBMITTABLE: string[] = ['draft', 'changes_requested', 'published'];
const LOCKED: string[] = ['submitted', 'in_review', 'approved', 'update_pending', 'rejected', 'suspended', 'archived'];

export function defineAbilityFor(user: SessionUser | null): AppAbility {
  const { can, cannot, build } = new AbilityBuilder(AppAbility);

  // Everyone, including anonymous visitors: published public listings only.
  can('read', 'Technology', { lifecycleStatus: 'published', visibility: 'public' });

  if (user) {
    for (const m of user.memberships.filter((x) => x.status === 'active')) {
      can('read', 'Technology', { ownerOrganizationId: m.organizationId });
      if (m.roleCodes.some((r) => MANAGES_TECHNOLOGY.includes(r))) {
        can(['create', 'update', 'submit'], 'Technology', { ownerOrganizationId: m.organizationId });
        can('respond', 'Technology', { ownerOrganizationId: m.organizationId, lifecycleStatus: { $in: ['in_review', 'update_pending'] } });
        can('delete', 'Technology', { ownerOrganizationId: m.organizationId, lifecycleStatus: 'draft', currentVersion: 1 });
      }
    }
    for (const g of user.accessGrants) {
      can('read', g.resourceType, { _id: g.resourceId });
    }
    if (user.platformRoles.includes('listing_reviewer')) {
      can('review', 'Technology', { lifecycleStatus: { $in: ['submitted', 'in_review', 'update_pending'] } });
      can('review', 'ReviewCase', { caseType: { $in: ['technology_review', 'ip_verification', 'demand_review'] } });
      can('reinstate', 'Technology', { lifecycleStatus: 'suspended' });
    }
    if (user.platformRoles.includes('verification_reviewer')) {
      can('review', 'ReviewCase', { caseType: 'organization_verification' });
    }
    if (user.platformRoles.includes('operations_manager')) {
      can('assign', 'ReviewCase');
    }
    if (user.platformRoles.includes('compliance_officer')) {
      can('suspend', 'Technology', { lifecycleStatus: 'published' });
    }
  }

  // State rules apply on top of role rules ("cannot" wins over "can").
  cannot('submit', 'Technology', { lifecycleStatus: { $nin: SUBMITTABLE } });
  cannot('update', 'Technology', { lifecycleStatus: { $in: LOCKED } });
  return build();
}
