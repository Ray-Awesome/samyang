// 로컬 서버(npm run dev)에 대고 돌리는 확인 테스트: BASE=http://localhost:8787 npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.BASE;
const skip = !BASE && '로컬 서버 주소(BASE)가 없어 건너뜁니다';

async function get(path, cookie) {
  return fetch(BASE + path, { headers: cookie ? { Cookie: cookie } : {}, redirect: 'manual' });
}
function cookieOf(res) {
  return (res.headers.get('set-cookie') || '').split(';')[0];
}
function vidOf(html) {
  return html.match(/name="vid" value="([^"]+)"/)[1];
}

test('링크를 여는 것만으로는 표가 들어가지 않는다', { skip }, async () => {
  const before = await (await get('/r/2027-01-20')).text();
  await get('/v/2027-01-20/desk');
  const after = await (await get('/r/2027-01-20')).text();
  assert.equal(before.match(/응답 (\d+)명/)[1], after.match(/응답 (\d+)명/)[1]);
});

test('확인 버튼으로 기록하고, 다시 고르면 덮어쓴다', { skip }, async () => {
  const res = await get('/v/2027-01-20/desk');
  const cookie = cookieOf(res);
  const vid = vidOf(await res.text());
  const n0 = Number((await (await get('/r/2027-01-20')).text()).match(/응답 (\d+)명/)[1]);
  for (const code of ['desk', 'break']) {
    const r = await fetch(BASE + '/v/2027-01-20', {
      method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ vid, code }),
    });
    assert.equal(r.status, 200);
    assert.match(await r.text(), /응답이 기록됐습니다/);
  }
  const n1 = Number((await (await get('/r/2027-01-20')).text()).match(/응답 (\d+)명/)[1]);
  assert.equal(n1, n0 + 1);
});

test('쿠키와 폼 값이 다르면 거절한다', { skip }, async () => {
  const r = await fetch(BASE + '/v/2027-01-20', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ vid: '00000000-0000-0000-0000-000000000000', code: 'desk' }),
  });
  assert.equal(r.status, 400);
});

test('주관식은 HTML을 그대로 저장하되 화면에서는 이스케이프한다', { skip }, async () => {
  const res = await get('/q/2027-01-13');
  const cookie = cookieOf(res);
  const vid = vidOf(await res.text());
  const r = await fetch(BASE + '/q/2027-01-13', {
    method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ vid, answer: '<script>alert(1)</script> 질문', email: 'a@samyang.com', agree: 'on' }),
  });
  const html = await r.text();
  assert.match(html, /추첨에 응모됐습니다/);
});

test('관리자 페이지는 인증 없이 열리지 않는다', { skip }, async () => {
  assert.equal((await get('/admin')).status, 401);
  assert.equal((await get('/admin/2027-01-13.csv')).status, 401);
});

test('없는 호와 보기는 404', { skip }, async () => {
  assert.equal((await get('/v/2099-01-01/x')).status, 404);
  assert.equal((await get('/v/2027-01-20/nope')).status, 404);
});

async function adminGet(path) {
  const token = process.env.ADMIN_TOKEN;
  return fetch(BASE + path, { headers: { Authorization: 'Basic ' + btoa('admin:' + token) } });
}
const skipAdmin = skip || (!process.env.ADMIN_TOKEN && '관리자 토큰(ADMIN_TOKEN)이 없어 건너뜁니다');

test('이름 공개에 동의한 답은 이름·한 줄과 함께 관리 화면에 모인다', { skip: skipAdmin }, async () => {
  const res = await get('/v/2027-01-20/cafeteria');
  const html = await res.text();
  assert.match(html, /우리 사업장 점심의 한 장면/);
  const r = await fetch(BASE + '/v/2027-01-20', {
    method: 'POST', headers: { Cookie: cookieOf(res), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ vid: vidOf(html), code: 'cafeteria', comment: '목요일은 짜장면 날', name: '한서진', team: '삼양사 울산공장', publish: 'on' }),
  });
  assert.match(await r.text(), /한서진 · 삼양사 울산공장 님의 답이 다음 레터에 실릴 수 있어요/);
  const admin = await (await adminGet('/admin/2027-01-20')).text();
  assert.match(admin, /목요일은 짜장면 날/);
  assert.match(admin, /한서진/);
  const csv = await (await adminGet('/admin/2027-01-20.csv')).text();
  assert.match(csv, /목요일은 짜장면 날/);
});

test('동의하지 않으면 이름을 적어도 공개 목록에 오르지 않는다', { skip }, async () => {
  const res = await get('/v/2027-01-06/biopharm');
  const html = await res.text();
  const r = await fetch(BASE + '/v/2027-01-06', {
    method: 'POST', headers: { Cookie: cookieOf(res), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ vid: vidOf(html), code: 'biopharm', name: '익명희망' }),
  });
  assert.doesNotMatch(await r.text(), /익명희망/);
});

test('동료 추천은 이름과 이유가 모두 있어야 받는다', { skip }, async () => {
  const res = await get('/n/2027-01-13');
  const html = await res.text();
  assert.match(html, /삼양바이오팜 편/);
  const post = (body) => fetch(BASE + '/n/2027-01-13', {
    method: 'POST', headers: { Cookie: cookieOf(res), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ vid: vidOf(html), ...body }),
  });
  assert.match(await (await post({ nominee: '바이오팜 김○○' })).text(), /함께 적어 주세요/);
  assert.match(await (await post({ nominee: '바이오팜 김○○', reason: '검사실 이야기가 궁금해요' })).text(), /추천을 잘 받았어요/);
});

async function adminPost(path) {
  return fetch(BASE + path, { method: 'POST', headers: { Authorization: 'Basic ' + btoa('admin:' + process.env.ADMIN_TOKEN), Origin: BASE } });
}

test('가상 응답을 넣으면 원고 숫자가 결과에 나오고, 지우면 실제 응답만 남는다', { skip: skipAdmin }, async () => {
  assert.match(await (await adminPost('/admin/sample/load')).text(), /가상 응답 1547명/);
  await adminPost('/admin/sample/load'); // 두 번 눌러도 늘지 않는다
  const r = await (await get('/r/2027-01-06')).text();
  assert.match(r, /가상 응답 612명 포함/);
  const admin = await (await adminGet('/admin/2027-01-13')).text();
  assert.match(admin, /SAMI를 업무에 어디까지 써도 되나요/);
  assert.match(admin, /임원분들도 새 자리에 가면 첫 주에 헤매시나요/);
  assert.match(await (await adminPost('/admin/sample/clear')).text(), /지웠습니다/);
  assert.doesNotMatch(await (await get('/r/2027-01-06')).text(), /가상 응답/);
});
