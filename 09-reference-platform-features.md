# 09 — Reference Platforms: Real Features, Rules and Architecture

> **About this document**
>
> - **Purpose:** Record what the real Chinese technology exchanges and transfer platforms actually do (modules, user roles, business rules with concrete time limits, technology), and derive what our platform must copy, route to partners or do differently.
> - **Audience:** Product owner, business analysts, architects, and the founders deciding the market position.
> - **Status:** Research findings (October 2026). Requirements derived from them are numbered in [10 — Product requirements](10-product-requirements.md).
> - **Method:** STEX's official site blocks automated access from outside China, so its operating rules were read from **Internet Archive (Wayback Machine) copies** of the official pages and from its live bidding system `bid.stte.com`. Other facts come from government documents, official notices and news sources, listed per section.
> - **Confidence labels:** **V** = verified from the source text · **E** = from a search-engine extract of the official page · **I** = inference or typical practice.

---

## Summary

1. **Exchange functions are licensed, and licences are scarce.** In Shanghai, a technology trading venue (技术交易场所) is approved by the municipal government under "total-quantity control and prudent approval" (总量控制、审慎审批). Formal listing and bidding, third-party settlement of deposits and prices, rights-registration certificates (技术权益登记凭证) and transaction certificates (交易凭证) are **venue functions** (V).
2. **Recommended position:** a **matching and service platform** (like NETC/InnoMatch) that is also a **registered practising agent of a licensed venue** (STEX 执业类交易服务机构). Formal listing, bidding, settlement and certificates are executed through STEX (or CTEX) as the venue.
3. **STEX's rules are detailed and time-boxed.** Most steps have a working-day limit: 3 WD reviews, minimum 5 WD disclosure, contract within 5 WD, deposits refunded within 5 WD. Bidding uses timed and continuous phases. Our workflow engine needs a **working-day calendar** that follows China's official holiday and make-up-day schedule (调休).
4. **InnoMatch is demand-driven.** Demands are rewritten by experts and technology managers, anonymized, and answered through "揭榜" (solution submissions). Every demand must get a response. Technology managers earn **points** and rewards. Matching runs online and offline, with challenges and an annual EXPO.
5. **Universities need specific tools.** Negotiated prices for service inventions require a **public notice of at least 15 days**. In Shanghai, publishing the notice **both in the university and on a technology trading market** exempts staff from due-diligence liability. Inventor rewards, ownership grants (赋权) and open licensing (开放许可) have their own notices and rules.
6. **The tech stacks are conventional.** InnoMatch: Vue 3 SPA, REST API with WebSocket, SMS/WeChat login, multi-tenant configuration. STEX: Nuxt 3 portal, a separate bidding system with CA-certificate login, and BI dashboards. CTEX: CMS plus its own blockchain evidence service.

---

## 1. The regulatory frame: Shanghai technology trading venues

Source: 《上海市技术交易场所管理细则》 (沪科规〔2025〕2号), in force 1 May 2025 – 30 April 2030 (V). Full analysis in [01 §1.3](01-shanghai-landscape.md).

| Rule | Content | Consequence for us |
| --- | --- | --- |
| Approval (Art. 6) | New venues need STCSM review, public notice and municipal approval under total-quantity control; no trading while preparing | Becoming a venue is a long, uncertain path, so plan the agent route |
| Changes (Arts. 7–8) | Trading products, modes, rules or major shareholders need consent; senior-manager changes filed within 10 WD | Venue partners change slowly, so build stable integrations |
| Duties (Art. 11) | Rules publication, rights registration, transaction certification, disclosure, notices for university transfers, valuation, settlement, supervision of service institutions, mediation, participant suitability, internal controls | The partner venue performs these; we prepare complete, correct submissions |
| Money (Art. 12) | Third-party settlement through a bank or licensed payment institution, segregated client accounts | Never hold deposits or prices in our own accounts |
| Evidence (Art. 13) | Certificates support ownership transfer, diligence exemption, negotiated pricing, inventor rewards, judicial appraisal, technology-contract registration | Our deal records must link to the venue's certificate numbers |
| Reporting (Arts. 16–17) | Monthly, quarterly and annual reports to STCSM | Provide exports in the venue's format |

