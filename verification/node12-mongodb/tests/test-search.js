'use strict';
// Node 12: MongoDB text index vs Meilisearch (HTTP API via axios) for Chinese search.
const { MongoClient } = require('mongoose').mongo;          // the driver bundled with Mongoose (3.7.4)
const axios = require('axios');
const docs = [
  { _id: 't1', title: '锂电池极片缺陷在线检测技术', summary: '基于机器视觉的锂离子电池电极缺陷实时检测，准确率超过99%' },
  { _id: 't2', title: '固态电池电解质制备工艺', summary: '高离子电导率硫化物固态电解质的低成本制备方法' },
  { _id: 't3', title: 'Industrial optical inspection', summary: 'Inline defect detection for battery electrodes' },
];
(async () => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  const col = client.db('searchtest').collection('pubs');
  await col.deleteMany({}); await col.insertMany(docs);
  await col.createIndex({ title: 'text', summary: 'text' }, { default_language: 'none' });
  for (const q of ['缺陷检测', '电池', '固态电解质', 'defect']) {
    const hits = await col.find({ $text: { $search: q } }).project({ _id: 1 }).toArray();
    console.log('MongoDB $text  q=%s -> %j', q, hits.map((h) => h._id));
  }
  await client.close();
  const ms = axios.create({ baseURL: process.env.MEILI_URL, headers: { Authorization: 'Bearer test-master-key-123456' } });
  const task = await ms.post('/indexes/pubs/documents?primaryKey=_id', docs);
  for (let i = 0; i < 50; i++) {
    const t = await ms.get('/tasks/' + task.data.taskUid);
    if (t.data.status === 'succeeded') break;
    if (t.data.status === 'failed') throw new Error(JSON.stringify(t.data.error));
    await new Promise((r) => setTimeout(r, 200));
  }
  for (const q of ['缺陷检测', '电池', '固态电解质', 'defect', '锂电池缺陷']) {
    const r = await ms.post('/indexes/pubs/search', { q, attributesToRetrieve: ['_id'] });
    console.log('Meilisearch    q=%s -> %j', q, r.data.hits.map((h) => h._id));
  }
})().catch((e) => { console.error('FATAL', e.message); process.exit(2); });
