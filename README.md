# Technology Exchange & Transfer Platform — Documentation

Design documentation for a technology exchange and technology-transfer platform for China, starting in Shanghai. It is benchmarked on Shanghai's two leading platforms, the **Shanghai Technology Exchange (STEX, 上海技术交易所)** and the **National Technology Transfer Center East (NETC, 国家技术转移东部中心) / InnoMatch**, on the **China Technology Exchange (CTEX, 中国技术交易所)** in Beijing, and on international models (WIPO GREEN, Enterprise Europe Network, university TTOs, yet2). The documents take the work from market research to product requirements, an implementation design and a verified target runtime.

## The system at a glance

**What it is.** A demand-driven **matching and service platform** with managed transfer workflows. Organizations list technologies, publish technology needs, find each other and manage the path from first contact to a signed, completed transfer. Formal listing (挂牌), competitive bidding, settlement and transaction certificates are **venue functions**: the platform performs them through a licensed venue (STEX or CTEX) as a **registered practising agent** (执业类交易服务机构). Money is held and released only by a licensed bank or payment institution; the platform coordinates the conditions and records verified events.

| Who | What the platform does for them |
| --- | --- |
| **Suppliers**: university TTOs, institutes, companies, startups | Reviewed listings (bulk import for portfolios); offers (transfer, licence, equity contribution, joint development, technical service, pilot); public notices (公示) for negotiated university prices; inquiries with contact masking; NDA-controlled data rooms |
| **Buyers**: company R&D and innovation teams | Structured demands (anonymous if wished), Chinese search, ranked and explained candidate matches, side-by-side comparison, introductions, negotiation and contracts |
| **Clients**: enterprises, universities, parks and governments with a contract | Scouting projects, TTO and programme workspaces (vouchers, KPIs), dashboards and reports (mainly from R2) |
| **Administrators**: platform staff | Review queues with SLA timers and maker-checker, the technology-manager (技术经理人) network, working-day calendar, support tools, configuration, audit and compliance cases |

**Main modules** ([10 §3](10-product-requirements.md)): accounts, organizations, technologies, university tools, demands and challenges, search, matching, introductions and data rooms, deals, venue-routed transactions, services and experts, events, clients, notifications, administration, reporting, compliance. That is 17 modules with 138 numbered requirements.

**From listing to transfer.**

1. A verified organization submits a technology; staff review it; the approved **publication snapshot** feeds search and a pre-rendered public page ([06 §6.1](06-implementation-design-v1.md)).
2. A buyer publishes a demand; matching ranks candidate offers, and a technology manager reviews high-value or uncertain candidates ([06 §6.2, §10](06-implementation-design-v1.md)).
3. The buyer requests an introduction; the supplier consents; contacts are exchanged; an NDA opens a controlled data room ([06 §6.3](06-implementation-design-v1.md)).
4. The deal moves through due diligence, versioned proposals, contract, approval and signing, then conditions and milestones, to completion ([06 §6.4](06-implementation-design-v1.md), [08 §4](08-china-operating-model.md)).
5. Listing-based sales and bidding run through the venue, and payments through the licensed payment partner. Each deal keeps a dossier and a full audit trail.

**Architecture.** A TypeScript **Express 4 modular monolith**, compiled to ES2019, runs on **Node.js 12.4**: two API instances and one worker under systemd, behind Nginx, self-hosted in mainland China. Data lives in a **MongoDB 4.4 / 5.0 replica set**, accessed through **Mongoose 5.13** models with tenant-scope and immutability plugins; database validators are a safety net. A transactional outbox drives **Meilisearch** (Chinese search), notifications and the pre-rendered public pages. The frontend is React 18 + Ant Design 5, built on CI ([06 §3](06-implementation-design-v1.md), [11](11-target-runtime-node12-mongodb.md)).

**Release plan** ([10 §9](10-product-requirements.md)): R0 foundation (≈ 6 weeks) → R1 marketplace MVP (≈ 12 weeks; 67 requirements) → R2 managed transfer and clients (≈ 12 weeks; 53) → R3 venue-routed transactions and payments (≈ 12–16 weeks; 18).

## Reading order

New readers: read the section above, then [10 §1–§4](10-product-requirements.md) (what is built), then [06 §1–§3](06-implementation-design-v1.md) and [11](11-target-runtime-node12-mongodb.md) (how it is built). Docs 01–04 explain why; 07–09 give the operating and regulatory detail behind the requirements.

