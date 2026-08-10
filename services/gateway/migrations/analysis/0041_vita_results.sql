-- VITA 자가진단 결과 저장(analysis DB, pseudonym 스코프 — ADR 0003).
-- 영역별 점수(JSON) + 16유형 코드 + 총점. 이력 보관(최신 1건을 결과 화면에 사용).
CREATE TABLE IF NOT EXISTS vita_results (
  id TEXT PRIMARY KEY,
  user_pseudonym_id TEXT NOT NULL,
  code TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  section_scores TEXT NOT NULL, -- JSON {energy,glucose,gut,inflammation,detox,circulation,hormone,sleep,musculoskeletal,neuro}
  model_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vita_user_created ON vita_results(user_pseudonym_id, created_at DESC);
