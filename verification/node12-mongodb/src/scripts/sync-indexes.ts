// src/scripts/sync-indexes.ts — release step, run as tex_migrator after migrate-mongo:
//   node dist/scripts/sync-indexes.js            create missing indexes declared in the schemas
//   node dist/scripts/sync-indexes.js --check    report differences only (CI / pre-release)
// Never syncIndexes() in production: it drops every index that a schema does not declare.
import { connectDatabase, disconnectDatabase } from '../core/db/connection';
import { allModels } from '../models';

export async function syncIndexes(checkOnly: boolean): Promise<{ model: string; toCreate: unknown[]; toDrop: unknown[] }[]> {
  const report = [];
  for (const model of allModels) {
    const diff = await model.diffIndexes();
    if (!checkOnly && diff.toCreate.length > 0) await model.createIndexes();
    report.push({ model: model.modelName, toCreate: diff.toCreate, toDrop: diff.toDrop });
  }
  return report;
}

if (require.main === module) {
  const checkOnly = process.argv.includes('--check');
  connectDatabase(String(process.env.MONGO_URL))
    .then(() => syncIndexes(checkOnly))
    .then(async (report) => {
      for (const r of report) {
        if (r.toCreate.length || r.toDrop.length) {
          console.log(`${r.model}: ${checkOnly ? 'missing' : 'created'} ${JSON.stringify(r.toCreate)}; not in schema ${JSON.stringify(r.toDrop)}`);
        }
      }
      await disconnectDatabase();
    })
    .catch((err) => { console.error(err); process.exit(1); });
}
