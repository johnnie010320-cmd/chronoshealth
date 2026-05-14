# Spec — identity (회원관리 / pseudonym 발급 / 세션 토큰)

- **Status**: **Accepted** (2026-05-14)
- **Created**: 2026-05-14
- **Accepted by**: Johnnie
- **Author**: Johnnie (검토) / 지니 (초안)
- **Related ADR**: ADR 0003 (identity-vault PII 격리), ADR 0008 (D1 채택), ADR 0010 (단순 가입 방식)
- **Phase**: P1 예측 MVP의 선행 슬라이스 (risk-survey Slice 05 이전 필수)
- **Estimate**: 1개 슬라이스 / 2일 (Day 5 분해 결과)
- **Slices**: `docs/spec/identity/01-signup.md`

> ⚠️ **본인 인증 보강 시 갱신**: 본 명세는 ADR 0010 단순 가입 정책 기반. P1 후반 OTP / OAuth / 본인 인증 도입 시 본 명세에 직접 갱신 + 후속 ADR로 supersede.

---

## 1. 목표 (Goal)

P0/P1 단계에서 사용자가 이름·전화번호·이메일·생년·성별을 입력하면 즉시:

1. PII가 `services/identity/` (identity-vault) D1 인스턴스에만 저장된다.
2. 분석 DB / 게이트웨이 다른 라우트는 `user_pseudonym_id`만 보유한다.
3. 클라이언트는 30일 유효 세션 토큰을 받는다.
4. risk-survey 등 인증 필요 API에 그 토큰으로 접근 가능하다.

이 spec은 **회원관리 + pseudonym 발급 + 세션 토큰 인터페이스 정의** 단일 책임. 로그인 / 토큰 갱신 / 비밀번호 / OAuth는 **비목표** (ADR 0010 명시).

---

## 2. 비목표 (Non-goal)

본 슬라이스에서 의도적으로 **제외**:

- 비밀번호 / 패스코드
- 이메일 OTP / 전화 OTP
- OAuth (Google / Kakao / Apple)
- 본인 인증 (PASS, KMC 등)
- 비밀번호 찾기 / 계정 복구
- 멀티 디바이스 로그인 / 토큰 갱신 (refresh token)
- 회원 정보 수정 (이름·전화·이메일 변경)
- 회원 탈퇴 (P1 후반 별도 슬라이스)
- 관리자 권한 / 역할
- 다국어 가입 폼 (한국어 우선, 영어 P1 후반)

---

## 3. 격리 구조 (ADR 0003 정합)

### 3.1 D1 인스턴스 분리

| 인스턴스 | 바인딩 | 책임 | PII |
|---------|--------|------|-----|
| `chronoshealth-identity` | `IDENTITY_DB` | PII + pseudonym 매핑 + 세션 토큰 | ✓ |
| `chronoshealth-analysis` | `DB` | risk_survey_responses, reports, consent_log | ❌ pseudonym만 |

`services/gateway/` 내 라우트가 두 DB를 모두 받지만, 각 라우트는 1개 DB만 접근:

- `/api/v1/auth/*` → `IDENTITY_DB`
- `/api/v1/risk-estimate` 외 분석 라우트 → `DB`

크로스 조인 금지. 세션 토큰 검증 시 `IDENTITY_DB`에서 pseudonym만 추출 후 `c.set('userPseudonymId', ...)`로 전달.

### 3.2 코드 격리

- `services/gateway/src/routes/auth/*.ts` — identity 도메인 라우트 (다른 도메인이 import 금지)
- `services/gateway/src/middleware/auth.ts` — 세션 토큰 검증 (IDENTITY_DB 읽기, pseudonym만 노출)
- 분석 라우트는 `c.get('userPseudonymId')`만 사용 → PII 컬럼 grep 시 다른 라우트에서 0 매치

### 3.3 PII 처리 금지 영역

- 분석 DB 테이블의 어떤 컬럼도 `name` / `email` / `phone` 포함 금지
- 로그(Worker `console.log` / `c.executionCtx.waitUntil`)에 PII 출력 금지
- 응답 JSON에 PII 직접 노출 금지 (가입 응답은 pseudonym + 토큰만)
- compliance-reviewer 서브에이전트가 grep으로 차단

---

## 4. API 인터페이스

### 4.1 POST /api/v1/auth/signup

요청:

```http
POST /api/v1/auth/signup
Content-Type: application/json
```

```ts
const SignupRequest = z.object({
  name: z.string().trim().min(1).max(40),
  email: z.string().email().max(254),
  phone: z.string().regex(/^(\+\d{1,3}\d{6,14}|0\d{1,2}-\d{3,4}-\d{4})$/),
  birthYear: z.number().int().min(1900).refine(
    (y) => new Date().getFullYear() - y >= 19,
    { message: 'AGE_RESTRICTED' },
  ),
  sex: z.enum(['male', 'female', 'other']),
  consentMedical: z.literal(true),
  consentTerms: z.literal(true),
});
```

