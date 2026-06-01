-- analysis DB R7a — Community (text posts + external video URL embeds, comments, likes)
-- spec: docs/spec/community.md (R7a)
-- ADR 0003 (PII 격리), 0008 (D1)
-- R2 영상 직접 업로드 + Workers AI 모더레이션은 R7b (P2)에서 추가.
-- 본 슬라이스는 텍스트 + 외부 video_url(YouTube/Vimeo 등) 기반.

CREATE TABLE community_posts (
  id TEXT PRIMARY KEY NOT NULL,
  user_pseudonym_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  video_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX idx_cp_user ON community_posts(user_pseudonym_id);
CREATE INDEX idx_cp_created ON community_posts(created_at);

CREATE TABLE community_comments (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL,
  user_pseudonym_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (post_id) REFERENCES community_posts(id)
);

CREATE INDEX idx_cc_post ON community_comments(post_id);
CREATE INDEX idx_cc_user ON community_comments(user_pseudonym_id);
CREATE INDEX idx_cc_created ON community_comments(created_at);

CREATE TABLE community_likes (
  user_pseudonym_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_pseudonym_id, post_id),
  FOREIGN KEY (post_id) REFERENCES community_posts(id)
);

CREATE INDEX idx_cl_post ON community_likes(post_id);
CREATE INDEX idx_cl_created ON community_likes(created_at);
