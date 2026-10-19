# Draft implementation: Node.js 12.4 + Mongoose 5.13 + MongoDB 4.4 / 5.0

A simple, working draft of the backend data layer described in [doc 06](../06-implementation-design-v1.md): Mongoose models for all core collections, plugins for tenant isolation and immutable history, a technology service built on the Document API, migrations and an index-sync release step. Its `src/` folder uses the same layout as the application (`apps/api/src`), so it can be copied into the project as starting code.

`run.sh` builds it and proves, with real binaries, that it runs on the target server stack ([doc 11](../11-target-runtime-node12-mongodb.md)). HTTP routes are not part of the draft yet; the tests call the services directly.

| Component | Version tested |
| --- | --- |
| Node.js runtime | **12.4.0** (npm 6.9) |
| MongoDB server | **4.4.30** and **5.0.33**, single-node replica set |
| ODM | **Mongoose 5.13.23**, bundling MongoDB Node driver **3.7.4** (Mongoose 6+ uses driver 4, which declares Node ≥ 12.9) |
| Authorization | CASL **5.4.4** + `@casl/mongoose` **5.0.0** |
| Migrations | `migrate-mongo` **8.2.3** (CLI run on Node 12.4.0) |
| Search | Meilisearch **v1.11.3** (HTTP API via axios) |
| TypeScript (build machine only) | 5.6.3, output `ES2019` / CommonJS, strict mode |

## Run it

Requirements: Docker only. Nothing is installed on the host; containers use a private network, publish no ports and are removed afterwards.

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
├── core/http/idempotency-key.model.ts
├── modules/<module>/*.model.ts  # 24 models: identity, organizations, technology, offers, demands,
│                                # matching, exchange, deals, documents, workflow, audit
├── modules/identity/abilities.ts            # CASL policy
├── modules/technology/technology.service.ts # Document API use cases in transactions
├── models.ts                    # registry of all models
└── scripts/sync-indexes.ts      # release step: create missing indexes / --check for drift
migrations/                      # migrate-mongo: $jsonSchema validators, roles, sessions TTL index
tests/                           # plain JavaScript, run directly on Node 12.4.0
```

## What it checks

| Step | Files | Checks |
| --- | --- | --- |
| 1 | `package.json` | All runtime dependencies install with npm 6 on Node 12.4.0 (versions pinned, lockfile v1) |
| 2 | `tsconfig.json`, `src/**/*.ts` | TypeScript compiles in strict mode to ES2019/CommonJS against the Mongoose 5.13 and Node 12 typings |
| 3 | `tests/smoke.js`, `tests/test-icu.js` | 34 libraries load and perform a basic operation; Chinese dates and pinyin sorting work with `full-icu` (they fail with Node 12's default small ICU) |
| 4 | `migrate-mongo up` / `status`, `sync-indexes` (and `--check`) | Release steps run on Node 12.4.0; indexes declared in the schemas are created and the drift check reports nothing |
| 4 | `tests/test-mongo.js` (40 checks) | Mongoose validation (strict fields and filters, update validators, cross-field rules, Int64 money); unique, partial and TTL indexes; database validators still reject raw writes; BSON types; optimistic concurrency; frozen versions and append-only history; least-privilege role; cross-database transactions with rollback; login sessions through the Mongoose connection |
| 4 | `tests/test-documents.js` (25 checks) | Technology use cases with the Document API: create, update, stale `If-Match` (409), invalid input (422), other tenant (404), concurrent edits, `lean()` + `populate()` list, submit, revise a published listing, discard |
| 4 | `tests/test-policy.js` (25 checks) | CASL rules on plain objects and Mongoose documents; `accessibleBy()` filters; tenant-scope plugin on find, findById, updateMany, deleteMany, countDocuments, distinct and aggregate; buyer/supplier and deal-party visibility |
| 5 | `tests/test-search.js` | Chinese queries: MongoDB text index returns nothing; Meilisearch returns correct results |

Steps 4 run once per MongoDB version. Any Node deprecation warning during the database tests counts as a failure, because it means a Mongoose setting is missing. Expected result: every line `PASS` / `OK`, `40 + 25 + 25` passed per MongoDB version, and the search table:

```text
MongoDB $text  q=缺陷检测 -> []
Meilisearch    q=缺陷检测 -> ["t1"]
```

## Known incompatible or not approved on Node 12.4.0

| Package | Why |
| --- | --- |
| `mongodb` ≥ 4.0, `mongoose` ≥ 6 | Driver 4 declares Node ≥ 12.9.0. A basic Mongoose 6.13.11 transaction test runs on 12.4.0, but outside the declared range; it is the planned step after upgrading to Node 12.22.12 |
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

Performance and capacity, production MongoDB configuration (authentication, TLS, 3-member replica set, backups), Meilisearch production setup, and the security posture of end-of-life software (Node 12, MongoDB 4.4/5.0, Mongoose 5). See doc 11 §11 for the risk register and upgrade path.
