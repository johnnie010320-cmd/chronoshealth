-- analysis DB R7c — Community 그룹화 (Instagram 스타일 follow + 공개/비공개).
-- spec: docs/spec/community.md (R7c, 추후 정리)
-- ADR 0003 (PII 격리), 0008 (D1).
-- 0004 는 텍스트 포스트만 있었으나, 본 슬라이스에서는
--   - communities 테이블 신설 (소유자·이름·공개여부·좋아요/댓글 허용 기본값)
--   - community_followers 신설 (공개=즉시 active, 비공개=pending → owner 승인)
--   - community_posts.community_id NOT NULL 추가, 기본 '_lounge' 로 backfill
--   - community_posts.allow_likes / allow_comments 추가 (post 단위 토글)
-- 모든 식별자는 pseudonym_id 만 보유. 이메일·이름 등 PII 0.

-- 1) communities 테이블
CREATE TABLE communities (
  id TEXT PRIMARY KEY NOT NULL,
  owner_pseudonym_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL CHECK (visibility IN ('public','private')),
  allow_likes_default INTEGER NOT NULL DEFAULT 1 CHECK (allow_likes_default IN (0,1)),
  allow_comments_default INTEGER NOT NULL DEFAULT 1 CHECK (allow_comments_default IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX idx_communities_owner ON communities(owner_pseudonym_id);
CREATE INDEX idx_communities_visibility ON communities(visibility);

-- 2) 기본 '공개 라운지' 시드 — 기존 community_posts 행을 안전하게 backfill 하기 위한 앵커.
INSERT INTO communities (id, owner_pseudonym_id, name, description, visibility)
VALUES ('_lounge', 'system-seed', 'Public Lounge', 'Default community for legacy posts.', 'public');

-- 3) community_followers — 팔로워 / 멤버십.
CREATE TABLE community_followers (
  community_id TEXT NOT NULL,
  follower_pseudonym_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (community_id, follower_pseudonym_id),
  FOREIGN KEY (community_id) REFERENCES communities(id)
);

CREATE INDEX idx_cf_follower ON community_followers(follower_pseudonym_id);
CREATE INDEX idx_cf_status ON community_followers(status);

-- 4) community_posts 에 community_id 컬럼 추가 + post 단위 좋아요/댓글 토글.
ALTER TABLE community_posts ADD COLUMN community_id TEXT NOT NULL DEFAULT '_lounge' REFERENCES communities(id);
ALTER TABLE community_posts ADD COLUMN allow_likes INTEGER NOT NULL DEFAULT 1 CHECK (allow_likes IN (0,1));
ALTER TABLE community_posts ADD COLUMN allow_comments INTEGER NOT NULL DEFAULT 1 CHECK (allow_comments IN (0,1));

CREATE INDEX idx_cp_community ON community_posts(community_id);
