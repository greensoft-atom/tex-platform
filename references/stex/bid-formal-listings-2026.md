---
id: "stex/bid-formal-listings-2026"
title_zh: "上海技术交易所正式披露项目（2026 年，项目编号 Z20260098 技术许可、Z20260093 技术转让）及 60 个在挂项目抽样"
title_en: "STEX formal technology listings of 2026 (Z20260098 licence, Z20260093 transfer; bid.stte.com ids 10031, 10026) and a sample of 60 live listings"
publisher: "上海技术交易所有限公司 (STEX), listings published for the holders through their service institutions"
type: "platform page"
published: "listing start 2026-04-27; disclosure end shown as 2026-10-21 (rolled forward in 5-WD extensions)"
url: "https://bid.stte.com/prjs/real_right/detail/10031.html ; https://bid.stte.com/prjs/real_right/detail/10026.html ; list: https://bid.stte.com/page/s/prjs/real_right/index?type=1 (data from /page/s/prjs/real_right/list)"
archived: "none (live pages)"
retrieved: "Fetched live 2026-10-19T03:12Z (curl; file mtimes, UTC). Contact persons' names and mobile numbers were redacted before saving"
cited_by: "09 §2.3, §2.6; 06 §6.4; 07 §3.5; 08 §1.3; 10 FR-VEN-03, FR-VEN-08, FR-DEAL-05, UAT-16; 12 D-01"
raw: "raw/stex/bid-stte-live/p_10031.txt; raw/stex/bid-stte-live/p_10031.html; raw/stex/bid-stte-live/p_10026.txt; raw/stex/bid-stte-live/p_10026.html; raw/stex/bid-stte-live/sample-2026-10-19.tsv"
---

# STEX formal technology listings, 2026

## What it is

Two live **formal disclosures (正式披露)** of technology deals on STEX's trading site `bid.stte.com`, both filed by 中国融通科技服务集团有限公司 (named as the listing's "技术服务机构") on behalf of the patent owners, the Naval Medical University and its affiliated hospital: Z20260098 (patent licence, floor ¥300,000 entry fee plus 10 % of sales; id 10031) and Z20260093 (technology package transfer, ¥20 million with milestones; id 10026). They show the terms STEX uses in 2026 for technology listings. The file `sample-2026-10-19.tsv` summarises the first 60 listings of the public listing index on 2026-10-19 (10 formal, 50 intent disclosures), extracted by script from the live pages (the other 58 pages were not kept).

The bid.stte.com listing pages and the listing index are public; the rule and news pages under `/info/` now redirect to a login page (they were public in the 2025–2026 Wayback copies in `raw/stex/bid-stte/`).

## What the docs take from it

Facts for 09 §2.3/§2.6, FR-VEN-03 and D-01:

- **Fees:** the transferee/licensee pays STEX a transaction service fee "per the STEX fee standard"; the transferor commits to pay "per the STEX fee measures" (收费办法). 9 of the 10 formal listings sampled carry the transferee clause and all 10 the transferor commitment; none states a rate; see [stex/fee-standard-2021](fee-standard-2021.md).
- **Disclosure period:** 10 WD in 7 of the 10 formal listings (the others 15, 20 and 261 WD), i.e. ≥ 5 WD as in rule 81; when no buyer appears the disclosure is **extended in 5-WD cycles** until one does (9 of the 10; the other simply ends), so the shown end date keeps moving.
- **Method when two or more buyers qualify:** competitive negotiation (竞争性谈判) in 8 formal listings, online bidding (在线竞价) in 2.
- **Contract deadline:** STEX organises signing **within 60 WD** after the buyer is determined — longer than the 5 WD in rule 83 Art. 6 ([stex/rule-83](rule-83.md)); listings can set their own terms.
- **Settlement:** 9 of the 10 formal listings use **off-exchange settlement (场外结算)**: the price goes straight to the transferor's bank account; only the deposit passes through STEX's deposit account. One uses on-exchange settlement (场内结算).
- **Agent role:** the page header names the filing "技术服务机构" (agent) with a case handler, and a STEX trading-department contact.

## Excerpts

1. Fees — transferee and transferor (Z20260098)
   > 8、被许可方应按照上海技术交易所收费标准支付交易服务费。

   *Translation:* "8. The licensee shall pay the transaction service fee according to the STEX fee standard."

   > （7）我方将按照技交所收费办法及相关交易文件的约定及时、足额支付相关费用，不因与受让方争议或合同解除、终止等原因拒绝、拖延、减少交纳或主张退还相关费用。

   *Translation:* "(7) We [the transferor] will pay the relevant fees in time and in full according to the STEX fee measures and the transaction documents, and will not refuse, delay or reduce payment or claim a refund because of a dispute with the transferee or the rescission or termination of the contract."

2. Extension in 5-WD cycles
   > 延长信息披露：不变更信息披露内容，按照5个工作日为一个周期延长，直至征集到意向受让方。

   *Translation:* "Extend the disclosure: without changing its content, extend in cycles of 5 working days until an intended transferee is found."

3. Method and contract deadline
   > 如征集到31个及以上符合条件的意向被许可方的，则以竞争性谈判方式组织交易，按照交易规则确定被许可方和受让价格。上技所在被许可方确定后60个工作日内组织交易双方签订《技术交易合同》。

   *Translation:* "If 31 or more qualified intended licensees are found [for 30 non-exclusive licences], the transaction is organised by competitive negotiation and the licensees and price are determined under the trading rules. STEX organises the signing of the Technology Transaction Contract within 60 working days after the licensees are determined."

4. Payment straight to the transferor (Z20260093)
   > 为人民币2000万元，包括首付款和里程碑付款，首付款不少于200万元，受让方应在技术交易合同生效之日起30个工作日内支付至转让方指定银行账户

   *Translation:* "RMB 20 million, comprising a down payment and milestone payments; the down payment is not less than RMB 2 million and the transferee pays it into the transferor's designated bank account within 30 working days of the contract taking effect"

## Notes

- **Privacy:** the live pages show the agent's case handler and STEX staff with personal mobile numbers, and the researchers' names; these were replaced with "[姓名已删除]" / "[电话已删除]" in both the `.html` and `.txt` copies. The STEX deposit-account numbers (company accounts) are left in the raw files but not reproduced here.
- The same live check of listing 9348 (`/page/s/prjs/real_right/detail?…id=9348`) still showed the 5 % buyer service fee recorded in [stex/bid-listing-9348](bid-listing-9348.md); it was not saved again.
- **Data access:** the listing index fills its rows from `/page/s/prjs/real_right/list` (an HTML fragment built for the page itself, with `pageNo`/`pageSize` parameters), and the search box calls `/service/keywordSearch`. These are internal endpoints of the web UI; no documented API, data feed or agent interface was found. Buyers must open an account with STEX (开户申请) and submit applications themselves or through a service institution (listing 9348 text).
- Intent disclosures (意向披露) in the sample run about one year (180–256 WD shown) and carry no fee clause.
- The sample TSV columns: bid.stte.com id, project number, disclosure type, project type, start and end dates, disclosure WD, extension rule, method for two or more buyers, settlement, buyer-fee clause present, transferor-fee commitment present, agent organisation. It contains no personal names.
