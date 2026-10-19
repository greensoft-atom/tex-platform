# 12 — Decision Record: Open Decisions D-01 … D-08

> **About this document**
>
> - **Purpose:** Turn the open decisions of [10 §12](10-product-requirements.md) into designed resolutions. For each decision: the question, what we know, the options, the proposed resolution, what it changes in the design, and what still has to be confirmed, by whom and by when.
> - **Audience:** Owner and founders (who decide), product owner, tech lead, operations lead, and the PRC counsel, venue and assessors who confirm.
> - **Status:** Revision 6 (2026-10-19). **D-02 is decided** by the owner. The others are **proposed**: designed and ready to adopt, but not adopted until the owner confirms them. Items marked *legal validation required* also need PRC counsel.
> - **Related:** the engineering designs that implement these decisions are in [06 §6.6–§6.11](06-implementation-design-v1.md); sources are in [`references/`](references/README.md).

---

## Summary

| # | Decision | Status | Resolution | Owner action | Needed before |
| --- | --- | --- | --- | --- | --- |
| D-01 | Venue route | Proposed (*legal validation required*) | Register as a CTEX service institution now (light entry rules); partner with a registered STEX agent for STEX listings; register as a STEX agent once eligible; act for one side and one buyer only; no venue licence | Confirm; counsel on 沪府规〔2025〕2号 Art. 11; shortlist STEX partners | R3 design |
| D-02 | Payments | **Decided** | The owner's payment testing platform behind one adapter; a shallow design (FR-PAY-01 … 04) | None | R3 |
| D-03 | Non-binding price indications (意向报价) | Proposed (*legal validation required*) | Private, non-binding indications to the seller only, with no ranking, rounds or deposits; competition goes to the venue | Ask counsel for a written opinion | R2 |
| D-04 | Internet licensing (ICP, EDI) | Proposed (*legal validation required*) | ICP filing in R0; ICP licence before online charging (R2); counsel's view on EDI before the R2 deal workspace | Confirm; engage counsel | R1 launch / R2 |
| D-05 | Classified protection (MLPS, 等保) | Proposed | Level 2; grading in R0, filing and assessment before the R1 launch | Confirm; choose an assessor | R1 launch |
| D-06 | E-signature, SMS and e-invoice providers | Proposed | Each behind an adapter; selection by fixed criteria and a short proof of concept | Approve the shortlist and budget | R1 (SMS) / R2 |
| D-07 | Fee schedule and plan pricing | Proposed | Free listing and search; a success fee on platform-managed deals on the Jiangsu broker-commission bands; an agent fee on venue deals instead of it; subscription prices after the R1 pilot | Confirm the structure and starting values | R2 |
| D-08 | Runtime upgrade | Proposed | Node 12.22.12 in R0; MongoDB 5.0 where the CPU allows it; Mongoose 6.13 port in R0 | Confirm | R0 |

The decisions are independent, except that D-01 and D-07 both concern the agent fee, and D-04 depends on when online charging starts (D-07).

---

## D-01 — Venue route

**Question.** Formal listing (挂牌), competitive bidding, third-party settlement and certificates are venue functions ([08 §1.3](08-china-operating-model.md)). How does the platform reach them: as a registered practising agent of STEX or CTEX, through a partner agent, or with its own venue licence?

**What we know.**

