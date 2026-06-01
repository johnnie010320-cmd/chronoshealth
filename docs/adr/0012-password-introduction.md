# ADR 0012 — P1 비밀번호 단독 도입 (ADR 0010 보강)

- 상태: **Accepted** (2026-05-31)
- 결정자: Johnnie
- 영향 범위: `services/gateway/` (인증), `apps/web/` (signup / login), D1 identity DB schema
- 보강 대상: **ADR 0010** (P0/P1 단순 가입 — 비밀번호/OTP/OAuth 미도입)
- 후속 ADR 예정: P2 OAuth 별도 ADR / P2 전화 OTP 별도 ADR

## 배경

ADR 0010은 P0/P1 단계에서 본인 인증 부담을 줄이기 위해 이름·전화·이메일 단순 가입만 허용했다. 다중 디바이스 로그인, 계정 복구, 가족 계정 공유 등은 본인 인증 도입 (P2) 이후로 미뤘다.

P1 실제 사용자 테스트 단계 진입 시점에 다음 요구가 발생했다:
1. 가입 시 비밀번호 설정 → 디바이스 분실 시 재로그인 가능
2. 로그인 시 비밀번호 검증 → 계정 보호
3. 카카오/Google 소셜 가입은 P2로 분리 (UI placeholder 유지)
4. 전화 OTP는 P2로 분리

## 결정

**P1 단계에 비밀번호 단독 도입.** OAuth / OTP는 별도 ADR로 분리.

### 해싱 알고리즘
**PBKDF2-SHA256** + 16-byte 랜덤 솔트 + 100,000 iteration. 출력 32-byte (256-bit).

선정 사유:
- Cloudflare Workers SubtleCrypto 네이티브 지원 (Argon2 미지원, bcrypt는 wasm 도입 필요)
- OWASP 권장 iteration count 600,000 (2023 갱신) 대비 보수적으로 100,000 채택 — Workers CPU 30s 한계 내 부담 적음
- P2 진입 시 Argon2id로 재해싱 검토 (재로그인 시점에 자동 마이그레이션)

저장 형식 (D1 `users` 테이블):
- `password_hash` TEXT — base64(PBKDF2-SHA256 32-byte)
- `password_salt` TEXT — base64(16-byte 랜덤)
- `password_algo` TEXT DEFAULT 'pbkdf2-sha256-100k' — 향후 알고리즘 마이그레이션 식별자

### 비밀번호 정책
- 최소 8자, 최대 128자
- 영문 대/소문자 + 숫자 + 특수문자 중 **3종 이상** 포함 (NIST SP 800-63B는 길이 우선이지만 P1 단계 균형책)
- 한국어 입력 차단 (조합 깨짐 방지)
- HIBP (Have I Been Pwned) 조회는 P2 (외부 API 호출 비용)

### 회원가입 흐름 변경
1. 신규 사용자: 이름·이메일·전화·생년·성별·**국적**·**비밀번호**·**비밀번호 확인** + 동의 3종
2. 비밀번호 / 비밀번호 확인 일치 여부 클라이언트 검증
3. 서버에서 솔트 생성 + PBKDF2 해싱 후 D1 저장
4. 세션 토큰 발급 (기존 ADR 0010 패턴 유지)

### 로그인 흐름 신규
1. 이메일 + 비밀번호 입력
2. 서버: 이메일로 `users` 조회 → `password_hash`/`password_salt` 추출
3. 입력 비밀번호 + 저장 솔트로 PBKDF2 해싱 → `password_hash` 비교 (timing-safe)
4. 일치 시 세션 토큰 신규 발급
5. **불일치 시 일관된 에러 코드 `INVALID_CREDENTIALS`** (이메일 존재 여부 누설 차단)
6. Rate limit: 이메일 + IP별 분당 5회

### 기존 사용자 마이그레이션
ADR 0010 시점 가입자는 `password_hash IS NULL`.

**전략**: 마이그레이션 강제 우회 — 다음 로그인 시도 시 비밀번호 설정 강제.
1. 이메일 입력 시 백엔드에서 `password_hash IS NULL` 확인
2. 응답 `error.code = 'PASSWORD_REQUIRED'`
3. FE에서 비밀번호 설정 모달 표시 → POST `/api/v1/auth/set-password`
4. 저장 후 일반 로그인 흐름 진입

본 ADR 시점 D1에 있는 1명은 이 흐름으로 마이그레이션 또는 신규 가입 권장.

## 거부된 대안

- **Argon2id**: Cloudflare Workers 네이티브 미지원. wasm 도입 시 isolate 부팅 비용 증가.
- **bcrypt**: 동일 사유 + 메모리 안전성 PBKDF2 대비 우위 미미.
- **단순 SHA-256 + 솔트**: 무작위 대입 공격에 취약.
- **scrypt**: Workers 네이티브 미지원.
- **OAuth 동시 도입**: 카카오·Google 콘솔 등록, 리다이렉트 URL 검증, ID 토큰 검증 등 P1 범위 초과.

## 영향

### Pros
- 디바이스 분실 / 다른 디바이스에서 재로그인 가능 → P1 사용자 테스트 가능
- 본인 인증 도입(P2) 전까지 계정 도용 위험 일부 완화
- 비밀번호 변경 / 비활성화 등 운영 기능 기반 마련

### Cons
- ADR 0010 한 단계 후퇴 (단순함이 깨짐)
- 비밀번호 분실 시 복구 경로 부재 (P1 한정 — P2 이메일 복구 ADR 별도)
- HIBP 조회 미수행 → 약한 비밀번호 가입 가능

### Compliance
- 개인정보보호법(PIPA) §29 비밀번호 일방향 암호화 의무 → 충족 (PBKDF2)
- GDPR Art. 32 보안 조치 의무 → 충족 (해싱 + 솔트)
- 비밀번호 정책 로깅: `consent_log` append-only에 `password_set` 이벤트 기록

## 마이그레이션 (절차서 7.3 4단계)

1. **migrate**: `0003_password_nationality_consent.sql` — `users` 테이블 신규 컬럼 (NULL 허용)
2. **backfill**: 기존 가입자 1명 → `password_hash IS NULL` 유지, `nationality NULL` 유지
3. **코드 배포**: signup/login 라우트 갱신, set-password 라우트 신규
4. **마이그레이션 정리**: P2 진입 시점에 `password_hash NOT NULL` 강제 ADR 별도

## 후속 작업 (별도 ADR)

- **ADR TBD — OAuth (카카오·Google)**: P2 본인 인증 ADR과 연동
- **ADR TBD — 전화 OTP**: 본인 인증 강화
- **ADR TBD — 비밀번호 복구**: 이메일 토큰 / 보안 질문 등 (P2)
- **ADR TBD — Argon2id 마이그레이션**: P3 ML 단계 진입 시 보안 강화

## 참조

- `docs/spec/identity.md` (갱신 예정 — v2)
- ADR 0010 (P0/P1 단순 가입)
- ADR 0003 (PII 격리 — 비밀번호 해시도 identity DB 내부 한정)
- OWASP Password Storage Cheat Sheet
- NIST SP 800-63B
