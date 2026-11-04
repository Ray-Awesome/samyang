// 우리함께 Weekly 2027 샘플 · <삼양인 한 표>·피드백 서버 (Cloudflare Workers + D1)
//
// 공개 주소
//   GET  /                      안내
//   GET  /v/:issue/:code        객관식 확인 화면(메일 링크). 메일 보안 프로그램이 링크를 미리 열어도
//                               표가 들어가지 않도록, 기록은 확인 버튼(POST)으로만 한다.
//   POST /v/:issue              객관식 기록
//   GET  /q/:issue              주관식 입력 화면
//   POST /q/:issue              주관식 기록
//   GET  /r/:issue              결과(객관식 집계, 주관식은 응답 수만)
//   GET  /f/:issue              한 줄 피드백 입력 화면
//   POST /f/:issue              피드백 기록
//   GET  /n/:issue              동료 추천(릴레이) 입력 화면
//   POST /n/:issue              동료 추천 기록
// 응답·피드백·추천에는 이름·소속과 "레터에 실려도 좋다" 동의를 선택으로 받는다.
// 관리자(Basic 인증, 사용자 이름 admin · 비밀번호 ADMIN_TOKEN)
//   GET  /admin                 호별 응답 수
//   GET  /admin/:issue          집계·주관식 답·피드백 전체
//   GET  /admin/:issue.csv      응답 CSV
//   POST /admin/:issue/draw     추첨(n명). 응모 메일 주소 반환
//   POST /admin/:issue/purge    해당 호 응모 메일 주소 삭제(기프티콘 발송 후)

import { POLLS, GIFT_RULE } from './polls.js';

const COOKIE = 'sy_vid';
const MAX_ANSWER = 300;
const MAX_FEEDBACK = 200;

// 첫 요청 때 표가 없으면 만든다(migrations/0001_init.sql과 같은 내용). 배포 명령을 따로 바꾸지 않아도 된다.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS responses (issue TEXT NOT NULL, voter TEXT NOT NULL, choice TEXT, answer TEXT,
     created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
     PRIMARY KEY (issue, voter))`,
  `CREATE TABLE IF NOT EXISTS entries (issue TEXT NOT NULL, voter TEXT NOT NULL, email TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (issue, voter))`,
  `CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, issue TEXT NOT NULL, voter TEXT NOT NULL,
     body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE INDEX IF NOT EXISTS feedback_issue ON feedback(issue)`,
];
// 이미 만들어진 표에 나중에 더한 칸(migrations/0002). 이미 있으면 넘어간다.
const ALTERS = [
  'ALTER TABLE responses ADD COLUMN comment TEXT',
  'ALTER TABLE responses ADD COLUMN display_name TEXT',
  'ALTER TABLE responses ADD COLUMN team TEXT',
  'ALTER TABLE responses ADD COLUMN publish INTEGER NOT NULL DEFAULT 0',
  "ALTER TABLE feedback ADD COLUMN kind TEXT NOT NULL DEFAULT 'feedback'",
  'ALTER TABLE feedback ADD COLUMN display_name TEXT',
  'ALTER TABLE feedback ADD COLUMN team TEXT',
  'ALTER TABLE feedback ADD COLUMN publish INTEGER NOT NULL DEFAULT 0',
];
let schemaReady = null;
async function migrate(env) {
  await env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s)));
  for (const sql of ALTERS) {
    try {
      await env.DB.prepare(sql).run();
    } catch (e) {
      if (!/duplicate column/i.test(String(e && e.message))) throw e;
    }
  }
}
function ensureSchema(env) {
  schemaReady ??= migrate(env).catch((e) => {
    schemaReady = null;
    throw e;
  });
  return schemaReady;
}

export default {
  async fetch(request, env) {
    try {
      await ensureSchema(env);
      return await route(request, env);
    } catch (err) {
      console.error(err);
      return page('잠시 문제가 생겼습니다', '<p>잠시 뒤 다시 시도해 주세요.</p>', 500);
    }
  },
};

async function route(request, env) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const method = request.method;

  if (parts.length === 0) return home();
  if (parts[0] === 'admin') return admin(request, env, parts.slice(1), method);

  const [kind, issue, code] = parts;
  const poll = POLLS[issue];
  if (!poll || !['v', 'q', 'r', 'f', 'n'].includes(kind)) return notFound();

  if (kind === 'r' && method === 'GET') return results(env, issue, poll);

  const vid = await voterId(request);
  const voter = await sha256(vid.value);

  if (kind === 'f' || kind === 'n') {
    const form = kind === 'f' ? feedbackForm : nominateForm;
    if (method === 'GET' && !code) return withCookie(form(issue, poll, vid.value), vid);
    if (method === 'POST' && !code) return withCookie(await saveFeedback(request, env, issue, voter, vid.value, kind), vid);
  }

  if (kind === 'v' && poll.type === 'choice') {
    if (method === 'GET' && code) return withCookie(confirmChoice(issue, poll, code, vid.value), vid);
    if (method === 'POST' && !code) return withCookie(await saveResponse(request, env, issue, poll, voter, vid.value), vid);
  }

  if (kind === 'q' && poll.type === 'text') {
    if (method === 'GET' && !code) return withCookie(textForm(issue, poll, vid.value), vid);
    if (method === 'POST' && !code) return withCookie(await saveResponse(request, env, issue, poll, voter, vid.value), vid);
  }

  return notFound();
}

// ── 응답자 식별: 브라우저 쿠키. 로그인 없이 한 브라우저에서 한 번만 집계한다. ──

async function voterId(request) {
  const m = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)sy_vid=([A-Za-z0-9-]{36})/);
  if (m) return { value: m[1], fresh: false };
  return { value: crypto.randomUUID(), fresh: true };
}

function withCookie(response, vid) {
  if (vid.fresh) {
    response.headers.append(
      'Set-Cookie',
      `${COOKIE}=${vid.value}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
    );
  }
  return response;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 폼의 숨은 값과 쿠키가 같아야 기록한다(다른 사이트에서 대신 제출하는 것을 막는다).
