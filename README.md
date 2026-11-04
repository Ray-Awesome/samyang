# samyang · 우리함께 Weekly 2027 샘플

삼양그룹 사내 뉴스레터 2027년 1월 샘플 세 호의 원고와, 원고 속 <삼양인 한 표>·피드백을 받는 서버입니다.

- `content/` 1월 6일·13일·20일 원고(디자인 전 텍스트)
- `src/` Cloudflare Worker. 설문 설정은 `src/polls.js`
- `migrations/` D1 스키마

## 주소 (배포 후)

기본 주소는 `https://samyang-poll.ray-b50.workers.dev` 입니다.

| 용도 | 주소 |
|---|---|
| 객관식 응답(메일 링크) | `/v/2027-01-06/holdings` 처럼 `/v/{호}/{보기 코드}` |
| 주관식 응답 | `/q/2027-01-13` |
| 결과 | `/r/{호}` |
| 한 줄 피드백 | `/f/{호}` |
| 관리(집계·주관식·피드백·CSV·추첨·응모 주소 삭제) | `/admin` (사용자 이름 `admin`, 비밀번호 `ADMIN_TOKEN`) |

메일 보안 프로그램이 링크를 미리 열어도 표가 들어가지 않도록, 링크는 확인 화면만 열고 기록은 확인 버튼으로만 합니다.
응답자는 로그인 없이 브라우저 쿠키로 구분하고, 쿠키 값은 해시로만 저장합니다. 마감 전에는 다시 고르면 마지막 답만 집계합니다.
기프티콘 추첨용 메일 주소는 동의한 경우에만 응답과 다른 표에 저장하고, 발송 후 관리 화면에서 호별로 지웁니다.

## 배포 (Cloudflare 대시보드에서 GitHub 연결)

1. Cloudflare 대시보드(미디어브레인 계정) → Workers & Pages → Create → Import a repository → 이 리포 선택
2. 빌드 설정: Deploy command `npx wrangler deploy` (기본값). 첫 배포 때 D1 `samyang-poll-db`가 자동으로 만들어집니다.
3. 첫 배포 뒤 한 번만: Settings → Variables and Secrets 에서 `ADMIN_TOKEN`(32자 이상) 을 Secret으로 추가하고, Build 설정의 Deploy command를 `npx wrangler d1 migrations apply samyang-poll-db --remote && npx wrangler deploy` 로 바꿔 재배포합니다.
   (또는 로컬에서 `npm run db:remote` 한 번 실행)

## 로컬 개발

```sh
npm install
cp .dev.vars.example .dev.vars   # ADMIN_TOKEN 값을 바꿉니다
npm run db:local
npm run dev
BASE=http://localhost:8787 npm test
```
