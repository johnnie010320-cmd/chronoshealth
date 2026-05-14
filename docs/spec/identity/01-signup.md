# Slice 01 — identity / 회원가입 + 세션 토큰 발급

- **Spec**: `docs/spec/identity.md`
- **Estimate**: 2일
- **Linear**: TBD
- **Dependencies**: ADR 0003, ADR 0008, ADR 0010 (모두 Accepted)
- **Status**: Ready

## 완료 정의 (Definition of Done)

- [ ] D1 신규 인스턴스 `chronoshealth-identity` 생성 (wrangler `d1 create`)
- [ ] 마이그레이션 0001 — `users` / `session_tokens` / `consent_log` 3 테이블 (spec 5.1 SQL 그대로)
- [ ] `services/gateway/wrangler.toml` 에 `IDENTITY_DB` 바인딩 추가
- [ ] `POST /api/v1/auth/signup` Hono 라우트 구현 (Zod 검증 + D1 INSERT + 토큰 발급)
- [ ] `services/gateway/src/middleware/auth.ts` — mock 토큰 검증 폐기 → 실제 `IDENTITY_DB.session_tokens` 조회로 교체
- [ ] `apps/web/src/app/signup/page.tsx` — 가입 폼 (이름 / 이메일 / 전화 / 생년 / 성별 + 2개 동의)
- [ ] `apps/web/src/features/identity/SignupForm.tsx` — 6 필드 + 2 체크박스 + 클라이언트 Zod 검증
- [ ] `apps/web/src/lib/session.ts` — 토큰 localStorage 저장 / 읽기 / 삭제
- [ ] `apps/web/src/app/page.tsx` — CTA "설문 시작하기" 클릭 시 토큰 없으면 `/signup`으로 이동
- [ ] `apps/web/src/app/survey/page.tsx` — 토큰 없으면 `/signup`으로 자동 리디렉트
- [ ] `apps/web/src/lib/api-client.ts` — `submitRiskEstimate` 헤더가 mock 토큰이 아닌 localStorage 세션 토큰 사용
- [ ] 4개 언어 i18n: `signup.*` 키 추가 (ko / en / ja / es)
- [ ] 만 19세 미만 차단 메시지 표시 + 가입 차단
- [ ] 동의 미체크 시 가입 버튼 비활성 + 명시 메시지
- [ ] 동일 email / phone 중복 → 가입 폼에 409 에러 메시지 표시
- [ ] Vitest 단위 테스트 — Positive / Negative / 회귀 (spec 8장 시나리오 전체)
- [ ] CORS 화이트리스트는 기존 `chronoshealth.ever-day.com` 등 동일 (변경 없음)
- [ ] compliance-reviewer 통과 (PII grep / 윤리 / 동의 항목)

## 영향 영역

### 신규
- `services/gateway/migrations/0001_identity_init.sql` — D1 마이그레이션
- `services/gateway/src/routes/auth/signup.ts` — Hono 라우트
- `services/gateway/src/auth/tokens.ts` — 32바이트 random base64url 생성, expiresAt 계산
- `services/gateway/src/auth/signup.ts` — DB 쓰기 로직 (users + session_tokens + consent_log 3 row 원자적)
- `services/gateway/src/schemas/signup.ts` — Zod
- `services/gateway/test/signup.test.ts` — Vitest
- `apps/web/src/app/signup/page.tsx` — 신규 페이지
- `apps/web/src/features/identity/SignupForm.tsx` — 신규 컴포넌트
- `apps/web/src/lib/session.ts` — localStorage 유틸
- `apps/web/src/lib/schemas/signup.ts` — 클라이언트 Zod (서버와 동일)

