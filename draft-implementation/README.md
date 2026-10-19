# Draft implementation: Node.js 12.4 + Mongoose 5.13 + MongoDB 4.4 / 5.0

A simple, working draft of the backend data layer described in [doc 06](../06-implementation-design-v1.md): Mongoose models for all core collections, plugins for tenant isolation and immutable history, a technology service built on the Document API, the workflow infrastructure (review cases, publishing service, leased jobs with an outbox relay, working-day calendar), migrations and an index-sync release step. Its `src/` folder uses the same layout as the application (`apps/api/src`), so it can be copied into the project as starting code.

`run.sh` builds it and proves, with real binaries, that it runs on the target server stack ([doc 11](../11-target-runtime-node12-mongodb.md)). HTTP routes are not part of the draft yet; the tests call the services directly.

| Component | Version tested |
| --- | --- |
| Node.js runtime | **12.4.0** (npm 6.9) |
| MongoDB server | **4.4.30** and **5.0.33**, single-node replica set |
| ODM | **Mongoose 5.13.23**, bundling MongoDB Node driver **3.7.4** (Mongoose 6+ uses driver 4, which declares Node ≥ 12.9) |
| Authorization | CASL **5.4.4** + `@casl/mongoose` **5.0.0** |
| Migrations | `migrate-mongo` **8.2.3** (CLI run on Node 12.4.0) |
| Search | Meilisearch **v1.11.3** (HTTP API via axios) |
| TypeScript (build machine only) | 5.6.3 on `node:22.11.0-alpine`, output `ES2019` / CommonJS, strict mode |

## Run it

Requirements: Docker only. Nothing is installed on the host; containers use a private network, publish no ports and are removed afterwards. Docker is used only for these throwaway checks: the production baseline runs Node directly under systemd behind Nginx ([doc 11 §9](../11-target-runtime-node12-mongodb.md)).

```bash
./run.sh
# optional overrides
MONGO_VERSIONS="4.4" ./run.sh
NODE_RUNTIME_IMAGE=node:12.22.12 ./run.sh      # check a later Node 12 patch release
```

## What is in it

```text
src/
├── core/db/
│   ├── mongoose-settings.ts     # global settings, loaded before any model compiles
│   ├── connection.ts            # connect(), audit database via useDb()
│   ├── schema-helpers.ts        # i18nText, money, int, enumOf, ref, crossField, entity/record options
│   ├── int64.schema-type.ts     # strict BSON Int64 for money (rejects fractions)
│   ├── tenant-scope.plugin.ts   # every query on tenant data must name a tenant or a staff reason
│   ├── immutability.plugins.ts  # freezablePlugin (versions), appendOnlyPlugin (history, audit)
│   └── transaction.ts           # inTransaction(): withTransaction + result + endSession
├── core/http/idempotency-key.model.ts  # stored results of retried commands (Idempotency-Key header)
├── core/jobs/                   # leased jobs (job.model.ts, job-queue.ts) and the outbox relay (06 §6.9)
├── core/calendar/               # working-day calendar: models and the WD algorithm (06 §6.10)
├── core/actor.ts, service-errors.ts     # who acts (incl. the worker's system user) and service errors
├── modules/<module>/*.model.ts  # 23 models in 11 modules: identity, organizations, technology, offers,
│                                # demands, matching, exchange, deals, documents, workflow, audit
├── modules/identity/abilities.ts            # CASL policy
├── modules/technology/technology.service.ts # Document API use cases in transactions
├── modules/technology/publishing.service.ts # snapshots, suspension, reinstatement, search/page sync (06 §6.8)
├── modules/workflow/review-case.service.ts  # review-case lifecycle, SLA pause, maker-checker, escalation (06 §6.7)
├── models.ts                    # registry of all 27 models (used by index sync and tests)
└── scripts/sync-indexes.ts      # release step: create missing indexes / --check for drift
migrations/                      # migrate-mongo: 001 validators + sessions TTL, 002 roles, 003 review/jobs/calendar
tests/                           # plain JavaScript, run directly on Node 12.4.0
```

`package.json` pins every library that was smoke-tested, so it is **not** the application's dependency list. Some entries were only evaluated and are not in the approved stack ([doc 11 §3](../11-target-runtime-node12-mongodb.md)): NestJS 8 with `class-validator`, `class-transformer`, `reflect-metadata` and `rxjs` (considered and rejected), `joi` and `jsonwebtoken`, `@elastic/elasticsearch` (alternative search client), the `meilisearch` client (the tests call the HTTP API through `axios`), and `bull` 3 (optional, later).

## What it checks

