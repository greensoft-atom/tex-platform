# 08 — China Operating Model: Legal Boundary, Venue Route, Deals and Money

> **About this document**
>
> - **Purpose:** Define how the platform operates in China: legal boundaries, the route through a licensed trading venue, user groups and authority, deal types, the end-to-end workflow with approvals, contracts, funds handling, fees, disputes, required modules and the launch checklist.
> - **Audience:** Founders, product owner, architects, finance and compliance leads, and the Chinese legal counsel and payment partner who must validate it.
> - **Status:** Operating-model baseline for the China launch. Implementation baseline: [06](06-implementation-design-v1.md); role and money concepts: [07](07-roles-workflows-and-money.md); real venue rules: [09](09-reference-platform-features.md); numbered requirements (FR-VEN, FR-DEAL, FR-CMP …) and open decisions D-01 … D-08: [10](10-product-requirements.md).
> - **Not legal advice.** Every item marked *legal validation required* must be confirmed by PRC counsel, the relevant regulator or the payment partner before launch.
> - **Previous:** [07 — Roles, workflows and money movement](07-roles-workflows-and-money.md) · **Next:** [09 — Reference platforms](09-reference-platform-features.md) · **Index:** [README](README.md)

---

## Summary

The platform is a demand-driven **matching and service platform with managed transfer workflows**: verified organizations, controlled introductions, negotiated contracts, milestone-based delivery, and **funds handling backed by a licensed bank or payment institution**. It is **not** itself a licensed exchange.

Two legal boundaries shape the model:

1. **Exchange functions are licensed.** Formal listing (挂牌), competitive bidding, auction and tender, third-party settlement of deposits and prices, and rights-registration and transaction certificates are **venue functions**: the Shanghai rules list them as duties of licensed venues (Art. 11), and the national rules on trading venues bar unapproved operators from centralized competitive trading (国发〔2011〕38号; how they apply to this platform is a legal-validation item, D-03). In Shanghai, technology trading venues (技术交易场所) are approved by the municipal government under total-quantity control (《上海市技术交易场所管理细则》, 沪科规〔2025〕2号, in force 1 May 2025 – 30 April 2030). The platform therefore performs these steps **through a licensed venue (STEX or CTEX), as a registered practising agent** (执业类交易服务机构) of its clients (§1.3).
2. **Money handling is licensed.** The business wants funds held until contractual conditions are met. The **business process** we want must be separated from the **financial activity the platform is legally permitted to perform**:
   - The State Council's **Regulations on the Supervision and Administration of Non-bank Payment Institutions** (《非银行支付机构监督管理条例》, State Council Decree No. 768, published December 2023, effective **1 May 2024**) require payment business to be carried out only by institutions licensed by the People's Bank of China (PBOC). They regulate payment processing and customer reserve funds (备付金), and prohibit misappropriating reserve funds.
   - Shanghai's 2025 venue rules likewise require **third-party settlement** through a bank or licensed non-bank payment institution, with separate accounts per client (Art. 12; see [01 §1.3](01-shanghai-landscape.md)).