function sameVoter(form, vidValue) {
  return form.get('vid') === vidValue;
}

// 이름·소속·지면 공개 동의(모두 선택). 이름이나 소속이 하나라도 있어야 공개로 본다.
function readIdentity(form) {
  const name = String(form.get('name') || '').trim().slice(0, 30);
  const team = String(form.get('team') || '').trim().slice(0, 40);
  const publish = form.get('publish') === 'on' && Boolean(name || team) ? 1 : 0;
  return { name: name || null, team: team || null, publish };
}

function isClosed(poll, now = new Date()) {
  return now >= new Date(poll.closesAt);
}

// ── 기록 ──

async function saveResponse(request, env, issue, poll, voter, vidValue) {
  const form = await request.formData();
  if (!sameVoter(form, vidValue)) return page('다시 시도해 주세요', `<p>메일의 링크를 다시 눌러 주세요.</p>`, 400);
  if (isClosed(poll)) return closedPage(issue, poll);

  let choice = null;
  let answer = null;
  if (poll.type === 'choice') {
    choice = String(form.get('code') || '');
    if (!poll.options.some((o) => o.code === choice)) return page('보기를 찾을 수 없습니다', '<p>메일의 링크를 다시 눌러 주세요.</p>', 400);
  } else {
    answer = String(form.get('answer') || '').trim().slice(0, MAX_ANSWER);
    if (!answer) return textForm(issue, poll, vidValue, '한 줄이라도 적어 주세요.');
  }

  const comment = poll.commentPrompt ? String(form.get('comment') || '').trim().slice(0, 150) || null : null;
  const who = readIdentity(form);
  await env.DB.prepare(
    `INSERT INTO responses (issue, voter, choice, answer, comment, display_name, team, publish)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
     ON CONFLICT(issue, voter) DO UPDATE SET choice = ?3, answer = ?4, comment = ?5, display_name = ?6, team = ?7,
       publish = ?8, updated_at = datetime('now')`,
  ).bind(issue, voter, choice, answer, comment, who.name, who.team, who.publish).run();

  const email = String(form.get('email') || '').trim().toLowerCase();
  const agreed = form.get('agree') === 'on';
  let entryNote = '';
  if (email) {
    if (!agreed) {
      entryNote = '<p class="note">개인정보 수집에 동의하지 않아 추첨에는 응모되지 않았습니다. 응답은 기록됐습니다.</p>';
    } else if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email)) {
      entryNote = '<p class="note">메일 주소 형식이 맞지 않아 추첨에는 응모되지 않았습니다. 응답은 기록됐습니다.</p>';
    } else {
      await env.DB.prepare(
        `INSERT INTO entries (issue, voter, email) VALUES (?1, ?2, ?3)
         ON CONFLICT(issue, voter) DO UPDATE SET email = ?3`,
      ).bind(issue, voter, email).run();
      entryNote = '<p class="note">기프티콘 추첨에 응모됐습니다.</p>';
    }
  }

  const picked = poll.type === 'choice' ? poll.options.find((o) => o.code === choice).label : null;
  return page(
    '응답이 기록됐습니다',
    `<p class="lead">${picked ? `<strong>${esc(picked)}</strong>을(를) 고르셨습니다.` : '보내 주신 답을 잘 받았습니다.'}</p>
     ${entryNote}
     ${who.publish ? `<p class="note">${esc([who.name, who.team].filter(Boolean).join(' · '))} 님의 답이 다음 레터에 실릴 수 있어요.</p>` : ''}
     <p>결과는 ${esc(poll.resultIssueLabel)} 레터에 실립니다. 마감 전에는 다시 골라도 마지막 응답만 집계됩니다.</p>
     <p><a class="btn ghost" href="/r/${esc(issue)}">지금까지 결과 보기</a></p>`,
  );
}

