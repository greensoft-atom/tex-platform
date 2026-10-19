// migrations/001-core-schema.js — run by migrate-mongo (or any runner that passes a Db).
// Creates collections with $jsonSchema validators and the indexes the application relies on.

const STR = { bsonType: 'string' };
const OID = { bsonType: 'objectId' };
const DATE = { bsonType: 'date' };
const INT = { bsonType: 'int' };
const LONG = { bsonType: 'long' };
const enumOf = (...values) => ({ bsonType: 'string', enum: values });
const nullable = (schema) => ({ ...schema, bsonType: [schema.bsonType, 'null'] });
const i18nText = {                       // bilingual text: Chinese required, English optional
  bsonType: 'object',
  required: ['zh'],
  properties: { zh: STR, en: STR },
};
const money = {                          // integer minor units (fen for CNY), never floating point
  bsonType: 'object',
  required: ['currency', 'amountMinor'],
  properties: { currency: { bsonType: 'string', pattern: '^[A-Z]{3}$' }, amountMinor: LONG },
};
const audit = { createdAt: DATE, updatedAt: DATE, rev: INT };   // rev = optimistic-concurrency counter

async function ensureCollection(db, name, jsonSchema, extraValidator) {
  const validator = extraValidator
    ? { $and: [{ $jsonSchema: jsonSchema }, extraValidator] }
    : { $jsonSchema: jsonSchema };
  const exists = await db.listCollections({ name }).hasNext();
  if (exists) {
    await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
  } else {
    await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
  }
}

