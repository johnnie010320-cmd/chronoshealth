-- analysis DB R-Community — 게시글 본문 서식(폰트 크기·색상·굵게 등).
-- spec: 2026-06-20 죠니 요청 (제목/부제목은 크게, 본문은 작게, 색상도 다르게 — 부분 선택 서식).
-- body_rich = 세그먼트 JSON 배열. 예: [{"t":"제목","s":"xl","c":"#1a73e8"},{"t":"\n본문","s":"sm"}]
-- 평문 body 컬럼은 피드 미리보기·검색·모더레이션용으로 그대로 유지. body_rich 없으면 평문 렌더(역호환).

ALTER TABLE community_posts ADD COLUMN body_rich TEXT;

-- 첨부 이미지 노출 위치: 'top'(본문 처음) | 'middle'(본문 가운데) | 'bottom'(본문 마지막). 기본 top.
ALTER TABLE community_posts ADD COLUMN image_position TEXT NOT NULL DEFAULT 'top';

-- 유튜브/SNS 링크를 여러 개 첨부(JSON 문자열 배열). 기존 단일 video_url/sns_url 은 역호환 폴백용으로 유지.
ALTER TABLE community_posts ADD COLUMN video_urls TEXT;
ALTER TABLE community_posts ADD COLUMN sns_urls TEXT;