응답 (성공 `201 Created`):

```ts
const SignupResponse = z.object({
  userPseudonymId: z.string().uuid(),
  sessionToken: z.string(),                  // base64url 32바이트
  expiresAt: z.string().datetime(),          // 30일 후 ISO
});
```

### 4.2 에러 응답

| 상태 | code | 발생 조건 |
|------|------|----------|
| `400` | `INVALID_INPUT` | Zod 검증 실패 |
| `400` | `INVALID_JSON` | JSON 파싱 실패 |
| `403` | `AGE_RESTRICTED` | 만 19세 미만 (birthYear refine) |
| `403` | `CONSENT_REQUIRED` | `consentMedical` 또는 `consentTerms` false |
| `409` | `IDENTITY_EXISTS` | 동일 email 또는 phone 존재 |
| `429` | `RATE_LIMITED` | IP당 일 10회 초과 |
| `500` | (내부 오류) | DB 쓰기 실패 등 |

### 4.3 세션 토큰 검증 (다른 라우트가 사용)

- 클라이언트 헤더: `Authorization: Bearer <sessionToken>`
- `auth.ts` 미들웨어:
  1. `IDENTITY_DB.session_tokens` 조회 → `userPseudonymId` 추출
  2. `expiresAt > now()` 확인
  3. `c.set('userPseudonymId', ...)`
  4. PII는 절대 c 컨텍스트에 넣지 않음
- 실패 시 `401 UNAUTHORIZED`

### 4.4 신규/기존 API 영향

- 기존 `risk-survey` Slice 02 `auth.ts`는 mock 토큰 (`"test-token-123"`) 검증 → 본 슬라이스 완료 후 실제 세션 토큰 검증으로 교체
- 교체는 본 슬라이스 완료 정의에 포함

---

## 5. 데이터

### 5.1 `IDENTITY_DB` 테이블 (마이그레이션 필요)

```sql
-- users: PII + pseudonym 매핑 (identity-vault 단독)
CREATE TABLE users (
  user_pseudonym_id TEXT PRIMARY KEY NOT NULL,   -- UUID v4
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  birth_year INTEGER NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('male','female','other')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (length(name) BETWEEN 1 AND 40),
  CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

-- session_tokens: 토큰 → pseudonym 매핑
CREATE TABLE session_tokens (
  token TEXT PRIMARY KEY NOT NULL,                -- base64url 32바이트
  user_pseudonym_id TEXT NOT NULL,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_pseudonym_id) REFERENCES users(user_pseudonym_id)
);

CREATE INDEX idx_session_tokens_user ON session_tokens(user_pseudonym_id);
CREATE INDEX idx_session_tokens_expires ON session_tokens(expires_at);

-- consent_log: 동의 변경 이력 (append-only)
CREATE TABLE consent_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pseudonym_id TEXT NOT NULL,
  consent_kind TEXT NOT NULL CHECK (consent_kind IN ('medical','terms','research')),
  granted INTEGER NOT NULL CHECK (granted IN (0,1)),
  source TEXT NOT NULL,                            -- 'signup' / 'profile_update' 등
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_consent_log_user ON consent_log(user_pseudonym_id);

-- consent_log는 append-only — UPDATE/DELETE 트리거로 차단
CREATE TRIGGER consent_log_no_update
  BEFORE UPDATE ON consent_log
  BEGIN
    SELECT RAISE(ABORT, 'consent_log is append-only');
  END;

CREATE TRIGGER consent_log_no_delete
  BEFORE DELETE ON consent_log
  BEGIN
    SELECT RAISE(ABORT, 'consent_log is append-only');
  END;
```

### 5.2 보존 / 익명화

- `users`: 사용자 탈퇴 요청 전까지 보존 (P1 후반 탈퇴 슬라이스 시 정의)
- 탈퇴 시 처리: 본 ADR 0003 따라 `users` row 삭제 → 분석 DB는 pseudonym으로 통계 익명 상태로 잔존
- `session_tokens`: 만료 + 7일 후 자동 cleanup (P1 후반 cron, Slice 외)
- `consent_log`: 7년 보존 (개인정보보호법)

### 5.3 비밀 관리

- 세션 토큰은 평문 저장 (해시 X) — P0/P1 단순화. 향후 OTP/OAuth 도입 시 토큰 해싱 ADR로 보강.
- D1 미사용 컬럼 0개 (스키마 최소화)

---

## 6. 위험

### 6.1 보안

- 세션 토큰 1개 = 모든 의료 데이터 접근 (P0 한정 위험 수용, ADR 0010 명시)
- HTTPS 전 구간 강제 (CF Pages / Workers 기본 TLS)
- Rate limit: IP당 일 10회 (가입 시도 — DoS 방지)
- 토큰 만료 30일 — localStorage 휘발 또는 만료 시 재가입 필요 (ADR 0010 수용)

### 6.2 개인정보 (개인정보보호법 23조 — 민감정보)