| Step | Files | Checks |
| --- | --- | --- |
| 1 | `package.json` | All runtime dependencies install with npm 6 on Node 12.4.0 (versions pinned, lockfile v1) |
| 2 | `tsconfig.json`, `src/**/*.ts` | TypeScript compiles in strict mode to ES2019/CommonJS against the Mongoose 5.13 and Node 12 typings |
| 3 | `tests/smoke.js`, `tests/test-icu.js` | 34 smoke checks: each pinned library loads and performs a basic operation; Chinese dates and pinyin sorting work with `full-icu` (they fail with Node 12's default small ICU) |
| 4 | `migrate-mongo up` / `status`, `sync-indexes` (and `--check`) | Release steps run on Node 12.4.0; indexes declared in the schemas are created and the drift check reports nothing |
| 4 | `tests/test-mongo.js` (43 checks) | Mongoose validation (strict fields and filters, update validators, cross-field rules, Int64 money); unique, partial and TTL indexes; database validators still reject raw writes; BSON types; optimistic concurrency; frozen versions and append-only history; least-privilege role; cross-database transactions with rollback; login sessions through the Mongoose connection |
| 4 | `tests/test-documents.js` (25 checks) | Technology use cases with the Document API: create, update, stale `If-Match` (409), invalid input (422), other tenant (404), concurrent edits, `lean()` + `populate()` list, submit, revise a published listing, discard |
| 4 | `tests/test-policy.js` (27 checks) | CASL rules on plain objects and Mongoose documents; `accessibleBy()` filters; tenant-scope plugin on find, findById, updateMany, deleteMany, countDocuments, distinct, aggregate, findOneAndReplace and estimatedDocumentCount; buyer/supplier and deal-party visibility |
| 4 | `tests/test-workflow.js` (71 checks) | Working-day calendar (2025 National Day make-up days, Civil Code start-day and rest-day rules, cut-off times, missing years fail) and its maker-checker publication; leased jobs (five-worker lease race, expired-lease takeover, lost-lease completion refused, backoff, dead letters, operator retry, rollback with the business transaction); outbox fan-out and re-relay after a crash; review cases (conflict of interest, assignee-only actions, SLA pause and deadline shift, maker-checker, assignment, escalation, deadlines filled once a calendar year is published); publishing service (snapshot from the approved version only, offer activation, revision swap with one live snapshot, idempotent re-run, suspension and reinstatement, dead letter for an unapproved version, search and page sync) |
| 5 | `tests/test-search.js` (MongoDB 4.4 only) | Chinese queries: MongoDB text index returns nothing; Meilisearch returns correct results |

Step 4 runs once per MongoDB version (4.4 and 5.0). Any Node deprecation warning during the database tests counts as a failure, because it means a Mongoose setting is missing. Expected result: every line `PASS` / `OK`, `43 + 25 + 27 + 71` passed per MongoDB version (368 PASS/OK lines in a full run), and the search table:

```text
MongoDB $text  q=缺陷检测 -> []
MongoDB $text  q=电池 -> []
MongoDB $text  q=固态电解质 -> []
MongoDB $text  q=defect -> ["t3"]
Meilisearch    q=缺陷检测 -> ["t1"]
Meilisearch    q=电池 -> ["t2","t1"]
Meilisearch    q=固态电解质 -> ["t2"]
Meilisearch    q=defect -> ["t3"]
Meilisearch    q=锂电池缺陷 -> ["t1","t2"]
```

## Known incompatible or not approved on Node 12.4.0

| Package | Why |
| --- | --- |
| `mongodb` ≥ 4.0, `mongoose` ≥ 6 | Driver 4 declares Node ≥ 12.9.0. A port to Mongoose 6.13.11 passed this full suite on Node 12.22.12 (and on 12.4.0, outside the declared range) in October 2026; it is the planned R0 step after upgrading to Node 12.22.12 ([doc 11 §11.2](../11-target-runtime-node12-mongodb.md), decision D-08) |
| `@casl/mongoose` ≥ 6 | Requires Mongoose 6 |
| `mongoose-long` | Loads, but silently truncates `300000.5` to `300000`; the strict `Int64` type in `src/core/db` is used instead |
| `bull` 4.16.5 | Declares Node ≥ 12 but fails: `SyntaxError: Unexpected token ?` (optional chaining) |
| `argon2` ≥ 0.28 | Requires Node ≥ 14 (use `bcryptjs`) |
| `minio` ≥ 7.1 | Requires Node ≥ 16 (use `aws-sdk` v2 S3 client or `ali-oss`) |
| `agenda` ≥ 4 | Requires Node ≥ 12.9.0 |
| `@nestjs/*` ≥ 10, Next.js ≥ 12, Prisma, AWS SDK v3 (recent) | Require Node 14–18+ |

> Declared `engines` ranges are not reliable on this old runtime in either direction (see `bull` 4.16.5 and Mongoose 6). Every new dependency must pass `tests/smoke.js` on `node:12.4.0` before it is added.

`migrate-mongo` 8.2.3 bundles driver 4.17.2, which also declares Node ≥ 12.9. Its CLI runs on 12.4.0 in `run.sh`, and it runs only in the release step; if that ever fails, run migrations from the build machine.

## What these checks do not prove

Performance and capacity, production MongoDB configuration (authentication, TLS, 3-member replica set, backups), Meilisearch production setup, and the security posture of end-of-life software (Node 12, MongoDB 4.4/5.0, Mongoose 5). See [doc 11 §11](../11-target-runtime-node12-mongodb.md) for the risk register and upgrade path.