**Recommendation:** **never assume the platform itself can receive, pool, safeguard or release customer money**. Money is held and released only by a licensed bank or payment institution (or, for venue-routed deals, through the venue's third-party settlement). The platform coordinates deal conditions and records verified payment events. **Owner decision (D-02, 2026-10-19):** the build keeps payments shallow. One adapter carries payment requests, verified events, refunds and reconciliation, with the owner's own payment testing platform as the first provider ([06 §6.11](06-implementation-design-v1.md), FR-PAY). Conditional holding is not designed. If it is ever wanted, a provider must confirm the exact arrangement for each transaction type before implementation commits to it.

This document separates three kinds of statement:

| Label | Meaning |
| --- | --- |
| **Evidence** | What official regulations or established technology-transfer practice support |
| **Proposed policy** | How this platform should operate |
| **Legal validation required** | What PRC counsel, the regulator or the payment partner must confirm before launch |

---

## 1. Legal and operational boundary for the China launch

The platform supports all requested deal types, but the transaction engine applies a **different compliance path to each deal**, and distinguishes **domestic** from **cross-border** technology transfer.

### 1.1 Legal map

| Area | Evidence (Chinese source) | Required product decision |
| --- | --- | --- |
| Platform operation | **E-Commerce Law** (《电子商务法》): an e-commerce platform operator must publish platform rules, take security measures, and keep transaction information for **at least three years** after transaction completion (Art. 31), unless other laws require longer | Publish a platform service agreement and transaction rules; keep immutable, exportable records with retention policies per record category. Whether the platform counts as an e-commerce platform operator for each service is *legal validation required*; design as if it does |
| Internet operation | **ICP filing** (ICP备案) for any website in mainland China; an **ICP licence** (ICP经营许可证) for commercial internet information services; online platforms on which third parties transact typically need a value-added telecom licence for **online data processing and transaction processing** (在线数据处理与交易处理, "EDI") | Decide the licensing path with counsel before public launch (*legal validation required*; decision D-04) |
| Cybersecurity | **Cybersecurity Law**: classified protection of information systems (网络安全等级保护, "MLPS 2.0") | Plan the grading, filing and assessment of the platform's systems (level 2 at launch, NFR-08; decision D-05) |
| Payment handling | **Non-bank Payment Institution Regulations** (Decree No. 768, effective 1 May 2024): PBOC authorization; regulated payment processing and reserve funds | No general-purpose wallet or pooled balance. Choose a bank or licensed payment institution that confirms it can legally support the exact flow (decision D-02) |
| Technology contracts | **Civil Code**, Book III, Chapter 20: technology **development** (commissioned or cooperative), technology **transfer** and **licensing**, technology **consulting** and **services** are distinct contract types | Make deal type, IP rights, scope, deliverables, consideration and acceptance rules explicit in each contract |
| Patent transfer formalities | **Patent Law** Art. 10: assignment of a patent (or application) needs a written contract **registered with CNIPA**, and takes effect **on registration**. Assignment to foreign parties also follows technology-export rules. Licence contracts are normally filed (备案) with CNIPA | "Assignment completed" requires CNIPA registration evidence; track licence filing |
| Public-institution transfers | **Law on Promoting the Transformation of Scientific and Technological Achievements** (《促进科技成果转化法》) Art. 18: state-funded universities and institutes may decide to transfer, license or invest results, pricing by **negotiation (with public notice of the name and proposed price), listing on a technology market, or auction**. Art. 45: absent internal rules or agreement, **at least 50%** of net transfer or licence income goes to the contributing researchers | Support public-notice periods, listing and auction pricing, and income-distribution records for university sellers |
| Technology import/export | **Regulations on Technology Import and Export Administration** and the **Catalogue of Technologies Prohibited or Restricted from Export** (revised 2023): prohibited, restricted and free categories. Free-category contracts are **registered**; restricted technologies need **prior licensing**. Registration certificates are used for foreign-exchange, banking, tax and customs procedures | Screen technology and parties **before** disclosure, signing, delivery and payment; block prohibited transfers; gate restricted ones on approvals |
| Export control | **Export Control Law** (2020): dual-use items and controlled technical data | Flag dual-use and controlled technical data in compliance screening |
| Electronic contracts | **Electronic Signature Law**: a *reliable* electronic signature has the same legal effect as a handwritten signature or seal, under specified conditions | Keep the exact signed version, signer identity and authority, timestamps and integrity evidence. Use an e-signature provider whose certificates come from a licensed electronic certification service provider (电子认证服务机构), and support company e-seals (电子印章) (decision D-06) |
| Personal information and data | **PIPL**, **Data Security Law** and the 2024 **Provisions on Promoting and Regulating Cross-border Data Flows** | China-based data storage and access controls from day one; assess before sending personal or important data overseas (including to AI providers) |
| Technology-contract registration | Revised **Measures for the Administration of the Recognition and Registration of Technology Contracts** (《技术合同认定登记管理办法》, issued by MIIT, effective **1 March 2026**). Registration is generally voluntary, but in practice it unlocks tax incentives; records are generally kept five years | Generate registration-ready contract packages and track registration status (see §5.5) |
| Trading venues (national) | State Council **Decision on Cleaning Up and Rectifying Trading Venues** (《国务院关于清理整顿各类交易场所切实防范金融风险的决定》, 国发〔2011〕38号): a trading venue that uses "交易所" (exchange) in its name needs approval (provincial government, unless approved by the State Council or a financial regulator); unapproved venues may not split rights into equal shares for public sale or trade them by centralized bidding (集中竞价) or market making. Shanghai applies this through 《上海市交易场所管理暂行办法》 (沪府规〔2025〕2号) | Do not use 交易所 in the Chinese company or platform name, do not present the platform as a licensed venue, and run no binding bidding on the platform itself. Whether non-binding price indications (意向报价) on the platform are acceptable is open (*legal validation required*; decision D-03) |
| Licensed trading venues (Shanghai) | 《上海市技术交易场所管理细则》 (沪科规〔2025〕2号): venues approved by the municipal government under total-quantity control (Art. 6); rights registration, transaction certification, disclosure and settlement are venue duties (Art. 11), with third-party settlement (Art. 12). STEX rules require intended buyers to submit through a registered agent, who verifies their materials and bears **joint liability** (连带责任) (STEX rule 82) | Default route: act as a **registered practising agent** of STEX (≥ 2 years registered, registered capital ≥ RMB 1 million, ≥ 2 recognised practitioners, clean 24-month record; STEX rule 105) or of CTEX, and route formal listing, bidding, settlement and certificates through the venue (§1.3; [09 §2.1](09-reference-platform-features.md); decision D-01) |

> This table is an implementation baseline, not a legal opinion that a particular holding structure, company licence or cross-border transaction is permitted. Before production, PRC counsel and the proposed financial institution must validate the legal entities, funds flow, contract wording, regulated activities, tax and foreign-exchange handling.

### 1.2 Money-handling model approved for development

Money moves on one of three routes, and on none of them does the platform hold client funds (route table in [07 §6](07-roles-workflows-and-money.md)):

- **Direct payment between the parties** (from R2, before payments are integrated): the platform records obligations and the payment evidence the parties provide, and never shows such payments as provider-confirmed.
- **Payment provider** (R3, decision D-02): payment requests through one adapter, with the owner's payment testing platform first and a licensed bank or payment institution for live money ([06 §6.11](06-implementation-design-v1.md)). The diagram below shows the general model. Its holding and release part is background, not build scope.
- **Venue settlement** (R3): venue-routed deals settle through the venue's third-party settlement account (§1.3).

```mermaid
flowchart LR
    subgraph EXCH["Our platform (operator)"]
        E1["Listings, introductions, negotiations"]
        E2["Contract conditions and milestone evidence"]
        E3["Disputes and payment instructions"]
    end
    subgraph BANK["Licensed bank / payment institution (selected partner)"]
        B1["Holds the actual funds"]
        B2["Confirms received, reserved, transferred,<br/>refunded and paid-out amounts"]
    end
    subgraph PARTIES["Buyer and supplier"]
        P1["Execute the contract"]
        P2["Provide evidence; approve or contest milestones"]
        P3["Pay and receive provider-confirmed outcomes"]
    end
    PARTIES -->|"payments"| BANK
    EXCH -->|"authorized instructions"| BANK
    BANK -->|"verified events (webhooks, statements)"| EXCH
    BANK -->|"payouts"| PARTIES
    EXCH <-->|"workflow, evidence, notifications"| PARTIES
```

This is a proposed architecture. It does **not** claim that any Chinese provider currently offers a universal escrow service for all technology licensing, investment and R&D transactions. Products to evaluate include bank fund-supervision (资金监管) or custody (存管) accounts and licensed payment institutions' split-settlement (分账) services. Validate fund ownership, release control, dispute handling, refunds, fees and permitted customer types with each candidate (*legal validation required*).

**Do not make any user-facing "escrow" promise until that validation is complete.** If the partner can only process ordinary payments and payouts, the system must describe exactly that.

### 1.3 Venue route: what runs through STEX or CTEX

Some steps are **venue functions** under the Shanghai rules (Arts. 11–13): formal listing and disclosure, buyer registration and qualification, competitive methods (online bidding, auction, tender, competitive negotiation), third-party settlement of deposits and prices, and certificates: the rights-registration certificate (技术权益登记凭证), the transaction certificate (技术交易凭证) and the no-objection certificate for a public notice (公示无异议证明). The platform does not perform them itself. As its client's **agent of record**, it prepares, verifies, submits and tracks them, and records the venue's results (FR-VEN-01 … FR-VEN-10, release R3 in [10](10-product-requirements.md)).

**When a deal uses the venue route**

| Situation | Venue product |
| --- | --- |
| The seller wants open competition among buyers | Formal listing (正式挂牌), with buyer registration and the pre-announced competitive method if two or more buyers qualify |
| The seller wants to test interest before fixing price or method | Intent listing (意向挂牌) |
| A state-funded university or institute prices a service invention by listing or auction (§5.4), or wants the Shanghai due-diligence exemption for a negotiated price (notice published in the institution **and** on a trading market) | Formal listing or auction; transfer notice (科技成果转化公示) with a no-objection certificate |
| Parties agreed a deal off-venue but need venue settlement, a transaction certificate or venue evidence | Private agreement (非公开协议成交) |
| State-owned enterprise property rights are transferred | State-owned property-rights listing (FR-CMP-07) |

Any deal type in §3 can use the venue route. Deals that need none of these products stay on the platform's own managed workflow (§4) and its payment route (§1.2).

**Who does what**

| Step | Our platform (agent of record) | Venue |
| --- | --- | --- |
| Submission | Collects the application, agency contract, identity documents, decision documents, ownership proof and commitment letter; checks completeness; records the agent's verification opinion under maker-checker (FR-VEN-01, FR-ADM-02) | Completeness check, then compliance review within 3 working days (WD) |
| Disclosure | Builds the announcement; tracks the minimum period (≥ 5 WD on STEX, ≥ 10 WD on CTEX) on the official working-day calendar (FR-VEN-02, FR-VEN-03, FR-ADM-09) | Publishes; restarts the period after any change |
| Buyer registration | Submits the buyer's intent form, risk statement and the agent's verification opinion; the agent bears **joint liability** for the buyer's materials (STEX rule 82; FR-VEN-04) | Reviews within 3 WD; asks the seller to confirm qualification (silence within 3 WD = consent) |
| Competition | Prepares bidding plans and documents; supports the client (FR-VEN-05, FR-VEN-06) | Runs online bidding, auction (through a licensed auction house), tender or competitive negotiation |
| Contract | Drafts the contract with the 12 mandatory clauses and tracks the signing deadline the listing sets (5 WD in rule 83; 60 WD in most 2026 STEX listings) (FR-DEAL-03, FR-DEAL-05) | Reviews and certifies the contract |
| Money | Shows the venue-reported status of deposits and prices; for off-exchange settlement (场外结算, the price paid straight to the seller), records the seller's evidenced receipt. **Never receives the funds** (FR-VEN-08) | Settles deposits (and, on-exchange, prices) through its third-party settlement account (Art. 12) |
| Certificates | Stores certificate numbers and PDFs and links them to deals, notices and reward records (FR-VEN-09) | Issues the certificates |

Exact STEX rules and time limits: [09 §2.3–§2.4](09-reference-platform-features.md).

**Becoming an agent.** CTEX's latest available entry rules (2022) are much lighter than STEX's: no minimum capital, company age or staff number, a 10-WD review and a one-year certificate, and no acting for both sides or for two buyers in one deal. Since December 2023 CTEX has handled agents as members under rules that could not be retrieved, so this must be confirmed ([09 §2.1](09-reference-platform-features.md)). STEX (rule 105, [09 §2.1](09-reference-platform-features.md)): an independent legal entity registered for at least 2 years, registered capital of at least RMB 1 million, at least 2 practitioners recognised by STEX, and no major violations, dishonesty records or administrative penalties in the last 24 months. Agents face an annual review each July and report changes within 10 WD. A newly formed operating company cannot meet the 2-year rule, so the options (decision D-01) are: partner with an existing registered agent first, register as a STEX (or CTEX) agent once eligible, or apply for venue status (long and uncertain under total-quantity control). The proposed resolution is designed in [12 D-01](12-decision-record.md): register with CTEX now, partner with a STEX agent for STEX listings, and register with STEX once eligible. It starts with a legal check of 沪府规〔2025〕2号 Art. 11, which restricts venues from operating through agents without approval.

*Legal validation required:* the scope of the agent's joint liability, the agency-contract terms with clients, insurance, and internal controls for verification opinions.

---

## 2. User groups and authorization model

The platform needs **organization-level identity, deal-specific roles and platform staff roles**. A user can hold different roles in different organizations and deals.

### 2.1 Organization and deal participants

| User type | Main workflow | Decisions they can make |
| --- | --- | --- |
| Technology owner / provider | Submit, update and commercialize technologies | Authorize an offer, disclose approved information, propose terms, accept deliverable or payment terms on its side |
| Buyer / technology seeker | Publish needs, qualify candidates, evaluate and acquire | Approve its demand, evaluation plan, commercial proposal and acceptance of contracted deliverables |
| R&D collaborator | Propose or join research projects | Approve its work packages, contributions, background IP and new-results arrangements |
| IP owner or co-owner | Verify rights and authorize transactions | Consent to licensing, assignment or disclosure within its authority (co-owners may need to consent jointly) |
| University TTO / technology-transfer center | Manage service inventions (职务科技成果) of the institution | Approve listing, pricing method (negotiation + public notice, listing or auction), contract and income distribution |
| Investor / funding party | Review opportunities and commit funding | Approve its investment conditions, subject to legal and corporate process |
| Technology broker / technology manager (技术经理人) / authorized agent | Represent a party in defined activities | Only the actions explicitly delegated to it |
| Technical evaluator | Test, inspect or assess deliverables | Submit an evaluation report; **cannot** approve payment unless separately authorized |
| Legal / IP adviser | Review rights, contracts and restrictions | Record legal clearance, concerns and conditions |
| Finance approver | Approve budgets and payment instructions | Approve the organization's payment obligations within its limits |
| Authorized signatory | Execute agreements for an organization | Sign only for the organization and scope for which authority is established (legal representative 法定代表人, or a holder of a power of attorney 授权委托书, with company seal or e-seal) |

### 2.2 Platform roles

| Platform role | Responsibilities | Important restriction |
| --- | --- | --- |
| Organization verification officer | Reviews organization and representative evidence | Cannot sign on behalf of an organization |
| Listing reviewer | Reviews listing completeness and policy compliance | Cannot certify technical claims it has not tested |
| Case manager | Coordinates introductions, discussions, milestones and deadlines | Cannot rewrite agreed terms |
| Compliance officer | Reviews technology-control, sanctions, fraud and escalation flags | Cannot bypass mandatory legal gates |
| Financial operations officer | Reconciles provider transactions, investigates failures, prepares payout actions | Cannot create provider confirmations or alter financial history |
| Venue submission officer (agent of record) | Prepares venue submissions and buyer registrations; drafts the agent's verification opinion (§1.3) | Cannot submit alone: a second reviewer approves (maker-checker, FR-ADM-02), because the company bears joint liability for what it verifies |
| Dispute reviewer | Manages evidence and the dispute process | Must follow agreed rules and disclose conflicts of interest |
| System administrator | Accounts, configuration and system health | Admin access never grants business approval rights |
| Auditor | Reviews authorized records and logs | Read-only by default |

In a small team, one employee may perform several functions. The application must still enforce **separation of duties** for high-risk actions.

### 2.3 Mandatory approval policy

- A provider cannot authorize a transaction solely because it uploaded a listing.
- A broker cannot bind the owner unless valid authority is recorded.
- A technical evaluator cannot release funds.
- A finance approver cannot change technical acceptance criteria.
- A case manager cannot substitute their judgment for a party's contractually required consent.
- A system administrator cannot mark an external payment as successful.
- Every payout or refund needs a recorded authorization **and** a matching provider transaction result.
- Where one user acts for several parties, the system detects and flags the conflict.

Use explicit **organization mandates**, permission scopes, approval limits and expiry dates (`organization_authorizations`, FR-ORG-04). For larger transactions, require **two-person approval** inside the paying organization for payments and for changes to payout destinations. Conflict detection is FR-ORG-07.

---

## 3. Deal-type catalogue

All deal types are supported in the data model. Each has its own contract template, compliance checklist and definition of completion.

| Deal type | Civil Code / legal category | Required submissions and contract terms | Funding / payment model | Completion condition |
| --- | --- | --- | --- | --- |
| IP licensing | Technology licensing contract (技术许可合同) | Owner authority, licensed rights, territory, field of use, exclusivity, duration, sublicensing, improvements, reporting, termination | Upfront fee, milestone fees, royalties or a combination | Licence executed, approvals met, initial payment / delivery obligations satisfied; CNIPA licence filing where applicable |
| IP assignment | Technology transfer contract (技术转让合同) | Rights and ownership evidence, assigned assets, consideration, warranties, transfer documents, formalities | Lump sum or instalments | **CNIPA registration of the assignment** and other formalities completed |
| Technical services | Technical service contract (技术服务合同) | Statement of work, deliverables, timetable, dependencies, acceptance tests, revisions, warranties | Deposit plus milestone and final payments | Deliverables accepted or contractually resolved |
| Technology consultation | Technical consulting contract (技术咨询合同) | Scope of investigation, methods, report, assumptions, acceptance criteria | Fixed fee or milestones | Report or service accepted |
| R&D collaboration | Technology development contract (技术开发合同: commissioned or cooperative) | Work packages, funding and contributions, background IP, foreground IP, publication, patent costs, confidentiality, exit | Funding tranches and milestone payments or contributions | Work-package and funding conditions satisfied |
| Technology supply | Sales contract (with technology elements) | Specification, quantity, delivery terms, inspection, warranties, title and risk transfer, service obligations | Deposit, shipment or delivery payments | Delivery and acceptance requirements satisfied |
| Commercialization / distribution | Licence + distribution agreement | Rights, territory, channel, sales targets, lawful pricing controls, reporting, royalties | Licence fee, minimum guarantees, royalties or revenue share | Rights granted; reporting and payment obligations established |
| Investment (incl. technology-for-equity, 作价投资) | Company-law and investment documents | Instrument, valuation, approvals, conditions precedent, equity or rights, disclosures, closing documents | Funds at closing or in tranches | Closing conditions, documents and registration of share changes completed |
| Joint venture / consortium | Company-law or consortium agreement | Structure, contributions, governance, IP, liabilities, exit and deadlock rules | Capital contributions on schedule | Formation and closing conditions met; ongoing obligations tracked |

Cross-border deals add the import/export requirements in §5.3. Any deal type can also use the venue route (§1.3) when it needs formal listing, competition among buyers, venue settlement or a venue certificate.

### 3.1 Launch policy: three implementation tiers

All deal types can be **listed** at launch, but workflows are implemented in three tiers:

| Tier | Deal types | Workflow |
| --- | --- | --- |
| **1. Standardized** | IP licensing, technical services, technology supply, technology consultation | Standard templates, standard milestone and payment flows |
| **2. Managed legal review** | IP assignment, R&D collaboration, commercialization and revenue sharing | Mandatory legal review step before signing |
| **3. Specialist-only closing** | Investment, joint ventures, regulated technologies, complex cross-border transactions | The platform coordinates the opportunity and evidence, but closing is handled by specialists. Never imply that a standard template or ordinary payment flow is sufficient |

---

## 4. End-to-end business workflow and required approvals

The recommended end-to-end workflow for a deal the platform manages. Every arrow is a business transition with its own authorization checks.

```mermaid
flowchart TD
    A["Register organization and users"] --> B["Verify identity and authority"]
    B --> C["Submit technology or demand"]
    C --> D["Review and publish"]
    D --> E["Expression of interest"]
    E --> F{"Both parties accept<br/>introduction?"}
    F -->|"No"| X1["Declined / closed"]
    F -->|"Yes"| G["Qualification and managed introduction"]
    G --> H["Confidentiality terms and<br/>disclosure permissions"]
    H --> I["Technical, IP and commercial evaluation"]
    I --> J["Proposal and counter-proposal versions"]
    J --> K{"All required parties agree<br/>to the same terms?"}
    K -->|"No"| J
    K -->|"Yes"| L["Contract approval and signature"]
    L --> M["Legal / technology-control gates"]
    M --> N{"All closing conditions<br/>satisfied?"}
    N -->|"No"| X2["Blocked / remediation / cancellation"]
    N -->|"Yes"| O["Payment obligation created"]
    O --> P["Payment provider confirms funding"]
    P --> Q["Delivery / project milestone"]
    Q --> R{"Acceptance decision"}
    R -->|"Accepted"| S["Authorized release instruction"]
    R -->|"Rejected"| T["Correction or dispute"]
    T --> Q
    S --> U["Provider confirms transfer / payout"]
    U --> V["Reconcile fees and ledger"]
    V --> W["Close initial deal;<br/>track continuing obligations"]
```

Some contracts use a different order: an upfront licence fee may be due **before** technical handover, and an R&D project may have several funding tranches. The workflow engine therefore supports **configurable rules per deal type**, not one hard-coded sequence.

**How this maps to the records.** Steps up to "Managed introduction" live on the technology, demand and introduction records ([06 §6.1–§6.3](06-implementation-design-v1.md)). From then on the deal record moves through its own status (06 §6.4; the `ready_to_complete` step is detailed in [05](05-system-design-blueprint.md)): `opportunity` → `qualified` → `due_diligence` (evaluation) → `negotiation` (proposal versions) → `contract_draft` → `approval` → `signed` → `conditions_pending` (legal gates, funding, milestones) → `ready_to_complete` → `completed`, with `on_hold`, `lost` and `disputed` as side states. Proposals, contracts, compliance gates, milestones and every payment object keep **separate** statuses (§6.2); the deal status never replaces them.

### 4.1 Transition specification

| Transition | Who can initiate? | Required evidence | What becomes true? |
| --- | --- | --- | --- |
| Register organization | Authorized applicant | Business registration (unified social credit code 统一社会信用代码) and representative details | Organization record exists; verification pending |
| Verify organization | Verification officer | Identity and organization evidence (e.g. checked against the National Enterprise Credit Information Publicity System, 国家企业信用信息公示系统) | A defined verification level is recorded (L0–L4, FR-ACC-05) |
| Submit listing | Authorized provider representative | Required listing fields and rights declaration | A version is submitted for review |
| Publish listing | Listing reviewer / authorized workflow | Completeness and policy checks | That version becomes searchable |
| Express interest | Buyer or authorized representative | Use case, intended collaboration, information requested | A non-binding enquiry exists |
| Accept introduction | Each party's authorized contact | Explicit consent and scope | The introduction is permitted |
| Authorize confidential disclosure | Information owner and any other required parties | Disclosure scope and applicable confidentiality terms | Access granted to specified documents |
| Submit proposal | Authorized commercial representative | Complete proposal version, validity period, assumptions | Immutable proposal version exists |
| Accept proposal | Authorized party representative | Acceptance of the exact version | That party's response is recorded |
| Agree final terms | Every required party | Matching acceptance of the same complete version | Terms agreed, subject to contract and legal conditions |
| Execute contract | Authorized signatories | Final document, signature or seal evidence, authority | Contract executed, subject to its conditions |
| Clear compliance gate | Authorized compliance / legal reviewer | Required IP, export/import, party and other checks | Specific transaction gates satisfied |
| Confirm funding | Provider integration / reconciliation process | Authenticated provider event or verified bank reconciliation | Funding status reflects actual receipt |
| Submit milestone | Contractually responsible party | Deliverable, evidence, timestamp | Milestone enters review |
| Accept milestone | Authorized recipient | Acceptance decision against criteria | Milestone accepted |
| Reject milestone | Authorized recipient | Specific reason and supporting evidence | Correction or dispute procedure begins |
| Instruct release | Contract-authorized actor or approved automated rule | Accepted milestone, satisfied conditions, available provider funds, required approvals | Release instruction sent to the provider |
| Confirm payout | Provider integration / reconciled finance officer | Authenticated provider result | Payout status reflects the actual outcome |
| Open dispute | Authorized deal party | Issue, remedy sought, supporting evidence | Affected obligations enter the dispute procedure |
| Close deal | Authorized workflow after required conditions | Contractual closing checklist | Initial deal closed; royalties and other obligations stay active |

### 4.2 "Accept" must always be scoped

Use distinct action labels in the interface and API:

| Label | Meaning |
| --- | --- |
| Accept introduction | Permits the introduction |
| Approve disclosure | Authorizes specified information sharing |
| Accept proposal version | Confirms a particular set of terms |
| Sign contract | Executes the agreement |
| Confirm funds received | Only for authorized reconciliation backed by verified evidence |
| Accept milestone | Confirms the deliverable meets the agreed criteria |
| Approve payment release | Authorizes an eligible payment instruction under the agreed terms |

**Never reuse a generic `accepted = true` field across these concepts.**

---

## 5. Contract and proposal rules

### 5.1 Commercial negotiation

Each proposal is an **immutable version**. Negotiable items:

- Deal type and licensed or transferred assets.
- Scope, territory, duration, exclusivity and permitted use.
- Deliverables, milestones and acceptance tests.
- Price, currency, taxes, payment dates and royalties.
- Background IP and ownership of new results.
- Confidentiality, permitted disclosure and data handling.
- Warranties, liability, indemnities and remedies.
- Termination, refunds, outstanding payments and dispute resolution (mediation, arbitration institution or court).
- Required regulatory approvals, registrations and conditions precedent.

Example (amounts illustrative only):

| Step | Action | Resulting status |
| --- | --- | --- |
| 1 | Provider proposes a non-exclusive licence for RMB 300,000 | v1 open |
| 2 | Buyer counters: RMB 200,000 upfront + RMB 100,000 after a technical milestone | v1 superseded, v2 open |
| 3 | Provider accepts the payment split but changes the licensed territory | v2 superseded, v3 open |
| 4 | Buyer must explicitly accept the **new complete** version v3 | v3 accepted by both |
| 5 | Final term sheet generated; parties review the contract | Contract draft |
| 6 | Authorized representatives execute the definitive agreement | Contract executed |
| 7 | Platform checks remaining regulatory or other closing conditions | Conditions pending / cleared |

Agreeing commercial terms alone does not make every technology-transfer contract effective or immediately performable.

### 5.2 Contract records and signature evidence

For each contract, keep:

- Contract ID, type, language and governing-law / jurisdiction fields.
- Exact version and cryptographic document hash.
- Parties and the legal entities they represent.
- Signatory identity, role and recorded authority.
- Signature or seal evidence and timestamps.
- Effective date and conditions precedent.
- Attachments, schedules, amendments and superseded versions.
- Required regulatory approvals, registrations and certificates.
- Links between clauses, obligations, milestones and payment instructions.

Under the Electronic Signature Law, a **reliable** electronic signature has the same legal effect as a handwritten signature or seal. The product must still verify identity, authority and the requirements of the particular instrument. **A typed name or a click is never treated as sufficient signature evidence.**

### 5.3 Legal gate for cross-border technology deals

A cross-border deal has its own review workflow. Before the system permits controlled disclosure, contract execution or delivery, it determines:

```mermaid
flowchart TD
    A["Cross-border deal detected<br/>(provider, recipient or user outside mainland China)"] --> B["1. Locate provider, recipient and intended user"]
    B --> C{"2. Technology category?"}
    C -->|"Prohibited"| X["Block: transfer not permitted"]
    C -->|"Restricted"| D["Prior export / import licence required"]
    C -->|"Free"| E["Contract registration after signing"]
    D --> F["3. Controlled technical data, dual-use<br/>items or sensitive information?"]
    E --> F
    F --> G["4. Payment path: currency, banking,<br/>tax withholding, foreign exchange"]
    G --> H["5. Personal or important data crossing<br/>borders? Choose the legal mechanism"]
    H --> I["6. IP rights, ownership and existing<br/>agreements permit the transfer?"]
    I --> J{"All gates cleared<br/>with evidence?"}
    J -->|"No"| K["Action stays blocked;<br/>remediation tasks created"]
    J -->|"Yes"| L["Disclosure / signing / delivery / payment<br/>allowed per cleared gate"]
```

China's technology import/export framework requires **licensing for restricted technologies**, **prohibits** exports of prohibited technologies, and provides **contract registration** for free-category technologies.

**System policy:** a compliance flag **blocks** the relevant action until the required review is complete (FR-CMP-05). No platform employee can bypass a mandatory legal gate by changing a deal status.

### 5.4 University and public-institution transfers

When the seller is a state-funded university or research institute, the transfer of a service invention (职务科技成果) follows extra steps:

```mermaid
flowchart TD
    A["Researcher discloses the invention to the TTO"] --> B["Institution decides to transfer, license<br/>or invest (internal approval)"]
    B --> C{"Pricing method"}
    C -->|"Negotiated price"| D["Public notice of result name<br/>and proposed price at the institution<br/>(at least 15 days)"]
    C -->|"Listing"| E["List on a licensed technology<br/>trading venue (via agent)"]
    C -->|"Auction"| F["Auction through the venue<br/>and a licensed auction house"]
    D --> G{"Objection upheld?"}
    G -->|"Yes"| E
    G -->|"No"| H["Sign contract"]
    E --> H
    F --> H
    H --> I["Technology-contract recognition and<br/>registration (技术合同认定登记)"]
    I --> J["Income received; rewards to the research team<br/>under the institution's rules<br/>(statutory default: at least 50% of net income)"]
```

Notes on the rules behind this flow (details and sources in [09 §5](09-reference-platform-features.md)):

- The negotiated-price notice runs for **at least 15 days** with an objection procedure (国发〔2016〕16号). Under Shanghai's due-diligence exemption guideline (尽职免责, written for the city's reform-pilot units; other public research units may follow it), staff are not held liable if the result's value later changes, provided the price was set by listing or auction on a technology market, or the negotiated price was published **both in the institution and on a technology trading market**. The venue issues a no-objection certificate for the market-side notice (§1.3).
- Listing and auction pricing run **through a licensed venue** (§1.3), not on the platform.
- Shanghai's regulation on promoting the transformation of results (Art. 34) allows universities and institutes to set, by internal rule or agreement, researcher rewards of at least 70% of net transfer or licence income. Without a rule or agreement, the national default of at least 50% applies.