module.exports = {
  async up(db, client) {
    const auditDb = client.db('tex_audit');

    // ---------- Identity and organizations ----------
    await ensureCollection(db, 'users', {
      bsonType: 'object',
      required: ['displayName', 'status', 'createdAt', 'updatedAt', 'rev'],
      properties: {
        emailNormalized: STR,                               // lower-cased email
        phoneE164: { bsonType: 'string', pattern: '^\\+[1-9][0-9]{6,14}$' },
        displayName: STR,
        authSubject: STR,                                   // subject id at an external IdP, if used
        passwordHash: STR,                                  // argon2id hash, never plaintext
        status: enumOf('pending', 'active', 'suspended', 'closed'),
        emailVerifiedAt: DATE,
        phoneVerifiedAt: DATE,
        realName: {
          bsonType: 'object',
          properties: { status: enumOf('none', 'pending', 'verified', 'failed'), verifiedAt: DATE },
        },
        locale: enumOf('zh-CN', 'en'),
        ...audit,
      },
    });
    await db.collection('users').createIndexes([
      { key: { emailNormalized: 1 }, unique: true, partialFilterExpression: { emailNormalized: { $type: 'string' } } },
      { key: { phoneE164: 1 }, unique: true, partialFilterExpression: { phoneE164: { $type: 'string' } } },
      { key: { authSubject: 1 }, unique: true, partialFilterExpression: { authSubject: { $type: 'string' } } },
    ]);

    await ensureCollection(db, 'organizations', {
      bsonType: 'object',
      required: ['ref', 'legalName', 'displayName', 'organizationType', 'jurisdictionCode', 'verification', 'status', 'createdAt', 'updatedAt', 'rev'],
      properties: {
        ref: { bsonType: 'string', pattern: '^ORG-[0-9]{6,}$' },   // human-readable reference
        legalName: STR,
        displayName: STR,
        organizationType: enumOf('university', 'research_institute', 'company', 'startup', 'government', 'service_provider', 'individual'),
        jurisdictionCode: { bsonType: 'string', pattern: '^[A-Z]{2}$' },   // ISO 3166-1 alpha-2
        registrationNumber: STR,                            // e.g. unified social credit code (CN)
        websiteUrl: STR,
        description: i18nText,
        verification: {
          bsonType: 'object',
          required: ['status'],
          properties: {
            status: enumOf('pending', 'in_review', 'verified', 'rejected', 'expired', 'suspended'),
            level: INT,
            verifiedAt: DATE,
            expiresAt: DATE,
            caseId: OID,
          },
        },
        status: enumOf('active', 'suspended', 'closed'),
        ...audit,
      },
    });
    await db.collection('organizations').createIndexes([
      { key: { ref: 1 }, unique: true },
      {
        key: { jurisdictionCode: 1, registrationNumber: 1 },
        unique: true,
        partialFilterExpression: { registrationNumber: { $type: 'string' } },
      },
      { key: { 'verification.status': 1, createdAt: 1 } },
    ]);

    await ensureCollection(db, 'organization_memberships', {
      bsonType: 'object',
      required: ['organizationId', 'userId', 'roleCodes', 'status', 'createdAt', 'updatedAt'],
      properties: {
        organizationId: OID,
        userId: OID,
        roleCodes: {
          bsonType: 'array',
          minItems: 1,
          uniqueItems: true,
          items: enumOf('org_owner', 'org_admin', 'technology_manager', 'demand_manager', 'deal_manager', 'viewer'),
        },
        status: enumOf('invited', 'active', 'revoked'),
        invitedBy: OID,
        acceptedAt: DATE,
        createdAt: DATE,
        updatedAt: DATE,
      },
    });
    await db.collection('organization_memberships').createIndexes([
      { key: { organizationId: 1, userId: 1 }, unique: true },
      { key: { userId: 1, status: 1 } },
    ]);

    // Delegated authority: who may sign, approve payments, etc. for an organization (see 07 §2, 08 §2.3).
    await db.collection('organization_authorizations').createIndexes([
      { key: { organizationId: 1, userId: 1, scope: 1, status: 1 } },
    ]);

    // Platform staff roles are separate from organization roles.
    await db.collection('platform_role_assignments').createIndexes([
      { key: { userId: 1, roleCode: 1 }, unique: true },
    ]);

    // ---------- Technology registry ----------
    await ensureCollection(db, 'technologies', {
      bsonType: 'object',
      required: ['ref', 'ownerOrganizationId', 'technologyType', 'lifecycleStatus', 'visibility', 'currentVersion', 'createdBy', 'createdAt', 'updatedAt', 'rev'],
      properties: {
        ref: { bsonType: 'string', pattern: '^TEC-[0-9]{6,}$' },
        ownerOrganizationId: OID,
        technologyType: STR,                                // validated against the taxonomy in the app
        lifecycleStatus: enumOf(
          'draft', 'submitted', 'in_review', 'changes_requested', 'approved',
          'rejected', 'published', 'update_pending', 'suspended', 'archived',
        ),
        visibility: enumOf('private', 'public', 'restricted'),
        currentVersion: INT,
        publishedVersion: nullable(INT),
        createdBy: OID,
        ...audit,
      },
    });
    await db.collection('technologies').createIndexes([
      { key: { ref: 1 }, unique: true },
      { key: { ownerOrganizationId: 1, lifecycleStatus: 1 } },
    ]);

    // Immutable revisions: never updated after `frozen: true` (enforced in the repository layer).
    await ensureCollection(db, 'technology_versions', {
      bsonType: 'object',
      required: ['technologyId', 'version', 'title', 'frozen', 'createdBy', 'createdAt'],
      properties: {
        technologyId: OID,
        version: INT,
        title: i18nText,
        publicSummary: i18nText,
        technicalDescription: i18nText,
        industryCodes: { bsonType: 'array', items: STR },
        applicationCodes: { bsonType: 'array', items: STR },
        claimedTrl: { bsonType: ['int', 'null'], minimum: 1, maximum: 9 },
        assessedTrl: { bsonType: ['int', 'null'], minimum: 1, maximum: 9 },
        technicalAttributes: { bsonType: 'object' },       // flexible, sector-specific fields
        frozen: { bsonType: 'bool' },
        createdBy: OID,
        createdAt: DATE,
      },
    });
    await db.collection('technology_versions').createIndexes([
      { key: { technologyId: 1, version: 1 }, unique: true },
    ]);

    // Approved public snapshot. The ONLY technology data that MongoDB Search indexes for public search.
    await db.collection('technology_publications').createIndexes([
      { key: { technologyId: 1 }, unique: true, partialFilterExpression: { status: 'live' } },
      { key: { status: 1, industryCodes: 1, 'trl.claimed': 1 } },
    ]);

    await db.collection('ip_assets').createIndexes([
      { key: { technologyId: 1 } },
      { key: { jurisdictionCode: 1, identifier: 1 } },     // duplicate detection across technologies
    ]);

    await ensureCollection(db, 'technology_offers', {
      bsonType: 'object',
      required: ['ref', 'technologyId', 'technologyVersion', 'supplierOrganizationId', 'transactionType', 'offerStatus', 'exclusivity', 'price', 'createdBy', 'createdAt', 'updatedAt', 'rev'],
      properties: {
        ref: { bsonType: 'string', pattern: '^OFR-[0-9]{6,}$' },
        technologyId: OID,
        technologyVersion: INT,
        supplierOrganizationId: OID,
        transactionType: enumOf('license', 'assignment', 'partnership', 'joint_development', 'pilot', 'evaluation', 'equity_investment'),
        offerStatus: enumOf('draft', 'submitted', 'active', 'paused', 'under_negotiation', 'closed', 'expired', 'rejected'),
        rightsScope: { bsonType: 'object' },
        territoryCodes: { bsonType: 'array', items: STR },
        fieldOfUse: STR,
        exclusivity: enumOf('exclusive', 'sole', 'non_exclusive', 'unspecified'),
        price: {
          bsonType: 'object',
          required: ['type'],
          properties: {
            type: enumOf('fixed', 'indicative', 'negotiable', 'royalty_based', 'milestone_based', 'undisclosed'),
            indicative: money,
          },
        },
        validFrom: DATE,
        validUntil: DATE,
        createdBy: OID,
        ...audit,
      },
    }, {
      $expr: {
        $or: [
          { $eq: [{ $ifNull: ['$validFrom', null] }, null] },
          { $eq: [{ $ifNull: ['$validUntil', null] }, null] },
          { $gt: ['$validUntil', '$validFrom'] },
        ],
      },
    });
    await db.collection('technology_offers').createIndexes([
      { key: { ref: 1 }, unique: true },
      { key: { technologyId: 1, offerStatus: 1 } },
      { key: { supplierOrganizationId: 1, offerStatus: 1 } },
    ]);

    // ---------- Demands and matching ----------
    await ensureCollection(db, 'demands', {
      bsonType: 'object',
      required: ['ref', 'buyerOrganizationId', 'status', 'visibility', 'currentVersion', 'createdBy', 'createdAt', 'updatedAt', 'rev'],
      properties: {
        ref: { bsonType: 'string', pattern: '^DEM-[0-9]{6,}$' },
        buyerOrganizationId: OID,
        status: enumOf(
          'draft', 'submitted', 'clarification', 'approved', 'rejected', 'matching', 'shortlisted',
          'no_candidates', 'introduction', 'in_evaluation', 'negotiation', 'fulfilled', 'withdrawn', 'expired',
        ),
        visibility: enumOf('private', 'anonymous_public', 'verified_users', 'broker_only'),
        currentVersion: INT,
        assignedManagerId: OID,
        closureReason: STR,
        createdBy: OID,
        ...audit,
      },
    });
    await db.collection('demands').createIndexes([
      { key: { ref: 1 }, unique: true },
      { key: { buyerOrganizationId: 1, status: 1 } },
      { key: { assignedManagerId: 1, status: 1 } },
    ]);

    await ensureCollection(db, 'demand_versions', {
      bsonType: 'object',
      required: ['demandId', 'version', 'title', 'problemStatement', 'createdBy', 'createdAt'],
      properties: {
        demandId: OID,
        version: INT,
        title: i18nText,
        problemStatement: i18nText,
        hardConstraints: { bsonType: 'object' },           // filters: must be met
        preferredAttributes: { bsonType: 'object' },       // ranking preferences
        industryCodes: { bsonType: 'array', items: STR },
        transactionTypes: { bsonType: 'array', items: STR },
        budget: {
          bsonType: 'object',
          required: ['currency'],
          properties: {
            currency: { bsonType: 'string', pattern: '^[A-Z]{3}$' },
            minMinor: { bsonType: 'long', minimum: 0 },
            maxMinor: { bsonType: 'long', minimum: 0 },
          },
        },
        targetDate: DATE,
        createdBy: OID,
        createdAt: DATE,
      },
    }, {
      // budget.minMinor <= budget.maxMinor when both are present
      $expr: {
        $lte: [
          { $ifNull: ['$budget.minMinor', 0] },
          { $ifNull: ['$budget.maxMinor', { $ifNull: ['$budget.minMinor', 0] }] },
        ],
      },
    });
    await db.collection('demand_versions').createIndexes([
      { key: { demandId: 1, version: 1 }, unique: true },
    ]);

    await ensureCollection(db, 'matches', {
      bsonType: 'object',
      required: ['demandId', 'demandVersion', 'offerId', 'technologyId', 'technologyVersion', 'retrievalMethod', 'rankingVersion', 'eligibilityStatus', 'reviewStatus', 'createdAt'],
      properties: {
        demandId: OID,
        demandVersion: INT,
        offerId: OID,
        technologyId: OID,
        technologyVersion: INT,
        retrievalMethod: enumOf('structured', 'full_text', 'semantic', 'manual'),
        rankingVersion: STR,
        score: { bsonType: ['double', 'int', 'null'], minimum: 0, maximum: 100 },
        scoreComponents: { bsonType: 'object' },
        explanation: { bsonType: 'object' },
        eligibilityStatus: enumOf('eligible', 'ineligible', 'needs_review'),
        reviewStatus: enumOf('pending', 'accepted', 'rejected', 'shortlisted'),
        rejectionReason: STR,
        createdAt: DATE,
      },
    });
    await db.collection('matches').createIndexes([
      // Re-running the same matching job must not create duplicates.
      { key: { demandId: 1, demandVersion: 1, offerId: 1, rankingVersion: 1 }, unique: true },
      { key: { demandId: 1, demandVersion: 1, score: -1 } },
      { key: { offerId: 1 } },
    ]);

    // ---------- Introductions and deals ----------
    await ensureCollection(db, 'introduction_requests', {
      bsonType: 'object',
      required: ['ref', 'matchId', 'buyerOrganizationId', 'supplierOrganizationId', 'requestedBy', 'status', 'createdAt', 'updatedAt', 'rev'],
      properties: {
        ref: { bsonType: 'string', pattern: '^INT-[0-9]{6,}$' },
        matchId: OID,
        buyerOrganizationId: OID,
        supplierOrganizationId: OID,
        requestedBy: OID,
        status: enumOf('requested', 'under_review', 'supplier_pending', 'approved', 'rejected', 'withdrawn', 'introduced', 'converted_to_deal'),
        buyerMessage: STR,
        supplierResponse: STR,
        disclosureScope: { bsonType: 'object' },
        assignedManagerId: OID,
        ...audit,
      },
    }, { $expr: { $ne: ['$buyerOrganizationId', '$supplierOrganizationId'] } });
    await db.collection('introduction_requests').createIndexes([
      { key: { ref: 1 }, unique: true },
      { key: { supplierOrganizationId: 1, status: 1 } },
      { key: { buyerOrganizationId: 1, status: 1 } },
      { key: { matchId: 1 } },
    ]);

    await ensureCollection(db, 'deals', {
      bsonType: 'object',
      required: ['ref', 'dealType', 'status', 'name', 'parties', 'createdBy', 'createdAt', 'updatedAt', 'rev'],
      properties: {
        ref: { bsonType: 'string', pattern: '^DEAL-[0-9]{6,}$' },
        introductionRequestId: OID,
        dealType: enumOf(
          'ip_license', 'ip_assignment', 'technical_service', 'technology_consulting', 'rnd_collaboration',
          'technology_supply', 'commercialization', 'investment', 'joint_venture',
        ),
        status: enumOf(
          'opportunity', 'qualified', 'due_diligence', 'negotiation', 'contract_draft', 'approval',
          'signed', 'conditions_pending', 'completed', 'on_hold', 'lost', 'disputed',
        ),
        name: STR,
        parties: {
          bsonType: 'array',
          minItems: 2,
          items: {
            bsonType: 'object',
            required: ['organizationId', 'role', 'status'],
            properties: {
              organizationId: OID,
              role: enumOf('buyer', 'supplier', 'broker', 'licensor', 'licensee', 'investor', 'other'),
              status: enumOf('active', 'withdrawn'),
            },
          },
        },
        assignedManagerId: OID,
        expectedCloseDate: DATE,
        estimatedValue: money,
        lossReason: STR,
        createdBy: OID,
        ...audit,
      },
    });
    await db.collection('deals').createIndexes([
      { key: { ref: 1 }, unique: true },
      // One deal per introduction (idempotent conversion).
      { key: { introductionRequestId: 1 }, unique: true, partialFilterExpression: { introductionRequestId: { $type: 'objectId' } } },
      { key: { 'parties.organizationId': 1, status: 1 } },
      { key: { assignedManagerId: 1, status: 1 } },
    ]);

    await db.collection('deal_milestones').createIndexes([
      { key: { dealId: 1, dueDate: 1 } },
      { key: { status: 1, dueDate: 1 } },
    ]);

    // ---------- Documents and review ----------
    await ensureCollection(db, 'documents', {
      bsonType: 'object',
      required: ['ownerOrganizationId', 'uploadedBy', 'storageKey', 'originalFilename', 'mediaType', 'byteSize', 'classification', 'scanStatus', 'lifecycleStatus', 'links', 'createdAt'],
      properties: {
        ownerOrganizationId: OID,
        uploadedBy: OID,
        storageKey: STR,
        originalFilename: STR,
        mediaType: STR,
        byteSize: { bsonType: ['long', 'int'], minimum: 0 },
        sha256: { bsonType: 'string', pattern: '^[a-f0-9]{64}$' },
        classification: enumOf('public', 'organization_only', 'deal_restricted', 'highly_confidential'),
        scanStatus: enumOf('pending', 'clean', 'infected', 'failed'),
        lifecycleStatus: enumOf('quarantined', 'available', 'suspended', 'deleted'),
        links: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['resourceType', 'resourceId', 'purpose'],
            properties: {
              resourceType: enumOf('organization', 'technology', 'ip_asset', 'demand', 'deal', 'review_case'),
              resourceId: OID,
              purpose: enumOf('evidence', 'data_room', 'contract', 'verification', 'deliverable', 'other'),
            },
          },
        },
        createdAt: DATE,
      },
    });
    await db.collection('documents').createIndexes([
      { key: { storageKey: 1 }, unique: true },
      { key: { 'links.resourceType': 1, 'links.resourceId': 1 } },
      { key: { ownerOrganizationId: 1, createdAt: -1 } },
    ]);

    await db.collection('document_access_grants').createIndexes([
      { key: { documentId: 1, granteeOrganizationId: 1 } },
      { key: { dealId: 1 } },
    ]);

    await ensureCollection(db, 'review_cases', {
      bsonType: 'object',
      required: ['ref', 'caseType', 'resource', 'status', 'priority', 'createdAt'],
      properties: {
        ref: { bsonType: 'string', pattern: '^CASE-[0-9]{6,}$' },
        caseType: enumOf('organization_verification', 'technology_review', 'ip_verification', 'demand_review', 'introduction_review', 'dispute'),
        resource: {
          bsonType: 'object',
          required: ['type', 'id'],
          properties: { type: STR, id: OID, version: INT },  // exact version under review
        },
        status: enumOf('open', 'assigned', 'in_review', 'waiting_for_submitter', 'approved', 'rejected', 'escalated', 'closed'),
        priority: enumOf('low', 'normal', 'high', 'urgent'),
        assignedTo: OID,
        decision: STR,
        decisionReason: STR,
        dueAt: DATE,
        createdAt: DATE,
        closedAt: DATE,
      },
    });
    await db.collection('review_cases').createIndexes([
      { key: { ref: 1 }, unique: true },
      { key: { status: 1, priority: 1, dueAt: 1 } },
      { key: { assignedTo: 1, status: 1 } },
      { key: { 'resource.type': 1, 'resource.id': 1 } },
    ]);

    // ---------- Workflow infrastructure ----------
    await db.collection('workflow_transitions').createIndexes([
      { key: { 'resource.type': 1, 'resource.id': 1, occurredAt: 1 } },
    ]);

    await ensureCollection(db, 'idempotency_keys', {
      bsonType: 'object',
      required: ['actorUserId', 'key', 'requestHash', 'createdAt', 'expiresAt'],
      properties: {
        actorUserId: OID,
        key: STR,
        requestHash: { bsonType: 'string', pattern: '^[a-f0-9]{64}$' },  // detects key reuse with another payload
        responseCode: INT,
        responseBody: { bsonType: 'object' },
        createdAt: DATE,
        expiresAt: DATE,
      },
    });
    await db.collection('idempotency_keys').createIndexes([
      { key: { actorUserId: 1, key: 1 }, unique: true },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },      // TTL: MongoDB deletes expired keys
    ]);

    // Transactional outbox: written in the same transaction as the business change.
    await ensureCollection(db, 'outbox_events', {
      bsonType: 'object',
      required: ['eventType', 'aggregate', 'payload', 'status', 'attempts', 'createdAt'],
      properties: {
        eventType: STR,                                    // e.g. technology.published
        aggregate: { bsonType: 'object', required: ['type', 'id'], properties: { type: STR, id: OID } },
        payload: { bsonType: 'object' },
        status: enumOf('pending', 'published', 'failed'),
        attempts: INT,
        lockedUntil: DATE,
        lastError: STR,
        createdAt: DATE,
        publishedAt: DATE,
      },
    });
    await db.collection('outbox_events').createIndexes([
      { key: { createdAt: 1 }, partialFilterExpression: { status: 'pending' } },
    ]);

    // Human-readable references (TEC-000123): one counter document per prefix, incremented atomically.
    await db.collection('counters').createIndex({ _id: 1 });

    // ---------- Audit (separate database, insert-only for the application) ----------
    const auditSchema = {
      bsonType: 'object',
      required: ['actor', 'action', 'resource', 'occurredAt'],
      properties: {
        actor: { bsonType: 'object', required: ['type'], properties: { type: enumOf('user', 'system', 'integration'), userId: OID } },
        organizationId: OID,
        action: STR,
        resource: { bsonType: 'object', required: ['type', 'id'], properties: { type: STR, id: OID } },
        correlationId: STR,
        reason: STR,
        details: { bsonType: 'object' },
        occurredAt: DATE,
      },
    };
    await ensureCollection(auditDb, 'audit_events', auditSchema);
    await auditDb.collection('audit_events').createIndexes([
      { key: { 'resource.type': 1, 'resource.id': 1, occurredAt: -1 } },
      { key: { 'actor.userId': 1, occurredAt: -1 } },
    ]);
  },

  async down() {
    // Schema migrations are forward-only in production; restore from backup instead of dropping data.
  },
};
