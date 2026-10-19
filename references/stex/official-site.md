---
id: "stex/official-site"
title_zh: "上海技术交易所官网（首页，2025 年改版）"
title_en: "STEX official website (home page, 2025 redesign)"
publisher: "上海技术交易所有限公司; site copyright 上技所数字科技（上海）有限公司 (STEX Digital Technology Co.)"
type: "platform page"
published: "n/a (live site)"
url: "http://www.stte.com (as cited in 01); https://www.stte.com/"
archived: "http://web.archive.org/web/20250812194142/https://www.stte.com/"
retrieved: "Live site unreachable on 2026-10-18T23:26Z (WebFetch \"connect ECONNREFUSED\"); Wayback snapshot 2025-08-12 19:41:42 UTC (archive timestamp), raw copy fetched 2026-10-19T00:34Z, decompressed copy 00:42Z (file mtimes, UTC)"
cited_by: "01 §1.1 (\"Official site\"); 09 §2.7 (portal 2025 redesign: Nuxt 3, Pinia, Tencent Maps, Baidu Analytics, built by STEX Digital Technology Co.); 09 Method note (site blocks automated access)"
raw: "raw/stex/wayback-stte/home2025/home.html; raw/stex/wayback-stte/home.txt; raw/_tool-output/webfetch-summaries/2026-10-18T2326_www-stte-com.md"
---

# STEX official website (home page)

## What it is

STEX's public portal. During the research the live site refused connections from outside China, so the 2025 home page was read from a Wayback Machine copy (`home2025/home.html` is the decompressed archived page; the gzip-compressed response it came from was dropped as a duplicate).

## What the docs take from it

- The official URL of STEX (01 §1.1).
- The 2025 redesign is a **Nuxt 3** server-rendered app named "TEIntegratedPortalPlatform" with Pinia stores, Tencent Maps and Baidu Analytics, copyright **上技所数字科技（上海）有限公司** (09 §2.7). These are technical markers in the page source, not statements by STEX.

## Excerpts

1. Footer copyright line in the archived page
   > 上技所数字科技（上海）有限公司版权所有

   *Translation:* "All rights reserved by STEX Digital Technology (Shanghai) Co., Ltd."

2. Application name embedded in the page source
   > TEIntegratedPortalPlatform

   *Translation:* (identifier; "technology-exchange integrated portal platform")

## Notes

- Other markers found in `home2025/home.html`: `apiBase:"/server"`, `pinia`, `map.qq.com`, `hm.baidu.com`, `cnzz`. The 2024 site (rule pages under `/articles/N`) used an older navigation (交易 / 机构 / 专板 / 区域 / 服务 / 规则 / 竞价).