The platform supports public-notice periods with evidence (FR-UNI-03), dual publication through the venue (FR-UNI-04), the pricing-method record (FR-UNI-05), contract registration (FR-DEAL-08) and income-distribution records (FR-UNI-06).

### 5.5 Technology-contract registration and tax incentives

| Item | Detail |
| --- | --- |
| Rule | Revised 《技术合同认定登记管理办法》 (MIIT), effective 1 March 2026 |
| Who applies | In principle the selling or performing party, at the registration office where it is located |
| Why it matters | Registration is generally voluntary, but needed in practice for incentives: VAT exemption for technology transfer and development and directly related consulting or services; corporate income tax relief on technology transfer income (resident enterprises: the first RMB 5 million per year exempt, the excess halved); enhanced R&D deductions; preferential individual income tax treatment for researchers' rewards at universities and non-profit institutes |
| Product feature | Generate a registration-ready package (contract text, attachments, party data), track the registration number and status, and remind sellers (FR-DEAL-08) |

*Legal and tax validation required:* VAT rules changed with the VAT Law effective 1 January 2026. Confirm the current exemption notice and procedure (a 2026 notice reportedly covers 2026–2027) and all thresholds with a tax adviser before advertising any benefit.

---

## 6. Funding, holding, release and payout rules

> **Build scope (owner decision D-02, 2026-10-19).** The R3 build implements only payment requests, verified provider events, refunds and daily reconciliation, through one adapter whose first provider is the owner's payment testing platform ([06 §6.11](06-implementation-design-v1.md), FR-PAY-01 … FR-PAY-04). The funding, holding, release and payout model below is **background** for a later production provider. It is not designed for implementation.

