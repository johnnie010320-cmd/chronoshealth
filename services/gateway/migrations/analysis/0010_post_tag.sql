-- 스토리보드 p32: 피드 필터 (전체/인기/식단/운동).
-- post.tag — 단일 태그 (NULL 가능).
ALTER TABLE community_posts ADD COLUMN tag TEXT
  CHECK (tag IS NULL OR tag IN ('diet','exercise','sleep','medical','general'));

CREATE INDEX idx_cp_tag ON community_posts(tag);