Formal auctions also require a **licensed auction house** under the Auction Law. STEX's own auction rule uses a three-party agreement: seller, agent and auction house.

---

## 2. Shanghai Technology Exchange (STEX, 上海技术交易所)

### 2.1 User roles

| Role | Description | Source |
| --- | --- | --- |
| Transferor / holder (转让方 / 持有方) | Lists a technology or technical-service capability | V |
| Intended transferee (意向受让方), bidder (竞买人), buyer (受让方) | Registers intent, qualifies, bids, signs | V |
| Procurer / supplier (采购方 / 投标方) | Enterprise technology procurement listings | V |
| **Practising agent (执业类交易服务机构)** | Represents a party; **intended buyers submit through an appointed agent**, who verifies the materials, issues a verification opinion and bears **joint liability** (连带责任) | V (rules 82, 105, 184) |
| Professional provider (专业类交易服务机构) | Auction, tender, evaluation, audit, legal, financial, patent-agency and consulting firms | V (rule 105) |
| Service-provider registry "科商" | Providers with a 1-year filing period and service tags (finance, IP, incubation, media, technology transfer) | V |
| Regional members (服务生态网) | Regional technology markets joining STEX's network | V |
| Back-office staff in the bidding system | Administrator, intake, first review, second review, settlement, settlement review, media publisher, certificate issuer / reviewer / printer | V |

**Becoming a practising agent** (rule 105, V):

| Requirement | Value |
| --- | --- |
| Legal form | Independent legal entity (technology-transfer, asset-management, investment, consulting firm…) |
| Age and capital | Registered **≥ 2 years**, registered capital **≥ RMB 1 million** |
| People | **≥ 2 practitioners** recognised by STEX; experience in technology and equity transactions; fixed premises |
| Integrity | No major violations or dishonesty records in the last **24 months** |
| Process | STEX review within **7 WD** → cooperation agreement within **15 WD** → fee → certificate |
| Ongoing | Annual review (July); missing two consecutive reviews means exit; changes reported within **10 WD** |

### 2.2 Products

| Product | What it is | Source |
| --- | --- | --- |
| Formal listing (正式挂牌) | Target, method and floor price fixed; public disclosure; buyer registration; competition if several buyers | V |
| Intent listing (意向挂牌) | Scope, price or method still open; STEX publishes and collects interest | V |
| Private agreement (非公开协议成交) | Deal agreed beforehand; STEX provides certification, settlement and the certificate | V |
| Transfer notice (科技成果转化公示) | Public notice for negotiated prices of universities, institutes and hospitals; STEX issues a no-objection certificate (公示无异议证明) | V |
| Rights registration (技术权益登记) | For results and for technical-service capability | V |
| Enterprise technology procurement | Companies publish technology needs as procurement listings | V |
| Equity contribution (作价投资) | Technology contributed as equity, with dedicated rules | V |
| Evaluation products | 16 products, including patent grading (> 30,000 patents graded) and income-method valuation | V (STCSM 2025) |
| Valuation chain | "Model evaluation + expert price inquiry + market price": big-data model → random expert panel proposes a price range → floor price → market decides | V |
| Technology finance | IP-pledge loans "技知融" (> 600 firms, ¥3.285 bn credit); "one price, two certificates" pledge loans | V |
| Open licensing | STEX acts as Shanghai's IP operation trading platform for open licences | V |
| Special boards (专板) | Green technology, biomedicine, agriculture, meteorology, popular science, digital IP | V |
| "科技成果 + 认股权" | Listed under the national trading venue (STEX) in STCSM's 2024 report: product launched and first deal in China completed | V (STCSM 2024 report) |
| IP forensic appraisal | Trade-secret, patent, copyright and trademark appraisal for courts | V |
| Cross-border | STEX cross-border technology trade centre in Lingang, 19 overseas nodes | V |

