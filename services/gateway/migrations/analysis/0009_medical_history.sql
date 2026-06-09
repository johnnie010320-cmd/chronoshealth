-- 2nd Data: 만성질환·중증질환 체크 + 수술 기록.
-- 스토리보드 p13/p17.
-- ADR 0003: PII 0, user_pseudonym_id 만.

CREATE TABLE medical_conditions (
  user_pseudonym_id TEXT NOT NULL,
  code TEXT NOT NULL,
  -- 카테고리: chronic (만성), critical (중증), family (가족력)
  category TEXT NOT NULL CHECK (category IN ('chronic','critical','family')),
  granted INTEGER NOT NULL DEFAULT 1 CHECK (granted IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_pseudonym_id, category, code)
);

CREATE INDEX idx_mc_user ON medical_conditions(user_pseudonym_id);

CREATE TABLE surgery_records (
  id TEXT PRIMARY KEY NOT NULL,
  user_pseudonym_id TEXT NOT NULL,
  surgery_name TEXT NOT NULL,
  surgery_year INTEGER,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX idx_sr_user ON surgery_records(user_pseudonym_id);
