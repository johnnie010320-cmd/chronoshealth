-- analysis DB R6 — Routine 일일 기록
-- spec: docs/spec/routine.md (R6)
-- ADR 0003 (PII 격리), 0008 (D1)
-- D1 인스턴스: chronoshealth-analysis (binding DB)
-- purpose_code = 'routine_log' 강제.
-- PII 0건. user_pseudonym_id + 비식별 일일 수치만.

CREATE TABLE routine_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pseudonym_id TEXT NOT NULL,
  purpose_code TEXT NOT NULL CHECK (purpose_code = 'routine_log'),
  entry_date TEXT NOT NULL,
  calories_kcal INTEGER,
  exercise_minutes INTEGER,
  sleep_hours REAL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_pseudonym_id, entry_date)
);

CREATE INDEX idx_routine_user ON routine_entries(user_pseudonym_id);
CREATE INDEX idx_routine_date ON routine_entries(entry_date);

-- 단순한 daily upsert. update가 잦으므로 append-only 트리거 없음.
-- 단, 작성한 entry_date를 미래로 변경하는 것은 금지 (date pinning).
CREATE TRIGGER routine_entries_no_date_change
  BEFORE UPDATE OF entry_date ON routine_entries
  BEGIN
    SELECT RAISE(ABORT, 'entry_date is immutable');
  END;