### 2.3 The listing-to-certificate pipeline

STEX's bidding system defines **21 processes**: pre-disclosure → transfer application → media release → buyer registration → bid application → deposit in → withdrawal → buyer qualification → result entry → winner deposit in → price in → contract approval → fee setting → buyer fee in → certificate generation → price out → seller fee out → buyer fee out → result publication → archiving (V).

```mermaid
flowchart TD
    A["Application with materials<br/>(application, agency contract, identity,<br/>decision document, ownership proof)"] --> B["Completeness check → receipt slip<br/>Compliance review ≤ 3 WD"]
    B --> C["Public disclosure ≥ 5 WD<br/>(≤ 1 year; changes restart the clock)"]
    C --> D["Buyer registration via agent:<br/>intent form, buyer floor ≥ listing floor,<br/>risk statement"]
    D --> E["Review ≤ 3 WD; corrections ≤ 3 WD"]
    E --> F["Qualification letter to seller ≤ 3 WD after expiry;<br/>seller replies ≤ 3 WD (silence = consent)"]
    F --> G["Qualification notice with deposit amount and deadline"]
    G --> H{"Qualified buyers"}
    H -->|"0"| I["Extend (≥ 5 WD) or terminate"]
    H -->|"1"| J["Agreement at ≥ floor price"]
    H -->|"≥ 2"| K["Pre-announced method: online bidding,<br/>auction, tender or competitive negotiation"]
    J --> L["Contract within 5 WD (12 mandatory clauses)"]
    K --> L
    L --> M["Contract review; deposit and price settled<br/>through STEX's third-party account"]
    M --> N["Transaction certificate issued;<br/>results published; dossier archived ≤ 3 months"]
```

**Disclosure content** (rule 81, V): basic facts of the target · deal terms · buyer qualifications · material information · competitive method · deposit settings · start and end dates. Real listings add board tags, technical field, the holder's economic type, and for licences the **entry fee + royalty + milestone** structure. Example listing: "the notice period is the due-diligence period" (公告期即尽调期).

**Twelve mandatory contract clauses** (rule 83, V): project name · scope and requirements · parties · trading mode · price, payment method and terms · conditions for effect · handover · confidentiality · dispute resolution · liability for breach · amendment and termination · other matters. Patent contracts must also state the patent name, applicant/patentee, filing date, application number, patent number and validity.

### 2.4 Competitive methods

| Method | Key rules | Source |
| --- | --- | --- |
| **Online bidding** (网络竞价) | Seller files a bidding plan. Valid bidders receive a password slip. **Multiple-round mode:** first bid ≥ floor, raises in integer multiples of the increment; a **timed phase ≥ 10 minutes**, then a **continuous phase of rolling cycles ≥ 60 seconds** (a new bid restarts the cycle; a cycle without bids ends bidding). **One-shot mode:** sealed bid, highest wins, a tie goes to the earlier bid. A holder of a statutory pre-emption right makes one final bid at the top price. Bidder identities and counts stay confidential. Contract within 5 WD of the result | V (rule 179) |
| Example listing | Deposit ¥2,000 from a company account; timed phase, then 5-minute cycles; increment ¥100 multiples, max ¥1,000 per raise; no raising against your own top bid; deposit forfeited for fault in contracting | V (bid.stte.com) |
| **Auction** (拍卖) | Three-party agreement with a licensed auction house; notice in provincial media and on STEX; 1 bidder → deal per notice, 0 → extend or terminate; losing deposits refunded **≤ 5 WD** | V (rule 182) |
| **Tender** (招标) | Deposit **≤ 30%** of listing price; **≥ 10 WD** to prepare bids; evaluation ≤ 3 WD after opening; contract ≤ 3 WD after award | V (rule 180) |
| **Competitive negotiation** (竞争性谈判) | Odd-sized panel, **≥ one-third experts drawn at random**; negotiations within 20 WD; panel report ≤ 5 WD (majority) | V (rule 181) |
| **Enterprise procurement** | Publication ≥ 20 WD; bid bond ≤ 2% of budget; discriminatory conditions forbidden (e.g. naming a brand or patent) | V (rule 177) |

