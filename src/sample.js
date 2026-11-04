// 제안용 가상 응답 데이터. 원고에 적힌 숫자(612명, 17%·14%·12%·11%, 질문 214개, 리더 질문 387개 중 이름 142개,
// SAMI 질문 31개, 바이오팜 추천 27건 등)가 결과 화면과 관리 화면에 그대로 나오도록 만든다.
// 모든 인물·답은 지어낸 것이다. voter 값이 'sample:'로 시작해 실제 응답과 구분되고, 관리 화면에서 한 번에 지울 수 있다.

export const SAMPLE_PREFIX = 'sample:';

// 같은 결과가 매번 나오도록 고정 씨앗 난수를 쓴다.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FAMILY = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍', '전', '고', '문', '배', '백', '남', '노', '하', '곽', '성'];
const GIVEN = ['서연', '민준', '지우', '도윤', '하린', '예준', '수아', '시우', '지민', '주원', '유나', '건우', '채원', '현우', '다은', '우진', '소율', '준서', '가은', '태윤', '나연', '승민', '예린', '재현', '보람', '동훈', '혜진', '상우', '은비', '진혁', '미소', '경민', '아름', '정훈', '세아', '형준', '효정', '영수', '지혜', '성호'];
const TITLE = ['사원', '사원', '대리', '대리', '선임', '책임', '과장', '차장', '매니저', '기사', '기사', '반장', '연구원', '수석'];
const TEAMS = [
  '삼양홀딩스 재무팀', '삼양홀딩스 인사팀', '삼양홀딩스 커뮤니케이션팀', '삼양사 식품BU', '삼양사 울산공장', '삼양사 화학BU',
  '삼양패키징 광혜원공장', '삼양패키징 시화공장', '삼양바이오팜 품질팀', '삼양바이오팜 생산팀', '삼양케이씨아이 영업팀',
  '삼양이노켐 군산공장', '삼양엔씨켐 품질팀', '삼양엔씨켐 생산팀', '판교 연구소 소재연구팀', '대전 사업장 연구지원팀', '삼양홀딩스 전략팀',
];

// 원고에 이름과 함께 실린 사람. 결과 화면·관리 화면에서 원고와 같은 문장이 보이도록 고정해 둔다.
const FIXED_0106 = [
  { choice: 'biopharm', comment: '주사기에 미리 담긴 약은 공장에서 한 개씩 다 검사하나요?', name: '한서진 기사', team: '삼양사 울산공장' },
  { choice: 'biopharm', comment: '같은 그룹인데 의약 쪽은 무슨 일을 하는지 솔직히 잘 몰라요. 하루 일과부터 알려 주세요.', name: '오세린 매니저', team: '삼양홀딩스 재무팀' },
  { choice: 'biopharm', comment: '바이오팜도 화학 공장처럼 교대 근무가 있나요?', name: '정우람 대리', team: '삼양패키징 광혜원공장' },
  { choice: 'pangyo', comment: '연구소에서 만든 소재가 실제 공장에 가기까지 몇 년이 걸리나요?', name: '김나래 사원', team: '삼양사 식품BU' },
];
const FIXED_FEEDBACK = {
  '2027-01-06': [
    { body: "삼양엔씨켐이 반도체 소재를 하는 줄 처음 알았어요. '칩 그리는 물감 원료' 표현 좋네요.", name: '서지우 사원', team: '삼양케이씨아이' },
    { body: '열네 번 샘플 보낸 이야기, 우리 팀 얘기 같았어요. 저희는 열한 번이었어요.', name: '문경환 차장', team: '삼양이노켐' },
  ],
  '2027-01-13': [
    { body: "'겨울엔 이 소리가 정상이야', 저도 신입 때 들었던 말이에요.", name: '배승훈 반장', team: '삼양사 울산공장' },
    { body: '요일별 메모 표, 저도 첫 주에 저런 메모 했던 게 생각났어요.', name: '류다인 대리', team: '삼양바이오팜' },
  ],
};
const FIXED_0113 = [
  { answer: '새 대표님이 오시면 우리 계열사 일하는 방식에서 가장 먼저 바뀌는 건 뭔가요?', name: '오세린 매니저', team: '삼양홀딩스 재무팀' },
  { answer: '스페셜티로 간다는데, 기존 사업에서 일하는 사람은 무엇을 준비해야 하나요?', name: '강태호 기사', team: '삼양사 울산공장' },
  { answer: '임원분들도 새 자리에 가면 첫 주에 헤매시나요?', name: '이하은 사원', team: '삼양사 식품BU' },
];