### 수정
- `services/gateway/wrangler.toml` — `[[d1_databases]]` 블록 추가 (IDENTITY_DB)
- `services/gateway/src/middleware/auth.ts` — mock 검증 → 실제 토큰 조회로 교체
- `services/gateway/src/index.ts` — auth 라우트 등록
- `apps/web/src/lib/api-client.ts` — Bearer 토큰 소스를 hardcode → localStorage
- `apps/web/src/app/survey/page.tsx` — 토큰 없으면 `/signup` 리디렉트 추가
- `apps/web/src/app/page.tsx` — CTA 동일 리디렉트
- `apps/web/src/locales/ko.ts` / `en.ts` / `ja.ts` / `es.ts` — `signup.*` i18n 키 추가
- `docs/spec/risk-survey/01-survey-form.md` — "회원가입 spec 별도 작성 필요" 의존성 해소 표기
- `services/gateway/test/risk-estimate.test.ts` — mock 토큰 사용 부분을 본 슬라이스 토큰 발급 helper로 교체

## 의존성

- ADR 0010 확정값 (이름·전화·이메일·생년·성별·동의)
- ADR 0008 확정값 (Cloudflare D1)
- ADR 0003 — PII 격리 패턴 (별도 D1 binding)
- 기존 Slice 02 mock 토큰 회귀 테스트는 본 슬라이스가 새 토큰 발급 helper로 통합 후 폐기

## 검증 시나리오

### Positive
- 정상 입력(만 19세 이상, 동의 모두 true, 형식 통과) → 201 + `userPseudonymId` + `sessionToken` + `expiresAt`
- 발급된 토큰으로 `/api/v1/risk-estimate` 호출 → 200
- localStorage에 `chronos.session` 키로 토큰 저장 후 새 탭에서 `/survey` 접근 → 가입 페이지로 리디렉트되지 않고 설문 표시

### Negative
- 만 19세 미만 (예: birthYear=올해-17) → 403 `AGE_RESTRICTED`, 폼에 차단 메시지 노출
- `consentMedical: false` → 403 `CONSENT_REQUIRED` + 메시지 "건강 데이터 처리 동의가 필요합니다."
- `consentTerms: false` → 403 동일
- 동일 email 재가입 → 409 `IDENTITY_EXISTS` + 메시지 "이미 가입된 정보입니다."
- 잘못된 email 형식("foo") → 400 클라이언트 측 Zod로 사전 차단
- 잘못된 phone 형식("0101234") → 400 동일
- 이름 41자 → 400
- 일 10회 가입 초과 (동일 IP) → 429
- 만료된 토큰 → 401 `UNAUTHORIZED`
- 토큰 없이 `/api/v1/risk-estimate` 호출 → 401

### 회귀
- 기존 mock 토큰(`"test-token-123"`) → 401 (Slice 02 mock 인증 폐기 확인)
- 분석 DB 라우트(risk-estimate) 코드 grep — `IDENTITY_DB` 0건, `name` / `email` / `phone` / `birthYear` 0건
- 응답 JSON에 PII 0건 (가입 응답은 pseudonym + token + expiresAt만)
- `consent_log` UPDATE / DELETE 시도 → DB ABORT (트리거 동작 확인)
- 기존 risk-estimate Vitest 21건 모두 통과 (mock 토큰 부분만 새 helper로 교체, 의미 동일)
- 4개 언어 가입 폼 라벨 표시 정상 (i18n 누락 없음)
- compliance-reviewer 통과

## 비목표

- 로그인 (디바이스 분실 / 토큰 만료 시 재가입 필요 — ADR 0010 수용)
- 이메일 / 전화 OTP 검증
- 비밀번호 / OAuth
- 회원 정보 수정 / 탈퇴 (P1 후반 별도 슬라이스)
- 운영 콘솔 / 관리자 토큰 재발급 UI (베타 100명 한정 D1 SQL 수동 처리)
- 가입 후 환영 이메일 (P1 후반)

## 사전 조건

- ✅ ADR 0003, 0008, 0010 Accepted
- ✅ identity 도메인 spec Accepted
- ⏳ wrangler CLI에서 새 D1 인스턴스 생성 권한 (l2pamerica 계정, 70461e52... — 기존 chronoshealth 계정 동일)
- ⏳ 죠니 승인: 본 slice 진입 + i18n 가입 폼 라벨 한국어 초안 검토