- Shanghai approves technology trading venues under total-quantity control (《上海市技术交易场所管理细则》, 沪科规〔2025〕2号). Both the Shanghai rules and the national rules (国发〔2011〕38号) bar unapproved operators from running venue functions ([08 §1.1](08-china-operating-model.md)).
- STEX rule 105: a practising agent must have been registered for at least **2 years**, have registered capital of at least **RMB 1 million**, have at least **2 practitioners recognised by STEX** and a clean record for **24 months**. STEX reviews the application in 7 WD; the cooperation agreement follows within 15 WD; the agent pays a fee, gets a certificate, takes an annual review in July and reports changes within 10 WD ([09 §2.1](09-reference-platform-features.md)).
- Buyers submit through an agent, who verifies the materials, signs a verification opinion and bears **joint liability** for them (STEX rule 82).
- STEX publishes a fee standard (trial, 2021). Its amounts are an image that no archive holds, so the rates are unknown. The agent fee to STEX (交易服务机构费) is not published either ([`references/stex/fee-standard-2021.md`](references/stex/fee-standard-2021.md)).
- **CTEX's entry rules were much lighter** in its latest available text (service-institution measures, in force 20 December 2022). Since December 2023 CTEX has handled agents as members (trading or professional members) under a 会员管理办法 that could not be retrieved, so the conditions below must be confirmed with CTEX. There is no minimum registered capital, company age, staff number or broker certificate. CTEX requires good standing with no violations in the last 3 years, fixed premises and internal controls. It reviews applications in 10 WD and issues a certificate valid for one year, with an annual inspection in November and December. In one deal, an institution may not act for both sides or for two or more intended buyers ([09 §2.1](09-reference-platform-features.md)).
- **An open legal question:** Shanghai's general trading-venue rules (沪府规〔2025〕2号, in force 1 March 2025) regulate a venue's members and agents like branches. Art. 11 says a venue may in principle not operate through them without the provincial and Shanghai governments' approval. No source found says how this applies to STEX's practising agents ([09 §2.1](09-reference-platform-features.md)).
- **2026 STEX formal listings** each name the filing agent (技术服务机构). Most are settled **off-exchange**: only the deposit passes through STEX and the price goes straight to the seller. Most give 60 WD to sign ([09 §2.3](09-reference-platform-features.md)).
- **STEX's admission rules are incomplete in the sources.** STEX admits agents in an annual intake with a public notice. In 2024 it also applied a supplementary agent rule that could not be found. Which practitioner certificates it "recognises" is not defined anywhere; the national technology-transfer broker certificates are the likely evidence, but that is an inference ([09 §2.1](09-reference-platform-features.md)).
- **No data interface.** Participants and agents submit by logging in to the STEX website or its TECHDEAL app and uploading documents; operational notices are posted on the portal. No programmatic interface was found ([09 §2.7](09-reference-platform-features.md)).
- **How agents are paid** is not published by either venue. The evidence points to a commission from the agent's own client under the agency or service contract, with venue fees paid separately. No fee sharing by a venue was found. A provincial benchmark for broker commissions exists: Jiangsu, 2018 ([09 §2.6](09-reference-platform-features.md)).

**Options.**

| Option | For | Against | Time to first venue deal |
| --- | --- | --- | --- |
| A. Own venue licence | Full control of the flow | Total-quantity control makes approval long and uncertain; very high compliance load | Years, if ever |
| B. Register the operating company as a STEX agent | The platform is agent of record and earns the agent fee | Impossible until the company is 2 years old and has 2 recognised practitioners | Depends on the company's age |
| C. Partner with an existing registered STEX agent | Available now; the partner holds the registration and its liability | Fee split; dependence on the partner; a second party in each verification | Weeks, once an agreement is signed |
| D. Register the operating company as a CTEX service institution | Entry rules a new company can meet (no capital or age minimum); national reach; the platform is agent of record itself | A Beijing venue: some Shanghai clients and programmes will prefer STEX. A second rulebook and system. Yearly certificate and inspection | About a month (10 WD review, then agreements) |

**Proposed resolution.** **D and C now, B when eligible:**

0. **First, a legal check** (*legal validation required*): counsel confirms how 沪府规〔2025〕2号 Art. 11 applies to venue agents, and that acting as a STEX or CTEX agent is lawful for the operating company. This is needed before any agreement is signed.
1. **Now (during R2):** check whether the operating company already meets STEX rule 105 (age, capital, clean record). If it does, apply to STEX directly (B) and train two staff for STEX recognition.
2. **Now (during R2):** confirm CTEX's current membership conditions, then apply to CTEX as a trading member or service institution (D). The platform can then be agent of record itself for CTEX listings from the start of R3. CTEX is national, so any client can use it. If the 2023 scheme added thresholds the company cannot meet, C covers both venues until B.
3. **For clients who want STEX** (Shanghai programmes, or a university notice on a Shanghai market): sign a cooperation agreement with one registered STEX agent before R3 design starts (C).
   - **Division of work:** the platform prepares the submission packages, the disclosure drafts and the buyer files. The partner reviews them, signs the verification opinion, submits them in STEX's system and bears the agent's liability.
   - **The agreement fixes:** the scope; the liability split; the fee split; data handling (the partner sees only the deals it submits); response times, matching the WD limits in FR-VEN-03 and FR-VEN-04; and the right to end the agreement once the platform registers itself.
