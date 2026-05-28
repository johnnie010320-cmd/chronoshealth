# ADR 0011 — 베타 등록 데이터 모델: identity-vault 격리 (이메일 평문 / HMAC pseudonym 분리)

- **Status**: Proposed (죠니 검토 대기)
- **Date**: 2026-05-28
- **Decider**: Johnnie
- **Related**: ADR 0003 (identity-vault PII 격리), ADR 0008 (D1 채택), ADR 0010 (단순 가입 — 본인 인증 미보유 상태)
- **Source spec**: `docs/spec/roadmap-ui.md` (Slice R3 — `/beta-signup`)

## Context

`docs/spec/product-mvp.md` 의 11개 모듈 비전을 사용자에게 노출하는 공개 UI 슬라이스(`roadmap-ui.md`)에서, Slice R3는 **베타 출시 대기자 명단(`/beta-signup`)** 을 수집한다. 본 데이터는 ADR 0010 의 정식 가입과는 별개의 **마케팅·웨이팅리스트 목적** 이며:

1. 정식 사용자(설문 답변, 위험 추정 결과 등 의료 데이터 보유)와 데이터 모델·테이블이 섞이면 ADR 0003 의 식별 영역 격리 원칙이 흐려진다.
2. 베타 등록자는 의료 데이터를 제공하지 않고 이메일·국가·연령대·관심 모듈만 제공한다. 그러나 이메일은 그 자체로 PII이므로 ADR 0003 의 격리 요건은 동일하게 적용된다.
3. P1~P2 출시 시 베타 등록자 → 정식 가입 전환 시 동일 이메일을 다시 입력받아 새 계정 생성(별도 절차). 베타 테이블의 이메일을 정식 가입 테이블로 자동 이관하지 않는다.
4. 본 단계는 토큰 미발행·보상 미약속이므로 ZK 시빌·KYC 등급은 미적용 (P4 이후 분리 ADR).

## Decision

**베타 등록 데이터는 ADR 0003 정합으로 `services/identity/` 도메인(평문 PII 격리)과 `analysis` 도메인(가명화)으로 분리 저장한다.** 두 도메인은 동일 Cloudflare D1 인스턴스 내 별개 데이터베이스로 분리(P0~P1 한정 — ADR 0008), P2 이후 인프라 재결정 시 별도 인스턴스로 분리 가능.

### 분리 매핑

| 필드 | identity 도메인 | analysis 도메인 |
|------|----------------|----------------|
| `id` | UUID v4 (PK) | UUID v4 (PK) |
| `email` 평문 | ✓ (TEXT NOT NULL) | ✗ (절대 저장 금지) |
| `email_pseudonym` (HMAC) | ✗ | ✓ (TEXT NOT NULL, UNIQUE) |
| `ip_hash` (SHA-256 + per-day salt) | ✓ | ✗ |
| `user_agent` | ✓ (운영 디버깅용, 90일 후 삭제) | ✗ |
| `country` | ✗ | ✓ (TEXT, ISO 3166-1 alpha-2) |
| `age_group` | ✗ | ✓ (`'19-29'\|'30-39'\|'40-49'\|'50-59'\|'60+'`) |
| `interested_modules` | ✗ | ✓ (TEXT JSON array, M1~M11/M_DID 부분집합) |
| `locale` | ✗ | ✓ (TEXT, `'ko'\|'en'\|'ja'\|'es'`) |
| `consent_pii` / `consent_medical_disclaimer` / `consent_token_review` | ✓ (동의 로그 ADR 0010 패턴) | ✗ |
| `created_at` | ✓ | ✓ |

### 가명화 (Pseudonymization)

- **알고리즘**: `email_pseudonym = HMAC-SHA256(server_salt, lower(trim(email)))`
- **`server_salt`**: 32바이트 random, Cloudflare Workers 환경변수 `BETA_SIGNUP_HMAC_SALT` (secret). 절대 코드 / 로그 / Git 노출 금지. SOPS+age로 관리.
- **사유**: 결정적 (deterministic) 해시이므로 동일 이메일 재등록 차단 가능 (`UNIQUE` 제약). 동시에 평문은 identity 도메인에만 존재.
- **공격 표면**: salt 유출 시 알려진 이메일 dictionary 공격으로 가입 여부 역추적 가능. P0 베타는 보상 미발행 단계라 위험 수용. P4 토큰 보상 도입 시 salt 회전 + ZK 시빌 ADR 별도 작성.

### 스키마 (D1 마이그레이션 0011)

