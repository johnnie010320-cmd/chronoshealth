-- analysis DB R-Community — 댓글 1:1 대화 옵트인.
-- spec: 2026-06-20 죠니 요청 (댓글 작성 시 1:1 톡 수용 여부 선택, 수용자에게만 대화 버튼 노출).
-- accepts_dm = 1 인 댓글 작성자에게만 다른 회원이 1:1 대화를 시도할 수 있음(기존 DM/닉네임 재사용).

ALTER TABLE community_comments
  ADD COLUMN accepts_dm INTEGER NOT NULL DEFAULT 0;
