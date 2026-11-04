-- 삼양인 한 표: 한 사람(브라우저)당 호별 1응답. 다시 고르면 덮어쓴다.
CREATE TABLE IF NOT EXISTS responses (
  issue      TEXT NOT NULL,
  voter      TEXT NOT NULL,          -- 쿠키 값의 SHA-256 해시. 원래 값은 저장하지 않는다.
  choice     TEXT,                   -- 객관식 보기 코드
  answer     TEXT,                   -- 주관식 답(최대 300자)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (issue, voter)
);

-- 기프티콘 추첨 응모. 응답과 분리해 저장하고, 발송이 끝나면 호별로 지운다.
CREATE TABLE IF NOT EXISTS entries (
  issue      TEXT NOT NULL,
  voter      TEXT NOT NULL,
  email      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (issue, voter)
);

-- 피드백 말풍선용 한 줄 의견
CREATE TABLE IF NOT EXISTS feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  issue      TEXT NOT NULL,
  voter      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS feedback_issue ON feedback(issue);