4. **When eligible:** register the operating company as a STEX agent (B). The STEX partner agreement then becomes a fallback.
5. **No venue licence.**

**What it changes in the design.**

- `venue_submissions` records the venue (`stex` or `ctex`), the agent of record (`agentOrganizationId`), the mode (`partner_agent` or `platform_agent`) and the listing's own terms. Those terms are the disclosure and extension periods, the signing period and the settlement mode (on- or off-exchange), and they override the rule minimums (FR-VEN-03, FR-VEN-08). FR-ORG-06 (agent of record) already covers a partner organization.
- **One side, one buyer.** In a listing, the platform acts for the seller or for one buyer, never both and never two buyers (CTEX Art. 18, applied on both venues; FR-VEN-04). The venue submission service refuses a second agency on the same listing, and conflict detection (FR-ORG-07) flags it.
- A `VenueGateway` adapter, like the payment adapter (D-02). It starts with a **manual** implementation: staff enter the submission in the venue's own system, then record the venue's reference, dates, notices, results and certificate numbers on the platform. Recording uses maker-checker (FR-ADM-02): one person enters, another checks against the venue's document. FR-VEN-10 (data interface) moves to file exchange or an API only if the venue offers one; no public agent API was found.
- When an offer is submitted for formal listing, it is reserved (`under_negotiation`, reason `venue_listing`, [06 §6.6](06-implementation-design-v1.md)). It then accepts no new off-venue introductions during disclosure.
- The verification opinion is a maker-checker review case (`CHECK_REQUIRED` in [06 §6.7](06-implementation-design-v1.md)). In partner mode, the partner's signed opinion is uploaded as evidence.
- The agent fee is a fee-schedule item (D-07). In partner mode, the split with the partner is a commission rule (FR-MAT-08).

**To confirm.**
- The owner confirms the route and shortlists STEX partner agents. 2026 listings name the filing agents; STEX's "科商" registry lists filed providers ([09 §2.1](09-reference-platform-features.md)).
- STEX and CTEX confirm their current agent rules and fees in meetings: neither venue publishes the amounts.
- *Legal validation required:* the Art. 11 question above, the partner agreement (especially the liability split), and the client agency contracts.

**Fallback.** If no partner agrees, R3 keeps only the non-binding preparation features (FR-VEN-01, FR-VEN-02 as drafts, FR-VEN-07). Clients then file with the venue themselves, and the platform tracks the result.

---

## D-02 — Payments (decided)

**Decision (owner, 2026-10-19):** "For payment, we would use our own testing platform, please don't make too deep in it."

**Resolution.**

- Payments go through **one adapter** (`PaymentGateway`), with the **owner's own payment testing platform** as the first provider. The design stays shallow: payment requests, verified provider events, refunds and daily reconciliation, and nothing more (FR-PAY-01 … FR-PAY-04, [06 §6.11](06-implementation-design-v1.md)).
- **Not designed:** conditional holding, release instructions, split payouts, wallets or provider-side commission splits. The provider models in [07 §6](07-roles-workflows-and-money.md) and [08 §6](08-china-operating-model.md) are kept as background only.
- **Unchanged:** the platform never holds client money. Live money needs a bank or licensed payment institution behind the same adapter, plus the written confirmations of [08 §10 B](08-china-operating-model.md). Venue-routed deals settle through the venue (FR-VEN-08).
- **Integration work:** map the adapter's five operations (create, query, refund, verify notification, statement) to the testing platform's API. Acceptance: UAT-17 ([10 §10](10-product-requirements.md)).

---

## D-03 — Non-binding price indications (意向报价)

**Question.** May buyers indicate prices on the platform for a listed technology, given that unapproved operators may not run centralized competitive trading (国发〔2011〕38号, [08 §1.1](08-china-operating-model.md))?

**Options.** (a) No price indications at all. (b) Private, non-binding indications visible only to the seller. (c) Visible indications or a ranking. (d) Timed rounds or auctions.

**Proposed resolution: (b), with guardrails.** (c) and (d) look like competitive trading and are not offered.