- 의료 데이터 처리 동의(`consentMedical`)는 회원가입 동의(`consentTerms`)와 별도 체크박스
- 가입 시점 동의 이력은 `consent_log`에 즉시 append
- `users` 변경 / 탈퇴는 P1 후반 별도 슬라이스 (본 spec 비목표)

### 6.3 윤리 (compliance-reviewer 차단 항목)

- 가입 UI에 "진단" / "처방" / "치료" / "사망" / "여명" / "죽음" 단어 금지
- 만 19세 미만 차단 메시지: "본 서비스는 만 19세 이상부터 이용 가능합니다." (자살 예방 hotline은 본 슬라이스 미노출 — risk-survey와 달리 가입 단계에서는 위험 신호 아님)
- 미동의 시 가입 차단 메시지: "건강 데이터 처리 동의가 필요합니다." (강요 표현 금지)

### 6.4 성능 / 비용

- 가입 응답 SLO: p95 ≤ 500ms (D1 write 2 rows + token 발급)
- D1 free tier: 일 50k 쓰기 — P1 100명 베타에 충분 (1명당 수십 쓰기 가정 시)
- Worker CPU 30s 한도 안에서 여유

### 6.5 운영

- 디바이스 분실 / localStorage 삭제 → 운영팀 수동 토큰 재발급 (베타 100명 한정 수용)
- 운영 도구 / 콘솔은 본 슬라이스 비포함 (직접 D1 SQL로 처리)

---

## 7. 결정 사항 (2026-05-14 죠니 승인)

| # | 항목 | 결정값 | 상태 |
|---|------|--------|------|
| 1 | 가입 입력 | name + email + phone + birthYear + sex + consentMedical + consentTerms | 확정 |
| 2 | 인증 방식 | 세션 토큰 (32바이트 base64url, 30일) | 확정 |
| 3 | 토큰 저장 | 클라이언트 localStorage | 확정 |
| 4 | 중복 처리 | 동일 email OR phone → `409 IDENTITY_EXISTS` | 확정 |
| 5 | D1 인스턴스 | `chronoshealth-identity` (분석 DB와 분리, ADR 0003 정합) | 확정 |
| 6 | 본인 인증 | 미도입 (ADR 0010 수용) | 잠정 — P1 후반 보강 ADR |
| 7 | 비밀번호 / OTP | 미도입 (ADR 0010 수용) | 잠정 — P1 후반 보강 ADR |
| 8 | 다국어 | 한국어 우선 (영어 P1 후반) | 확정 |

---

## 8. 검증 시나리오

### Positive
- 30세 남성, 정상 입력 → 201 + pseudonym + token + expiresAt(30일 후)
- 위 사용자 토큰으로 `/api/v1/risk-estimate` 호출 → 200 (Slice 02 회귀 통과)

### Negative
- 17세 → 403 `AGE_RESTRICTED`
- `consentMedical: false` → 403 `CONSENT_REQUIRED`
- 동일 email 재가입 → 409 `IDENTITY_EXISTS`
- 동일 phone 다른 email 재가입 → 409 `IDENTITY_EXISTS`
- 잘못된 email 형식 → 400 `INVALID_INPUT`
- 잘못된 phone 형식 (예: "010-1234") → 400 `INVALID_INPUT`
- 일 10회 초과 가입 시도 (동일 IP) → 429
- 만료된 토큰으로 API 호출 → 401

### 회귀
- mock 토큰(`"test-token-123"`)으로 API 호출 → 401 (Slice 02 mock 인증 폐기 확인)
- 응답 JSON grep — `name` / `email` / `phone` / `birthYear` 0건 (PII 노출 차단)
- 분석 라우트(`/api/v1/risk-estimate`) 코드 grep — `IDENTITY_DB` 참조 0건
- compliance-reviewer 통과
- consent_log UPDATE / DELETE 시도 → DB ABORT

---

## 9. 완료 정의 (Definition of Done)

- [ ] 본 spec Status: Draft → Accepted (현재 Accepted)
- [ ] ADR 0010 작성 완료 (별도 PR 또는 동일 커밋)
- [ ] Slice 01 `docs/spec/identity/01-signup.md` 작성 완료
- [ ] compliance-reviewer 통과 (윤리 / 개인정보 항목)
- [ ] ADR 0003 / ADR 0008 / ADR 0010 정합성 확인
- [ ] risk-survey Slice 01 spec의 "회원가입 spec 별도 작성 필요" 의존성 해소

---

## 10. 다음 단계

본 spec Accepted 후:

1. Slice 01 `01-signup.md` 따라 구현 (회원가입 폼 + API + identity D1 마이그레이션 + 기존 mock 토큰 교체)
2. Slice 01 완료 후 risk-survey Slice 05 (답변 저장 + 동의 관리) 진입
3. P1 후반 — 본인 인증 보강 ADR + Slice 02 (이메일 OTP 또는 OAuth) 작성
