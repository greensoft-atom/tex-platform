---
id: "runtime/mongoose5-transactions"
title_zh: "Mongoose 5.x 指南：事务"
title_en: "Mongoose 5.x guide — Transactions"
publisher: "Mongoose (Automattic)"
type: "platform page"
published: "n/a (living documentation)"
url: "https://mongoosejs.com/docs/5.x/docs/transactions.html"
archived: "none"
retrieved: "Not saved. Link checked (HTTP 200) 2026-10-19T01:43Z"
cited_by: "11 §5.2 (transactions with sessions on a replica set), 08 (financial state changes in MongoDB transactions), 11 Sources"
raw: "none"
---

# Mongoose 5.x guide — Transactions

## What it is

A technical reference for the target runtime (doc 11). **No local copy** (technical sources are recorded as notes only).

## What the docs take from it

- Transactions in Mongoose 5 use `session.withTransaction()` / sessions on a replica set; the docs' financial state changes run inside MongoDB transactions with write concern `majority` (11 §5.2; 08 implementation note; verified in `draft-implementation/`).

## Excerpts

None (no local copy).