| Guardrail | Rule |
| --- | --- |
| Not binding | Labelled 意向报价（不具约束力） in the interface and in the buyer's acknowledgement; creates no obligation and no deal status |
| Private | Visible only to the seller and the assigned technology manager. A buyer never sees other buyers' indications, or whether there are any (FR-INT-07) |
| No mechanics | No ranking, no deadline, no rounds, no increments, no deposit, no "highest offer" messages, no automatic award |
| Seller's free choice | The seller may negotiate with any buyer, in any order |
| Competition goes to the venue | If two or more buyers are interested and the seller wants competitive price discovery, the platform offers the venue route (FR-VEN-05); state-owned assets always go to a designated exchange (FR-CMP-07) |
| Feature flag | `price_indications`, off until counsel confirms |

**What it changes.** A `price_indications` record per buyer and offer: amount or range, non-binding acknowledgement, and visibility to the seller only. It feeds the seller's view in the deal workspace (R2). FR-VEN-07 (competitive negotiation preparation) remains a non-binding venue preparation step.

**To confirm.** *Legal validation required:* a written opinion from PRC counsel before the flag is turned on (R2).

---

## D-04 — Internet licensing (ICP, EDI)

**Question.** Which internet licences does the platform need, and when?

**What we know** ([08 §1.1](08-china-operating-model.md)):

- Every website served from mainland China needs **ICP filing** (ICP备案).
- Commercial internet information services (经营性, i.e. charging for online services) need an **ICP licence** (ICP经营许可证).
- Platforms on which third parties transact typically need a value-added telecom licence for **online data processing and transaction processing** (在线数据处理与交易处理, "EDI").

**Proposed resolution.** Tie each licence to the release that triggers it:

| When | Step |
| --- | --- |
| R0 (before any public page, including staging on a public domain) | ICP filing through the data-centre or network provider that hosts the servers; domain with real-name verification; the filing number in the site footer. After going live, the public-security network filing (公安联网备案) within 30 days |
| R1 | Free marketplace: listings, demands, search and introductions without online charges. ICP filing is the working assumption for this scope |
| Before R2 charging | ICP licence before subscriptions or service orders are paid online (FR-CLI-07). Apply during R1, because the licence takes time |
| Before the R2 deal workspace | Counsel's written view on whether negotiation, contracts and (in R3) payment requests between third parties need an EDI licence. If yes, apply in R2 so that it is in place for R3 |

**What it changes.** Release gates in [08 §10 A](08-china-operating-model.md); the footer and legal pages; the operating company's business scope must include the licensed activities.

**To confirm.** *Legal validation required:* counsel confirms the R1 assumption and gives the EDI view. The owner confirms that the operating company will hold the licences.

---

## D-05 — Classified protection (MLPS, 等保)

**Question.** Which protection level, and who assesses it?

**Proposed resolution: level 2 at launch** (NFR-08).

- The platform holds personal and confidential business data but **no client funds** (D-02), and it is not critical information infrastructure. That points to level 2.
- Re-grade if that changes: live funds handled by the platform, a much larger user base, or a request from the authorities.

| When | Step |
| --- | --- |
| R0 | Grading report (定级报告) with the system boundary (API, worker, MongoDB, Meilisearch, file storage, admin network); expert review |
| R0–R1 | Filing (备案) with the local public security authority; gap analysis against GB/T 22239-2019 level 2; fixes |
| Last 4 weeks of R1 | Assessment (测评) by an assessment institution from the national recommended list; findings fixed before launch |
| Yearly | Self-inspection; re-assessment at the interval the filing authority and the assessor set. Level 3 would need an assessment every year |

**What it changes.**

- **Logs:** system and network logs are kept for at least 6 months (Cybersecurity Law Art. 21). The audit trail is kept for ≥ 5 years (NFR-09). The journal and Prometheus data must be shipped to storage that keeps them long enough ([06 §11.6](06-implementation-design-v1.md)).
- **Controls already in the design that the assessment checks:**
  - staff MFA;
  - least-privilege database roles;
  - an encrypted, off-server backup with restore drills;
  - malware scanning ([06 §9.1](06-implementation-design-v1.md));
  - alerting.
- **The end-of-life runtime** (D-08) will be an assessment finding. The compensating controls are in [11 §11.1](11-target-runtime-node12-mongodb.md).

**To confirm.** The owner chooses an assessor from three quotes, in R0.

---

## D-06 — E-signature, SMS and e-invoice providers

**Proposed resolution.** Every provider sits behind an adapter in `core/` (like `PaymentGateway`): `SmsSender`, `SignatureProvider`, `InvoiceIssuer` and, in R2, `IdentityVerifier`. Calls run as jobs (§6.9 of 06) with the provider's sandbox in tests. A provider can then be replaced without touching the modules.

