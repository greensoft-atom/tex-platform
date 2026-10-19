// src/models.ts — registers every model; used by the index-sync release step and by tests.
import { Model } from 'mongoose';
import { IdempotencyKey } from './core/http/idempotency-key.model';
import { AuditEvent } from './modules/audit/audit-event.model';
import { Deal, DealMilestone } from './modules/deals/deal.model';
import { Demand, DemandVersion } from './modules/demands/demand.model';
import { DocumentAccessGrant, DocumentFile } from './modules/documents/document.model';
import { IntroductionRequest } from './modules/exchange/introduction.model';
import { PlatformRoleAssignment, User } from './modules/identity/user.model';
import { Match } from './modules/matching/match.model';
import { TechnologyOffer } from './modules/offers/offer.model';
import { Organization, OrganizationAuthorization, OrganizationMembership } from './modules/organizations/organization.model';
import { IpAsset, Technology, TechnologyPublication, TechnologyVersion } from './modules/technology/technology.model';
import { Counter, OutboxEvent, ReviewCase, WorkflowTransition } from './modules/workflow/workflow.model';

export {
  AuditEvent, Counter, Deal, DealMilestone, Demand, DemandVersion, DocumentAccessGrant, DocumentFile,
  IdempotencyKey, IntroductionRequest, IpAsset, Match, Organization, OrganizationAuthorization,
  OrganizationMembership, OutboxEvent, PlatformRoleAssignment, ReviewCase, Technology, TechnologyOffer,
  TechnologyPublication, TechnologyVersion, User, WorkflowTransition,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const allModels: Model<any>[] = [
  User, PlatformRoleAssignment, Organization, OrganizationMembership, OrganizationAuthorization,
  Technology, TechnologyVersion, TechnologyPublication, IpAsset, TechnologyOffer,
  Demand, DemandVersion, Match, IntroductionRequest, Deal, DealMilestone,
  DocumentFile, DocumentAccessGrant, ReviewCase, WorkflowTransition, OutboxEvent, Counter,
  IdempotencyKey, AuditEvent,
];