// 1월 6일: 612명. 바이오팜 104(17%) · 판교 86(14%) · 울산 73(12%) · 소다 67(11%) · 나머지 일곱 곳 282.
const COUNTS_0106 = { biopharm: 104, pangyo: 86, ulsan: 73, soda: 67, holdings: 52, samyangsa: 48, packaging: 44, kci: 38, innochem: 36, daejeon: 34, hungary: 30 };
const ASK_0106 = {
  biopharm: ['수술 봉합사는 어떻게 만드나요? 실처럼 뽑는 건가요?', '항암제 공장은 들어갈 때 옷을 몇 번 갈아입나요?', '약 하나가 허가받기까지 몇 년 걸리는지 궁금해요.', '바이오팜 신입은 첫 달에 무엇을 배우나요?', '클린룸에서 하루 종일 일하면 어떤 점이 제일 힘든가요?', '해외 고객사 감사는 얼마나 자주 오나요?'],
  pangyo: ['연구원들은 실패한 실험을 어떻게 기록하나요?', '연구소 점심은 정말 맛있나요?', '특허 하나 내는 데 몇 명이 붙나요?', '연구소 사람들은 공장에 얼마나 자주 가나요?'],
  ulsan: ['교대 근무자들은 명절을 어떻게 보내나요?', '공장에서 가장 오래된 설비는 몇 살인가요?', '야간 근무 끝나고 다들 뭐 먹어요?', '울산 공장 안전 교육은 어떻게 하나요?'],
  soda: ['일본 동료들과는 무슨 말로 회의하나요?', '한국 본사에 대해 일본 동료들은 어떻게 생각하나요?', '일본 공장 하루 일과가 우리랑 어떻게 달라요?'],
  holdings: ['지주사는 하루에 무슨 회의를 하나요?', '홀딩스 사람들은 계열사 현장에 얼마나 가 보나요?'],
  samyangsa: ['설탕 공장은 정말 달콤한 냄새가 나나요?', '식품BU 신제품은 누가 먼저 먹어 보나요?'],
  packaging: ['페트병 하나 만드는 데 몇 초 걸리나요?', '재활용 페트는 어디서 모아 오나요?'],
  kci: ['화장품 원료는 직접 발라 보면서 테스트하나요?', '케이씨아이 영업은 어떤 고객을 만나나요?'],
  innochem: ['군산 공장 근처 맛집도 알려 주세요.', '이노켐 제품이 들어간 물건을 집에서 찾을 수 있나요?'],
  daejeon: ['대전 사업장 사람들은 판교 연구소와 어떻게 나눠 일하나요?'],
  hungary: ['헝가리 공장 동료들 점심 메뉴가 궁금해요.', '헝가리로 파견 가려면 어떻게 하나요?'],
};

// 1월 13일 리더 질문: 387개, 이름 공개 142개, "SAMI" 관련 31개.
const LEADER_Q = [
  '올해 회사가 가장 걱정하는 숫자는 무엇인가요?', '리더가 되고 나서 가장 먼저 버린 습관은 뭔가요?', '현장에 마지막으로 가 보신 게 언제인가요?',
  '계열사 사이 인사이동은 앞으로 늘어나나요?', '신입 때 들었던 조언 중 아직도 기억나는 게 있나요?', '스페셜티 전환에서 우리 팀이 맡을 몫은 무엇인가요?',
  '실패한 프로젝트를 어떻게 평가하시나요?', '보고서 장수를 줄일 계획이 있나요?', '해외 사업장은 앞으로 몇 곳이 더 생기나요?',
  '직원들이 회사에 바라는 걸 어떻게 듣고 계신가요?', '탄소 중립 목표가 공장 일에는 어떻게 바뀌나요?', '리더 인터뷰 질문이 실제로 반영되나요?',
  '올해 꼭 만나고 싶은 직원이 있나요?', '교대 근무자 복지는 어떻게 바뀌나요?', '임원 회의에서 가장 많이 나오는 단어는 무엇인가요?',
  '100년 기업에서 다음 10년의 첫 목표는 무엇인가요?', '퇴근 후에는 주로 무엇을 하시나요?', '젊은 직원들이 오래 다니게 하려면 무엇이 바뀌어야 할까요?',
  '계열사끼리 같이 하는 프로젝트가 늘어날까요?', '공장 설비 투자는 올해 어디에 먼저 들어가나요?', '평가 제도에서 올해 달라지는 게 있나요?',
  '리더도 일하다 막히면 누구에게 물어보시나요?', '바이오 사업은 앞으로 그룹에서 얼마나 커지나요?', '본사와 현장의 거리를 좁히려면 무엇부터 해야 할까요?',
  '재택이나 유연근무는 더 넓어지나요?', '지난해 가장 아쉬웠던 결정은 무엇인가요?', '신입사원에게 딱 한 가지만 말한다면요?',
  '해외 사업장 직원과 교류할 기회가 생기나요?', '회의 시간을 줄이자는 말, 임원 회의에도 해당되나요?', '삼양다운 사람은 어떤 사람이라고 생각하세요?',
];
const SAMI_Q = [
  'SAMI를 업무에 어디까지 써도 되나요?', 'SAMI로 보고서 초안을 써도 괜찮은가요?', '회사 자료를 SAMI에 넣어도 보안상 문제없나요?',
  'SAMI 쓰는 법은 누가 가르쳐 주나요?', '임원분들도 SAMI를 직접 쓰시나요?', 'SAMI가 내 일을 대신하게 되나요?',
];

