# ADR 0014 — 세션을 httpOnly 쿠키로 전환 (iOS Safari ITP 대응)

- 상태: **Accepted** (2026-06-17) — same-origin Pages Function 프록시 방식 승인
- 결정자: Johnnie
- 영향 범위: `services/gateway/` (인증·미들웨어·쿠키), `apps/web/` (api-client·session·Pages Function), Cloudflare Pages 라우팅
- 보강 대상: **ADR 0010** (localStorage 세션 토큰)

## 개정 이력

- 2026-06-16 Proposed: same-site **서브도메인**(`api-chronoshealth.ever-day.com`) 방식.
- 2026-06-17 **블로커 발견 후 변경**: `ever-day.com` 네임서버가 **Gabia**라 존이 Cloudflare에 없음 → CF Worker 커스텀 도메인/라우트 생성 불가. **same-origin Pages Function 프록시**로 변경(DNS 변경 불필요).

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

전제: 쿠키가 first-party여야 한다. 게이트웨이가 별도 도메인(`*.workers.dev`)이면 쿠키가 서드파티로 분류되어 Safari가 차단한다. `ever-day.com`이 Gabia DNS라 CF Worker 서브도메인을 붙일 수 없으므로, **웹과 동일 origin(`chronoshealth.ever-day.com`)의 `/api/*` 경로를 CF Pages Function이 게이트웨이 Worker로 프록시**한다. 브라우저는 항상 `chronoshealth.ever-day.com`하고만 통신하므로 쿠키가 first-party가 된다.

### 슬라이스

1. **(웹 인프라)** `apps/web/functions/api/[[path]].js` — Pages Function이 `chronoshealth.ever-day.com/api/*` → `chronoshealth-gateway.*.workers.dev`로 프록시. 요청의 `Cookie`·메서드·바디를 전달하고, 응답의 `Set-Cookie`를 그대로 브라우저에 반환. DNS·존 변경 불필요.
2. **(게이트웨이)** `signup`·`login`·`set-password` 응답에 쿠키 2종 발급:
   - `chronos_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`(30일) — 실제 인증 토큰.
   - `chronos_uid=<pseudonymId>; Secure; SameSite=Lax; Path=/; Max-Age=2592000` — 비-httpOnly 마커(토큰 아님, pseudonym은 비-PII). 클라이언트가 로그인 상태 판별용.
   - `Domain` 미지정(host-only) → 프록시 통과 시 `chronoshealth.ever-day.com` first-party 쿠키가 됨.
   - `authMiddleware`가 **쿠키 우선, 그다음 `Authorization: Bearer`**(과도기 호환) 인식.
   - `POST /api/v1/auth/logout` 신설 — 토큰 revoke + 쿠키 삭제.
3. **(웹)** `api-client` `GATEWAY_URL=''`(상대경로 `/api/*` = same-origin). same-origin이라 쿠키 자동 전송(`credentials` 기본 `same-origin`). `readSession()`은 localStorage가 비면 `chronos_uid` 마커 쿠키로 세션 복원(실제 인증은 httpOnly 쿠키 수행). 로그아웃은 서버 `/logout` 호출 후 localStorage 정리.
4. **(정리, 후속)** 과도기 후 Bearer 헤더 경로 제거.

## 보안 고려

- httpOnly → XSS로 토큰 탈취 불가(현재 localStorage는 XSS에 노출).
- SameSite=Lax → CSRF 표면 축소. 상태 변경 요청은 동일 site 호출이므로 정상 동작.
- Secure → HTTPS 전용. 토큰 평문 저장 정책(ADR 0010)은 유지하되 후속 ADR에서 해싱 보강 검토.

## 거부된 대안

- **localStorage 유지 + 만료 연장**: ITP 7일 캡은 만료값과 무관하게 강제되므로 무효.
- **클라이언트 쿠키(`document.cookie`)**: 스크립트 기록 쿠키도 ITP 7일 캡 대상 → 무효.
- **same-site 서브도메인(`api-chronoshealth.ever-day.com`)**: `ever-day.com`이 Gabia DNS라 CF Worker 커스텀 도메인/라우트 생성 불가 → 실현 불가(2026-06-17 발견).
- **ever-day.com을 Cloudflare로 네임서버 이전**: FormCoach 운영 도메인이라 영향 큼 + 별도 승인 필요. 불채택.

## 영향

### Pros
- 아이폰 세션이 서버 토큰 수명(30일)과 일치.
- XSS 토큰 탈취 표면 제거.

### Cons
- Pages Function 프록시 1홉 추가(지연 ms 단위, 동일 CF 엣지 내).
- 과도기 동안 쿠키·Bearer 두 경로 공존.

## 검증

- 단위: 게이트웨이 `session-cookie.test.ts` — 로그인 시 `Set-Cookie` 2종 발급, 쿠키만으로 보호 라우트 인증, 로그아웃 시 revoke.
- 배포 후 실측: 아이폰 Safari 7일+ 경과 후 재방문 시 세션 유지(죠니 단말 확인). ITP 가설의 최종 확정은 이 단계에서 이뤄짐.

## 참조

- ADR 0010 (단순 가입 / localStorage 세션)
- ADR 0012 (비밀번호 도입)
- ADR 0009 (Hono on CF Workers)