This is the most sensitive part of the design. **Model contractual money obligations separately from actual provider-held funds.**

### 6.1 Payment lifecycle

```mermaid
flowchart TD
    A["Contract obligation due"] --> B["Create payment request"]
    B --> C["Buyer authorizes payment"]
    C --> D{"Provider confirms receipt?"}
    D -->|"No"| D1["Pending / failed / expired"]
    D -->|"Yes"| E["Record confirmed funds"]
    E --> F{"Provider-backed conditional<br/>holding available?"}
    F -->|"No"| F1["Use permitted direct settlement<br/>or redesign payment terms"]
    F -->|"Yes"| G["Provider confirms restricted /<br/>reserved status"]
    G --> H["Milestone evidence submitted"]
    H --> I{"Contractual release<br/>condition met?"}
    I -->|"No"| I1["Correction / dispute /<br/>continued hold if supported"]
    I -->|"Yes"| J["Check approvals and available funds"]
    J --> K["Send release instruction"]
    K --> L{"Provider confirms transfer?"}
    L -->|"No"| L1["Pending / failed:<br/>retry or investigate"]
    L -->|"Yes"| M["Reconcile transaction and fees"]
    M --> N["Recipient payout / settlement confirmed"]
```

The system never represents an ordinary payment as held funds. If the chosen bank or payment institution does not provide conditional holding for a deal type, use a legally approved alternative or keep that deal **outside** the platform-controlled funds workflow.