### 2.5 Archives

One dossier per deal, filed within 3 months of completion. Retention: **permanent** (landmark deals), **20 years** (normal deals), **10 years** (qualification files), **5 years** (valuation reports). Paper and electronic copies are kept in parallel, and electronic access requires authentication and permission control (rule 183, V).

### 2.6 Fees (benchmarks)

STEX's fee schedule could not be found. Published benchmarks from other venues:

| Venue | Fee | Source |
| --- | --- | --- |
| Tianjin technology trading platform (2021) | Seller, tiered cumulative: **2%** up to ¥1 M · **1%** ¥1–10 M · **0.5%** ¥10–100 M · **0.3%** above ¥100 M; minimum ¥2,000. Buyer ≤ 5%. Bidding service fee ≥ 5%, minimum ¥5,000 per side. Notice and value-added fees separate | V |
| CTEX (one auction listing) | Buyer bidding service fee 10%; fees due within 3 WD of contract signing | E |

### 2.7 Technology hints

| System | Observed technology | Source |
| --- | --- | --- |
| Portal (2025 redesign) | Nuxt 3 server-rendered app ("TEIntegratedPortalPlatform"), Pinia, Tencent Maps, Baidu Analytics; built by STEX Digital Technology Co. | V |
| Bidding system `bid.stte.com` | Enterprise login with **CA-certificate USB key + SMS code**; jQuery/Vue 2 front end; 21-process back office with maker-checker roles | V |
| Data and BI | FineReport/FineBI market dashboards; a "trading index" | V |
| Product to regions | White-label "技术交易信息化综合服务平台" (cockpit, data middle platform, core trading system, SaaS) sold to regional governments | V |

STEX is therefore both a **potential partner** (venue functions) and a **potential competitor** (regional platforms).

---

## 3. NETC and InnoMatch (国家技术转移东部中心 / 全球技术供需对接平台)

### 3.1 Model

"**One platform, one expo, one challenge**" (一平台一展一赛): the InnoMatch platform, the InnoMatch EXPO / Global Technology Transfer Conference, and the innovation challenge. NETC calls itself a "fourth-party platform" combining trading, technology finance and incubation (V).

Scale (official figures):

| Metric | Value | Source |
| --- | --- | --- |
| NETC signed deals facilitated, 2024 | **≈ ¥4.2 billion** (近42亿元) | STCSM 2024 report (V) |
| NETC signed deals, cumulative | **≈ ¥40 billion** (近400亿元); 44 domestic outlets, 11 international channels | STCSM 2024 report (V) |
| InnoMatch, mid-2024 | 4,395 demands; 3,295 results; match rate > 60%; ¥5.239 bn intended deals; 18,569 technology-manager participations | STCSM reply (V) |
| InnoMatch, 2025 | ≈ 30,000 users; 6,600 demands; ≈ ¥800 M signed | STCSM (V) |
| Challenge 2023 | 2,617 demands from 1,385 firms; 581 solved; match rate up from < 20% to 46% | V |

### 3.2 Roles

Demand side (enterprises; about 60 large firms run open-innovation zones) · solution providers / challengers (anyone, including individuals) · **technology managers** (certified on the platform; break down demands; earn points and rewards) · service institutions (302 participating by mid-2024) · **experts** (certified profiles; sign an NDA and disclaimer) · investors · organization showcase pavilions (品牌馆) · administrators (permissions, data scopes, tenants, points rules, period close) (V).

### 3.3 Modules

Libraries (demands, results, SME products, talent demands, cases, experts, videos, news) · smart matching (similar demands, results, firms, patents, experts and managers; "show another batch"; message push) · workbench (my demands, results, matches, pavilion, business card, follows) · challenge campaigns with sub-tracks · **points** (rules, withdrawable points, period close; doubled during challenges) · deal signing and evaluation · online EXPO (exhibitors, registration, livestreams) · community and instant messaging · analytics (industry-chain maps, enterprise and patent ratings) · translation, venue booking, contract square (V).

