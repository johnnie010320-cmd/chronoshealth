-- 오늘의 루틴에서 입력한 음식 항목명 목록을 일기에 보존.
-- JSON 배열: [{ "name": string, "amount": string, "calories": number|null }]
ALTER TABLE routine_entries ADD COLUMN food_items TEXT;
