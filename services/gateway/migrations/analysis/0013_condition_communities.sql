-- 스토리보드 p32: 질환별 커뮤니티 (당뇨/고혈압/유방암/전립선암 등).
-- 시스템 시드 커뮤니티 — 모두 공개·소유자는 system-seed.

INSERT INTO communities (id, owner_pseudonym_id, name, description, visibility, allow_likes_default, allow_comments_default)
VALUES
  ('_c_diabetes',      'system-seed', '당뇨 커뮤니티',       '당뇨 관리 정보·경험 공유',                          'public', 1, 1),
  ('_c_hypertension',  'system-seed', '고혈압 커뮤니티',     '고혈압 관리·식이·운동 공유',                       'public', 1, 1),
  ('_c_cancer_breast', 'system-seed', '유방암 커뮤니티',     '유방암 진단·치료·회복 동행',                       'public', 1, 1),
  ('_c_cancer_prostate','system-seed','전립선암 커뮤니티',   '전립선암 진단·치료·회복 동행',                     'public', 1, 1),
  ('_c_stroke',        'system-seed', '뇌졸증 커뮤니티',     '뇌졸증·재활·생활 공유',                            'public', 1, 1),
  ('_c_dementia',      'system-seed', '치매·인지건강',       '치매 예방·돌봄·가족 지원',                          'public', 1, 1),
  ('_c_sleep',         'system-seed', '수면 커뮤니티',       '수면의 질·습관 공유',                              'public', 1, 1),
  ('_c_diet',          'system-seed', '식습관 커뮤니티',     '균형 식단·다이어트 경험 공유',                     'public', 1, 1),
  ('_c_running',       'system-seed', '러닝 클럽',           '러닝·조깅 기록·코스 공유',                         'public', 1, 1),
  ('_c_fitness',       'system-seed', '피트니스 클럽',       '근력·홈트·헬스 기록 공유',                         'public', 1, 1);