**Venue-routed deals** do not use this lifecycle. Deposits and prices are settled by the venue's third-party settlement account (§1.3). The platform records the venue-reported status only (FR-VEN-08) and never creates provider-held-funds or release records for them.

### 6.2 Payment statuses

Use **separate** status fields for the obligation, payment request, provider transaction, held funds, release instruction and payout:

| Object | Statuses |
| --- | --- |
| Payment obligation | `draft`, `approved`, `due`, `partially_satisfied`, `satisfied`, `cancelled`, `disputed` |
| Payment request | `created`, `sent`, `pending`, `expired`, `cancelled`, `failed` |
| Provider transaction | `initiated`, `processing`, `succeeded`, `failed`, `reversed`, `refunded`, `partially_refunded` |
| Provider-held funds (if supported) | `not_applicable`, `pending`, `confirmed`, `reserved`, `partially_released`, `released`, `frozen`, `returned` |
| Release instruction | `not_eligible`, `awaiting_approval`, `approved`, `submitted`, `provider_pending`, `completed`, `failed`, `cancelled` |
| Payout | `not_requested`, `requested`, `pending`, `paid`, `failed`, `returned`, `reversed` |

These statuses are **not interchangeable**. A successful payment transaction does not mean funds are available for payout; a submitted release instruction does not mean the recipient was paid.

### 6.3 Payment data model

