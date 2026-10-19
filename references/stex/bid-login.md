---
id: "stex/bid-login"
title_zh: "上海技术交易所竞价/交易系统登录页（bid.stte.com）"
title_en: "STEX bidding and trading system login page (bid.stte.com)"
publisher: "上海技术交易所有限公司 (STEX)"
type: "platform page"
published: "n/a (live page)"
url: "http://bid.stte.com/page/login"
archived: "none used (live page fetched as http://bid.stte.com/page/login?reqUri=%2Finfo%2Flist%2F31.html)"
retrieved: "2026-10-19T00:29Z by WebFetch (model summary only; the page itself was not saved)"
cited_by: "09 §2.7 (enterprise login with CA-certificate USB key + SMS code), 09 §6 (login for binding actions), 09 Sources"
raw: "none (summary only: raw/_tool-output/webfetch-summaries/2026-10-19T0029_bid-stte-com-page-login-reqUri-2Finfo-2Flist-2F31-html.md); related archived pages: raw/stex/bid-stte/"
---

# STEX bidding system login (bid.stte.com)

## What it is

The login page of STEX's older trading portal and online bidding front end. It was reachable live during the research (the main site was not). **No local copy of the page itself was saved**; only a WebFetch summary exists.

## What the docs take from it

- Enterprise login with a **CA-certificate USB key plus SMS code** (09 §2.7; 09 §6 "Login for binding actions").
- jQuery / Vue 2 front end (09 §2.7). This part is supported by the archived `bid.stte.com` pages in `raw/stex/bid-stte/` (for example `list_31.html` loads `jquery-3.4.1.min.js`, `vue.js`, `layer.min.js`, `jquery.jBox.js` and `des.js`).

## Excerpts

None (no verbatim copy of the login page). The WebFetch summary reports the strings "企业登录", "请插入CA证书（USB）", "获取手机验证码" and a recommendation of IE 9.0 or later; these are model-reported, not verified against a saved page.

## Notes

- To make this source verifiable, save the login page HTML (or a Wayback capture) next time it is reachable.