async function saveFeedback(request, env, issue, voter, vidValue, kind) {
  const form = await request.formData();
  if (!sameVoter(form, vidValue)) return page('다시 시도해 주세요', '<p>메일의 링크를 다시 눌러 주세요.</p>', 400);
  const poll = POLLS[issue];
  let body;
  if (kind === 'n') {
    const nominee = String(form.get('nominee') || '').trim().slice(0, 60);
    const reason = String(form.get('reason') || '').trim().slice(0, MAX_FEEDBACK);
    if (!nominee || !reason) return nominateForm(issue, poll, vidValue, '추천할 동료와 이유를 함께 적어 주세요.');
    body = `${nominee} — ${reason}`;
  } else {
    body = String(form.get('body') || '').trim().slice(0, MAX_FEEDBACK);
    if (!body) return feedbackForm(issue, poll, vidValue, '한 줄이라도 적어 주세요.');
  }
  const recent = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM feedback WHERE issue = ?1 AND voter = ?2 AND kind = ?3`,
  ).bind(issue, voter, kind === 'n' ? 'nominate' : 'feedback').first();
  if (recent.n >= 3) return page('고맙습니다', '<p>이번 호에는 이미 세 번 보내 주셨어요.</p>');
  const who = readIdentity(form);
  await env.DB.prepare(
    `INSERT INTO feedback (issue, voter, body, kind, display_name, team, publish) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  ).bind(issue, voter, body, kind === 'n' ? 'nominate' : 'feedback', who.name, who.team, who.publish).run();
  const shown = who.publish ? `${esc([who.name, who.team].filter(Boolean).join(' · '))} 님의 이름과 함께` : '이름 없이';
  return kind === 'n'
    ? page('추천을 잘 받았어요', `<p>편집팀이 추천받은 동료에게 먼저 연락드려요. 레터에 실리면 추천한 분도 ${shown} 소개돼요.</p>`)
    : page('의견을 잘 받았어요', `<p>다음 호 맨 아래 피드백 말풍선에 ${shown} 실릴 수 있어요.</p>`);
}

// ── 화면 ──

