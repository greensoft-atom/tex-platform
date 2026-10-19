# Verification kit: Node.js 12.4.0 + MongoDB 4.4 / 5.0

This kit proves, with real binaries, that the backend design in [doc 06](../../06-implementation-design-v1.md) and [doc 11](../../11-target-runtime-node12-mongodb.md) runs on the target server stack:

| Component | Version tested |
| --- | --- |
| Node.js runtime | **12.4.0** (npm 6.9) |
| MongoDB server | **4.4.30** and **5.0.33**, single-node replica set |
| MongoDB Node driver | **3.7.4** (driver 4.x needs Node ≥ 12.9) |
| Search | Meilisearch **v1.11.3** (HTTP API via axios) |
| TypeScript (build machine only) | 5.6.3, output `ES2019` / CommonJS |

## Run it

Requirements: Docker only. Nothing is installed on the host; containers use a private network, publish no ports and are removed afterwards.

```bash
./run.sh
# optional overrides
MONGO_VERSIONS="4.4" ./run.sh
NODE_RUNTIME_IMAGE=node:12.22.12 ./run.sh      # check a later Node 12 patch release
```

## What it checks

| Step | File | Checks |
| --- | --- | --- |
| 1 | `package.json` | All runtime dependencies install with npm 6 on Node 12.4.0 (versions pinned) |
| 2 | `tsconfig.json`, `src/*.ts` | TypeScript compiles with strict mode to ES2019/CommonJS against driver-3 and Node-12 typings |
| 3 | `tests/smoke.js` | 33 libraries load and perform a basic operation on Node 12.4.0 |
| 3 | `tests/test-icu.js` | Chinese date formatting and pinyin sorting work when Node starts with `NODE_ICU_DATA` pointing at `full-icu` (they fail with Node 12's default small ICU) |
| 4 | `migrations/*.js`, `tests/test-mongo.js` | Collections, `$jsonSchema` validators, unique/partial/TTL indexes, least-privilege role, cross-database transaction with optimistic concurrency and tenant scope (23 checks, per MongoDB version) |
| 4 | `src/abilities.ts`, `src/tenant-scoped.repository.ts`, `tests/test-policy.js` | CASL permission rules and tenant-scoped repository (12 checks) |
| 5 | `tests/test-search.js` | Chinese queries: MongoDB text index returns nothing; Meilisearch returns correct results |

Expected result: every line `PASS` / `OK`, and the search table:

```text
MongoDB $text  q=缺陷检测 -> []
Meilisearch    q=缺陷检测 -> ["t1"]
```

## Known incompatible on Node 12.4.0 (do not use)

| Package | Why |
| --- | --- |
| `mongodb` ≥ 4.0, `mongoose` ≥ 6 | Driver 4 requires Node ≥ 12.9.0 |
| `bull` 4.16.5 | Declares Node ≥ 12 but fails: `SyntaxError: Unexpected token ?` (optional chaining) |
| `argon2` ≥ 0.28 | Requires Node ≥ 14 (use `bcryptjs`) |
| `minio` ≥ 7.1 | Requires Node ≥ 16 (use `aws-sdk` v2 S3 client or `ali-oss`) |
| `agenda` ≥ 4 | Requires Node ≥ 12.9.0 |
| `@nestjs/*` ≥ 10, Next.js ≥ 12, Prisma, AWS SDK v3 (recent) | Require Node 14–18+ |

> Declared `engines` ranges are not reliable on this old runtime (see `bull` 4.16.5). Every new dependency must pass `tests/smoke.js` on `node:12.4.0` before it is added.

## What this kit does not prove

Performance and capacity, production MongoDB configuration (authentication, TLS, 3-member replica set, backups), Meilisearch production setup, and the security posture of end-of-life software. See doc 11 §10 for the risk register and upgrade path.
