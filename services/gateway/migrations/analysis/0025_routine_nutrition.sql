-- 식단 점수(칼로리30 + 영양성분30 + 초가공식품40) 산출용 영양 데이터.
-- routine_entries 에 하루 합계 매크로(탄단지) + 초가공식품 등급(NOVA 단순화) 추가.
-- 모두 nullable — 기존 행/AI 미추정 입력은 NULL(해당 점수 항목 미집계).

ALTER TABLE routine_entries ADD COLUMN protein_g REAL;       -- 하루 단백질 합계(g)
ALTER TABLE routine_entries ADD COLUMN carb_g REAL;          -- 하루 탄수화물 합계(g)
ALTER TABLE routine_entries ADD COLUMN fat_g REAL;           -- 하루 지방 합계(g)
ALTER TABLE routine_entries ADD COLUMN upf_tier TEXT;        -- 'clean' | 'processed' | 'ultra' (그날 최악 등급)
