-- MY DIARY — 스토리보드 p32.
-- 커뮤니티 게시글과 별개로, 본인만 보는 개인 일기.
CREATE TABLE my_diary (
  id TEXT PRIMARY KEY NOT NULL,
  user_pseudonym_id TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  mood TEXT CHECK (mood IS NULL OR mood IN ('great','good','soso','tired','bad')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX idx_diary_user ON my_diary(user_pseudonym_id);
CREATE INDEX idx_diary_date ON my_diary(entry_date);