| Provider | Selection criteria | Proposed choice | When |
| --- | --- | --- | --- |
| SMS | Signature and template approval time; delivery reports; price; mainland data | One of the two main cloud SMS services (e.g. Aliyun SMS) as primary and the other (e.g. Tencent Cloud SMS) as fallback. Both need the company signature and templates approved in advance | R1 (login codes) |
| E-signature | Certificates from a licensed electronic certification service provider (电子认证服务机构); company e-seals; signer real-name and authority checks; callbacks; evidence reports usable in court (出证); sandbox; data stored in mainland China; price per signature | A 2-week proof of concept with two licensed providers (e.g. two of Fadada, eSignBao, BestSign) on the NDA and licence-contract flows; choose by the criteria | R2 (FR-INT-05, FR-DEAL-04) |
| E-invoice (数电票) | Issuing digital e-invoices for the platform's own fees; API; red-letter (credit) invoices | Start by issuing through the tax bureau's online service (电子税务局) by finance staff, because R2 volume is low. Move to an invoicing API service when the volume makes manual issuing a burden | R2 (FR-CLI-07) |

**To confirm.** The owner approves the shortlist and budget. Finance confirms the invoicing set-up with the tax adviser ([08 §10 F](08-china-operating-model.md)).

---

## D-07 — Fee schedule and plan pricing

**What we know.**

- Venue fees: Tianjin's tiered seller fee (2% / 1% / 0.5% / 0.3%, minimum ¥2,000), single listings' terms (a 5% STEX buyer fee on one 2026 equipment disposal; a 10% CTEX bidding fee), and STEX's own fee standard, which exists but whose rates are unknown ([09 §2.6](09-reference-platform-features.md); D-01).
- **CTEX published a full schedule** (in force 1 June 2021; replaced in June 2024 by measures that could not be retrieved): ¥2,000 listing fee; agreement deals charged to **each side** at 1.5% / 0.5% / 0.25% / 0.15% by band (minimum ¥3,000); competitive deals add 5% of the premium for the holder; separate settlement fees ([09 §2.6](09-reference-platform-features.md)).
- **What a broker earns:** Jiangsu's technology-manager commission standard (2018). For technology transfer: 6% / 5% / 4% / 3% by band up to ¥5 M, then negotiated, with a ¥3,000 floor. Lower rates apply to development contracts; similar rates to consulting and services up to ¥1 M. The broker firm may keep 12% of the commission; two brokers of one firm split it 60 / 40, demand side first. A three-party service agreement names who pays.
- The fee rules in [08 §7.2](08-china-operating-model.md) apply to every fee: defined trigger, payer, basis, invoice, never charged on intended value.

**Proposed resolution.** A starting schedule, entered as data in the configurable fee schedule (FR-ADM-04) and versioned. A deal keeps the schedule version that applied when it was signed.