```sql
-- identity 도메인 (격리 배포 대상)
CREATE TABLE beta_signup_identity (
  id TEXT NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  consent_pii INTEGER NOT NULL CHECK (consent_pii = 1),
  consent_medical_disclaimer INTEGER NOT NULL CHECK (consent_medical_disclaimer = 1),
  consent_token_review INTEGER NOT NULL CHECK (consent_token_review = 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_beta_signup_identity_email ON beta_signup_identity(email);

-- analysis 도메인 (PII 0개)
CREATE TABLE beta_signups (
  id TEXT NOT NULL PRIMARY KEY,
  email_pseudonym TEXT NOT NULL,
  country TEXT NOT NULL,
  age_group TEXT NOT NULL CHECK (age_group IN ('19-29','30-39','40-49','50-59','60+')),
  interested_modules TEXT NOT NULL DEFAULT '[]',
  locale TEXT NOT NULL CHECK (locale IN ('ko','en','ja','es')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_beta_signups_pseudonym ON beta_signups(email_pseudonym);
CREATE INDEX idx_beta_signups_country_age ON beta_signups(country, age_group);
```

> ADR 0010 패턴과 동일하게 `id`는 별도 (identity·analysis 양쪽 모두 자체 UUID). 두 테이블의 연결은 `email_pseudonym` 을 통해서만 (identity 측에 보관 안 함). 즉 analysis → identity 역추적 시 ip/UA만으론 매칭 불가, 평문 email 조회는 운영 권한자 직접 쿼리 필요.

### 미성년 차단

- 클라이언트 측 `age_group` 드롭다운에 `'19세 미만'` 옵션 → 선택 즉시 폼 비활성 + 안내
- 서버 측 화이트리스트 검증: `age_group ∈ {'19-29','30-39','40-49','50-59','60+'}`. 그 외 값은 `400 INVALID_AGE_GROUP`
- 자가 보고 한계 명시: 본인이 거짓 입력 시 차단 불가, 정식 가입(ADR 0010)에서 `birthYear` 로 재검증

### 동의 (3종, 모두 필수)

| 키 | 표시 문구 (한국어) | 미동의 처리 |
|----|------------------|------------|
| `consent_pii` | "베타 등록을 위해 이메일·국가·연령대를 수집·저장하며, 동의 철회 시 삭제됩니다." | 400 거부 |
| `consent_medical_disclaimer` | "Chronos Health는 의료 진단·처방·치료를 제공하지 않으며, 예측 리포트는 의료 자문을 대체하지 않습니다." | 400 거부 |
| `consent_token_review` | "CHRO 토큰 및 보상은 현재 검토 중인 기능이며, 베타 등록이 미래 토큰 수령을 보장하지 않습니다." | 400 거부 |

- 3종 모두 별도 체크박스. 사전 체크 금지(ADR 0010 패턴 동일).
- 동의 시점·문구 버전·IP 해시는 `beta_signup_identity` 에 append-only 기록. 문구 변경 시 새 버전 칼럼 추가(향후 마이그레이션).

### Rate limit / 시빌 가드 (P0 수준)

- **IP 기준**: 시간당 5건 / 일 20건 (Cloudflare Workers Durable Object 또는 KV 카운터)
- **email_pseudonym 기준**: 중복 등록 → `409 ALREADY_REGISTERED` (UI 안내: "이미 등록된 이메일입니다. 출시 시 안내드립니다.")
- **ZK 시빌 / KYC**: 적용 안 함 (P4 토큰 단계 ADR 분리)

### API 인터페이스

```
POST /api/v1/beta-signup
Content-Type: application/json

Request:
{
  "email": "string (RFC 5322)",
  "country": "string (ISO 3166-1 alpha-2)",
  "ageGroup": "'19-29'|'30-39'|'40-49'|'50-59'|'60+'",
  "interestedModules": "string[] (subset of M1..M11, M_DID)",
  "locale": "'ko'|'en'|'ja'|'es'",
  "consentPii": true,
  "consentMedicalDisclaimer": true,
  "consentTokenReview": true
}

Response 201:
{
  "id": "uuid",
  "registeredAt": "ISO 8601"
}

Errors:
  400 INVALID_EMAIL / INVALID_COUNTRY / INVALID_AGE_GROUP / INVALID_LOCALE
  400 CONSENT_REQUIRED   (3종 중 1개 이상 false)
  403 UNDERAGE           (age_group 'under-19' 또는 화이트리스트 외)
  409 ALREADY_REGISTERED
  429 RATE_LIMITED       (IP 시간당 5건 초과)
```

### 운영·감사

