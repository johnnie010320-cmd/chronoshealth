-- analysis DB — 루틴 운동 강도(약/중/강) 기록. 2026-06-25 죠니 요청.
-- low=걷기 수준, medium=보통, high=호흡이 가쁜 운동(구기·마라톤 등).
-- 생활 점수에서 운동 점수를 강도로 가중.
ALTER TABLE routine_entries ADD COLUMN exercise_intensity TEXT;
