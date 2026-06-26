-- analysis DB — AI 처방(식단·운동·휴식) 날짜별 저장. 2026-06-25 죠니 요청('나의 건강 일기').
-- 처방 생성 시 그 날짜로 upsert(하루 1건). 일기에서 루틴·컨디션과 함께 조회.
-- payload: 처방 JSON 문자열({summary,diet,exercise,rest,formcoachSports}).
CREATE TABLE ai_prescriptions (
  user_pseudonym_id TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  payload TEXT NOT NULL,
  model_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_pseudonym_id, entry_date)
);
CREATE INDEX idx_rx_user_date ON ai_prescriptions(user_pseudonym_id, entry_date);
