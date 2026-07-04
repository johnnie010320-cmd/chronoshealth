-- 나의 건강 일기(오늘의 루틴) 개인 첨부 — 사진/PDF. 본인만 열람(관리자 미연동).
-- 파일 본체는 R2(ATTACHMENTS), 메타만 D1(analysis, PII 없이 pseudonym).
CREATE TABLE diary_attachments (
  id TEXT PRIMARY KEY,
  user_pseudonym_id TEXT NOT NULL,
  entry_date TEXT NOT NULL,          -- YYYY-MM-DD
  kind TEXT NOT NULL CHECK (kind IN ('image','file')),
  r2_key TEXT NOT NULL,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_diary_att_user_date ON diary_attachments(user_pseudonym_id, entry_date);
