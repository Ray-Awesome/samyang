// 디자인 캔버스의 시안(.dc.html)을 웹에서 바로 열리는 메일 HTML로 바꾼다.
//   node scripts/build-mail.mjs   →  public/mail/{호}.html, public/mail/index.html, public/mail/images/
// 캔버스에서 시안을 고치면 design/ 아래 파일을 바꾸고 다시 실행한다.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { POLLS } from '../src/polls.js';

const ISSUES = [
  { id: '2027-01-13', file: 'A-0113.dc.html', design: '시안 A 펜슬 노트', title: '새 명함을 받은 첫 주, 세 사람의 메모장' },
  { id: '2027-01-06', file: 'Main.dc.html', design: '시안 B 현장 다큐', title: '머리카락보다 수천 배 가는 회로, 그 밑그림을 그리는 사람들' },
  { id: '2027-01-20', file: 'C-0120.dc.html', design: '시안 C 타이포 카드', title: '올해 내 휴가와 연말정산, 무엇이 달라지나요?' },
];

// 메일 속 링크 글자 → 실제 주소. 없는 주소(사내 공지 등)는 그대로 둔다.
function linkFor(issue, text) {
  const t = text.trim();
  const poll = POLLS[issue];
  const opt = poll.options?.find((o) => o.label === t || o.label.endsWith(t));
  if (opt) return `/v/${issue}/${opt.code}`;
  if (t === '이번 호 한 줄 의견 남기기') return `/f/${issue}`;
  if (t === '바이오팜 동료 추천하기') return issue === '2027-01-20' ? '/n/2027-01-13' : `/n/${issue}`;
  if (t === '제도를 먼저 써 본 동료를 추천해 주세요') return `/n/${issue}`;
  if (t === '질문 보내기') return `/q/${issue}`;
  if (t === '아래 삼양인 한 표') return '#poll';
  return null;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lookup = (scope, path) => path.split('.').reduce((v, k) => (v == null ? v : v[k]), scope);

function renderVals(src) {
  const script = src.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
  // 캔버스의 기본값(props 없음)으로 renderVals()를 돌린다.
  return new Function('DCLogic', `${script}; return new Component().renderVals();`)(class { constructor() { this.props = {}; } });
}

function expand(tpl, scope) {
  const open = /<sc-for list="\{\{([\w.]+)\}\}" as="(\w+)"[^>]*>/;
  let m;
  while ((m = open.exec(tpl))) {
    let depth = 1;
    let i = m.index + m[0].length;
    const tag = /<sc-for\b|<\/sc-for>/g;
    tag.lastIndex = i;
    let t;
    while (depth && (t = tag.exec(tpl))) depth += t[0] === '</sc-for>' ? -1 : 1;
    const inner = tpl.slice(i, t.index);
    const list = lookup(scope, m[1]) || [];
    const out = list.map((item) => expand(inner, { ...scope, [m[2]]: item })).join('');
    tpl = tpl.slice(0, m.index) + out + tpl.slice(t.index + '</sc-for>'.length);
  }
  return tpl.replace(/\{\{([\w.]+)\}\}/g, (_, p) => esc(lookup(scope, p) ?? ''));
}

function build({ id, file, design }) {
  const src = readFileSync(`design/${file}`, 'utf8');
  const vals = renderVals(src);
  const helmet = src.match(/<helmet>([\s\S]*?)<\/helmet>/)[1];
  let body = src.match(/<\/helmet>([\s\S]*?)<\/x-dc>/)[1];
  body = expand(body, vals)
    .replace(/min-height: \d+px; /, '') // 캔버스 높이 맞춤용 여백은 웹에서 뺀다
    .replace(/<div style="([^"]*)">(\s*<div[^>]*>삼양인 한 표 · 이번 주 질문|\s*<div[^>]*>삼양인 한 표<\/div>)/, '<div id="poll" style="$1">$2')
    .replace(/<a href="#"([^>]*)>([^<]*)<\/a>/g, (all, attrs, text) => {
      const href = linkFor(id, text);
      return href ? `<a href="${href}"${attrs}>${text}</a>` : all;
    });
  const title = src.match(/<title>([^<]*)<\/title>/)[1];
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=680">
<meta name="robots" content="noindex">
<title>우리함께 Weekly · ${esc(title)}</title>
${helmet.trim()}
<style>html{background:#E4E6EA}.sample-bar{width:640px;margin:0 auto;padding:10px 0;font:13px/1.5 'Noto Sans KR',sans-serif;color:#3a4050;display:flex;justify-content:space-between}.sample-bar a{color:#1d2230}.mail{width:640px;margin:0 auto 40px;box-shadow:0 2px 16px rgba(20,26,43,.12)}</style>
</head>
<body>
<div class="sample-bar"><span>제안용 샘플 · ${esc(design)} · 인물과 수치는 예시예요</span><a href="/mail/">세 호 목록</a></div>
<div class="mail">${body.trim()}</div>
</body>
</html>
`;
}

rmSync('public/mail', { recursive: true, force: true });
mkdirSync('public/mail', { recursive: true });
cpSync('design/images', 'public/mail/images', { recursive: true });
for (const issue of ISSUES) writeFileSync(`public/mail/${issue.id}.html`, build(issue));
const kdate = (id) => `${Number(id.slice(5, 7))}월 ${Number(id.slice(8))}일`;
writeFileSync('public/mail/index.html', `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>우리함께 Weekly · 2027년 1월 샘플 세 호</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&amp;display=swap">
<style>
body{margin:0;background:#F4F1EA;color:#1d2230;font:16px/1.6 'Noto Sans KR',sans-serif}
main{max-width:640px;margin:0 auto;padding:40px 16px}
h1{margin:0 0 6px;font-size:28px;font-weight:900;color:#151F6D}
p{margin:0 0 24px;color:#3a4050}
ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
a.card{display:block;padding:18px 20px;background:#fff;color:inherit;text-decoration:none;border-left:6px solid var(--c)}
a.card:hover{box-shadow:0 2px 12px rgba(20,26,43,.12)}
.d{font-size:13px;font-weight:700;color:#5b6270}.t{font-size:18px;font-weight:900;margin-top:2px}
.links{margin-top:28px;font-size:14px}.links a{color:#151F6D}
</style>
</head>
<body>
<main>
<h1>우리함께 Weekly</h1>
<p>디자인 시안 A·B·C를 2027년 1월 샘플 세 호에 하나씩 적용했어요. 메일 속 설문·의견·추천 버튼은 실제로 눌러 볼 수 있어요. 인물과 수치는 제안용 예시예요.</p>
<ol>
${ISSUES.map((x, i) => `<li><a class="card" style="--c:${['#151F6D', '#FC4C02', '#FFC72C'][i]}" href="/mail/${x.id}"><div class="d">${esc(x.design)} · ${kdate(x.id)} 호</div><div class="t">${esc(x.title)}</div></a></li>`).join('\n')}
</ol>
<div class="links">설문 결과 미리 보기: ${ISSUES.map((x) => `<a href="/r/${x.id}">${kdate(x.id)}</a>`).join(' · ')}</div>
</main>
</body>
</html>
`);
console.log(`public/mail에 ${ISSUES.length}개 호와 목록을 만들었습니다.`);
