// src/modules/identity/abilities.ts — RBAC + ABAC policy with CASL 5 (verified on Node 12.4).
import { Ability, AbilityBuilder, AbilityClass, ForcedSubject } from '@casl/ability';
import { ObjectId } from 'mongodb';

type Action = 'read' | 'update' | 'submit' | 'review' | 'suspend';
type SubjectName = 'Technology' | 'Demand' | 'Deal' | 'Document';

// Fields that permission conditions may refer to. Tagging the type with its subject name lets
// TypeScript check condition objects; documents are wrapped with subject('Technology', doc) at check time.
interface TechnologySubject extends ForcedSubject<'Technology'> {
  _id: ObjectId;
  ownerOrganizationId: ObjectId;
  lifecycleStatus: string;
  visibility: string;
}
interface GenericSubject extends ForcedSubject<Exclude<SubjectName, 'Technology'>> { _id: ObjectId }

export type AppAbility = Ability<[Action, SubjectName | TechnologySubject | GenericSubject]>;
const AppAbility = Ability as AbilityClass<AppAbility>;

export interface SessionUser {
  userId: ObjectId;
  memberships: { organizationId: ObjectId; roleCodes: string[]; status: 'active' | 'invited' | 'revoked' }[];
  platformRoles: string[];                                   // from platform_role_assignments
  accessGrants: { resourceType: SubjectName; resourceId: ObjectId }[];   // explicit grants (e.g. NDA-covered)
}

const MANAGES_TECHNOLOGY = ['org_owner', 'org_admin', 'technology_manager'];

export function defineAbilityFor(user: SessionUser | null): AppAbility {
  const { can, cannot, build } = new AbilityBuilder(AppAbility);

  // Everyone, including anonymous visitors: published public listings only.
  can('read', 'Technology', { lifecycleStatus: 'published', visibility: 'public' });

  if (user) {
    for (const m of user.memberships.filter((x) => x.status === 'active')) {
      can('read', 'Technology', { ownerOrganizationId: m.organizationId });
      if (m.roleCodes.some((r) => MANAGES_TECHNOLOGY.includes(r))) {
        can(['update', 'submit'], 'Technology', { ownerOrganizationId: m.organizationId });
      }
    }
    for (const g of user.accessGrants) {
      can('read', g.resourceType, { _id: g.resourceId });
    }
    if (user.platformRoles.includes('listing_reviewer')) {
      can('review', 'Technology', { lifecycleStatus: { $in: ['submitted', 'in_review'] } });
    }
    if (user.platformRoles.includes('compliance_officer')) {
      can('suspend', 'Technology', { lifecycleStatus: 'published' });
    }
  }

  // State rules apply on top of role rules ("cannot" wins over "can").
  cannot('submit', 'Technology', { lifecycleStatus: { $nin: ['draft', 'changes_requested'] } });
  cannot('update', 'Technology', { lifecycleStatus: { $in: ['submitted', 'in_review', 'suspended', 'archived'] } });
  return build();
}