| Fee | Payer | Proposed starting value | Trigger |
| --- | --- | --- | --- |
| Registration, listing, demands, search, introductions | — | Free (cold start: OPS-01, OPS-02) | — |
| Success fee on platform-managed deals (the platform acts as broker) | Named in the service agreement; the seller by default | The Jiangsu broker bands by contract type, applied marginally (each band's rate on the part of the value in that band). Technology transfer: 6% up to ¥0.5 M, 5% to ¥1 M, 4% to ¥3 M, 3% to ¥5 M, negotiated above, minimum ¥3,000. Development: 4% / 3% / 2% / 1% with the same minimum. Consulting and services: 6% / 5% / 4% / 3% up to ¥1 M, minimum ¥1,000 | Signed contract **and** first payment confirmed; calculated on the amount actually received |
| Agent fee on venue-routed deals | The client the platform represents, under the agency contract | Same bands. It **replaces** the success fee: one fee per deal, never both. In partner mode (D-01), split with the partner agent | The venue confirms the deal |
| Venue fees | As the venue's schedule says | Passed through at cost, shown separately and never booked as platform revenue (FR-RPT-03) | The venue's fee notice |
| Services (evaluation, valuation, patent search, registration help) | Client | Quoted per order (FR-SVC-03) | The client accepts delivery |
| Subscriptions (Professional, Enterprise), TTO workspace, programme contracts | Client | Free for pilot organizations during R1. Prices are set by the end of R1, from pilot interviews and willingness to pay | Annual contract |
| Technology manager's share | The platform, from a fee it has received | Set per manager agreement (FR-MAT-08). Starting rule for two managers on one deal: 60% to the demand-side manager and 40% to the supply-side manager (the Jiangsu split). For independent managers, the platform's own share is set in the agreement; the Jiangsu benchmark lets a broker firm keep 12% | The fee is actually received |

**What it changes.**

- The fee schedule needs versioning and effective dates. Deals store the version.
- The deal workspace shows the applicable fees before the parties accept terms.
- Invoices are issued for fees only (D-06).
- Charging online for subscriptions triggers the ICP licence (D-04).

**To confirm.** The owner confirms the structure and starting values before R2. The bands are a published provincial benchmark for broker commissions, used as a starting point to test with pilot clients. Clients compare the total: venue fees (CTEX charges both sides) plus the platform's fee, so both are shown up front.

---

## D-08 — Runtime upgrade

**What we know.**

- Node.js 12 has been end-of-life since 30 April 2022, MongoDB 4.4 since February 2024, MongoDB 5.0 since October 2024 and Mongoose 5 since 1 March 2024 ([11 §1, §11](11-target-runtime-node12-mongodb.md)).
- MongoDB 5.0 needs a CPU with AVX instructions ([11 §1.2](11-target-runtime-node12-mongodb.md)).
- **Tested on 2026-10-19** ([11 §11.2](11-target-runtime-node12-mongodb.md)):
  - the draft code runs unchanged on Node 12.22.12, and the full suite passes;
  - a port to Mongoose 6.13.11 passes the full suite on Node 12.22.12 and 12.4.0, with MongoDB 4.4 and 5.0, for about one working day of effort.
  - Three of the port's changes are silent: update-result field names, `increment()`, and the JSON form of Int64. 11 §11.2 lists them and the search that finds them.
  - The spike also exposed two tenant-scope gaps (`findOneAndReplace`, `estimatedDocumentCount`). They are now fixed on 5.13 as well.

**Proposed resolution.**

1. **Node 12.22.12 in R0.** It is the last Node 12 release, a drop-in step within the same major version, and the full suite passes on it (see above).
2. **MongoDB 5.0** where the CPU has AVX (`grep avx /proc/cpuinfo` in the server survey, [11 §1.1](11-target-runtime-node12-mongodb.md)); otherwise 4.4. The code uses only 4.4 features, so the choice does not change the code.
3. **Mongoose 6.13 in R0**, as a second release after the Node step, with the full suite as the gate, before R1 code is written on top of the data layer. Never run Mongoose 6 in production on Node 12.4.0: its driver declares Node ≥ 12.9. If the port fails the gate, stay on 5.13 and record the accepted risk.
4. **Later:** the path in [11 §11.2](11-target-runtime-node12-mongodb.md), via a container with a current Node LTS if the servers allow containers. That is needed before the platform handles live funds or a level-3 assessment (D-05).

**To confirm.** The owner confirms; the tech lead runs the server survey in the first week of R0.

---

## Other items closed in this revision

The known gaps listed in revision 5 of the [README](README.md) are now designed:

| Gap | Where it is designed | Verified in code |
| --- | --- | --- |
| Payment requirements | FR-PAY-01 … FR-PAY-04 ([10 §3.18](10-product-requirements.md)); [06 §6.11](06-implementation-design-v1.md) | No (R3 specification) |
| R3 acceptance scenarios | UAT-16 (venue route), UAT-17 (payments); also UAT-14 and UAT-15 for the calendar and review cases ([10 §10](10-product-requirements.md)) | — |
| Offer lifecycle | [06 §6.6](06-implementation-design-v1.md) | Statuses, reservation, closure reason; activation on publication |
| Review-case lifecycle | [06 §6.7](06-implementation-design-v1.md) | Yes (`tests/test-workflow.js`) |
| Publishing service | [06 §6.8](06-implementation-design-v1.md) | Yes |
| Worker leases, retries, dead letters | [06 §6.9](06-implementation-design-v1.md) | Yes |
| Working-day calendar algorithm | [06 §6.10](06-implementation-design-v1.md) | Yes |
| Malware scanning and alerting | [06 §9.1, §11.6](06-implementation-design-v1.md) | No (configuration) |

## Facts still unknown

The research of 2026-10-19 ([`references/`](references/README.md)) could not establish these facts. Each needs a direct answer from the venue or counsel before the decision that depends on it is final.

| Fact | What was found | Who can answer | Affects |
| --- | --- | --- | --- |
| STEX's fee rates | A trial fee standard (2021) exists; its table is an image that no archive holds | STEX | D-01, D-07 |
| Fees STEX and CTEX charge their agents or members | Both venues charge them; no amounts are published | STEX, CTEX | D-01 |
| STEX's full agent rules | The 2024 admission notice also applied a supplementary agent rule, a trading rule and a 科商 rule; none of them was found | STEX | D-01 |
| Which practitioner certificates STEX recognises | Not defined in any source; the national technology-transfer broker certificates are the likely evidence (inference) | STEX | D-01 |
| Whether the archived STEX rules (2020–2022) are current | No newer rules were found. 2026 listings use longer signing periods and off-exchange settlement, so they differ in practice | STEX | FR-VEN, D-01 |
| CTEX's current member rules (December 2023) and fee measures (June 2024) | Both exist; neither text could be retrieved (the site blocks access from outside mainland China) | CTEX | D-01, D-07 |
| How 沪府规〔2025〕2号 Art. 11 applies to venue agents | Venues may in principle not operate through agents without approval; nothing says how this applies to existing agent schemes | PRC counsel | D-01 |
| A data interface for agents | None found; the venues' web portals (and STEX's TECHDEAL app) only | STEX, CTEX | FR-VEN-10 |
| The 2027 holiday arrangement | Not yet published (the 2026 notice came out on 4 November 2025) | State Council notice, entered under §6.10 of 06 | FR-ADM-09 |