// 1월 20일 점심: 548명. 구내식당 251(46%) · 밖에서 126(23%) · 자리에서 98(18%) · 산책·운동 73(13%).
const COUNTS_0120 = { cafeteria: 251, outside: 126, desk: 98, break: 73 };
const LUNCH = {
  cafeteria: ['울산 공장 식당 수요일 국밥은 줄이 정문까지 서요.', '대전은 금요일마다 면 요리가 나와요. 다들 그날만 기다려요.', '판교 연구소 식당 샐러드바, 연구원들이 제일 먼저 비워요.', '광혜원 공장은 교대 시간 맞춰 식당이 세 번 열려요.', '종로 본사 식당 창가 자리는 11시 50분에 다 차요.'],
  outside: ['종로 골목 칼국수집, 팀 막내가 찾은 곳이에요.', '판교에서는 점심마다 다른 계열사 동료랑 섞여 먹어요.', '울산 공장 앞 백반집 사장님이 우리 팀 메뉴를 외우세요.', '대전 사업장 근처 국숫집, 비 오는 날은 다 거기 있어요.'],
  desk: ['야간 근무 다음 날은 자리에서 김밥 한 줄이면 충분해요.', '광혜원은 바쁜 날 라인 옆 휴게실에서 도시락 먹어요.', '마감 주간엔 자리에서 샌드위치. 대신 금요일엔 꼭 나가요.'],
  break: ['판교 연구소 뒤 탄천을 20분 걸어요. 오후 실험이 덜 졸려요.', '울산 공장 안 운동장을 세 바퀴 돌고 들어와요.', '종로 본사 근처 청계천 한 바퀴가 점심 루틴이에요.', '대전 사업장 탁구대는 12시 30분부터 예약제예요.'],
};

const NOMINATE_0113 = ['품질팀 막내인데 설명을 정말 쉽게 해요', '15년째 같은 라인을 지킨 반장님이에요', '해외 감사 대응을 혼자 맡았던 분이에요', '봉합사 공정을 처음부터 세팅한 분이에요', '신입 교육을 매년 맡는 선배예요', '교대 근무 중에도 사내 동호회를 운영해요'];
const NOMINATE_0120 = ['작년에 육아휴직 1년을 쓰고 복귀했어요', '교대 근무 중에 배우자 출산휴가를 썼어요', '난임치료휴가를 팀에 처음 알린 분이에요', '반차를 쪼개 쓰는 요령을 다 알아요'];
const FEEDBACK_POOL = ['다음 호도 기대돼요.', '사진이 좋았어요. 현장 냄새가 나요.', '우리 사업장도 꼭 와 주세요.', '표가 읽기 편했어요.', '조금 짧았으면 좋겠어요.', '동료 이름이 나오니까 끝까지 읽게 되네요.', '설문 링크가 휴대폰에서 잘 열렸어요.', '모르는 계열사 이야기라 새로웠어요.'];

