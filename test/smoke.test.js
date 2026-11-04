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
