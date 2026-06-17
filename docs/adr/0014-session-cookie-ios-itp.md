# ADR 0014 — 세션을 httpOnly 쿠키로 전환 (iOS Safari ITP 대응)

- 상태: **Proposed** (2026-06-16) — 게이트웨이 도메인 이전 승인 대기
- 결정자: Johnnie (승인 대기)
- 영향 범위: `services/gateway/` (인증·미들웨어), `apps/web/` (api-client·session), Cloudflare 라우팅
- 보강 대상: **ADR 0010** (localStorage 세션 토큰)

## 배경 — 측정된 현상

관리자 보고: **PC 브라우저에서는 로그인이 유지되는데 아이폰(Safari)에서는 며칠 만에 로그아웃되어 매번 이메일·비밀번호 재입력이 필요하다.**

### 현재 구조 (코드 실측)

- 세션 토큰은 브라우저 **localStorage**(`chronos.session`)에 저장 — `apps/web/src/lib/session.ts`.
- 서버(D1) 토큰 수명은 **30일** — `services/gateway/src/auth/tokens.ts` `SESSION_TTL_MS`.
- 게이트웨이는 별도 오리진(`chronoshealth-gateway.l2pamerica.workers.dev`), 웹은 `chronoshealth.ever-day.com` → **크로스 오리진**. 토큰은 `Authorization: Bearer`로 전송 — `apps/web/src/lib/api-client.ts`.

### 원인 (가설 — 단말 실측으로 확정 필요)

iOS Safari의 ITP(Intelligent Tracking Prevention)는 **스크립트로 기록한 저장소(localStorage 포함)를 7일간 미접속 시 전량 삭제**한다. PC 브라우저에는 이 제한이 없다.

→ D1 토큰은 30일 유효하지만, 아이폰은 7일째 localStorage가 비워져 토큰을 읽지 못해 "로그아웃"으로 보인다. "PC 유지 / 아이폰만 며칠 만에 풀림" 증상과 정확히 일치한다.

> 이 ADR은 가설 위에서 **방향**을 결정한다. 코드/인프라 착수 전 실제 아이폰 Safari에서 7일+ 경과 재현으로 가설을 확정한다.

## 결정

**세션 토큰을 localStorage에서 httpOnly · Secure · SameSite=Lax 쿠키로 전환한다.** httpOnly 쿠키는 서버가 `Set-Cookie`로 발급하므로 ITP의 7일 스크립트-저장소 캡 대상이 아니다.

전제: 쿠키가 first-party로 인정되어야 한다. 현재처럼 게이트웨이가 별도 등록가능도메인(`*.workers.dev`)이면 쿠키가 서드파티로 분류되어 ITP가 아예 차단한다. 따라서 **게이트웨이를 웹과 동일 site(eTLD+1)로 노출하는 것이 선결 조건**이다.

### 슬라이스

1. **(인프라, 승인 필요)** 게이트웨이를 웹과 동일 site로 라우팅 — 예: `api-chronoshealth.ever-day.com` (웹 `chronoshealth.ever-day.com`과 eTLD+1 `ever-day.com` 동일). Cloudflare 커스텀 도메인/라우트 설정.
2. **(게이트웨이)** `login` · `set-password` 응답에 `Set-Cookie: <token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`(30일) 발급. `authMiddleware`가 `Authorization` 헤더와 쿠키를 모두 인식(과도기 호환).
3. **(웹)** `api-client`의 모든 fetch를 `credentials: 'include'`로 전환. `readSession()` 기반 Bearer 의존 제거. localStorage에는 비민감 식별자(`userPseudonymId`·`expiresAt`)만 잔류하거나 완전 제거.
4. **(정리)** 과도기 후 Bearer 헤더 경로 제거.

## 보안 고려

- httpOnly → XSS로 토큰 탈취 불가(현재 localStorage는 XSS에 노출).
- SameSite=Lax → CSRF 표면 축소. 상태 변경 요청은 동일 site 호출이므로 정상 동작.
- Secure → HTTPS 전용. 토큰 평문 저장 정책(ADR 0010)은 유지하되 후속 ADR에서 해싱 보강 검토.

## 거부된 대안

- **localStorage 유지 + 만료 연장**: ITP 7일 캡은 만료값과 무관하게 강제되므로 무효.
- **클라이언트 쿠키(`document.cookie`)**: 스크립트 기록 쿠키도 ITP 7일 캡 대상 → 무효.
- **게이트웨이를 서브패스 프록시(`/api`)로 노출**: 동일 origin이라 가장 강력하나 CF Pages ↔ Workers 라우팅 재구성 범위가 큼. 동일 site 서브도메인(슬라이스 1)으로 충분.

## 영향

### Pros
- 아이폰 세션이 서버 토큰 수명(30일)과 일치.
- XSS 토큰 탈취 표면 제거.

### Cons
- 게이트웨이 도메인 이전 필요(인프라 변경·승인 대상).
- CORS·쿠키 도메인 설정 재검증 필요.

## 선결 조건 (착수 전)

1. 아이폰 Safari 7일+ 재현으로 ITP 가설 확정.
2. 게이트웨이 same-site 도메인 이전에 대한 Johnnie 승인.

## 참조

- ADR 0010 (단순 가입 / localStorage 세션)
- ADR 0012 (비밀번호 도입)
- ADR 0009 (Hono on CF Workers)
