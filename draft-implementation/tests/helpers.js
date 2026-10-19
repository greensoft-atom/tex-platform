// Shared helpers for the database tests (plain JavaScript: runs directly on Node 12.4.0).
'use strict';
const mongoose = require('mongoose');
const { connectDatabase } = require('../dist/core/db/connection');
const { allModels } = require('../dist/models');

let pass = 0;
let fail = 0;

// A deprecation warning means a driver option or global setting is missing (e.g. ensureIndex).
process.on('warning', (w) => { if (w.name === 'DeprecationWarning') ok('no deprecation warnings: ' + w.message, false); });

function ok(name, cond, detail) {
  if (cond) pass++; else fail++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond || detail === undefined ? '' : '  -> ' + detail));
}

/** Expects `fn` to reject; `match(err)` says whether it failed for the expected reason. */
async function rejects(name, fn, match) {
  try {
    await fn();
    ok(name + ' (expected rejection)', false);
  } catch (e) {
    const good = !match || match(e);
    ok(name, good, (e && (e.name + ' ' + (e.code || '') + ' ' + e.message)).slice(0, 200));
  }
}

const is = {
  validation: (e) => e.name === 'ValidationError',              // Mongoose schema: rejected before any database call
  strict: (e) => e.name === 'StrictModeError',                  // unknown field or filter path
  dbValidator: (e) => e.code === 121,                           // MongoDB $jsonSchema / $expr validator
  duplicate: (e) => e.code === 11000,                           // unique index
  version: (e) => e.name === 'VersionError',                    // optimistic concurrency on save()
  named: (name) => (e) => e.name === name,
};

async function connect() {
  const conn = await connectDatabase(process.env.MONGO_URL);
  const info = await conn.db.admin().command({ buildInfo: 1 });
  console.log('node', process.version, '| mongoose', mongoose.version, '| mongod', info.version);
  return conn;
}

/** Empties every collection but keeps validators and indexes (tests can be re-run after migrations). */
async function clearAll() {
  for (const model of allModels) await model.collection.deleteMany({});
}

async function finish() {
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

function run(main) {
  main().then(finish).catch((e) => { console.error('FATAL', e); process.exit(2); });
}

module.exports = { ok, rejects, is, connect, clearAll, run };
