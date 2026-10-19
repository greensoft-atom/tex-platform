---
id: "runtime/meilisearch-language-support"
title_zh: "Meilisearch 文档：语言支持"
title_en: "Meilisearch documentation — Language support"
publisher: "Meili SAS (Meilisearch documentation)"
type: "platform page"
published: "n/a (living documentation)"
url: "https://www.meilisearch.com/docs/learn/configuration/language"
archived: "none"
retrieved: "Not retrieved. Seen in web-search results 2026-10-19T00:17Z"
cited_by: "11 §6.1 (\"Meilisearch segments Chinese words (jieba-based) out of the box\"), 11 Sources"
raw: "none (search result: raw/_tool-output/websearch-results/2026-10-19T0017_14.md)"
---

# Meilisearch documentation — Language support

## What it is

A technical reference for the target runtime (doc 11). **No local copy** (technical sources are recorded as notes only).

## What the docs take from it

- Meilisearch's tokenizer (Charabia) segments Chinese with a **jieba-based** pipeline out of the box (11 §6.1); this is why Meilisearch was adopted for Chinese search on MongoDB 4.4/5.0 (11 §6; README revision 3).

## Excerpts

None (no local copy).

## Notes

- The search summary notes community reports that jieba segmentation quality was not always sufficient, and that the docs and the Charabia README describe Chinese normalisation differently. The draft implementation verified Chinese search with Meilisearch 1.11.3 (see `draft-implementation/`).
