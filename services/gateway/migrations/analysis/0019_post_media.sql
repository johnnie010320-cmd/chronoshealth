-- analysis DB R-Community — 게시글 미디어 확장.
-- spec: 2026-06-20 죠니 요청 (게시글에 SNS 링크 + 이미지 직접 업로드. 동영상은 기존 video_url 링크 유지).
-- image_data = base64 (소형 이미지, 클라 압축 후 ≤ ~512KB). 동영상 직접 업로드는 R2 미도입으로 제외(링크만).

ALTER TABLE community_posts ADD COLUMN sns_url TEXT;
ALTER TABLE community_posts ADD COLUMN image_data TEXT;
ALTER TABLE community_posts ADD COLUMN image_mime TEXT;
