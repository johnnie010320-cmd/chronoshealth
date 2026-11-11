-- 0048 — VITA 유형 판정 v8.1 (2026-11-11 죠니 승인).
-- ① 200문항 답 원본 저장 · ② 강도 가중 축 부하 · ③ 같은 성별·나이대 기준선 · ④ 경계 표시.
-- ADR 0003: 생년·이름 등 PII 없음. sex 는 male/female(그 밖 NULL), age_band 는 10세 구간 문자열.
-- 🚨 analysis D1 은 `migrations apply` 금지(0044~0046 미기록) — `wrangler d1 execute --file` 로만 적용.

ALTER TABLE vita_results ADD COLUMN answers TEXT;      -- JSON {energy:[20개 0~5], ...} (옛 결과 NULL)
ALTER TABLE vita_results ADD COLUMN axis_loads TEXT;   -- JSON {metabolic,circulation,gutliver,hormonal} 가중 축 부하
ALTER TABLE vita_results ADD COLUMN axis_detail TEXT;  -- JSON 축별 {load,cutoff,basis,peers,secondary,borderline}
ALTER TABLE vita_results ADD COLUMN sex TEXT;
ALTER TABLE vita_results ADD COLUMN age_band TEXT;

CREATE INDEX IF NOT EXISTS idx_vita_cohort ON vita_results(sex, age_band);