```mermaid
erDiagram
    CONTRACT ||--|{ PAYMENT_OBLIGATION : creates
    PAYMENT_OBLIGATION ||--o{ PAYMENT_REQUEST : "billed by"
    PAYMENT_REQUEST ||--o{ PROVIDER_TRANSACTION : "paid via"
    PROVIDER_TRANSACTION ||--o{ PROVIDER_EVENT : "confirmed by"
    PROVIDER_TRANSACTION ||--o{ FUNDING_ALLOCATION : allocated
    FUNDING_ALLOCATION }o--|| PAYMENT_OBLIGATION : satisfies
    MILESTONE ||--o{ RELEASE_INSTRUCTION : triggers
    FUNDING_ALLOCATION ||--o{ RELEASE_INSTRUCTION : "released by"
    RELEASE_INSTRUCTION ||--o| PAYOUT : produces
    PAYMENT_OBLIGATION ||--o{ FEE_ASSESSMENT : "charged with"
    PROVIDER_TRANSACTION ||--o{ REFUND : "reversed by"
    PROVIDER_TRANSACTION ||--o{ LEDGER_ENTRY : "posted as"
    PAYOUT ||--o{ LEDGER_ENTRY : "posted as"
```

### 6.4 Funding calculation

For each obligation, store at least: gross amount due · currency · amount received and provider-confirmed · amount refunded or reversed · amount reserved (if supported) · amount released or transferred · platform fee and provider fee · tax or withholding amounts · outstanding amount · provider transaction IDs and reconciliation references.

A simplified outstanding amount:

```text
Outstanding = Gross obligation
            − Confirmed qualifying payments
            + Applicable reversals (refunds or chargebacks of earlier payments)
            − Valid credits
```

An accounting illustration, not a complete legal or tax calculation. Reconcile each currency independently. Every FX conversion records its rate, source and timestamp.

### 6.5 When funds can be released

A release requires **all** of the following:

1. The obligation is linked to an executed contract or another valid arrangement.
2. The relevant legal and compliance gates are satisfied.
3. The funds are confirmed and eligible under the payment partner's product.
4. The contractual release condition is met.
5. Required technical acceptance or other evidence is present.
6. The approving actor has authority for this transaction.
7. No active hold or dispute contractually or legally blocks the release.
8. The release amount does not exceed the eligible amount.
9. The request is idempotent and has a unique provider reference.
10. The provider confirms the result and the ledger is reconciled.

There is **no admin override that releases money directly**. If an exceptional release is legally allowed, it goes through a separately authorized, audited exception workflow with the payment institution.

### 6.6 Royalties and recurring payments

Licensing and commercialization deals carry obligations long after the initial transfer. Support:

- Royalty reporting periods and due dates.
- Sales or usage reports from the licensee.
- Minimum royalties and thresholds.
- Currency and tax fields (including withholding on cross-border royalties).
- Report review and correction.
- Payment-request generation.
- Late-payment reminders and disputes.
- Contract amendments and renewal dates.
- Audit rights where the contract provides them.

A deal can be closed for initial delivery while its royalty schedule stays active (FR-DEAL-10). **Moving a deal to `completed` never cancels future contractual obligations.**

---

## 7. Fee model

Fees are a **commercial decision**, not something set by technology-transfer law. Support a configurable fee schedule (FR-ADM-04). The schedule and plan pricing are decision D-07, with a proposed starting schedule in [12 D-07](12-decision-record.md); benchmark fees of other venues are in [09 §2.6](09-reference-platform-features.md).

### 7.1 Recommended fee policy

| Fee | Recommended rule | Trigger |
| --- | --- | --- |
| Account / organization registration | Free at launch | None |
| Listing fee | Free at launch, to build supply and demand | Publication, only if introduced later |
| Managed-service fee | Fixed or quoted on work scope | Client accepts the service order or a contract milestone |
| Success fee | Contractually defined fixed fee or percentage | An explicit qualifying event, e.g. completion of a defined transaction |
| Technical assessment | Quoted fee for an expert engagement | Written approval of scope and quote |
| Legal / IP service | Separate professional-service fee | Accepted engagement terms |
| Payment-provider fee | Passed through or allocated under disclosed terms | Provider transaction |
| Refund / reversal cost | Allocated only under disclosed terms and applicable law | Actual refund or reversal |
| Royalty administration | Optional, if the platform provides ongoing reporting or collection | Contractually defined reporting period or service milestone |
| Venue fees (venue-routed deals) | Charged by the venue under its own schedule; shown to the client in advance and not mixed with platform revenue | The venue's fee notice |
| Agent service fee (venue-routed deals) | Quoted fee for acting as agent of record (preparation, verification, buyer registration) | Accepted agency contract or service order |

### 7.2 Required fee rules

Every fee definition includes:

- Payer and recipient.
- Calculation basis and rate, or fixed amount.
- Currency and tax treatment (issue proper invoices, 发票).
- The exact triggering event.
- Whether it is deducted from the transaction or invoiced separately.
- Refundability and cancellation treatment.
- Treatment of partial payment, chargeback, reversal and failed payout.
- Whether it is calculated before or after taxes and provider charges.

If parties agree a success fee based on the amount **actually received** by the provider, the system uses that defined eligible amount, never the asking price or the proposed contract value. **Never deduct a fee just because an introduction was accepted**, unless that is an expressly agreed paid service.

---

## 8. Disputes, rejection and refunds

A managed transfer platform needs a structured dispute process (FR-CMP-04), but it must not promise that the platform can decide every legal dispute or reverse every payment.

### 8.1 Dispute categories

- Technical deliverable does not meet the agreed specification.
- A milestone is late or incomplete.
- IP ownership, licence scope or authority is disputed.
- Confidential information was disclosed or used outside the permitted scope.
- Payment is missing, late, duplicated or misallocated.
- A refund or payout failed.
- Alleged misrepresentation, fraud or non-performance.
- A cross-border transfer or required approval is blocked.
- Disagreement about royalty calculations or ongoing obligations.

### 8.2 Dispute workflow

```mermaid
flowchart TD
    A["Party submits dispute"] --> B["Record issue, remedy sought and evidence"]
    B --> C["Notify other party and set response deadline"]
    C --> D["Apply contractual and provider rules<br/>(holds only where permitted)"]
    D --> E{"Can the parties resolve it?"}
    E -->|"Yes"| F["Record signed settlement /<br/>agreed correction"]
    E -->|"No"| G["Independent review or mediation,<br/>if agreed"]
    F --> H{"Resolution outcome"}
    G --> H
    H -->|"Continue performance"| I["Resume milestones"]
    H -->|"Partial release / refund"| J["Authorize permitted<br/>financial instruction"]
    H -->|"Terminate"| K["Apply contractual termination<br/>and accounting"]
    H -->|"Unresolved"| L["External route: arbitration<br/>or people's court"]
    I --> M["Reconcile money and close dispute"]
    J --> M
    K --> M
    L --> M
```

### 8.3 Rules for disputed funds

1. Record the exact obligation and amount being contested.
2. Apply only holds that the contract, provider arrangement and law permit.
3. Preserve evidence and notify the parties.
4. Prevent the same disputed amount from being released twice.
5. Keep undisputed obligations separate where legally and operationally possible.
6. Record the outcome and its authority (settlement, mediation agreement, arbitral award or court judgment).
7. Issue refund or release instructions only through the approved payment mechanism.
8. Reconcile the provider result before closing the financial case.

A dispute flag in our database does **not** freeze money at a bank or payment provider. The provider must support the hold, and a contractual and legal basis must exist.

Describe the platform's service as **case management, facilitated resolution or mediation**, depending on what is actually provided. Never present it as a court or binding arbitral tribunal. Contracts should name an external forum, for example an arbitration institution (such as CIETAC or the Shanghai International Arbitration Center) or a competent people's court (人民法院). For venue-routed deals, the venue can also mediate: the Shanghai rules make dispute mediation a venue duty (Art. 11).

---

## 9. Required database and backend modules

