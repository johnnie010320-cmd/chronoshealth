-- 커뮤니티 큐레이션 동영상 시드 — 주제별 신뢰 채널(서울대병원 5분 건강정보·KBS 등) 유튜브 링크.
-- 관리자(l2pamerica pseudonym)가 관리자 메뉴에서 추가/삭제 가능. 스토리보드 "동영상 무조건 넣기".
INSERT INTO community_featured_videos
  (id, group_key, category_id, title, video_url, sort_order, created_by_pseudonym_id)
VALUES
  ('vid_seed_hbp',      'overcome', 'cat_hypertension', '고혈압, 미리 관리하면 건강을 지킬 수 있습니다 (5분 건강정보)', 'https://www.youtube.com/watch?v=S6Ua5bUd2WU', 1, '12608e7f-3b17-49ae-818a-c68a9049f458'),
  ('vid_seed_dm',       'overcome', 'cat_diabetes',     '당장 따라할 수 있는 당뇨병 식사 요법 3가지 (5분 건강정보)',   'https://www.youtube.com/watch?v=p_ymG6jHYV8', 2, '12608e7f-3b17-49ae-818a-c68a9049f458'),
  ('vid_seed_insomnia', 'overcome', 'cat_insomnia',     '불면증, 단순 수면 문제가 아닙니다 — 신경과 전문의',           'https://www.youtube.com/watch?v=adM08l-Gfs8', 3, '12608e7f-3b17-49ae-818a-c68a9049f458'),
  ('vid_seed_sleep',    'manage',   'cat_sleep',        '최고의 수면을 위한 스트레칭과 행동수칙 (KBS)',                'https://www.youtube.com/watch?v=nzH7r6voKk0', 1, '12608e7f-3b17-49ae-818a-c68a9049f458'),
  ('vid_seed_exercise', 'manage',   'cat_exercise',     '걷기 운동의 놀라운 효능, 이렇게 걸어라',                       'https://www.youtube.com/watch?v=nO7XFO-8xqI', 2, '12608e7f-3b17-49ae-818a-c68a9049f458');
