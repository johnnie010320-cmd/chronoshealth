-- 커뮤니티 3계층: 고정 3그룹(overcome/manage/talk) → 하위 카테고리(관리자 편집) → 커뮤니티.
-- 스토리보드 p2~p6. 카테고리 추가/수정/삭제는 관리자 전용.

CREATE TABLE community_categories (
  id TEXT PRIMARY KEY,
  group_key TEXT NOT NULL CHECK (group_key IN ('overcome','manage','talk')),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_comm_cat_group ON community_categories(group_key, sort_order);

-- 커뮤니티 → 하위 카테고리(선택; 라운지/미분류는 NULL).
ALTER TABLE communities ADD COLUMN category_id TEXT REFERENCES community_categories(id);
CREATE INDEX idx_communities_category ON communities(category_id);

-- 관리자 큐레이션 동영상 링크(YouTube/Vimeo). 그룹 또는 카테고리 단위 노출.
CREATE TABLE community_featured_videos (
  id TEXT PRIMARY KEY,
  group_key TEXT CHECK (group_key IN ('overcome','manage','talk')),
  category_id TEXT REFERENCES community_categories(id),
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by_pseudonym_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_comm_vid_cat ON community_featured_videos(category_id, sort_order);
CREATE INDEX idx_comm_vid_group ON community_featured_videos(group_key, sort_order);

-- 하위 카테고리 시드 (스토리보드 p4~p6, 질병 중복 '불면증' 제거).
INSERT INTO community_categories (id, group_key, name, sort_order) VALUES
  ('cat_hypertension',    'overcome', '고혈압',        1),
  ('cat_diabetes',        'overcome', '당뇨',          2),
  ('cat_dyslipidemia',    'overcome', '고지혈증',      3),
  ('cat_mi',              'overcome', '심근경색',      4),
  ('cat_stroke',          'overcome', '뇌졸중',        5),
  ('cat_copd',            'overcome', '만성폐쇄성폐질환', 6),
  ('cat_ckd',             'overcome', '만성신장질환',  7),
  ('cat_asthma',          'overcome', '천식',          8),
  ('cat_thyroid',         'overcome', '갑상선질환',    9),
  ('cat_insomnia',        'overcome', '불면증',        10),
  ('cat_breast_cancer',   'overcome', '유방암',        11),
  ('cat_prostate_cancer', 'overcome', '전립선암',      12),
  ('cat_thyroid_cancer',  'overcome', '갑상선암',      13),
  ('cat_hairloss',        'overcome', '탈모',          14),
  ('cat_doctors',         'overcome', '명의',          15),
  ('cat_dementia',        'overcome', '치매·인지건강', 16),
  ('cat_exercise',        'manage',   '운동',          1),
  ('cat_diet',            'manage',   '식단',          2),
  ('cat_supplement',      'manage',   '영양제',        3),
  ('cat_sleep',           'manage',   '수면',          4),
  ('cat_stress',          'manage',   '스트레스',      5),
  ('cat_my_story',        'talk',     '내 이야기',     1),
  ('cat_others_story',    'talk',     '남 이야기',     2),
  ('cat_gossip',          'talk',     '사돈의 팔촌 이야기', 3);

-- 기존 시드 커뮤니티 → 하위 카테고리 매핑(backfill).
UPDATE communities SET category_id = 'cat_diabetes'        WHERE id = '_c_diabetes';
UPDATE communities SET category_id = 'cat_hypertension'    WHERE id = '_c_hypertension';
UPDATE communities SET category_id = 'cat_breast_cancer'   WHERE id = '_c_cancer_breast';
UPDATE communities SET category_id = 'cat_prostate_cancer' WHERE id = '_c_cancer_prostate';
UPDATE communities SET category_id = 'cat_stroke'          WHERE id = '_c_stroke';
UPDATE communities SET category_id = 'cat_dementia'        WHERE id = '_c_dementia';
UPDATE communities SET category_id = 'cat_sleep'           WHERE id = '_c_sleep';
UPDATE communities SET category_id = 'cat_diet'            WHERE id = '_c_diet';
UPDATE communities SET category_id = 'cat_exercise'        WHERE id = '_c_running';
UPDATE communities SET category_id = 'cat_exercise'        WHERE id = '_c_fitness';
