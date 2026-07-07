-- analysis DB — 케마바디 레시피 건강 점수.
-- 레시피(=_recipe 커뮤니티 게시물)를 Workers AI 로 분석해 3축(칼로리·영양·초가공)으로 채점.
-- post 1건당 점수 1행(post_id PK). 재평가 시 upsert(덮어쓰기). PII 0 — pseudonym 조차 없음(post_id만).
-- 참고 지표일 뿐 의학적 평가 아님(윤리 규칙). ADR 0008.

CREATE TABLE recipe_scores (
  post_id         TEXT PRIMARY KEY NOT NULL REFERENCES community_posts(id),
  total_score     INTEGER NOT NULL,          -- 0~100 가중 총점
  calorie_score   INTEGER NOT NULL,          -- 0~100 칼로리 적정성
  nutrition_score INTEGER NOT NULL,          -- 0~100 영양 균형
  upf_score       INTEGER NOT NULL,          -- 0~100 초가공식품(NOVA)
  grade           TEXT NOT NULL,             -- excellent | good | fair | caution
  est_kcal        INTEGER NOT NULL,          -- 1인분 추정 kcal
  protein_g       REAL NOT NULL,
  carb_g          REAL NOT NULL,
  fat_g           REAL NOT NULL,
  upf_tier        TEXT NOT NULL,             -- clean | processed | ultra
  servings        INTEGER NOT NULL DEFAULT 1,
  summary         TEXT NOT NULL DEFAULT '',  -- AI 한 줄 평가(웰니스 톤)
  model_version   TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
