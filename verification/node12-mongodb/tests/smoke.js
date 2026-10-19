// Loads and exercises each pinned runtime dependency on the target Node version (12.4.0).
'use strict';
const results = [];
async function check(name, fn) {
  try { await fn(); results.push(['OK  ', name]); }
  catch (e) { results.push(['FAIL', name + ' -> ' + (e && e.message ? e.message.split('\n')[0] : e)]); }
}
(async () => {
  await check('mongodb@3.7', () => { const { MongoClient, Long } = require('mongodb'); if (!Long.fromNumber(1)) throw 0; });
  await check('express@4.22 + helmet@4', () => { const app = require('express')(); app.use(require('helmet')()); });
  await check('@nestjs/core@8', async () => {
    require('reflect-metadata');
    const { Module, Controller, Get } = require('@nestjs/common');
    const { NestFactory } = require('@nestjs/core');
    class C { hi() { return 'ok'; } }
    Controller('x')(C); Get()(C.prototype, 'hi', Object.getOwnPropertyDescriptor(C.prototype, 'hi'));
    class M {} Module({ controllers: [C] })(M);
    const app = await NestFactory.create(M, { logger: false }); await app.init(); await app.close();
  });
  await check('class-validator@0.13', () => { require('class-validator'); require('class-transformer'); });
  await check('bull@3 (load only)', () => { require('bull'); });
  await check('bcryptjs', () => { const b = require('bcryptjs'); if (!b.compareSync('pw', b.hashSync('pw', 4))) throw 0; });
  await check('zod@3.22', () => { const { z } = require('zod'); z.object({ a: z.string() }).parse({ a: 'x' }); });
  await check('joi@17', () => { require('joi').object({ a: require('joi').string() }).validate({ a: 'x' }); });
  await check('@casl/ability@5', () => { const { AbilityBuilder, Ability } = require('@casl/ability'); const { can, build } = new AbilityBuilder(Ability); can('read', 'T'); if (!build().can('read', 'T')) throw 0; });
  await check('pino@6', () => { require('pino')({ enabled: false }).info('x'); });
  await check('nodemailer@6', () => { require('nodemailer').createTransport({ jsonTransport: true }); });
  await check('jsonwebtoken@9', () => { const j = require('jsonwebtoken'); j.verify(j.sign({ a: 1 }, 's'), 's'); });
  await check('ali-oss@6 (load)', () => { require('ali-oss'); });
  await check('aws-sdk@2 S3 (load)', () => { const AWS = require('aws-sdk'); new AWS.S3({ region: 'x' }); });
  await check('meilisearch@0.25 (load)', () => { require('meilisearch'); });
  await check('migrate-mongo@8 (load)', () => { require('migrate-mongo'); });
  await check('otplib@12', () => { const { authenticator } = require('otplib'); authenticator.generate(authenticator.generateSecret()); });
  await check('pdf-lib (watermark)', async () => { const { PDFDocument } = require('pdf-lib'); const d = await PDFDocument.create(); d.addPage().drawText('CONFIDENTIAL'); await d.save(); });
  await check('exceljs@4', () => { new (require('exceljs').Workbook)().addWorksheet('a'); });
  await check('express-rate-limit@5', () => { require('express-rate-limit')({ windowMs: 1000, max: 5 }); });
  await check('prom-client@14', () => { new (require('prom-client').Counter)({ name: 'c_total', help: 'h' }).inc(); });
  await check('multer@1.4.5-lts', () => { require('multer')({ dest: '/tmp' }); });
  await check('axios@0.34', () => { require('axios'); });
  await check('dayjs + uuid@8', () => { require('dayjs')(); require('uuid').v4(); });
  await check('ejs@3.1.10 render', () => { const h = require('ejs').render('<h1><%= t %></h1>', { t: '锂电池<检测>' }); if (h !== '<h1>锂电池&lt;检测&gt;</h1>') throw new Error(h); });
  await check('@pdf-lib/fontkit (load + register)', async () => { const { PDFDocument } = require('pdf-lib'); const d = await PDFDocument.create(); d.registerFontkit(require('@pdf-lib/fontkit')); });
  await check('@casl/ability@5.4.4 ObjectId conditions', () => {
    const { AbilityBuilder, Ability, subject } = require('@casl/ability'); const { ObjectId } = require('mongodb');
    const org = new ObjectId(); const { can, build } = new AbilityBuilder(Ability);
    can('update', 'Technology', { ownerOrganizationId: org }); const a = build();
    const same = a.can('update', subject('Technology', { ownerOrganizationId: new ObjectId(org.toHexString()) }));
    const other = a.can('update', subject('Technology', { ownerOrganizationId: new ObjectId() }));
    if (!same || other) throw new Error('same=' + same + ' other=' + other);
  });
  await check('jest@27 (load)', () => { require('jest'); });
  await check('mocha@9 (load)', () => { require('mocha'); });
  await check('sanitize-html@2', () => { const s = require('sanitize-html')('<b>ok</b><script>x</script>'); if (s !== '<b>ok</b>') throw new Error(s); });
  await check('@elastic/elasticsearch@7.17 (load)', () => { new (require('@elastic/elasticsearch').Client)({ node: 'http://localhost:9200' }); });
  await check('express-session + connect-mongo@3', () => { require('express-session'); require('connect-mongo'); });
  await check('node-cron@3', () => { require('node-cron').validate('*/5 * * * *'); });
  console.log('node', process.version);
  for (const r of results) console.log(r[0], r[1]);
})();