| # | Document | What it covers | Main audience |
| --- | --- | --- | --- |
| 01 | [Shanghai technology-trading landscape](01-shanghai-landscape.md) | What STEX and NETC are, how they relate (same parent group), what Shanghai's 2025 rules require from an exchange | Everyone |
| 02 | [STEX vs NETC/InnoMatch: scale and scope](02-stex-vs-netc-scale-and-scope.md) | Transaction value vs ecosystem breadth vs revenue; how each turns a technology into a deal | Founders, product, analysts |
| 03 | [Business models and revenue](03-business-models-and-revenue.md) | Verified financials, revenue streams, profit pools, lessons for our pricing | Founders, business planning |
| 04 | [Product strategy](04-product-strategy.md) | What to copy, what to do differently, demand-first design, TRL, verification, scouting, strategic stages | Founders, product, architects |
| 05 | [System design blueprint](05-system-design-blueprint.md) | Target architecture: domain model, roles, workflows, sequence diagrams, data, APIs, AI, security, roadmap, KPIs | Product, architects, engineering leads |
| 06 | [Implementation-level design v1.0](06-implementation-design-v1.md) | Verified Mongoose models, database validators, indexes, roles, transactions and Document API patterns; tenant-scope plugin; API catalogue; state machines; UI specs; permissions (CASL); search; deployment; sprint plan | Engineers, tech lead |
| 07 | [Real-world roles, workflows and money movement](07-roles-workflows-and-money.md) | User groups and authority, workflows per role, action vocabulary, disclosure ladder, payment lifecycle, deal types | Product, operations, architects |
| 08 | [China operating model](08-china-operating-model.md) | Legal map, authority model, deal-type catalogue, transitions, cross-border and university rules, funds handling, disputes, launch checklist | Founders, compliance, finance, counsel |
| 09 | [Reference platform features](09-reference-platform-features.md) | What STEX, NETC/InnoMatch, CTEX and other Chinese platforms actually provide: modules, rules, flows, architecture hints, gap analysis | Product, business analysts |
| 10 | [Product requirements specification](10-product-requirements.md) | Numbered functional requirements for users, clients and administrators; non-functional requirements; integrations; release plan; UAT scenarios | Product, engineering, QA, operations |
| 11 | [Target runtime: Node.js 12.4 + MongoDB 4.4/5.0](11-target-runtime-node12-mongodb.md) | Verified library versions, coding rules, MongoDB rules, Chinese search, SEO, deployment configs, risks and upgrade path | Tech lead, engineers, DevOps |

```mermaid
flowchart LR
    subgraph Research
        D01["01 Landscape"] --> D02["02 Scale and scope"] --> D03["03 Business models"]
    end
    subgraph Strategy
        D04["04 Product strategy"]
    end
    subgraph Design
        D05["05 Blueprint"] --> D06["06 Implementation v1.0"]
        D07["07 Roles and money"] --> D08["08 China operating model"]
    end
    subgraph Requirements
        D09["09 Reference platform features"] --> D10["10 Product requirements"]
    end
    subgraph Engineering
        D11["11 Target runtime<br/>Node 12.4 + MongoDB 4.4/5.0"]
    end
    D03 --> D04 --> D05
    D06 --> D07
    D08 --> D09
    D10 --> D06
    D11 --> D06
```

## Key decisions at a glance

| Topic | Decision | Reference |
| --- | --- | --- |
| Positioning | Demand-driven **matching and service platform** with managed transfer workflows, acting as a **registered practising agent** of a licensed venue (STEX / CTEX) for formal listing, bidding, settlement and certificates | [09 §1–§2](09-reference-platform-features.md), [10 §1](10-product-requirements.md) |
| Requirements | 138 numbered functional requirements in 17 modules (67 start in R1, 53 in R2, 18 in R3) and 17 measurable non-functional requirements; releases R0–R3 | [10 §3–§4, §7, §9](10-product-requirements.md) |
| Launch market | China, starting in Shanghai, with STEX (or CTEX) as the venue partner | [08](08-china-operating-model.md), [09 §1–§2](09-reference-platform-features.md) |
| Users at launch | R1: technology suppliers (including university TTOs) and buyers, supported by platform staff; enterprise and institutional clients from R2 | [10 §2, §9](10-product-requirements.md), [06 §1](06-implementation-design-v1.md) |
| Deal types | All types in the data model; three implementation tiers (standardized, legal review, specialist-only) | [08 §3](08-china-operating-model.md) |
| Money | Funds held and released only by a licensed bank or payment institution; the platform coordinates conditions and records verified events | [08 §1, §6](08-china-operating-model.md) |
| Target runtime | **Node.js 12.4 + MongoDB 4.4 / 5.0** replica set ("4.5" is a development series); verified with real binaries | [11](11-target-runtime-node12-mongodb.md), [`draft-implementation/`](draft-implementation/README.md) |
| Architecture | Express 4 modular monolith (TypeScript → ES2019), MongoDB through **Mongoose 5.13** models (with database validators, transactions and least-privilege roles), Meilisearch for Chinese search, transactional outbox, pre-rendered public pages | [06 §3–§6, §10](06-implementation-design-v1.md) |
| Data access | **Mongoose 5.13** schemas, models and Document API; tenant-scope plugin on every tenant-owned model; database validators as a safety net; indexes from the schemas | [06 §4](06-implementation-design-v1.md), [11 §5.2](11-target-runtime-node12-mongodb.md) |
| Hosting and team | Self-hosted in mainland China: Nginx + systemd on the given servers (no Docker Compose or Kubernetes); 1–4 developers, and the release plan assumes 3–4 plus design, QA and operations staff | [06 §11, §13](06-implementation-design-v1.md), [10 §9](10-product-requirements.md), [11 §9](11-target-runtime-node12-mongodb.md) |