### 3.4 Demand and solution state machines

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> MaterialReview : Submit
    MaterialReview --> Collecting : Approved and published
    MaterialReview --> Draft : Returned
    Collecting --> Choosing : Solutions received
    Collecting --> Expired : Deadline passed
    Choosing --> Negotiating : Solution selected
    Negotiating --> FeedbackGiven : Outcome recorded
    FeedbackGiven --> Done : Closed
    Collecting --> Terminated : Withdrawn
    Negotiating --> Closed : Failed
    Done --> [*]
    Expired --> [*]
    Terminated --> [*]
    Closed --> [*]
```

Demand fields: overview, technical parameters, expected outcomes, budget in units of ¥10,000 or "negotiable" (面议), deadline countdown. Solutions move draft → review → accepted / not accepted → feedback → signed / matched / failed (V).

### 3.5 Challenge (揭榜) flow

```mermaid
flowchart LR
    A["Collect demands<br/>(platform + provincial platforms)"] --> B["Experts, institutions and<br/>technology managers rewrite<br/>and anonymize"]
    B --> C["Publish valid demands"]
    C --> D["Solvers submit proposals<br/>(投递方案)"]
    D --> E["Online matching +<br/>offline sessions"]
    E --> F{"Several strong<br/>solutions?"}
    F -->|"Yes"| G["Roadshow → live final"]
    F -->|"No"| H["Direct negotiation"]
    G --> I["Cooperation agreement"]
    H --> I
    I --> J["Annual awards: best solution,<br/>best institution, best technology manager"]
