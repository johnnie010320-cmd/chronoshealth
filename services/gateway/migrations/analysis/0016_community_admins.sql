-- analysis DB R-Community — owner 위임 커뮤니티 관리자 + 시드 커뮤니티 작성자 재지정.
-- spec: 2026-06-17 죠니 요청 (시드 커뮤니티 활성화, 작성자 l2pamerica, owner 권한).
-- l2pamerica pseudonym: 12608e7f-3b17-49ae-818a-c68a9049f458 (실측 확인).

-- 1) community_admins — owner 가 지정한 커뮤니티 관리자(글·댓글 모더레이션 권한).
CREATE TABLE community_admins (
  community_id TEXT NOT NULL,
  admin_pseudonym_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (community_id, admin_pseudonym_id),
  FOREIGN KEY (community_id) REFERENCES communities(id)
);
CREATE INDEX idx_cadmin_admin ON community_admins(admin_pseudonym_id);

-- 2) 시드 커뮤니티(system-seed) 작성자를 l2pamerica 로 재지정 → 실제 활성화.
UPDATE communities
   SET owner_pseudonym_id = '12608e7f-3b17-49ae-818a-c68a9049f458'
 WHERE owner_pseudonym_id = 'system-seed';

-- 3) 재지정된 커뮤니티에 owner 를 active 팔로워로 등록(중복 무시).
INSERT OR IGNORE INTO community_followers (community_id, follower_pseudonym_id, status)
  SELECT id, '12608e7f-3b17-49ae-818a-c68a9049f458', 'active'
    FROM communities
   WHERE owner_pseudonym_id = '12608e7f-3b17-49ae-818a-c68a9049f458';