function confirmChoice(issue, poll, code, vidValue) {
  const opt = poll.options.find((o) => o.code === code);
  if (!opt) return notFound();
  if (isClosed(poll)) return closedPage(issue, poll);
  return page(
    poll.title,
    `<p class="q">${esc(poll.question)}</p>
     <form method="post" action="/v/${esc(issue)}">
       <input type="hidden" name="vid" value="${esc(vidValue)}">
       <fieldset>
         ${poll.options.map((o) => `<label class="opt"><input type="radio" name="code" value="${esc(o.code)}"${o.code === code ? ' checked' : ''}> ${esc(o.label)}</label>`).join('')}
       </fieldset>
       ${poll.commentPrompt ? `<label class="q2">${esc(poll.commentPrompt)}<textarea name="comment" maxlength="150" rows="2"></textarea></label>` : ''}
       ${identityFields()}
       ${entryFields()}
       <button class="btn" type="submit">이 답으로 보내기</button>
     </form>`,
  );
}

function textForm(issue, poll, vidValue, error = '') {
  if (isClosed(poll)) return closedPage(issue, poll);
  return page(
    poll.title,
    `<p class="q">${esc(poll.question)}</p>
     ${poll.hint ? `<p class="hint">${esc(poll.hint)}</p>` : ''}
     ${error ? `<p class="err">${esc(error)}</p>` : ''}
     <form method="post" action="/q/${esc(issue)}">
       <input type="hidden" name="vid" value="${esc(vidValue)}">
       <textarea name="answer" maxlength="${MAX_ANSWER}" rows="4" required placeholder="${esc(poll.placeholder || '')}"></textarea>
       ${identityFields(poll.anonymousNote || '')}
       ${entryFields()}
       <button class="btn" type="submit">보내기</button>
     </form>`,
  );
}

function feedbackForm(issue, poll, vidValue, error = '') {
  return page(
    '이번 호, 어떠셨어요?',
    `<p class="q">${esc(poll.issueLabel)} 레터에 대한 한 줄 의견을 남겨 주세요.</p>
     ${error ? `<p class="err">${esc(error)}</p>` : ''}
     <form method="post" action="/f/${esc(issue)}">
       <input type="hidden" name="vid" value="${esc(vidValue)}">
       <textarea name="body" maxlength="${MAX_FEEDBACK}" rows="3" required></textarea>
       ${identityFields()}
       <button class="btn" type="submit">보내기</button>
     </form>`,
  );
}

function nominateForm(issue, poll, vidValue, error = '') {
  return page(
    '이 동료를 추천합니다',
    `<p class="q">${esc(poll.nominatePrompt || '레터에서 이야기를 듣고 싶은 동료가 있나요? 옆 팀, 다른 계열사, 다른 사업장 누구든 좋아요.')}</p>
     ${error ? `<p class="err">${esc(error)}</p>` : ''}
     <form method="post" action="/n/${esc(issue)}">
       <input type="hidden" name="vid" value="${esc(vidValue)}">
       <label>추천할 동료(이름·소속) <input type="text" name="nominee" maxlength="60" required placeholder="예) 삼양패키징 광혜원공장 ○○○ 대리"></label>
       <label>추천하는 이유 한 줄 <textarea name="reason" maxlength="${MAX_FEEDBACK}" rows="3" required></textarea></label>
       ${identityFields('추천한 분 이름은 동의하신 경우에만 함께 실려요.')}
       <button class="btn" type="submit">추천하기</button>
     </form>`,
  );
}

function identityFields(anonymousNote = '') {
  return `<fieldset class="who">
    <legend>레터에 이름과 함께 실릴 수 있어요(선택)</legend>
    ${anonymousNote ? `<p class="hint">${esc(anonymousNote)}</p>` : ''}
    <label>이름 <input type="text" name="name" maxlength="30" autocomplete="name"></label>
    <label>소속(계열사·팀·사업장) <input type="text" name="team" maxlength="40" placeholder="예) 삼양사 울산공장 생산팀"></label>
    <label class="agree"><input type="checkbox" name="publish"> 제 답이 이름·소속과 함께 레터에 실려도 좋아요.</label>
  </fieldset>`;
}

