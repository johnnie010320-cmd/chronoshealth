-- analysis DB — 건강 설문 세분화 필드.
-- 흡연(주당 갑)·음주(주종+주량)·운동(종류/강도/시간 목록)·기타 가족력(복수)을 원자료로 보존.
-- 기존 coarse 컬럼(smoking / alcohol_drinks_per_week / exercise_minutes_per_week / family_history_*)은
-- 위험 계산 입력으로 그대로 유지되고, 세부 컬럼은 추가 정보(파생 전 원자료)로만 저장. ADR 0008.
-- 배열/목록은 JSON 텍스트로 저장(운동 목록, 기타 가족력).

ALTER TABLE risk_survey_responses ADD COLUMN smoking_packs_per_week REAL;
ALTER TABLE risk_survey_responses ADD COLUMN alcohol_entries_json TEXT;      -- [{type, amountPerWeek}]
ALTER TABLE risk_survey_responses ADD COLUMN exercises_json TEXT;            -- [{kind, intensity, minutesPerWeek}]
ALTER TABLE risk_survey_responses ADD COLUMN family_history_other_json TEXT; -- string[]
