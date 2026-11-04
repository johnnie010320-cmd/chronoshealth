-- 0043 — 공개 도메인 이전(ever-day.com → vitacodeapp.com)에 따른 care 제휴 자리표시자 URL 정정.
--
-- 배경: src/care/affiliates.ts 의 isPlaceholder() 는 cta_url 이 자기 도메인 /care 로
-- 시작하는지로 "아직 미연동(준비중)" 을 판정한다. 도메인 이전으로 상수를
-- 'https://vitacodeapp.com/care' 로 바꾸면, 기존 D1 6행(0037 시드)이 옛 도메인
-- 'https://chronoshealth.ever-day.com/care#...' 그대로라 자리표시자로 인식되지 않아
-- 죽은 도메인 링크가 "실제 제휴"로 열려 버린다. 두 곳을 함께 맞춘다.
--
-- PII 없음 (제휴 카탈로그). ADR 0008 (D1). 스키마 변경 없음(데이터 UPDATE).

UPDATE care_affiliates
SET cta_url = 'https://vitacodeapp.com/care' ||
              substr(cta_url, length('https://chronoshealth.ever-day.com/care') + 1),
    updated_at = '2026-09-19T00:00:00.000Z'
WHERE cta_url LIKE 'https://chronoshealth.ever-day.com/care%';
