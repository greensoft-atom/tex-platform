---
id: "netc-innomatch/innomatch-site"
title_zh: "InnoMatch 全球技术供需对接平台（网站与前端程序）"
title_en: "InnoMatch global technology supply-demand matching platform (site and front-end bundle)"
publisher: "国家技术转移东部中心 (NETC) / InnoMatch"
type: "platform page"
published: "n/a (live site; server reported Last-Modified 2025-12-25 for the root page)"
url: "https://www.innomatch.net/home (cited); also https://www.innomatch.net/ and https://challenge.innomatch.net/"
archived: "none"
retrieved: "2026-10-19T00:30–00:32Z (live fetch with curl; file mtimes, UTC)"
cited_by: "09 §3.3 (modules), 09 §3.4 (demand and solution states), 09 §3.7 (technology hints), 09 Summary item 6, 09 Sources (\"InnoMatch\")"
raw: "raw/netc-innomatch/innomatch-site/home/home.html; raw/netc-innomatch/innomatch-site/www-root/index.html; raw/netc-innomatch/innomatch-site/www-root/headers.txt; raw/netc-innomatch/innomatch-site/challenge-root/index.html"
---

# InnoMatch website and front-end bundle

## What it is

The InnoMatch single-page application. The HTML shell is almost empty, so the module list, labels and state names in 09 §3.3–§3.4 were read from the public JavaScript bundles (`/os/assets/index-YSmKPZuT.js`, `challenge.innomatch.net/assets/index-CwteL7k7.js`). The bundles were downloaded for analysis but are not kept in `raw/` (software, ~2 MB each); their URLs and SHA-256 hashes are in [`raw-manifest.tsv`](../raw-manifest.tsv), and the markers found in them are listed below.

## What the docs take from it

- Modules: libraries, smart matching ("换一批"), workbench, challenge campaigns, points (rules, withdrawable points, period close), signing and evaluation, online EXPO, IM, analytics (09 §3.3).
- Demand states (待提交 → 资料审核 → 征集中 → 待选择 → 对接中 → 已反馈 → 完成; 终止/关闭/到期) and solution states (09 §3.4).
- Technology: Vue 3 + Vite SPA, REST API with WebSocket `/cable`, multi-tenant configuration (`TENENT_CODE`), Huawei Cloud OBS storage (09 §3.7).

## Excerpts

1. Page title and module script in `home.html`
   > <title>InnoMatch</title>

   *Translation:* (page title)

   > /os/assets/index-YSmKPZuT.js

   *Translation:* (the Vite-built ES-module bundle loaded by the page)

## Notes

- Markers found in the `/os/` bundle: `/cable` (1), `createApp` (2), `TENENT_CODE` (1), `myhuaweicloud` (4); UI labels such as 换一批, 积分关账, 提现积分, 品牌馆, 合约广场 and the demand states 待提交 / 资料审核 / 征集中 / 待选择 / 对接中 / 已反馈. The bundle is software and is not quoted beyond these labels. "Rails backend" and "built by vendor Tallty" are inferences (09 §3.7 marks the backend framework as inferred).
- API probes to `api.innomatch.net` returned only short encrypted or unauthenticated responses (discarded as junk; listed in the manifest).