The existing technology, demand, organization, introduction and deal collections ([06 §4.3, §4.9](06-implementation-design-v1.md)) remain. The table groups them with the records this operating model adds; names already defined in 06 are used as they are there. Collections are MongoDB collections with Mongoose models.

| Module | Core records | Main purpose |
| --- | --- | --- |
| Identity and authority | `users`, `organizations`, `organization_memberships`, `organization_authorizations` | Who the user is and what they may do for an organization |
| Technology and IP | `technologies`, `technology_versions`, `ip_assets`, `ip_asset_evidence`, `rights_claims`, `technology_offers` | What is offered, who claims rights, which evidence supports them |
| Discovery | `demands`, `demand_versions`, `matches`, `shortlists`, `introduction_requests` | Buyer needs, candidates, consent to introductions |
| Negotiation | `deals` (parties embedded), `proposal_versions`, `proposal_responses`, `approval_requests` | Versioned offers, counter-offers, authorized decisions |
| Contracts | `contracts`, `contract_versions`, `contract_parties`, `contract_signatures`, `contract_conditions`, `contract_registrations` | Executed agreements, amendments, conditions precedent, CNIPA / technology-contract registrations |
| Compliance | `compliance_cases`, `technology_control_reviews`, `regulatory_documents`, `cross_border_reviews` | Legal and regulatory gates |
| Venue route (R3) | `venue_submissions`, `buyer_registrations`, `venue_certificates` | Agent-of-record submissions, buyer registrations, venue-reported settlement status and certificates (§1.3) |
| Delivery | `deal_milestones`, `deliverables`, `acceptance_cases`, `delivery_evidence` | Work, evidence, acceptance, corrections |
| Payment obligations | `payment_obligations`, `invoices`, `fee_assessments` | Contractual amounts due and platform charges |
| Provider integration | `payment_transactions`, `provider_events`, `funding_allocations`, `release_instructions`, `payouts`, `refunds` | External payment operations and verified outcomes |
| Accounting | `ledger_accounts`, `ledger_entries`, `reconciliations` | Auditable accounting and reconciliation |
| Disputes | `disputes`, `dispute_evidence`, `dispute_decisions`, `settlements` | Contested obligations and recorded outcomes |
| Security and audit | `documents`, `document_access_grants`, `document_access_events`, `audit_events` (in the separate, insert-only `tex_audit` database), `notifications` | Confidentiality, accountability, communication |

### 9.1 Financial database rules

- Store amounts as `{ currency, amountMinor }` with `amountMinor` as a 64-bit integer (fen for RMB; BSON `long`, through the strict `Int64` Mongoose type of [06 §4.5](06-implementation-design-v1.md)), and rates as `Decimal128`; never binary floating point. Both the Mongoose schema and the database validator reject fractional or floating-point amounts, and APIs return amounts as decimal strings (verified).
- Store the currency on every amount.
- Make external provider transaction and event IDs unique (unique indexes on `provider` + `providerEventId`).
- Process webhooks idempotently and verify their signatures.
- Never delete a confirmed financial event to fix an error; record an adjustment, reversal or correction.
- Keep contractual obligations separate from actual cash movements.
- Keep the provider's actual funds status separate from the platform's calculated status.
- Reconcile provider transactions against ledger entries regularly (at least daily).
- Restrict payout-destination changes with step-up verification and audit logging.
- No arbitrary edits to ledger entries by administrators.
- Keep immutable versions of contracts, proposals and approval decisions.

For the self-hosted first version, keep the **Node.js (Express) modular monolith + MongoDB replica set + private file storage** architecture on the given servers (Node.js 12.4, MongoDB 4.4 / 5.0, Mongoose 5.13) ([06](06-implementation-design-v1.md), [11](11-target-runtime-node12-mongodb.md)). Every financial state change runs in a MongoDB transaction with write concern `majority`, together with its ledger entries, transition record and outbox event. Use separate modules for deals, compliance and payments instead of introducing microservices early. Host data inside mainland China.

---

## 10. China launch checklist

These are **release gates**, not optional enhancements. Where relevant, an item names the release in [10 §9](10-product-requirements.md) it gates and the open decision in [10 §12](10-product-requirements.md) it depends on.

### A. Platform registration and operating model

- [ ] Chinese operating entity, business scope and platform service agreements confirmed (R1).
- [ ] Provider and seller verification, transaction rules and platform obligations under the E-Commerce Law in place (R1).
- [ ] ICP filing and any required value-added telecom licence (e.g. EDI) obtained (*legal validation required*; D-04; before R1 launch).
- [ ] Cybersecurity classified-protection (MLPS) grading and filing planned (D-05; before R1 launch).
- [ ] Platform name and public wording checked: no "交易所", no claim to perform venue functions (*legal validation required*; D-03).

### B. Payment and conditional holding

