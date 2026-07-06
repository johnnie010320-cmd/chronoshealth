-- analysis DB — '케마바디 레시피' 전용 공개 게시판 시드.
-- 커뮤니티 탭 옆의 '케마바디 레시피' 탭이 노출하는 피드의 앵커 커뮤니티.
-- '_lounge' 와 동일한 특수(시스템) 커뮤니티로, 누구나 자유롭게 레시피(=게시물)를 올릴 수 있다.
-- 게시물 인프라(community_posts / 좋아요 / 댓글 / 리워드)를 그대로 재사용하므로 별도 테이블은 없다.
-- 모든 식별자는 pseudonym_id 만 보유 (PII 0). ADR 0003 / 0008.

INSERT OR IGNORE INTO communities (id, owner_pseudonym_id, name, description, visibility)
VALUES ('_recipe', 'system-seed', '케마바디 레시피', '건강에 좋은 음식 레시피를 공유하는 공개 게시판.', 'public');
