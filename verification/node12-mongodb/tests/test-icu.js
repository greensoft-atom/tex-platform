'use strict';
// Node 12 ships "small ICU" (English only). Chinese dates and pinyin sorting need full ICU data:
// start Node with NODE_ICU_DATA=<path to node_modules/full-icu>.
const d = new Date(Date.UTC(2026, 9, 19, 8, 30));
const date = d.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
const sorted = ['张', '李', '王', '安'].sort(new Intl.Collator('zh-CN').compare).join('');
const okDate = date === '2026/10/19';
const okSort = sorted === '安李王张';
console.log((okDate ? 'PASS' : 'FAIL') + ' zh-CN date format -> ' + date);
console.log((okSort ? 'PASS' : 'FAIL') + ' pinyin collation  -> ' + sorted);
process.exit(okDate && okSort ? 0 : 1);