- [ ] Before any **live** money flows (not needed for the owner's testing platform, D-02): written confirmation from the bank or payment institution **and** PRC counsel on: who receives and holds funds; who controls release; whether the arrangement is permitted for each deal type; how refunds, disputes and payouts work.
- [ ] Confirmation of whether any additional licence or approval is required.

### C. Technology transfer and IP

- [ ] Process for verifying rights (CNIPA records, ownership evidence) in place.
- [ ] Screening for restricted and prohibited technologies in place.
- [ ] For cross-border transactions: licence, registration and approval requirements determined **before** the relevant transfer or performance is allowed.
- [ ] Public-institution pricing and public-notice support for university sellers.

### D. Data protection and security

- [ ] PIPL assessment completed; privacy notice and consents in place.
- [ ] Data-retention schedule per record category established.
- [ ] Confidential document access restricted and audited.
- [ ] Cross-border transfers of personal information or important data assessed case by case (China's rules provide different mechanisms and exemptions, so no blanket rule).

### E. Contracts and electronic signatures

- [ ] Contract templates per deal type validated (R2).
- [ ] E-signature provider selected; authority checks, signature and seal process, document integrity and evidence retention validated (D-06; R2).

### F. Technology-contract registration and tax

- [ ] Registration-package generation and tracking in place under the 2026 Measures (R2).
- [ ] Tax incentives and invoicing confirmed with a tax adviser.

### G. Venue route

- [ ] Decision taken: register as a STEX (or CTEX) practising agent, partner with an existing agent, or apply for venue status (D-01; before R3 design; proposal in [12](12-decision-record.md)).
- [ ] Agent obligations understood: verification opinion and joint liability for submissions, annual review, change reports within 10 working days (§1.3).
- [ ] Data interface with the venue agreed (API or file exchange, FR-VEN-10).

### Data retention

The E-Commerce Law requires covered transaction information to be kept for **at least three years** after transaction completion. Three years is **not** enough for every record: contracts, accounting records (accounting-archive rules require much longer retention for vouchers and ledgers), IP disputes, regulatory filings and legal claims may need more. STEX itself keeps deal dossiers permanently or for 20, 10 or 5 years by class ([09 §2.5](09-reference-platform-features.md)). Apply a retention schedule per record category (FR-CMP-06, FR-DEAL-09), and preserve evidence under legal hold.

### Cross-border technology contract registration

MOFCOM's **Measures for the Administration of Registration of Technology Import and Export Contracts** cover specified technology import and export contracts and set registration processes for free-category technologies. The 2009 text provided registration within 60 days after the contract takes effect, with royalty-based contracts counting from the first determination of the royalty base. Restricted technologies follow a separate licensing path. The WIPO Lex record now marks the 2009 text as repealed (废止), so *confirm the rules currently in force before relying on any deadline*.

Track a **regulatory case** for each cross-border contract with:

- Technology classification and review outcome.
- Exporting and importing jurisdictions.
- Required approval, licence or registration.
- Responsible party and filing authority.
- Submission date, status, approval document and expiry.
- Contract amendments that may require an updated filing or approval.
- The event that legally permits disclosure, execution, transfer, delivery or payment.

Do not infer that all cross-border technology contracts need the same registration, or that every filing is a condition of contract validity. That depends on the technology classification and the applicable rule.

---

## 11. Implementation sequence and acceptance tests

### 11.1 Build order

```mermaid
flowchart LR
    P1["Phase 1<br/>Organizations<br/>and roles"] --> P2["Phase 2<br/>Technology<br/>and demand"]
    P2 --> P3["Phase 3<br/>Introductions and<br/>confidentiality"]
    P3 --> P4["Phase 4<br/>Proposals and<br/>contracts"]
    P4 --> P5["Phase 5<br/>Delivery and<br/>disputes"]
    P5 --> P6["Phase 6<br/>Payment-provider<br/>integration"]
    P6 --> P7["Phase 7<br/>Complex deal<br/>types"]
```

| Phase | Scope | Release in [10 §9](10-product-requirements.md) |
| --- | --- | --- |
| 1 — Organizations and roles | Identity, organization verification, membership, delegated authority, audit events | R0–R1 (delegated authority FR-ORG-04 in R2) |
| 2 — Technology and demand | Listings, structured demands, review, publication, evidence, search | R1 |
| 3 — Introductions and confidentiality | Expressions of interest, consent, controlled disclosure, NDA tracking, communications | R1 (NDAs and data rooms in R2) |
| 4 — Proposals and contracts | Immutable proposal versions, counter-offers, approval routing, contract versions, signature evidence, compliance gates, contract registration | R2 |
| 5 — Delivery and disputes | Milestones, acceptance criteria, evidence, correction cycles, dispute cases, termination | R2 (basic complaints from R1) |
| 6 — Payment integration | Payment requests, verified provider events, refunds and reconciliation through one adapter; the owner's payment testing platform first (D-02, FR-PAY) | R3 |
| 7 — Complex deal types | Investment, joint ventures, royalties, cross-border contracts, specialized regulatory workflows | R3 and later (cross-border screening FR-CMP-05 from R2) |

The venue route (§1.3, FR-VEN) is built in R3, after decision D-01, in parallel with phase 6.

### 11.2 Minimum acceptance tests before launch

- [ ] An unauthorized employee cannot sign, approve a payment or accept a milestone on behalf of an organization.
- [ ] A provider cannot disclose a restricted document before the required authorization.
- [ ] Changing a proposal after one party accepted it invalidates that acceptance as the agreed final version.
- [ ] A contract cannot pass a mandatory compliance gate without the required evidence.
- [ ] A fake or replayed payment webhook cannot duplicate funding or payout records.
- [ ] A buyer's screenshot cannot make the system mark a payment as provider-confirmed.
- [ ] A milestone cannot release more money than the obligation and provider-backed arrangement permit.
- [ ] A dispute blocks only the actions that the contract and payment arrangement require it to block.
- [ ] A failed payout stays failed or pending until reconciled; it is never silently marked paid.
- [ ] Refunds, reversals and partial settlements produce auditable financial adjustments.
- [ ] Royalties and other continuing obligations survive closure of the initial delivery workflow.
- [ ] An administrator cannot rewrite an executed contract, remove financial history or bypass a mandatory regulatory gate.
- [ ] A patent assignment cannot be marked "completed" without CNIPA registration evidence.
- [ ] A venue submission cannot be sent without the agent's verification opinion and approval by a second reviewer.
- [ ] Deposits and prices of a venue-routed deal appear only as venue-reported status, never as funds held by the platform or its payment partner.

---

## Final decision

For the China launch, the operating model is:

```mermaid
flowchart LR
    A["Managed discovery"] --> B["Verified authority"] --> C["Consent-based introduction"] --> D["Controlled confidential evaluation"] --> E["Versioned negotiation"] --> F["Authorized contract execution"]
    F --> G["Regulatory clearance"] --> H["Provider-backed funding"] --> I["Milestone delivery and acceptance"] --> J["Authorized release"] --> K["Provider-confirmed payout"] --> L["Reconciliation and continuing obligations"]
```

- Support **all deal types** in the architecture, but apply different contract, compliance, funding and acceptance rules to each, and keep investment and complex cross-border deals under specialist review.
- Route formal listing, competitive bidding, venue settlement and certificates **through a licensed venue** as agent of record (§1.3); the platform prepares, verifies, tracks and records, but never performs venue functions itself.
- Above all, treat platform-controlled holding of funds as a **legal and payment-provider dependency**, not as a feature that can be built safely with a database balance and a release button. That decision drives the payment integration, accounting design, dispute workflow and launch readiness.

---

## Sources

Notes, excerpts and saved copies of these sources (with retrieval dates and archived links) are in [`references/`](references/README.md).

- State Council, 《非银行支付机构监督管理条例》 (Decree No. 768), text as published: <https://www.pds.gov.cn/upload/files/2023/12/18/%E9%9D%9E%E9%93%B6%E8%A1%8C%E6%94%AF%E4%BB%98%E6%9C%BA%E6%9E%84%E7%9B%91%E7%9D%A3%E7%AE%A1%E7%90%86%E6%9D%A1%E4%BE%8B.pdf>; People's Daily report: <https://paper.people.com.cn/rmrb/html/2023-12/18/nw.D110000renmrb_20231218_1-17.htm>
- STCSM, 《上海市技术交易场所管理细则》 (沪科规〔2025〕2号): <https://www.shanghai.gov.cn/nw12344/20250414/7d1e61e9a2de431aa524cb2f817845cf.html>
- State Council, 《国务院关于清理整顿各类交易场所切实防范金融风险的决定》 (国发〔2011〕38号): <https://www.gov.cn/zwgk/2011-11/24/content_2002092.htm>
- STEX rules on buyer registration (rule 82) and service institutions (rule 105), Internet Archive copies: <http://web.archive.org/web/20240718134706/https://www.stte.com/articles/82>, <http://web.archive.org/web/20240624032021/https://www.stte.com/articles/105> (all STEX rule sources: [09 Sources](09-reference-platform-features.md#sources))
- State Council, 国发〔2016〕16号 (negotiated-price notice ≥ 15 days): <https://www.gov.cn/zhengce/content/2016-03/02/content_5048192.htm>
- MOFCOM, Measures for the Administration of Registration of Technology Import and Export Contracts (WIPO Lex): <https://www.wipo.int/wipolex/en/text/199778>
- China Law & Practice, MIIT revised technology-contract registration measures (2026): <https://www.chinalawandpractice.com/2026/02/27/ministry-of-industry-and-information-technology-measures-for-the-administration-of-the-recognition-and-registration-of-technology-contracts-revised/>
- Ecovis, China updates technology contract registration rules for 2026: <https://www.ecovis.com/heidelberg-en/china-tech-contract-registration-2026/>
- 扬子晚报 / yzwb.net (Aug 2026), technology-contract registration and 2026 VAT notice (single secondary source; verify): <https://www.yzwb.net/news/ch/202608/t20260813_382284.html>
- State Taxation Administration, technology transfer income CIT policy (example guidance): <https://fgk.chinatax.gov.cn/zcfgk/c100012/c5194594/content.html>
- Analysis of Art. 18 pricing rules (协议定价, 挂牌, 拍卖, 公示): <https://www.zhonglun.com/research/articles/8704.html>, <https://www.junhe.com/legal-updates/2227>
- Laws referenced by name (official texts on npc.gov.cn / gov.cn): E-Commerce Law (2018); Civil Code (2020), Book III Ch. 20; Patent Law (2020 amendment); Law on Promoting the Transformation of Scientific and Technological Achievements (2015 amendment); Regulations on Technology Import and Export Administration; Catalogue of Technologies Prohibited or Restricted from Export (2023 revision); Export Control Law (2020); Electronic Signature Law; Cybersecurity Law; Data Security Law; Personal Information Protection Law; Provisions on Promoting and Regulating Cross-border Data Flows (CAC, 2024); VAT Law (effective 2026).
