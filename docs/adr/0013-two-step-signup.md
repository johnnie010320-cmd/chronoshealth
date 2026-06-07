# ADR 0013 — 2단계 회원가입 (계정 생성 → 본인정보)

- 상태: **Accepted** (2026-06-07)
- 결정자: Johnnie
- 영향 범위: `services/gateway/` (인증), `apps/web/` (signup / login / onboarding), D1 identity DB
- 보강 대상: **ADR 0010** (단순 가입) + **ADR 0012** (비밀번호 도입)

## 배경

ADR 0010 + 0012의 단일-스텝 회원가입 폼은 다음 문제를 가진다:
1. 한 화면에 너무 많은 입력 필드 → 이탈률 증가
2. 소셜 가입 (Google/Kakao/Apple) 도입 시 이미 OAuth로 받은 정보 (이메일·이름)를 다시 묻는 흐름이 비자연스러움
3. 본인정보 (전화·생년·성별·국적)는 본질적으로 가입 후 단계여도 됨

## 결정

**회원가입을 2단계로 분할.**

### Step 1 — 계정 생성 (`POST /api/v1/auth/signup`)
- 입력: **이메일 + 비밀번호 + 약관 3종 동의** + (선택) 소셜 OAuth subject
- 출력: `userPseudonymId` + `sessionToken` (즉시 로그인됨)
- D1 `users` row 생성 시 본인정보 필드는 NULL

### Step 2 — 본인정보 입력 (`PUT /api/v1/me/profile`)
- 입력: **이름 + 전화 + 출생연도 + 성별 + 국적**
- 출력: 갱신된 `MeProfile`
- 이메일 가입자는 Step 1 → `/onboarding` 자동 이동 → Step 2 → `/survey`
- 소셜 가입자는 Step 1에서 OAuth가 이름/이메일을 받아왔으므로 Step 2에서 빈 필드만 입력

### 미완료 사용자 처리
- `me.isProfileComplete = (name && phone && birth_year && sex && nationality 모두 채워짐)`
- false 시 보호된 라우트 (`/survey`, `/community`, `/reports`, `/care`, `/routine`, `/rewards`, `/profile`) 진입 시 `/onboarding` 강제 리다이렉트
- 예외: `/login`, `/signup`, `/onboarding`, `/admin/*` (admin은 별도 권한)

## D1 schema 변경 (절차서 7.3)

```sql
-- 0004_identity_relax_required.sql
-- ADR 0013 — 2단계 회원가입 도입에 따라 본인정보 필드 NULL 허용.
-- SQLite는 ALTER 제약 변경 불가 → 테이블 재생성 패턴.
```

기존 가입자는 모두 필드가 채워져 있으므로 backfill 불필요.

## 보안 고려

### Step 1 응답 신뢰
- Step 1 후 세션 토큰 즉시 발급 → 사용자가 미완료 상태로 다음 디바이스에서 로그인 시도 가능
- 이 경우에도 `/onboarding`으로 라우팅되므로 미완료 정책 유지

### 이메일 중복 확인 (`GET /api/v1/auth/check-email`)
- Account enumeration 방어:
  - IP 별 시간당 30회 rate limit
  - 응답 시간 일정화 (delay 200~400ms 무작위)
  - 회원가입 폼에서만 expose (로그인 폼은 미사용)

## 거부된 대안

- **단일 스텝 유지**: 소셜 가입 흐름 부자연스러움 + 한국 모바일 사용자 이탈률 높음
- **OAuth만 도입**: 일반 이메일 사용자 차별 + Apple Developer 의존성

## 영향

### Pros
- 모바일 사용자 경험 개선 (단계별 입력)
- 소셜 가입 흐름 자연스러움 (OAuth → 부족한 정보만 입력)
- A/B 테스트 가능 (Step 2 이탈률 측정)

### Cons
- 계정 생성 후 본인정보 미입력 사용자 발생 → 라우팅 가드 필수
- ADR 0010 + 0012의 단순 모델 깨짐

## 마이그레이션 (절차서 7.3 4단계)

1. **migrate**: `0004_identity_relax_required.sql` — users 컬럼 NULL 허용
2. **backfill**: 기존 가입자는 이미 채워져 있어 작업 0
3. **코드 배포**: signup 라우트 갱신, me/profile 라우트 신규
4. **마이그레이션 정리**: 일정 기간 후 미완료 사용자 알림 메일 (P2)

## 후속 작업 (별도 ADR)

- **ADR TBD — Google OAuth**: Google Cloud Console 등록 + `/auth/oauth/google/callback`
- **ADR TBD — Kakao 로그인**: Kakao Developers 등록
- **ADR TBD — Apple Sign In**: Apple Developer 가입 + JWT ES256 (별도 비용)

## 참조

- ADR 0010 (단순 가입)
- ADR 0012 (비밀번호 도입)
- ADR 0003 (PII 격리)