function entryFields() {
  return `<details class="entry">
    <summary>기프티콘 추첨에 응모하기(선택)</summary>
    <label>회사 메일 주소 <input type="email" name="email" autocomplete="email" maxlength="254"></label>
    <label class="agree"><input type="checkbox" name="agree"> 추첨과 기프티콘 발송을 위해 메일 주소를 수집하는 데 동의합니다.
      메일 주소는 응답과 따로 보관하고, 발송이 끝나면 지웁니다.</label>
    <p class="hint">${esc(GIFT_RULE)}</p>
  </details>`;
}

async function results(env, issue, poll) {
  const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM responses WHERE issue = ?1`).bind(issue).first();
  let body = `<p class="q">${esc(poll.question)}</p><p class="hint">${isClosed(poll) ? '마감됨' : '집계 중'} · 응답 ${total.n}명</p>`;
  if (poll.type === 'choice') {
    const { results: rows } = await env.DB.prepare(
      `SELECT choice, COUNT(*) AS n FROM responses WHERE issue = ?1 GROUP BY choice`,
    ).bind(issue).all();
    const counts = Object.fromEntries(rows.map((r) => [r.choice, r.n]));
    body += '<ul class="bars">' + poll.options.map((o) => {
      const n = counts[o.code] || 0;
      const pct = total.n ? Math.round((n / total.n) * 100) : 0;
      return `<li><span>${esc(o.label)}</span><span class="bar"><i style="width:${pct}%"></i></span><b>${pct}%</b></li>`;
    }).join('') + '</ul>';
  } else {
    body += '<p>보내 주신 답은 편집팀이 읽고, 다음 호에 "이런 답이 왔습니다"로 골라 소개합니다.</p>';
  }
  return page(poll.title + ' · 결과', body);
}

function closedPage(issue, poll) {
  return page('응답이 마감됐습니다', `<p>${esc(poll.title)}은(는) 마감됐습니다. 결과는 ${esc(poll.resultIssueLabel)} 레터에서 확인해 주세요.</p>
    <p><a class="btn ghost" href="/r/${esc(issue)}">결과 보기</a></p>`);
}

function home() {
  const list = Object.entries(POLLS).map(([id, p]) => `<li>${esc(p.issueLabel)} · <a href="/r/${esc(id)}">${esc(p.title)}</a></li>`).join('');
  return page('우리함께 Weekly · 삼양인 한 표', `<p>2027년 1월 샘플 호의 설문 서버입니다.</p><ul>${list}</ul>`);
}

function notFound() {
  return page('페이지를 찾을 수 없습니다', '<p>메일의 링크를 다시 확인해 주세요.</p>', 404);
}

// ── 관리자 ──

async function admin(request, env, parts, method) {
  if (!(await authorized(request, env))) {
    return new Response('인증이 필요합니다', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="samyang-admin", charset="UTF-8"', 'Cache-Control': 'no-store' },
    });
  }
  // 브라우저가 Basic 인증을 자동으로 붙이므로, 다른 사이트에서 보낸 POST는 막는다.
  if (method === 'POST' && request.headers.get('Origin') !== new URL(request.url).origin) {
    return page('요청을 처리할 수 없습니다', '<p>관리 화면에서 다시 시도해 주세요.</p>', 403, true);
  }
  if (parts.length === 0 && method === 'GET') {
    const { results: rows } = await env.DB.prepare(
      `SELECT issue, COUNT(*) AS n FROM responses GROUP BY issue`,
    ).all();
    const counts = Object.fromEntries(rows.map((r) => [r.issue, r.n]));
    return page('관리 · 호별 응답', '<ul>' + Object.entries(POLLS).map(([id, p]) =>
      `<li><a href="/admin/${esc(id)}">${esc(p.issueLabel)} · ${esc(p.title)}</a> — ${counts[id] || 0}명</li>`).join('') + '</ul>', 200, true);
  }

  let [issue, action] = parts;
  const csv = issue && issue.endsWith('.csv');
  if (csv) issue = issue.slice(0, -4);
  const poll = POLLS[issue];
  if (!poll) return notFound();

  if (csv && method === 'GET') {
    const { results: rows } = await env.DB.prepare(
      `SELECT created_at, updated_at, choice, answer, comment, display_name, team, publish FROM responses WHERE issue = ?1 ORDER BY created_at`,
    ).bind(issue).all();
    const lines = ['created_at,updated_at,choice,answer,comment,name,team,publish', ...rows.map((r) =>
      [r.created_at, r.updated_at, r.choice ?? '', r.answer ?? '', r.comment ?? '', r.display_name ?? '', r.team ?? '', r.publish].map(csvCell).join(','))];
    return new Response('﻿' + lines.join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="samyang-poll-${issue}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  if (action === 'draw' && method === 'POST') {
    const form = await request.formData();
    const n = Math.min(Math.max(parseInt(form.get('n'), 10) || 5, 1), 50);
    const { results: all } = await env.DB.prepare(`SELECT email FROM entries WHERE issue = ?1`).bind(issue).all();
    const winners = shuffle(all.map((r) => r.email)).slice(0, n);
    return page(`추첨 결과 · ${poll.issueLabel}`, `<p>응모 ${all.length}명 가운데 ${winners.length}명</p><ol>${winners.map((w) => `<li>${esc(w)}</li>`).join('')}</ol>
      <p class="hint">이 화면은 저장되지 않습니다. 발송이 끝나면 응모 주소를 지워 주세요.</p>`, 200, true);
  }

  if (action === 'purge' && method === 'POST') {
    const r = await env.DB.prepare(`DELETE FROM entries WHERE issue = ?1`).bind(issue).run();
    return page('응모 주소 삭제', `<p>${esc(poll.issueLabel)} 응모 주소 ${r.meta.changes}건을 지웠습니다.</p><p><a href="/admin/${esc(issue)}">돌아가기</a></p>`, 200, true);
  }

  if (!action && method === 'GET') {
    const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM responses WHERE issue = ?1`).bind(issue).first();
    const entries = await env.DB.prepare(`SELECT COUNT(*) AS n FROM entries WHERE issue = ?1`).bind(issue).first();
    let body = `<p class="q">${esc(poll.question)}</p><p>응답 ${total.n}명 · 추첨 응모 ${entries.n}명 · <a href="/admin/${esc(issue)}.csv">CSV</a></p>`;
    if (poll.type === 'choice') {
      const { results: rows } = await env.DB.prepare(
        `SELECT choice, COUNT(*) AS n FROM responses WHERE issue = ?1 GROUP BY choice ORDER BY n DESC`,
      ).bind(issue).all();
      const label = Object.fromEntries(poll.options.map((o) => [o.code, o.label]));
      body += '<table><tr><th>보기</th><th>응답</th></tr>' + rows.map((r) => `<tr><td>${esc(label[r.choice] || r.choice)}</td><td>${r.n}</td></tr>`).join('') + '</table>';
    } else {
      const { results: rows } = await env.DB.prepare(
        `SELECT answer, created_at FROM responses WHERE issue = ?1 ORDER BY created_at DESC`,
      ).bind(issue).all();
      body += '<h2>주관식 답</h2><ol>' + rows.map((r) => `<li>${esc(r.answer)} <small>${esc(r.created_at)}</small></li>`).join('') + '</ol>';
    }
    const { results: pub } = await env.DB.prepare(
      `SELECT choice, answer, comment, display_name, team FROM responses
       WHERE issue = ?1 AND publish = 1 ORDER BY updated_at DESC`,
    ).bind(issue).all();
    const lab = Object.fromEntries((poll.options || []).map((o) => [o.code, o.label]));
    body += `<h2>레터에 실어도 좋다는 답 (${pub.length})</h2><ol>` + pub.map((r) =>
      `<li><b>${esc([r.display_name, r.team].filter(Boolean).join(' · '))}</b> — ${esc(r.answer || lab[r.choice] || '')}${r.comment ? ` · "${esc(r.comment)}"` : ''}</li>`).join('') + '</ol>';
    const { results: fb } = await env.DB.prepare(
      `SELECT kind, body, display_name, team, publish, created_at FROM feedback WHERE issue = ?1 ORDER BY id DESC`,
    ).bind(issue).all();
    const line = (r) => `<li>${esc(r.body)} <small>${r.publish ? esc([r.display_name, r.team].filter(Boolean).join(' · ')) + ' · 실명 동의' : '익명'} · ${esc(r.created_at)}</small></li>`;
    body += '<h2>동료 추천</h2><ol>' + fb.filter((r) => r.kind === 'nominate').map(line).join('') + '</ol>';
    body += '<h2>피드백</h2><ol>' + fb.filter((r) => r.kind !== 'nominate').map(line).join('') + '</ol>';
    body += `<form method="post" action="/admin/${esc(issue)}/draw"><label>추첨 인원 <input type="number" name="n" value="5" min="1" max="50"></label> <button class="btn" type="submit">추첨</button></form>
      <form method="post" action="/admin/${esc(issue)}/purge" onsubmit="return confirm('이 호의 응모 메일 주소를 모두 지웁니다.')"><button class="btn ghost" type="submit">응모 주소 지우기(발송 후)</button></form>`;
    return page(`관리 · ${poll.issueLabel}`, body, 200, true);
  }

  return notFound();
}