---

## Sources

Notes, excerpts and saved copies of every source are in [`references/`](references/README.md); the venue facts are summarised in [09 §2.1, §2.3, §2.6, §2.7](09-reference-platform-features.md).

- STEX: rule 105 (agents) and rule 82 (buyer registration), Internet Archive copies listed in [09 Sources](09-reference-platform-features.md#sources); fee standard (trial, 2021) <http://web.archive.org/web/20241014020815/https://www.stte.com/articles/35>; 2026 formal listings <https://bid.stte.com/prjs/real_right/detail/10031.html>, <https://bid.stte.com/prjs/real_right/detail/10026.html>; 2024 agent admission notice <https://www.stte.com/articles/1331>; online submission notice (2022) <http://www.stte.com/articles/636>.
- CTEX: trading rules (2023) <https://us.ctex.cn/article/rules/202311/20231100140553.shtml>; fee measures (2021) <http://web.archive.org/web/20230607071939/https://us.ctex.cn/article/rules/202106/20210600106431.shtml>; service-institution measures (2022) <http://web.archive.org/web/20231207091034/https://us.ctex.cn/article/rules/202104/20210400103753.shtml>; rule list (2024) <https://us.ctex.cn/article/rules/>.
- Jiangsu technology managers' commission standard (2018): <https://jszy.ujs.edu.cn/__local/B/B0/48/3BF60588F177FC90541BD848228_017AEC54_7B34E.pdf?e=.pdf>.
- 《上海市交易场所管理暂行办法》 (沪府规〔2025〕2号): <https://www.shanghai.gov.cn/nw12344/20250218/f707bcc7c9f14983bf3d8f5cc7a0ac16.html>; 《上海市技术交易场所管理细则》 (沪科规〔2025〕2号) and 国发〔2011〕38号: see [08 Sources](08-china-operating-model.md#sources).
- Holiday notices: 2026, 国办发明电〔2025〕7号 <https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm> ([official text](references/official-texts/gov-holidays-2026-guobanfamingdian-2025-7.txt)); 2025, 国办发明电〔2024〕12号 <https://www.news.cn/politics/20241112/46dcf0de740844dd824ff54b5be5af2e/c.html>.
- PRC Civil Code Art. 201 and 203 (computation of periods), Cybersecurity Law Art. 21 (log retention), GB/T 22239-2019 (MLPS baseline requirements).
- Tianjin fee schedule: [09 §2.6](09-reference-platform-features.md).
- Runtime end-of-life dates and the Mongoose 6 port: [11 §11 and Sources](11-target-runtime-node12-mongodb.md#sources).