// 응답 시각: 수요일 오전 발송 직후에 몰리고 금요일 마감 전에 한 번 더 늘어난다.
function stamp(r, issue, extraDays = 0) {
  const sent = Date.parse(`${issue}T00:00:00Z`) - 60 * 60 * 1000; // 수요일 08:00 KST = 전날 23:00Z
  const u = r();
  const hours = u < 0.55 ? r() * 6 : u < 0.8 ? 6 + r() * 30 : 36 + r() * 21;
  return new Date(sent + (hours + extraDays * 24) * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

function person(r) {
  const n = FAMILY[Math.floor(r() * FAMILY.length)] + GIVEN[Math.floor(r() * GIVEN.length)];
  return { name: `${n} ${TITLE[Math.floor(r() * TITLE.length)]}`, team: TEAMS[Math.floor(r() * TEAMS.length)] };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
// 같은 질문도 사람마다 말투가 조금씩 다르다. 앞뒤에 짧은 말을 붙여 똑같은 문장이 줄지어 서지 않게 한다.
const LEAD = ['', '', '', '솔직히 ', '궁금했는데, ', '평소에 ', '혹시 ', '꼭 묻고 싶어요. '];
const TAIL = ['', '', '', ' 진짜 궁금해요.', ' 답 꼭 듣고 싶어요.', ' ㅎㅎ', ' (현장 직원 입장에서)', ' 짧게라도 알려 주세요.'];
const vary = (r, s) => pick(r, LEAD) + s + pick(r, TAIL);
// 점심 장면에 나온 사업장과 이름 공개자의 소속을 맞춘다.
const SITE_TEAMS = {
  울산: ['삼양사 울산공장'], 대전: ['대전 사업장 연구지원팀'], 판교: ['판교 연구소 소재연구팀'],
  종로: ['삼양홀딩스 재무팀', '삼양홀딩스 인사팀', '삼양홀딩스 커뮤니케이션팀', '삼양홀딩스 전략팀', '삼양케이씨아이 영업팀'], 광혜원: ['삼양패키징 광혜원공장'],
};
const personAt = (r, text) => {
  const p = person(r);
  const site = Object.keys(SITE_TEAMS).find((k) => text.includes(k));
  if (site) p.team = pick(r, SITE_TEAMS[site]);
  return p;
};
const shuffled = (r, arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function buildSample() {
  const r = rng(20270106);
  const responses = [];
  const feedback = [];
  const entries = [];
  let seq = 0;
  const voter = () => `${SAMPLE_PREFIX}${String(++seq).padStart(5, '0')}`;
  const row = (issue, o) => {
    const t = stamp(r, issue);
    const v = voter();
    responses.push({ issue, voter: v, choice: o.choice ?? null, answer: o.answer ?? null, comment: o.comment ?? null,
      display_name: o.name ?? null, team: o.team ?? null, publish: o.name ? 1 : 0, created_at: t, updated_at: t });
    if (r() < 0.62) entries.push({ issue, voter: v, email: `sample${String(seq).padStart(5, '0')}@example.com`, created_at: t });
  };

  // 1월 6일 객관식: 612명, 질문을 덧붙인 사람 214명(원고 고정 4명 포함), 그중 이름 공개 61명.
  {
    const issue = '2027-01-06';
    const left = { ...COUNTS_0106 };
    for (const f of FIXED_0106) left[f.choice]--;
    const choices = shuffled(r, Object.entries(left).flatMap(([c, n]) => Array(n).fill(c)));
    const withComment = new Set(shuffled(r, choices.map((_, i) => i)).slice(0, 214 - FIXED_0106.length));
    const named = new Set([...withComment].slice(0, 61 - FIXED_0106.length));
    FIXED_0106.forEach((f) => row(issue, f));
    choices.forEach((c, i) => {
      const o = { choice: c };
      if (withComment.has(i)) o.comment = vary(r, pick(r, ASK_0106[c]));
      if (named.has(i)) Object.assign(o, person(r));
      row(issue, o);
    });
  }

  // 1월 13일 주관식: 387개, 이름 공개 142개(원고 고정 3명 포함), SAMI 질문 31개.
  {
    const issue = '2027-01-13';
    FIXED_0113.forEach((f) => row(issue, f));
    const rest = 387 - FIXED_0113.length;
    const sami = new Set(shuffled(r, [...Array(rest).keys()]).slice(0, 31));
    const named = new Set(shuffled(r, [...Array(rest).keys()]).slice(0, 142 - FIXED_0113.length));
    for (let i = 0; i < rest; i++) {
      const o = { answer: vary(r, sami.has(i) ? pick(r, SAMI_Q) : pick(r, LEADER_Q)) };
      if (named.has(i)) Object.assign(o, person(r));
      row(issue, o);
    }
  }

  // 1월 20일 객관식: 548명, 점심 한 장면 168명, 그중 이름 공개 52명.
  {
    const issue = '2027-01-20';
    const choices = shuffled(r, Object.entries(COUNTS_0120).flatMap(([c, n]) => Array(n).fill(c)));
    const withComment = new Set(shuffled(r, choices.map((_, i) => i)).slice(0, 168));
    const named = new Set([...withComment].slice(0, 52));
    choices.forEach((c, i) => {
      const o = { choice: c };
      if (withComment.has(i)) o.comment = pick(r, LUNCH[c]);
      if (named.has(i)) Object.assign(o, personAt(r, o.comment));
      row(issue, o);
    });
  }

  // 피드백과 동료 추천. 1월 13일 바이오팜 추천은 1월 20일 발송 전까지 27건, 마감(1월 22일)까지 6건이 더 온다.
  const fb = (issue, kind, body, who, extraDays = 0) => {
    const t = stamp(r, issue, extraDays);
    feedback.push({ issue, voter: voter(), body, kind, display_name: who?.name ?? null, team: who?.team ?? null, publish: who ? 1 : 0, created_at: t });
  };
  for (const [issue, n] of [['2027-01-06', 46], ['2027-01-13', 39], ['2027-01-20', 33]]) {
    for (const f of FIXED_FEEDBACK[issue] || []) fb(issue, 'feedback', f.body, f);
    for (let i = (FIXED_FEEDBACK[issue] || []).length; i < n; i++) fb(issue, 'feedback', pick(r, FEEDBACK_POOL), r() < 0.4 ? person(r) : null);
  }
  const bioPeople = () => `${FAMILY[Math.floor(r() * FAMILY.length)]}${pick(r, GIVEN)} ${pick(r, ['책임', '선임', '반장', '사원', '대리'])}(삼양바이오팜)`;
  for (let i = 0; i < 27; i++) fb('2027-01-13', 'nominate', `${bioPeople()} — ${pick(r, NOMINATE_0113)}`, r() < 0.7 ? person(r) : null);
  for (let i = 0; i < 6; i++) fb('2027-01-13', 'nominate', `${bioPeople()} — ${pick(r, NOMINATE_0113)}`, r() < 0.7 ? person(r) : null, 7.2);
  for (let i = 0; i < 14; i++) {
    const p = person(r);
    fb('2027-01-20', 'nominate', `${p.name}(${p.team}) — ${pick(r, NOMINATE_0120)}`, r() < 0.7 ? person(r) : null);
  }
  // 바이오팜 추천 33건 중 앞의 27건이 1월 20일 0시(KST) 이전이 되도록 시각을 맞춘다.
  const bio = feedback.filter((f) => f.issue === '2027-01-13' && f.kind === 'nominate');
  bio.slice(0, 27).forEach((f) => { if (f.created_at >= '2027-01-19 15:00:00') f.created_at = '2027-01-15 08:30:00'; });

  return { responses, feedback, entries };
}

// D1에 넣기. 같은 voter가 이미 있으면 덮어쓴다(여러 번 눌러도 숫자가 늘지 않는다).
export async function loadSample(env) {
  await clearSample(env);
  const { responses, feedback, entries } = buildSample();
  const stmts = [
    ...responses.map((x) => env.DB.prepare(
      `INSERT OR REPLACE INTO responses (issue, voter, choice, answer, comment, display_name, team, publish, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    ).bind(x.issue, x.voter, x.choice, x.answer, x.comment, x.display_name, x.team, x.publish, x.created_at, x.updated_at)),
    ...feedback.map((x) => env.DB.prepare(
      `INSERT INTO feedback (issue, voter, body, kind, display_name, team, publish, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    ).bind(x.issue, x.voter, x.body, x.kind, x.display_name, x.team, x.publish, x.created_at)),
    ...entries.map((x) => env.DB.prepare(
      `INSERT OR REPLACE INTO entries (issue, voter, email, created_at) VALUES (?1, ?2, ?3, ?4)`,
    ).bind(x.issue, x.voter, x.email, x.created_at)),
  ];
  for (let i = 0; i < stmts.length; i += 200) await env.DB.batch(stmts.slice(i, i + 200));
  return { responses: responses.length, feedback: feedback.length, entries: entries.length };
}

export async function clearSample(env) {
  const like = `${SAMPLE_PREFIX}%`;
  const res = await env.DB.batch([
    env.DB.prepare('DELETE FROM responses WHERE voter LIKE ?1').bind(like),
    env.DB.prepare('DELETE FROM feedback WHERE voter LIKE ?1').bind(like),
    env.DB.prepare('DELETE FROM entries WHERE voter LIKE ?1').bind(like),
  ]);
  return res.reduce((n, r) => n + (r.meta?.changes || 0), 0);
}