async function authorized(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token || token.length < 32) return false;
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  let decoded = '';
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0)));
  } catch {
    return false;
  }
  const expected = `admin:${token}`;
  const [a, b] = await Promise.all([sha256(decoded), sha256(expected)]);
  return timingSafeEqual(a, b);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const r = new Uint32Array(1);
    crypto.getRandomValues(r);
    const j = r[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function csvCell(v) {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // 스프레드시트 수식 실행 방지
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ── 공통 HTML ──

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function page(title, body, status = 200, noindex = false) {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>
:root{--ink:#1a1d21;--sub:#5b6470;--line:#dde1e6;--bg:#f6f7f9;--card:#fff;--accent:#0b4ea2}
@media (prefers-color-scheme:dark){:root{--ink:#e9edf2;--sub:#a6afba;--line:#333a42;--bg:#14171b;--card:#1c2026;--accent:#6aa5ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}
main{max-width:560px;margin:0 auto;padding:32px 16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:24px}
.brand{font-size:13px;color:var(--sub);margin:0 0 8px}h1{font-size:22px;margin:0 0 16px}h2{font-size:17px;margin:24px 0 8px}
.q{font-weight:600}.hint,.note,small{color:var(--sub);font-size:14px}.err{color:#c62828}
fieldset{border:0;padding:0;margin:16px 0}.opt{display:block;padding:12px;border:1px solid var(--line);border-radius:8px;margin:8px 0;cursor:pointer}
textarea,input[type=email],input[type=number]{width:100%;font:inherit;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink)}
input[type=number]{width:90px}.entry{margin:16px 0;font-size:15px}.entry label,.who label,.q2{display:block;margin:8px 0}
.who{border:1px solid var(--line);border-radius:8px;padding:12px;margin:16px 0}.who legend{font-weight:600;padding:0 4px}
input[type=text]{width:100%;font:inherit;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink)}
.btn{display:inline-block;background:var(--accent);color:#fff;border:0;border-radius:8px;padding:12px 18px;font:inherit;font-weight:600;text-decoration:none;cursor:pointer;margin-top:8px}
.btn.ghost{background:transparent;color:var(--accent);border:1px solid var(--accent)}
.bars{list-style:none;padding:0}.bars li{display:grid;grid-template-columns:1fr 2fr 48px;gap:8px;align-items:center;margin:8px 0}
.bar{background:var(--line);border-radius:4px;height:10px;overflow:hidden}.bar i{display:block;height:100%;background:var(--accent)}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid var(--line);padding:6px;text-align:left}
</style></head><body><main><div class="card"><p class="brand">삼양 우리함께 Weekly</p><h1>${esc(title)}</h1>${body}</div></main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

export { csvCell, esc, isClosed, timingSafeEqual };
