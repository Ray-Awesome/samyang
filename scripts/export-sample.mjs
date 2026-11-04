// 가상 응답 데이터를 CSV로 내보낸다. node scripts/export-sample.mjs <출력 폴더>
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildSample } from '../src/sample.js';
import { POLLS } from '../src/polls.js';

const out = process.argv[2] || 'sample-data';
mkdirSync(out, { recursive: true });
const { responses, feedback } = buildSample();
const cell = (v) => (v == null ? '' : /[",\r\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const kst = (t) => new Date(Date.parse(t.replace(' ', 'T') + 'Z') + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 16);
for (const issue of Object.keys(POLLS)) {
  const label = Object.fromEntries((POLLS[issue].options || []).map((o) => [o.code, o.label]));
  const rows = responses.filter((r) => r.issue === issue);
  writeFileSync(`${out}/${issue}-responses.csv`, '﻿' + ['응답 시각(KST),보기,주관식 답,덧붙인 한 줄,이름,소속,레터 게재 동의',
    ...rows.map((r) => [kst(r.created_at), label[r.choice] || '', r.answer, r.comment, r.display_name, r.team, r.publish ? '예' : '아니요'].map(cell).join(','))].join('\r\n'));
  const fb = feedback.filter((f) => f.issue === issue);
  writeFileSync(`${out}/${issue}-feedback.csv`, '﻿' + ['보낸 시각(KST),종류,내용,이름,소속,레터 게재 동의',
    ...fb.map((f) => [kst(f.created_at), f.kind === 'nominate' ? '동료 추천' : '피드백', f.body, f.display_name, f.team, f.publish ? '예' : '아니요'].map(cell).join(','))].join('\r\n'));
}
console.log(`${out}에 CSV ${Object.keys(POLLS).length * 2}개를 썼습니다.`);
