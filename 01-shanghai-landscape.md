# 01 — Shanghai Technology-Trading Landscape: STEX, NETC and Related Platforms

> **About this document**
>
> - **Purpose:** Identify the main Shanghai platforms for technology trading and technology transfer, explain what each one actually does, and show how they relate to each other.
> - **Audience:** Founders, product managers and analysts who are designing a technology exchange and transfer platform. No prior knowledge of Chinese technology transfer is assumed: see [Key terms](#key-terms).
> - **Status:** Market research. Figures are taken from the cited sources (data years 2020–2025). Re-check them before quoting externally.
> - **Next:** [02 — STEX vs NETC/InnoMatch: scale and scope](02-stex-vs-netc-scale-and-scope.md)

---

## Summary

- Shanghai has two platforms that matter most for a project like ours:
  - **上海技术交易所 — Shanghai Technology Exchange (STEX, 上技所)**: a licensed **technology trading venue** (技术交易场所, an "exchange"). It lists technologies, runs negotiated and competitive sales, has payments settled by a third party and issues transaction certificates.
  - **国家技术转移东部中心 — National Technology Transfer Center East (NETC)** and its **InnoMatch** platform: a **technology-transfer network** focused on supply–demand matching and commercialization services. STCSM's 2024 report lists NETC as a technology-transfer platform, not as a trading venue.
- The two are **not independent competitors**. A public fund prospectus shows that both sit in the same state-owned group, led by **上海杨浦科技创业中心有限公司 (Shanghai Yangpu Science and Technology Entrepreneurship Center Co., Ltd., "杨科创")**. 杨科创 is STEX's largest shareholder and also initiated and operates NETC. One executive is chairman of STEX, president of NETC and general manager of 杨科创.
- Shanghai deliberately built **two complementary layers**: a *network and matching layer* (NETC/InnoMatch) and a *trusted transaction layer* (STEX).
- **What this means for our platform:** we build the matching and service layer ourselves, as NETC does. We reach the transaction layer as a **registered practising agent** (执业类交易服务机构) of a licensed venue (STEX or CTEX), not by becoming a venue (see §1.3 and [04](04-product-strategy.md)).

---

## Key terms

These terms are used throughout documents 01–03.

| Term | Chinese | Meaning in these documents |
| --- | --- | --- |
| Technology transfer | 技术转移; 科技成果转化 | Moving a technology from the party that developed it (often a university or research institute) to a party that will use it: by assignment, licence, contribution as equity, joint development, technical services or consulting. 科技成果转化 ("transformation of scientific and technological achievements") is the legal term for commercializing research results. |
| Technology trading venue, technology exchange | 技术交易场所; 技术交易所 | A company approved by the local government (in Shanghai, the municipal government after STCSM review) to organize technology trading under published rules: listing, disclosure, competitive sales, third-party settlement and certificates. Shanghai approves new venues under total-quantity control (§1.3). |
| Listing | 挂牌 | Publishing a technology for sale or licence on a venue, with fixed terms, a floor price and a public disclosure period (on STEX at least 5 working days) during which buyers register. |
| On-exchange | 进场 | Handled through a venue. 进场交易额 (on-exchange transaction value) is STEX's headline volume figure. |
| Negotiated transfer | 协议转让 | Price and terms agreed directly between seller and buyer. On a venue, this is the outcome when only one qualified buyer registers. |
| Competitive bidding | 竞价 | Qualified buyers bid online in a session run by the venue; the highest valid bid wins. STEX's multi-round mode has a timed phase of at least 10 minutes, then rolling cycles of at least 60 seconds. |
| Auction | 拍卖 | A public auction, run with a licensed auction house under the Auction Law. |
| Tender | 招标 | Buyers submit written bids by a deadline, which are evaluated against published criteria (on STEX: deposit ≤ 30% of the listing price, at least 10 working days to prepare bids). |
| Third-party settlement | 第三方结算 | Deposits and prices are settled by the bank or licensed non-bank payment institution that holds the trading funds, with a separate account for each client (Art. 12 of the Shanghai rules). Our platform never holds this money. |
| Rights-registration certificate; transaction certificate | 技术权益登记凭证; 技术交易凭证 (交易鉴证) | Documents issued by a venue confirming who holds a technology right, and that a transaction and its payment took place. They are accepted as supporting evidence, for example for university pricing and contract registration. |
| Practising agent | 执业类交易服务机构 | A firm registered with STEX to act for clients on the venue. Buyers must register through an agent, who verifies their materials and bears joint liability for them (STEX rule 82). This is the role our platform plans to take. |
| Technology manager | 技术经理人 | A professional broker who structures demands, finds candidates and turns a match into a deal. |
| Service invention | 职务科技成果 | A result created by employees in the course of their work. It belongs to the employer (for example a university). State-funded employers must follow public pricing rules when they transfer it. |
| Registered technology contract | 技术合同认定登记 | A signed technology contract registered with the local technology-market office. Registration unlocks tax incentives. City and national "technology contract value" statistics count these contracts. |
| Units | 万; 亿 | 1万 = 10,000 and 1亿 = 100 million. So 42亿元 = ¥4.2 billion and 400亿元 = ¥40 billion. ¥ means renminbi (RMB). B = billion, M = million. |

**A typical transfer in one paragraph.** A university decides to license a patent it owns (a service invention). It sets the price in one of three ways: negotiation followed by a public notice of at least 15 days, listing on a venue, or auction. The parties sign a technology contract and register it to obtain tax incentives. The university then pays the inventors their share of the income. A matching platform such as InnoMatch helps find the buyer. A venue such as STEX runs the listing, settlement and certificate when a formal process is needed. Details: [08 §5.4](08-china-operating-model.md).

---

## 1. Shanghai Technology Exchange (STEX / 上海技术交易所)

### 1.1 Identity and history

| Item | Details |
| --- | --- |
| Chinese name | 上海技术交易所（上技所） |
| Legal entity | 上海技术交易所有限公司 — state-controlled (国有控股) limited liability company in Yangpu District, Shanghai. Its largest shareholder is 杨科创 (see §3). |
| Founded | 1993, jointly by the Ministry of Science and Technology (MOST) and the Shanghai Municipal Government. Described as China's first national-level permanent technology market (首家国家级常设技术市场). |
| Re-launch | 31 Dec 2019: the inter-ministerial joint conference on the clean-up of trading venues (清理整顿各类交易场所部际联席会议) accepted STEX's filing. 28 Oct 2020: STEX formally re-opened as a modern exchange. |
| Regulator | Shanghai Municipal Science and Technology Commission (STCSM, 上海市科委) is the industry authority for technology trading venues in Shanghai. |
| Governing rules | 《上海市技术交易场所管理细则》 (Shanghai Rules on the Administration of Technology Trading Venues, 沪科规〔2025〕2号), in force 1 May 2025 – 30 Apr 2030 |
| Official site | <http://www.stte.com> |

### 1.2 What STEX actually does

STEX describes its core business as four functions:

| Function | Chinese | What it means in practice |
| --- | --- | --- |
| Registration | 登记 | Registers technology rights (技术权益登记) and technology demands. These records anchor later trades, on or off the exchange, and, together with technology evaluation, help universities find counterparties. |
| Trading | 交易 | Designs trading products and rules. Runs negotiated transfer, auction, tender and competitive bidding. Discovers market prices. |
| Custody / hosting | 托管 | Applies **tiered, classified information disclosure** to listed results, then organizes market promotion and deal matching on top of market-based evaluation. |
| Settlement | 结算 | Provides **third-party fund settlement** and issues **transaction certificates (交易凭证)** that record both the transaction and the money flow. |

Additional capabilities reported in public disclosures:

- **Specialized boards (专板):** science popularization, meteorological technology, green technology, standards, biomedicine and agricultural technology.
- **Technology-backed credit (技术授信):** about ¥4.058 billion (40.58亿元) of credit granted against technology assets, cumulative to July 2024.
- **Network (to July 2024):** links to 50 technology-market outlets across China, 19 core trading-network members, 8 regional innovation-center nodes, and cooperation with 32 countries.
- **International arm:** a cross-border trading center in the Lingang New Area, operated by the wholly owned subsidiary 上海上技所跨境技术贸易中心有限公司 (上技贸易).
- **Evaluation products:** 16 evaluation services built on "model evaluation + expert price inquiry + market price"; more than 30,000 patents graded and more than 1,200 results evaluated (STCSM reply, June 2025).
- **New products:** a "科技成果 + 认股权" product (technology result plus equity warrant) was launched in 2024, and the first deal of this kind in China was completed.

### 1.3 What the 2025 Shanghai rules require from a technology exchange

The 2025 STCSM rules are the best public description of what a *licensed* technology exchange must provide. Under these rules, a technology trading venue must provide:

| Requirement (Article 11 and related) | Detail |
| --- | --- |
| Rights registration (权属登记) | Issue technology-rights registration certificates where rights are clear and lawful. |
| Transaction certification (交易鉴证) | Issue transaction certificates for qualifying transactions. Certificates and public-notice proofs may be used as supporting evidence (Art. 13). |
| Information disclosure (信息披露) | Publish listing announcements, supply/demand information and the public notices required when public institutions transfer service inventions (职务科技成果). Information must be true, accurate and timely. |
| Market-based evaluation (评价) | Provide guidance on market-based evaluation and organize pre-transfer valuation. |
| Settlement (结算) | Settle transaction prices and deposits. Art. 12 requires **third-party settlement through a bank or a licensed non-bank payment institution**, with segregated per-client accounts. |
| Service-provider management | Manage IP, valuation, brokerage and legal service providers operating on the venue. |
| Participant suitability (适当性管理) | Check that participants are suitable, and guide and train them on rules, contract templates and the online system. |
| Risk control | Maintain a risk-prevention system and internal controls proportional to the business. |
| Dispute handling | Coordinate issues, mediate disputes and handle rule violations. |

- **Transaction modes (Art. 2):** technology transfer, technology licensing, technology-for-equity investment (作价投资), technology development, technical services and technical consulting.
- **Transaction methods (Art. 2):** negotiated transfer (协议转让), auction (拍卖), tender (招标), competitive bidding (竞价), and other lawful methods.
- **Conduct rules:** staff must recuse themselves from conflicts, may not misuse investor information or take improper benefits from listed projects (Art. 15), and must file monthly, quarterly and annual reports with STCSM (Art. 16).

> **Why this matters for us:** a private platform can copy the *workflow*, but some of these functions are *regulated activities*: certified rights registration, transaction certification, and holding or settling funds. New venues are approved under "total-quantity control, rational layout and prudent approval" (总量控制、合理布局、审慎审批, Art. 6), so a venue licence is a long, uncertain path. The realistic route is to act as a **registered practising agent** of a licensed venue (STEX or CTEX) and run formal listing, bidding, settlement and certificates through it. See [09 §1–§2](09-reference-platform-features.md) (including the agent requirements in 09 §2.1), [05 §2](05-system-design-blueprint.md) and [08](08-china-operating-model.md).

### 1.4 Scale

STEX's figures use several different metrics. Quote each number with its metric name and date.

| Metric | Value | Source |
| --- | --- | --- |
| Technologies entering the exchange (进场成果) in 2024 | 2,383 | STCSM 2024 annual report |
| On-exchange transaction value (进场交易额) in 2024 | ¥30.933 billion (309.33亿元) | STCSM 2024 annual report |
| Cumulative technologies (end of 2024) | > 12,800 | STCSM 2024 annual report |
| Cumulative closed value (累计成交金额, end of 2024) | > ¥63.4 billion (634亿元) | STCSM 2024 annual report |
| Cumulative technology-trading value (技术交易金额, June 2025) | > ¥65.3 billion; > 13,000 technologies | STCSM reply 沪科建复〔2025〕38号, 25 Jun 2025 |
| Cumulative on-exchange value (进场技术交易额, July 2025) | ≈ ¥76 billion (760亿元); > 13,000 technologies | Interview with STEX president, 28 Jul 2025 |
| Annual closed value (成交金额) 2021 / 2022 / 2023 | ¥3.047B / ¥10.115B / ¥18.922B | Fund prospectus (see Sources) |

> **Note:** the June 2025 and July 2025 cumulative figures differ by about ¥11 billion within roughly a month. They use different metric names, and the sources do not reconcile them. Prefer the STCSM report figures for year-end comparisons.

---

## 2. National Technology Transfer Center East (NETC / 国家技术转移东部中心)

### 2.1 Identity

| Item | Details |
| --- | --- |
| Chinese name | 国家技术转移东部中心（东部中心） |
| Status | National-level regional technology-transfer platform, approved by MOST in 2014 and jointly promoted by MOST and the Shanghai Municipal Government. Guided by STCSM. Establishment coordinated by the Shanghai Technology Innovation Center (上海市科技创业中心). |
| Operating company | 上海东部科技成果转化有限公司 (Shanghai Eastern Technology Achievement Transformation Co., Ltd.) |
| Positioning | A "fourth-party platform" (第四方平台) offering a full chain of technology trading, technology finance and industrial incubation. It describes its strategy as "technology trading as the main business, with services and finance as supporting businesses". |
| Official site | <https://www.netcchina.com> |

### 2.2 InnoMatch

**InnoMatch — 全球技术供需对接平台 (Global Technology Supply–Demand Matching Platform)** is NETC's digital product. The online platform was launched in August 2022 with STCSM support. Public descriptions say it:

- Aggregates technology results worldwide and matches them to enterprise technology demands, using big data and blockchain.
- Trains and manages **technology managers (技术经理人)**, the professional brokers who turn a match into a deal.
- Combines **online intelligent matching** with **offline brokerage and project operation**.
- Runs the annual **InnoMatch EXPO / Global Technology Transfer Conference (全球技术转移大会)**, part of the Pujiang Innovation Forum. The 2024 conference produced more than 1,600 cooperation intentions with an intended value of nearly ¥8 billion (近80亿元). The September 2025 fair released more than 10,000 technology needs, with more than ¥20 billion of investment commitments from participating companies and 1,728 R&D results seeking commercialization.

### 2.3 Scale

Official figures (STCSM 2024 report and STCSM replies). InnoMatch counts are **cumulative since the August 2022 launch** unless a year is given. "Intended" values are not signed deals.

| Metric | Value | Source |
| --- | --- | --- |
| Signed deals facilitated by NETC in 2024 | **≈ ¥4.2 billion** (近42亿元) | STCSM 2024 report |
| Signed deals facilitated, cumulative (end of 2024) | **≈ ¥40 billion** (近400亿元) | STCSM 2024 report |
| Network (end of 2024) | 44 domestic outlets and 11 international cooperation channels; 8 new domestic and international channels added in 2024 | STCSM 2024 report |
| InnoMatch, 2024 | 595 matching intentions; intended signing value > ¥3.4 billion (34亿元) | STCSM 2024 report |
| InnoMatch, cumulative to end of 2024 | 6,468 corporate demands; 4,390 technology results; 3,015 solutions; 313 completed transactions; ¥778 million (7.78亿元) completed value | STCSM 2024 report (also published on NETC's website) |
| InnoMatch, cumulative to June 2024 | 4,395 demands; 3,295 results; 1,982 solutions; matching rate (对接率, not defined in the source) > 60%; 1,408 matching intentions; intended signing value > ¥5.239 billion (52.39亿元) | STCSM reply 沪科建复〔2024〕43号, 5 Jun 2024 |
| InnoMatch, cumulative to June 2025 | ≈ 30,000 registered users in 36 countries and regions; > 6,600 demands; > 4,600 results; > 3,000 solutions; ≈ ¥800 million (近8亿元) signed and implemented; matching rate ≈ 65% | STCSM reply 沪科建复〔2025〕38号, 25 Jun 2025 |

> **Correction:** an earlier draft gave NETC's 2024 figure as "¥42 billion". The official text says 近42亿元, which is **¥4.2 billion** (亿 = 100 million). Earlier drafts also called the InnoMatch totals "2024 figures, self-reported". They are cumulative totals, and the STCSM 2024 report confirms them.

---

## 3. How STEX and NETC relate

```mermaid
flowchart TB
    G["上海杨浦科技创业中心有限公司 (杨科创)<br/>Yangpu Science and Technology Entrepreneurship Center"]
    G -->|"largest shareholder"| STEX["上海技术交易所 STEX<br/>Licensed technology trading venue"]
    G -->|"initiated and operates"| NETC["国家技术转移东部中心 NETC<br/>Regional technology-transfer platform"]
    NETC -->|"operating company"| OPCO["上海东部科技成果转化有限公司"]
    NETC --> IM["InnoMatch<br/>Global supply-demand matching"]
    G --> FIN["Technology finance<br/>(micro-loans, funds)"]
    G --> INC["Incubators and science parks"]
    IM -. "qualified opportunities" .-> STEX
    STEX -. "registration, certification, settlement" .-> IM
```

Solid lines are ownership or operating relationships disclosed in the fund prospectus. Dashed lines show how the two layers complement each other in function; they are not a documented contract between the two.

Fund-prospectus disclosures show:

- 杨科创 (上海杨浦科技创业中心有限公司) was founded by STCSM, the Yangpu District Government and Fudan University. It is a municipal state-owned enterprise supervised by STCSM; in mid-2024 it managed 10 parks with nearly 10,000 resident companies.
- 杨科创 is STEX's largest shareholder. The prospectus presents this "technology-factor market" business segment as holding its own trading licence and being recognized as a national IP and technology-achievement property-rights trading institution.
- 杨科创 initiated and operates NETC, and built InnoMatch.
- One executive (谢吉华) is chairman of STEX, president of NETC and general manager of 杨科创. STEX's president (颜明峰) is also the deputy general manager in charge of day-to-day operations at 杨科创.

**Interpretation:** Shanghai did not build "one platform that does everything". It built a **matching and services network** (NETC/InnoMatch) and a **regulated transaction venue** (STEX) under common ownership, and connected them to finance and incubation. That supports the recommendation in [04](04-product-strategy.md): design our platform as distinct but integrated layers. We build the matching and services layer ourselves and connect to a licensed venue's transaction layer as its registered practising agent.

---

## 4. Other relevant platforms and context

| Platform | Role |
| --- | --- |
| 上海市科技创业中心 (Shanghai Technology Innovation Center) | Government innovation, startup and commercialization services; coordinated the establishment of NETC |
| 中国（上海）国际技术进出口交易会 (China Shanghai International Technology Fair, CSITF) | Annual international technology-trade fair |
| STEX International Trading Center (Lingang) | Cross-border technology trading arm of STEX |
| 中国技术交易所 (China Technology Exchange, CTEX, Beijing) | Beijing's national technology exchange; a useful second benchmark outside Shanghai, and the alternative venue for our agent route |

National and city context:

| Indicator | Value | Source |
| --- | --- | --- |
| Shanghai registered technology contracts (技术合同认定登记), 2024 | 53,864 contracts, ¥520.07 billion (5200.73亿元) | STCSM 2024 annual report |
| Shanghai universities' technology contracts, 2024 | 9,179 contracts, ¥7.913 billion (79.13亿元) | STCSM reply 沪科建复〔2025〕38号 |
| National technology contract value | ¥2.83 trillion (2020) → ¥6.84 trillion (2024) | Science and Technology Daily, 2026 |
| Universities and research institutes nationwide, 2024 | 4,059 institutions transferred results via six modes (transfer, licensing, equity investment, development, consulting, services), total ¥226.91 billion | Xinhua, 2025, citing 《中国科技成果转化年度报告2025》 |

> **Note:** the city and national "technology contract" totals cover every *registered* technology contract (including development and service contracts signed off-exchange). They are far larger than any single platform's volume and should not be compared with STEX's on-exchange value.

---

## 5. Which platform to study, for which question

| If you want to understand… | Study | Why |
| --- | --- | --- |
| How a licensed exchange lists, prices, certifies and settles technology deals | **STEX** | Registration, disclosure, auction/tender/bidding, third-party settlement and transaction certificates |
| How demand-driven matching, brokers and ecosystem services work | **NETC / InnoMatch** | Demand collection, technology-manager network, online + offline matching, events, training |
| How the two layers are combined into one ecosystem | **杨科创 group structure** | Common ownership of exchange, network, finance and incubation |
| How our platform reaches venue functions | **STEX practising-agent rules** (rules 82 and 105) | Eligibility, joint liability for buyer materials, annual review (see [09 §2.1](09-reference-platform-features.md)) |
| How a university must price and publicize a transfer in China | **促进科技成果转化法** (Law on Promoting the Transformation of Scientific and Technological Achievements) + STEX disclosure services | Negotiated price with a public notice of at least 15 days, listing or auction (see [08 §5.4](08-china-operating-model.md)) |

---

## Sources

Notes, excerpts and saved copies of these sources (with retrieval dates and archived links) are in [`references/`](references/README.md).

- STCSM, *2024 Shanghai Science and Technology Progress Report* (STEX and NETC 2024 figures, InnoMatch totals; Shanghai technology contracts): <https://stcsm.sh.gov.cn/newspecial/2024jb/pdf/4.pdf>
- STCSM reply 沪科建复〔2024〕43号 (5 June 2024; InnoMatch figures to June 2024): <https://stcsm.sh.gov.cn/cmsres/1d/1d53be21ff5f458c8edddaa63645470f/507c46bece268afb611978ef1082ae12.pdf>
- STCSM reply 沪科建复〔2025〕38号 (25 June 2025; InnoMatch and STEX figures to June 2025, Shanghai university contracts): <https://stcsm.sh.gov.cn/cmsres/cd/cdb79143bcd740c492cd553dc3e1068f/beae17a516c40ac89bfa969742331cb1.pdf>
- STCSM, 《上海市技术交易场所管理细则》 (沪科规〔2025〕2号): <https://www.shanghai.gov.cn/nw12344/20250414/7d1e61e9a2de431aa524cb2f817845cf.html>
- China Merchants Fund, 招商科创孵化器封闭式基础设施证券投资基金更新的招募说明书（2025年第二号） (STEX and NETC company profiles, financials and group structure): <https://pdf.dfcfw.com/pdf/H2_AN202512151801143261_1.pdf>
- Interview with STEX president 颜明峰, *China Securities Journal*, 28 July 2025: <https://news.10jqka.com.cn/20250728/c669930204.shtml>
- NETC, About us: <https://www.netcchina.com/about-us>; 2024 figures: <https://www.netcchina.com/archives/28860>
- Shanghai Municipal Government, *InnoMatch Global Tech-Matching Fair unveils 10,000 global tech needs* (2025): <https://english.shanghai.gov.cn/en-Latest-TalentsinShanghai/20250924/5af31034be3f4e358e44c40a292a4298.html>
- Shanghai Yangpu District Government, STEX profile: <https://xyd.shyp.gov.cn/company-detail/10>
- Science and Technology Daily (2026-03-30), national technology contract value: <https://www.stdaily.com/web/gdxw/2026-03/30/content_494646.html>
- Xinhua (2025-09-22), university and institute transfers in 2024: <https://www.news.cn/tech/20250922/51549784dc2d460db3cc76bcc401eaa5/c.html>
