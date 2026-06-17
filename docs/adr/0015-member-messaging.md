# ADR 0015 — 회원간 메시징(DM·대화방) + Twin 닉네임 공개 핸들

- 상태: **Accepted** (2026-06-17)
- 결정자: Johnnie
- 영향 범위: `services/gateway/` (messaging 라우트·스토리지·닉네임 해석), `apps/web/` (메시지 UI·api-client), analysis D1 (마이그레이션 0014)
- 관련: ADR 0003 (PII 격리), 0008 (D1), 0009 (Hono on Workers), 0014 (세션 쿠키)

## 배경

관리자 요청: **회원간 1:1 메시지(DM)와 대화방(다인원) 생성** 기능. 기존에 사용자 측 진입 UI가 없었다.

현 인프라 실측:
- 게이트웨이에 **WebSocket/Durable Object 없음** — 상시 양방향 소켓 불가.
- 웹은 **정적 export**(`output: 'export'`) — 서버 푸시 불가.
- 닉네임(`nickname`)은 **IDENTITY_DB.users 에만** 존재(identity 마이그레이션 0006). 자기 자신(me) 조회로만 사용 중.

## 결정

### 1) 전송 방식 — D1 저장 + 클라이언트 폴링 (P0/P1)

추가 인프라 없이 가능한 유일안. 메시지는 analysis D1(`messages`)에 저장하고, 스레드가 열려 있는 동안 웹이 **4초 간격 폴링**으로 최신 메시지를 가져온다. 전송 지연(수 초)은 수용 가능, 데이터 손실은 없음.

> 실시간(WebSocket)은 **Durable Objects** 도입이 필요하며 별도 ADR로 다룬다(동시 사용자 증가 시점). 본 ADR 범위 아님.

### 2) 데이터 모델 (analysis D1, pseudonym 키만)

- `conversations(id, kind 'dm'|'room', title, owner_pseudonym_id, created_at)`
- `conversation_members(conversation_id, member_pseudonym_id, role, joined_at, last_read_at)`
- `messages(id, conversation_id, sender_pseudonym_id, body, created_at)`
- DM 은 `kind='dm'` + 두 pseudonym 을 정렬·조합한 **결정적 id**(`dm_<a>_<b>`)로 중복 생성 방지.
- 미읽음은 `last_read_at` 기준 카운트.

PII 0 — 모든 행은 pseudonym 만 보유(절대규칙 1 준수).

### 3) Twin 닉네임을 **비-PII 공개 핸들**로 규정 ★

발신자/상대 표시를 위해 게이트웨이는 IDENTITY_DB 에서 **닉네임 컬럼만** 조회해 응답에 포함한다.

- twin 닉네임은 사용자가 스스로 정한 공개 표시명이며 실명·연락처와 분리된다(스토리보드 p11/p12: UNIQUE·변경불가).
- 게이트웨이는 `nickname` **단일 컬럼만** SELECT 하며, 이름·이메일·전화 등 PII 는 메시징 경로에서 절대 반환하지 않는다.
- 실명은 종전대로 마이페이지(본인)에서만 노출(reveal/mask 유지).

이 규정으로 메시징의 발신자 표시 문제와, 보류됐던 **커뮤니티 작성자명 닉네임 연동**의 PII 경계 문제를 동시에 해소한다.

## 컴플라이언스

- 메시지 본문은 기존 `community/moderation` 키워드 필터를 통과해야 한다(의료 금지 표현 + 욕설 차단).
- 모든 메시지 화면에 면책 안내 노출: "메시지는 의학적 진단이 아닙니다."
- 미성년자(만 19세 미만)는 가입 단계에서 이미 차단(ADR 0010 / apps/web 규칙 3).
- 대화 나가기(`/leave`) 제공. 신고/차단 정교화는 후속 슬라이스.

## 결과

- 마이그레이션 `0014_messaging.sql`, 게이트웨이 `/api/v1/messages/*`, 웹 `/messages`·`/messages/room/new`·`/messages/view` 구현.
- 진입점: `/menu` 메시지 그룹 + 헤더 드롭다운(UserMenu) 상시 링크.
- 게이트웨이 테스트 9건 추가(총 205 통과).