```

Rules worth copying (V): every demand must receive a response; all participants sign an NDA and a disclaimer; there is a complaint and dispute channel. Example money rules (Shanghai 2019): the winning challenger receives ¥100k, paid in principle by the demander, and a prize cannot be made conditional on exclusivity; service institutions earn ¥2,000 per viable lead; base services are free.

Yangtze River Delta "揭榜挂帅" bounty projects set eligibility thresholds: demander revenue ≥ ¥200 M, R&D ≥ 5%, external bounty ≥ 30% of the budget and ≥ ¥2 M. The published list hides the demander (V).

### 3.6 EXPO and vouchers

- EXPO model "**1 + 3 + 365**": one online platform, three days on site, 365 days of matching. The 2025 EXPO released > 10,000 demands, waived booth fees for firms with revenue ≤ ¥200 M, and ran a "conversion clinic" (374 projects → 19 pre-proof-of-concept → 10 companies formed) (V).
- Shanghai **innovation vouchers** (科技创新券): cover 50% of approved service fees, up to ¥300k per firm per year. The service provider files the contract, invoice and payment proof; vouchers are paid quarterly. Proof-of-concept vouchers have been live since August 2026 (V).

### 3.7 Technology hints

Vue 3 + Vite + Tailwind single-page apps; REST API plus WebSocket (`/cable`); **multi-tenant configuration**; login by SMS, password, WeChat or e-mail; AMap; an IM SDK; Huawei Cloud OBS and OSS storage. STCSM describes demand "technology portraits" (技术画像) and a self-built matching tool (V; backend framework inferred, I).

---

## 4. Other reference platforms

| Platform | What is worth copying | Source |
| --- | --- | --- |
| **CTEX 中国技术交易所** (Beijing) | "5 categories, 19 services" (registration, trading, finance, consulting, regional services). Open-licence platform (> 2,500 patents). Roadshow livestreams. Disposal of pledged IP. Rules (2023): disclosure **≥ 10 WD**, total ≤ 12 months, deposit ≤ 30% of floor price; instalments with **≥ 30% down**, rest within 1 year; certificate within 3 WD of funds and fees arriving; payout within 5 WD of the seller's request. Blockchain evidence service "链证中国" with national cryptography and trusted timestamps (2025) | E / V |
| **Zhejiang online technology market** (浙江科技大市场, "浙江拍") | Province–city–county federation (11 cities, 90 counties); 316 service institutions; 350 brokers with contribution points; negotiated, listed and auction trades recorded on-chain; livestream auctions with Taobao; insurance for pilot tests and "use first, transfer later"; a county model: collect local demand → result pool → auction, with a 20% buyer subsidy. Auction premiums typically 16–48% | V |
| **China Innovation Challenge** (中国创新挑战赛, MOST Torch) | Demand mining with a survey form → **demand analysis report** → publish (demander may be hidden) → targeted push to likely solvers → expert first and final selection → cooperation agreement → **live final only when competition is strong**; prizes paid by the demander; NDA and disclaimer mandatory | V |
| **Ningbo / Jiangsu challenges** | Live final needs ≥ 3 teams; contract with the winner within 2 months; staged subsidy (40% / 80% / rest). Jiangsu: find → publish → respond → compete → track results; weekly online auction days, real-name verification before bidding | V |
| **科易网** (Xiamen) | Online contract drafting, payment and clearing, delivery of technical files, evidence preservation and acceptance; builds and operates > 55 local-government platforms; revenue reportedly ≈ 90% government contracts | V / reported |

---

## 5. National and university rules the platform must support

| Topic | Rule | Source |
| --- | --- | --- |
| Negotiated pricing notice | Result name and proposed price publicly notified **≥ 15 days**, with an objection procedure | 国发〔2016〕16号 (V) |
| Shanghai diligence exemption | Staff are exempt when the price was set by listing or auction on a technology market, **or** when a negotiated price was notified **both in the unit and on a technology trading market** | Shanghai guideline 2023 (V) |
| University notice template (example: Fudan) | Notice number; results with application numbers; inventor count; mode; named assignee; price; valuation firm and value; payment terms; 15-day window; real-name written objections; investigation within 10 WD | V |
| Inventor rewards | National minimum 50% of net income; Shanghai ≥ 70%; reward notice ≥ 15 WD including the contract-registration information | V |
| Ownership grants (赋权) | Co-ownership or a long-term use right of ≥ 10 years; team agreement → application → approval → notice ≥ 15 days → written agreement; negative list | 国科发区〔2020〕128号 (V) |
| Open licensing (开放许可) | Declaration through CNIPA → publication; implementer gives written notice and pays → licence, then filed. Not allowed while an exclusive licence exists, fees are unpaid, or the patent is pledged without consent | Patent Law Arts. 50–51 (V) |
| "Use first, pay later" (先使用后付费) | Zero upfront fee, then instalments, milestones or royalties; Beijing pilot: SMEs only, first payment ≥ 1 year after signing or after first revenue | 国知发运字〔2025〕16号; 京科发〔2022〕15号 (V) |
| Patent revitalisation (存量专利盘活) | University patents tagged with conversion intent; companies subscribe and evaluate; CTEX, STEX and the Shenzhen Stock Exchange named as functional platforms | 2024 plan (V) |
| Technology-contract registration | Seller-side registration once, after the contract is formed; written contract; decision within 30 days; gateway to VAT and income-tax relief | 2000 measures (V); revised measures effective 2026-03-01 (see [08 §5.5](08-china-operating-model.md)) |
| Technology-manager credentials | Torch syllabus: junior broker 24 h, mid-level 40 h, senior technology manager 56 h; occupation code 2-06-07-16 (2022 classification); group standard T/CASTEM 1007-2022 | V / E |
| High-tech fields | The 8 national key-supported high-tech fields (国家重点支持的高新技术领域) used as search filters by STEX and expos: electronic information, biotech and new medicine, aerospace, new materials, high-tech services, new energy and energy saving, resources and environment, advanced manufacturing and automation | V (STEX, EXPO forms) |

---

## 6. Gap analysis: our design vs. the reference platforms

| Capability | Reference practice | Our design before this research | Change |
| --- | --- | --- | --- |
| Market position | Venue functions licensed; agents verify buyers with joint liability | "Exchange later, via licence or partner" | **Agent route** with STEX/CTEX defined as the standard path for formal listing, bidding, settlement and certificates |
| Time limits | Working-day rules everywhere (3/5/10/15/20 WD) | Business-day SLAs only | **Working-day calendar** with official holidays and make-up days; configurable minimum periods per process |
| Listing types | Formal, intent, private agreement, notice, procurement, licence with entry fee + royalty + milestones | Technology + offers | Add listing types and licence price structure to offers; procurement listings as a demand type |
| Buyer qualification | Intent form, floor price, risk statement, agent verification, seller confirmation, silence = consent | Introduction requests | Add **buyer registration and qualification** for listing-based deals (via venue) |
| Competitive methods | Online bidding (timed + continuous), auction, tender, competitive negotiation | Not designed | Model the methods; run binding ones through the venue; competitive negotiation with expert panels can run on the platform |
| Demand handling | Expert rewriting, anonymization, every demand answered, solution submissions (揭榜), challenges with live finals | Demand + matching | Add **challenge campaigns**, solution submissions and "every demand answered" SLA |
| Technology managers | Certification levels, points, rewards, attribution | Brokers as users | **Technology-manager network**: credentials, assignment, points ledger, attribution |
| University tools | 15-day notices, dual publication, reward notices, ownership grants | Partly in 08 | Add **notice module**, inventor-reward notices and grant workflow |
| Open licensing and "use first, pay later" | National programmes with templates | Not designed | Add open-licence listings and a deferred-payment licence template |
| Events | EXPO "1+3+365", roadshows, livestreams, conversion clinics | Not designed | Add **events and roadshows** module |
| Evidence | Blockchain or timestamped evidence (CTEX), archives with retention classes (STEX) | Audit trail only | Add **hash-chained evidence** with trusted timestamps, and deal dossiers with retention classes |
| Service institutions | Registry with eligibility, annual review, sanctions | Service providers listed | Add onboarding rules, annual review and sanctions |
| Login for binding actions | CA-certificate USB key + SMS for bidding | SMS + password, MFA for staff | CA-based e-signature for signing and binding bids (via e-signature provider) |

These changes are specified as numbered requirements in [10](10-product-requirements.md).

---

## Sources

- 《上海市技术交易场所管理细则》 (沪科规〔2025〕2号): <https://stcsm.sh.gov.cn/cmsres/ba/ba7b10fcb800469ea1da3cf19001f714/363919f6ae1bad3c9f21bfacd938b066.pdf>
- STEX rules (Internet Archive copies of the official pages): information release rule 81 <http://web.archive.org/web/20240718145342/https://www.stte.com/articles/81>; buyer registration rule 82 <http://web.archive.org/web/20240718134706/https://www.stte.com/articles/82>; signing rule 83 <http://web.archive.org/web/20240718150251/https://www.stte.com/articles/83>; service institutions rule 105 (via <http://web.archive.org/web/20240808134107/https://www.stte.com/policies/rules>); procurement 177 <http://web.archive.org/web/20240624024635/https://www.stte.com/articles/177>; online bidding 179 <http://web.archive.org/web/20240624024414/https://www.stte.com/articles/179>; tender 180 <http://web.archive.org/web/20240624025921/https://www.stte.com/articles/180>; negotiation 181 <http://web.archive.org/web/20240624040825/https://www.stte.com/articles/181>; auction 182 <http://web.archive.org/web/20240624025611/https://www.stte.com/articles/182>; archives 183 <http://web.archive.org/web/20240624040640/https://www.stte.com/articles/183>; supply and demand 184 <http://web.archive.org/web/20240624025334/https://www.stte.com/articles/184>
- STEX bidding system and listings: <http://bid.stte.com/page/login>; example listing <http://web.archive.org/web/20260106060806/https://bid.stte.com/page/s/prjs/real_right/detail?flushResources=true&bshow=true&id=9348>
- Tsinghua PBCSF report on technology exchanges: <https://www.pbcsf.tsinghua.edu.cn/__local/B/5F/10/0DF73D686DF7BCA0F225309ADC3_E1443148_124049.pdf>
- STCSM 2024 report (STEX and NETC figures): <https://stcsm.sh.gov.cn/newspecial/2024jb/pdf/4.pdf>; STCSM replies on STEX evaluation products and InnoMatch: <https://stcsm.sh.gov.cn/cmsres/cd/cdb79143bcd740c492cd553dc3e1068f/beae17a516c40ac89bfa969742331cb1.pdf>, <https://stcsm.sh.gov.cn/cmsres/1d/1d53be21ff5f458c8edddaa63645470f/507c46bece268afb611978ef1082ae12.pdf>
- STEX finance and boards: <https://www.shanghai.gov.cn/nw4411/20240114/9980ba9d32d24f1ebb1fef6fa89ebb9e.html>; <https://news.10jqka.com.cn/20250728/c669930204.shtml>; <https://www.21jingji.com/article/20240104/herald/edbf2e7d6a7dd9bcb883c94fcef44a3f.html>; cross-border centre <https://www.gcs.gov.mo/news/detail/en/N26GAs9Ol2>
- NETC / InnoMatch: MOST <https://www.most.gov.cn/dfkj/sh/tpxw/201505/t20150520_119593.html>; 沪科提复〔2023〕49号 <https://www.shanghai.gov.cn/cmsres/7c/7c113929b0554fe6ab4970f086323048/d73ed26f8aacdc5495cca6611958b8db.pdf>; challenge notices <https://stcsm.sh.gov.cn/cmsres/d0/d062ffde2d544b79aa1f7dae84754591/20d896ae7d332071cffb5b7bd05cfd38.pdf>; 2025 EXPO notice <https://stcsm.sh.gov.cn/cmsres/8f/8fe2403a36d1440daae93500594e5873/44a23419cfc8c3d6de3ee822ac73dd82.pdf>; voucher rules <https://stcsm.sh.gov.cn/cmsres/35/3540a40b98dd4f5bb99e980f3b5d89a2/5e163d54dc89c40c7bea1b267e392b1a.pdf>; InnoMatch <https://www.innomatch.net/home>; challenge money rules (沪科合〔2019〕23号) <https://kyc.sues.edu.cn/_upload/article/files/4b/14/4cb347644e3ab9a0a3842377d654/32aba211-60e8-417a-9cca-fd3936c3b402.pdf>
- CTEX: <https://us.ctex.cn/article/aboutus/introduction/>; rules <https://us.ctex.cn/article/rules/202311/20231100140553.shtml>; 链证中国 <https://xian.ctex.cn/article/zyzx/zxdt/202503/20250300151707.shtml>; NCSTI guide <https://www.ncsti.gov.cn/kjdt/ztbd/xzhn_czhh_2021/zhwkjchgzhhshx_2021/202111/t20211123_51800.html>
- Zhejiang: <https://kjt.zj.gov.cn/art/2022/7/19/art_1229514947_43497.html>; <http://www.chinanews.com.cn/cj/2023/12-11/10126595.shtml>; <https://www.most.gov.cn/dfkj/zj/zxdt/202206/t20220621_181204.html>
- Tianjin fee schedule: <https://www.tpre.cn/rule/sfbf/12850.html>
- Technology-contract registration (2000): <https://www.gov.cn/gongbao/content/2000/content_60268.htm>
- 国发〔2016〕16号: <https://www.gov.cn/zhengce/content/2016-03/02/content_5048192.htm>; Shanghai diligence-exemption guideline: <https://www.shanghai.gov.cn/cmsres/55/55e069468cae46ffbb6bf687433e3b30/a4eb2a56b97c478bc7939d63be196a26.pdf>; Fudan notice example: <https://ist.fudan.edu.cn/Data/View/3033>