## Glossary

| Term | Meaning |
| --- | --- |
| **STEX** (上海技术交易所) | Shanghai Technology Exchange: licensed technology trading venue (registration, trading, custody / disclosure, settlement) |
| **NETC** (国家技术转移东部中心) | National Technology Transfer Center East: regional technology-transfer platform; operates **InnoMatch** |
| **InnoMatch** | NETC's global technology supply–demand matching platform and annual matching fair |
| **CTEX** (中国技术交易所) | China Technology Exchange, Beijing: licensed technology trading venue; the alternative venue partner to STEX |
| **Venue** (技术交易场所) | A government-approved technology trading venue (in Shanghai, approved under total-quantity control). Formal listing (挂牌), bidding, third-party settlement and certificates are venue functions |
| **Practising agent** (执业类交易服务机构) | A service institution registered with a venue that represents parties and submits on their behalf, with joint liability for buyer materials; the platform's intended role towards STEX or CTEX |
| **User / client / administrator** | A person acting for an organization / an organization with a contract (enterprise, university, park, government) / platform staff ([10 §2](10-product-requirements.md)) |
| **Technology manager** (技术经理人) | Professional broker who turns a match into a deal. Not the same as the organization role "technology manager" (a member who manages the organization's listings, [06 §8.2](06-implementation-design-v1.md)) |
| **TTO** | Technology-transfer office of a university or institute |
| **Service invention** (职务科技成果) | A result created in the course of employment; owned by the institution, not the researcher |
| **Technology / Offer / Demand** | A technology is the asset; an offer is a specific commercial opportunity for it (licence, assignment…); a demand is a buyer's structured need |
| **Match → Introduction → Deal** | A recorded candidate pairing → a consented, controlled contact → a managed negotiation and transaction |
| **Public notice** (公示) | Publication of a negotiated price for a university or institute result for at least 15 days, with an objection procedure, before the transfer |
| **Working day (WD)** | A day on China's official calendar, including make-up working days (调休); venue and regulatory time limits are counted in WD |
| **R0–R3** | The four releases: foundation, marketplace MVP, managed transfer and clients, venue-routed transactions and payments ([10 §9](10-product-requirements.md)) |
| **TRL** | Technology Readiness Level (1–9); China uses GB/T 22900-2022 |
| **CRL / CRI, MRL** | Commercial readiness and manufacturing readiness scales, tracked separately from TRL |
| **Rights registration** (权属登记) / **Transaction certification** (交易鉴证) | Regulated functions of a licensed technology trading venue |
| **Technology-contract registration** (技术合同认定登记) | Registration of technology contracts that unlocks tax incentives in China (MIIT measures, effective 2026-03-01) |
| **Payment obligation / transaction / payout** | What is owed / money actually moved and confirmed by the provider / money paid out to a recipient. Never the same thing |
| **Transactional outbox** | A collection written in the same database transaction as a business change, used to publish events reliably (search indexing, notifications, page rendering) |
| **Publication snapshot** | The approved, public part of a technology version; the only technology data sent to search and public pages |
| **揭榜挂帅 / challenge** | A demand published as an open challenge: solvers submit proposals, an expert panel selects the winner |

## Viewing the diagrams

All diagrams are standard [Mermaid](https://mermaid.js.org/) code blocks (`flowchart`, `stateDiagram-v2`, `sequenceDiagram`, `erDiagram`). They render on GitHub, GitLab, Gitea, Obsidian, Typora and in VS Code with a Mermaid preview extension. Every diagram was validated with the Mermaid CLI.

## Revision notes

### Revision 5 — full review, consistency and references

Every document was re-read line by line against one set of canonical facts (positioning, figures, rules, state machines, stack) and against the draft code.

- **Positioning everywhere.** Docs 04–08 now say plainly that the platform is a matching and service platform, that formal listing, bidding, settlement and certificates go through STEX or CTEX with the platform as registered practising agent (R3), and that money is held only by a bank, a licensed payment institution or the venue's settlement. Doc 07 gained a step-by-step venue-routed workflow (§3.5); doc 08 gained a "Venue route" section (§1.3). Docs 05–07 define the deal status while a venue runs its steps.
- **Facts corrected against sources.**
  - The shared state-owned shareholder of STEX and NETC is 上海杨浦科技创业中心有限公司 (杨科创).
  - The InnoMatch totals (6,468 demands, 313 deals, ¥778M) are cumulative from August 2022 to end-2024, as confirmed by the STCSM report; they are not unverifiable 2024 figures.
  - In STEX online bidding, the highest bidder's extra final bid sets the pre-emption price.
  - Challenge prizes are paid "in principle" by the demander and never tied to exclusivity.
  - The Shanghai ≥ 70% inventor reward is permissive.
  - The 2025 venue rules are cited from the final text, not the draft.
  - Unsourced USD pricing and university examples were replaced.
- **State machines aligned** across 05, 06, 07, 10 and the code: the demand lifecycle follows the stored statuses; the deal machine has `ready_to_complete` and allows disputes only after signature; the technology machine has `reject_revision`; listings cannot be edited while `approved`.
- **Doc 06 API (§5)** rewritten to match the data layer: ObjectId `id` plus human `ref`, camelCase JSON, money as decimal strings, `If-Match` carrying `rev` (missing → 428, stale → 409), session cookie + CSRF header, and an error catalogue that names the error each status comes from. §5 is a specification; the HTTP layer is not in the draft code yet.
- **Doc 05** now describes the real stack and one request's path (validation → tenant-scoped load → policy → `save()` → transition, outbox and audit in one transaction → worker), and has a complete, type-checked deal transition map (§13).
- **Doc 10:** release scopes, the requirement map and the summary match the requirement tables; acceptance scenarios name their release. **Doc 01** gained a "Key terms" section for readers new to Chinese technology transfer.
- **README:** new section "The system at a glance"; glossary extended.
- **Draft code:** submitting returns the new `rev`; listings are locked while `approved`. The full suite still passes (216 checks).
- **New [`references/`](references/README.md) folder:** one note per source used, with URLs, archived copies, retrieval dates, the facts the docs take from it and short excerpts; full official texts where they are public-domain government documents.

**Known gaps, for the next revision:**

- No numbered requirements yet for platform-coordinated payments (payment requests, provider events, payouts, reconciliation, refunds); adding a module changes the 138-requirement baseline, so it is the owner's decision.
- No acceptance scenario for R3 (venue route).
- Not yet designed in detail: the offer lifecycle; the review-case lifecycle; the publishing service that creates and supersedes snapshots; worker leases, retries and dead letters; the working-day calendar algorithm; malware scanning and alerting components.
- Missing facts: STEX's fee schedule, how agents are paid, CTEX's agent requirements, and whether STEX offers any data interface for agents. The archived STEX rules are 2020–2022 versions and must be re-checked before R3.

### Revision 4 — Mongoose data layer

- Data access moved from the native driver with repositories to **Mongoose 5.13.23** (bundles driver 3.7.4; the newest Mongoose that runs on Node 12.4). All 24 collections are Mongoose models with interfaces, schemas, indexes and plugins. Services use the Document API (`new Model()` + `save()`, `findById()` + `set()` + `save()`, `deleteOne()`, `lean()` lists with `populate()`), always inside transactions.
- Tenant isolation is a Mongoose plugin: every query on tenant data must name a tenant or an audited staff reason. Version history and audit records are protected by `freezablePlugin` and `appendOnlyPlugin`. CASL rules become query filters through `@casl/mongoose`.
- Database `$jsonSchema` validators are kept as a safety net under the schemas. Indexes are declared in the schemas and created by a release step (`npm run db:indexes`).
- Verified on Node 12.4.0 with MongoDB 4.4.30 and 5.0.33: 90 database checks per version, plus 34 library smoke checks. Findings:
  - global Mongoose settings must load before any model compiles (the audit connection otherwise built its own indexes);
  - update queries need `runValidators`;
  - `mongoose-long` silently truncates fractional amounts, so a strict `Int64` type was written;
  - Mongoose 5.13's `connection.transaction()` never ends its session;
  - Mongoose 5 has been end-of-life since 1 March 2024; Mongoose 6.13 is the next step with Node 12.22.12.
- Docs 05, 06, 11 and the README were updated, and the code folder was renamed to [`draft-implementation/`](draft-implementation/README.md).

### Revision 3 — target stack and strengthened requirements

- Backend changed to **Node.js + MongoDB** on the given target servers (Node 12.4, MongoDB 4.4 / 5.0). Docs 05, 06 and 08 were updated; doc 11 added.
- All schema definitions and code samples were **verified with real binaries** (Node 12.4.0; MongoDB 4.4.30 and 5.0.33; Meilisearch 1.11.3). The checks can be re-run from [`draft-implementation/`](draft-implementation/README.md) (named `verification/node12-mongodb/` in revision 3).
- Findings from the verification: MongoDB 4.4/5.0 cannot search Chinese text (Meilisearch adopted); Node 12 needs `full-icu` for Chinese dates and pinyin sorting; `bull@4` fails on Node 12.4 despite its declared engines; driver 3.x API differences are documented (superseded by the Mongoose rules in revision 4).
- Docs 09 (real platform features) and 10 (numbered product requirements for users, clients and administrators) added.

### Revision 2 — rewrite of the ChatGPT drafts

These documents began as ChatGPT conversation exports. That revision:

- Rewrote every file in a documentation voice, with a consistent structure (purpose, audience, summary, sections, sources) and cross-links.
- Replaced ChatGPT's rendered-SVG/CSS "mermaid" output (unreadable outside ChatGPT) with **pure Mermaid source**, reconstructed from the surviving labels. Converted the ASCII sketches into Mermaid diagrams as well.
- Fixed formatting defects: collapsed one-line Python code, broken LaTeX formulas, flattened tables in 08, headings nested in list items, dead `images.openai.com` thumbnails, favicon and "+N" citation artefacts, and `utm_source=chatgpt.com` tracking parameters.
- Expanded the workflows with actors, step tables, state machines, exception handling and service levels.

### Factual corrections (checked against primary sources)

| Earlier statement | Correction | Source |
| --- | --- | --- |
| STEX "~¥189B transaction volume" (2024) | ¥18.922B was STEX's **2023** value (a 10× unit error: 189.22亿元 read as ¥189B); 2024 on-exchange value was **¥30.933B** | Fund prospectus; STCSM 2024 report |
| NETC revenue "not found" | NETC's operating company reported **¥46.20M** revenue in 2023, more than STEX's ¥28.43M | Fund prospectus |
| STEX and NETC treated as independent competitors | Both are linked to the same state-owned shareholder, 上海杨浦科技创业中心有限公司 (杨科创, controlled by the STCSM-run 上海市科技创业中心), with overlapping leadership | Fund prospectus |
| NETC "¥42B facilitated in 2024"; cumulative "¥40B" vs "¥400B" | 2024: **≈ ¥4.2 billion** (近42亿元, a 10× unit error); cumulative **≈ ¥40 billion** (近400亿元) | STCSM 2024 report |
| STEX profile source labelled "Shanxi Provincial Government" | It is the **Shanghai Yangpu District** government site | — |
| TRL list with non-standard definitions and a fixed TRL→CRL mapping | Replaced with EU/Horizon TRL definitions; CRL treated as an independent scale | EU H2020 Annex G; ARENA CRI |
| Draft SQL schema: status lists out of sync with the state machines, a default value rejected by its own CHECK, missing `technology_type`, matches without version or idempotency key | Fixed in revision 2; superseded in revision 3 by the verified MongoDB design (since revision 4, Mongoose schemas and database validators enforce the same rules) | [06 §4](06-implementation-design-v1.md) |
| Civil Code contract types listed without technology **development** contracts; no CNIPA registration for patent assignments | Added development contracts, Patent Law Art. 10 registration, university pricing rules (Art. 18 / Art. 45), 2026 technology-contract registration measures, ICP/EDI and MLPS items | See [08 Sources](08-china-operating-model.md#sources) |

> Figures are as of the cited sources (2023–2026). Legal statements are an implementation baseline, **not legal advice**; items marked *legal validation required* in [08](08-china-operating-model.md) must be confirmed by PRC counsel before launch.
