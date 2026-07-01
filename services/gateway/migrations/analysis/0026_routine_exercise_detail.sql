-- 운동 점수 세분화(강도&시간 40 / 운동 밸런스 30 / 리커버리 30)용 입력. 2026-06-29 죠니 요청.
-- exercise_type: 유산소/근력/혼합 → '운동 밸런스' 점수 산출.
-- did_stretch: 운동 후 스트레칭·쿨다운 수행 여부 → '리커버리' 점수(수면과 함께) 산출.
-- 모두 nullable — 기존 행/미입력은 NULL(해당 세부 점수 기본 처리).
ALTER TABLE routine_entries ADD COLUMN exercise_type TEXT;   -- 'cardio' | 'strength' | 'both'
ALTER TABLE routine_entries ADD COLUMN did_stretch INTEGER;  -- 0/1 (스트레칭·쿨다운 수행 여부)
