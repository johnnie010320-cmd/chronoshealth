-- 0036 — 리더보드 실측 분포(ECDF) 표본 테이블.
-- spec docs/spec/leaderboard.md §3 — "P2 진입(베타 1,000명+) 시 D1 vitality_snapshots 에서 ECDF 로 대체".
--
-- ADR 0003 준수: user_pseudonym_id 만 보유. 이름·이메일·전화·생년 등 PII 미보유.
-- (age_band 는 5세 구간 문자열, birth_year 원본 아님.)
--
-- 사용자당 1행(최신 점수만 유지). 리포트 재생성 시 upsert.

CREATE TABLE IF NOT EXISTS vitality_snapshots (
  user_pseudonym_id TEXT PRIMARY KEY,
  vitality_score    INTEGER NOT NULL,
  age_band          TEXT NOT NULL,
  sex               TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

-- ECDF 질의: WHERE age_band = ? AND sex = ? 후 vitality_score 비교/집계.
CREATE INDEX IF NOT EXISTS idx_vitality_snapshots_cell
  ON vitality_snapshots (age_band, sex, vitality_score);