- **운영 권한 분리**: 평문 email 조회는 운영 콘솔(`apps/admin`, 향후 구축)에서만, 모든 조회는 감사 로그 남김
- **데이터 삭제 요청**(GDPR / 개인정보보호법 36조): identity·analysis 양쪽 동시 삭제 + 삭제 증명 토큰 발급. 30일 내 처리 의무
- **데이터 이관**(베타 → 정식 가입): 자동 이관 안 함. 정식 가입 시 동일 이메일을 다시 입력받아 ADR 0010 흐름으로 신규 계정 생성. 사용자 안내: "베타 등록은 출시 알림용입니다."

## Consequences

**긍정**
- ADR 0003 정합: PII 평문은 identity-vault 한 곳, 분석 DB는 pseudonym만 → P3 ML 학습 시 PII 분리 자동 보장
- 베타 등록과 정식 가입의 데이터 모델 명확히 분리 → 의료 데이터 영역 격리 유지
- 동의 3종 명문화 → 의료법·특금법(토큰 관련 표현) 가드 자동 적용
- HMAC 결정적 가명화 → 중복 등록 차단 가능 (UNIQUE 제약)
- IP·UA 90일 후 삭제 정책으로 PII 보관 최소화

**부정 / 위험**
- HMAC salt 유출 시 알려진 이메일 dictionary 공격 가능 (사용자 가입 여부 역추적). P0 토큰 미발행 단계라 수용
- 자가 보고 연령대는 검증 불가 → 미성년 차단의 완벽성 부재 (정식 가입에서 `birthYear` 재검증으로 보완)
- 베타 등록 → 정식 가입 이관 미자동화 → 사용자 재입력 friction. 마케팅 안내로 보완
- 운영 콘솔(`apps/admin`) 부재 단계에서 평문 email 조회는 wrangler CLI 직접 쿼리 필요 → 감사 로그 누락 위험. P0 100명 한정 수용, 운영 콘솔 구축 후 ADR 갱신

**위험 수용 사유**
- 베타 등록은 토큰 보상 약속 없음 → 부정 가입 동기 낮음
- 의료 데이터 미수집 단계 → 부정 접근 시 노출되는 PII는 이메일·국가·연령대 한정
- P4 토큰 도입 시 본 ADR 부분 supersede 예정 (ZK 시빌 + KYC 등급 별도 ADR)

## 재결정 트리거

다음 중 1건 이상 충족 시 본 ADR 부분 supersede + 후속 ADR 작성:

1. 베타 등록자 5,000명 초과 → HMAC salt 회전 정책 필요
2. CHRO 토큰 보상이 베타 등록자에 적용 (P4) → ZK 시빌 + KYC 등급 도입
3. SOC2 / HIPAA / 개인정보보호 인증 진입 → 감사 로그 강화
4. 운영 콘솔(`apps/admin`) 구축 → 직접 쿼리 → 감사 로그 자동화
5. 의료 자문에서 자가 보고 연령대 검증 강화 권고
6. 베타 → 정식 가입 자동 이관 요구 발생 (재입력 friction 누적 시)

## Alternatives Considered

- **단일 테이블 평문 저장**: 구현 단순. 단 ADR 0003 정면 위반. 거부.
- **외부 메일 서비스 위탁(Mailchimp / Resend / Brevo)**: 인프라 부담 0, 운영 편의 ↑. 단 베타 단계 사용자 동의 범위에 외부 위탁이 포함되지 않음 + Cloudflare 외부 의존 발생(ADR 0007 단독 인프라 정합성 ↓). P1 후반 출시 알림 메일 발송 시 재검토. 거부.
- **이메일 평문 비저장 (해시만)**: PII 최소화. 단 출시 알림 메일 발송 불가 → 베타 등록 자체의 목적(출시 시 도달) 실패. 거부.
- **결정적 해시 대신 랜덤 솔트별 해시**: dictionary 공격 방어 ↑. 단 동일 이메일 재등록 차단 불가 (중복 가입 대량 발생) → 베타 풀 의미 약화. 거부.
- **identity 도메인을 별도 D1 인스턴스로 즉시 분리**: 격리 강도 ↑. 단 ADR 0008(D1 채택, P0~P1 한정)의 단일 인스턴스 운영 정합성 ↓. P2 인프라 재결정 시 함께 분리. 현 단계는 동일 인스턴스 내 별개 DB로 충분.
- **ZK 시빌 가드 즉시 적용**: 보상 미발행 단계라 과잉. P4 토큰 단계 별도 ADR.
- **KYC 등급 부여**: 베타 마케팅 단계에 과잉. P4 별도 ADR.
