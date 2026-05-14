# ADR 0010 — 인증 / 회원관리: P0/P1 단순 가입 (이름·전화·이메일)

- **Status**: Accepted
- **Date**: 2026-05-14
- **Decider**: Johnnie
- **Related**: ADR 0003 (identity-vault PII 격리), ADR 0008 (D1 채택)
- **Supersede 예정**: 본 ADR은 P1 후반 또는 P2 진입 시점에 본인 인증 보강 ADR(0010-x 또는 0011)으로 부분 supersede

## Context

P0 W21 단계 — Slice 03 라이브 후 Slice 05(답변 저장)로 진입하려면 사용자 식별이 필요하다. ADR 0003은 PII를 `services/identity/` 격리 서비스에서만 처리하도록 못 박았고, 분석 DB는 `user_pseudonym_id`만 보유해야 한다. 즉 Slice 05 이전에 "회원관리 + pseudonym 발급" 슬라이스가 선행되어야 한다.

P0 비공개 베타는 100명 규모 (절차서 5.2 P1 종료 조건). 이 단계에서 OAuth / OTP / 비밀번호 정책을 풀세트로 구현하면 매몰비용이 크고 가입 friction이 베타 모집에 부정적. 반면 의료 데이터를 다루는 이상 익명·디바이스 ID 기반은 ADR 0003의 식별성 요건과 충돌한다.

## Decision

**이름 + 전화번호 + 이메일 + 생년 + 성별 입력 → 즉시 가입 완료** (P0/P1 한정).

### 가입 입력 (모두 필수)

| 필드 | 타입 | 검증 | identity-vault 저장 |
|------|------|------|-------------------|
| `name` | string | 1~40자, 공백 trim | ✓ (PII) |
| `email` | string | RFC 5322 정규식 + 길이 ≤ 254 | ✓ (PII) |
| `phone` | string | E.164 또는 한국 형식 (`010-XXXX-XXXX`) | ✓ (PII) |
| `birthYear` | number | 1900 ≤ x ≤ (현재년 − 19) | ✓ (PII, 만 19세 미만 차단) |
| `sex` | `'male' \| 'female' \| 'other'` | enum | ✓ (PII) |
| `consentMedical` | boolean | true 강제 (false → 가입 거부) | ✓ 동의 로그 |
| `consentTerms` | boolean | true 강제 | ✓ 동의 로그 |

### 발급물

- **`user_pseudonym_id`**: UUID v4, identity-vault DB와 분석 DB 모두에 저장 (분석 DB는 PII 0개)
- **세션 토큰**: 32바이트 random opaque token, base64url 인코딩. 만료 30일.
- 클라이언트는 토큰을 `localStorage['chronos.session']`에 보관 + 매 API 호출 `Authorization: Bearer <token>` 헤더 동봉.

### 인증·관리 비포함 항목 (P0/P1 의도적 미구현)

- 비밀번호 / 패스코드
- 이메일 OTP / 전화 OTP
- OAuth (Google / Kakao / Apple)
- 본인 인증 (PASS, KMC 등)
- 비밀번호 찾기 / 계정 복구
- 멀티 디바이스 로그인 (1 디바이스 = 1 세션. localStorage 휘발 시 재가입 필요)

### 중복 처리

- 동일 `email` 또는 동일 `phone` 존재 → **`409 Conflict`** + `error.code: 'IDENTITY_EXISTS'`
- 메시지: "이미 가입된 정보입니다. 멀티 디바이스 로그인은 향후 본인 인증 도입 후 제공됩니다."
- 운영 예외 처리: 운영팀이 identity-vault에서 직접 토큰 재발급 (수동, 100명 베타 한정)

### 동의 (개인정보보호법 23조 — 민감정보 별도 동의)

- `consentMedical`: "의료/건강 데이터(설문 응답, 측정값, 가족력)를 본 서비스의 위험 추정 목적으로 처리하는 데 동의합니다." 미동의 시 가입 차단.
- `consentTerms`: "서비스 이용약관 및 개인정보 처리방침에 동의합니다."
- 두 동의는 별도 체크박스. 사전 체크 금지.
- 동의 변경 이력: `consent_log` 테이블 (append-only, Slice 05 ADR 0008 정합)

## Consequences

**긍정**
- P0 베타 가입 friction 최소화 (1 페이지, 폼 제출 1회)
- ADR 0003 정합: PII는 identity-vault에만, 분석 DB는 pseudonym
- spec 5.2 정합: 의료 데이터 별도 동의 명시
- 보강 ADR로 무중단 업그레이드 가능 (세션 토큰 인터페이스 유지)

**부정 / 위험**
- 본인 인증 부재 → 타인 사칭 가입 가능 (이메일·전화번호 미검증)
- 디바이스 분실 / localStorage 삭제 시 사용자 재가입 불가 → 운영팀 수동 처리
- 의료 데이터 부정 접근 표면적 = 토큰 1개 탈취. P0 비공개 베타라 수용 가능, P1 후반 OTP/OAuth 보강 ADR로 차단
- 동일인이 다른 이메일·전화로 중복 가입 가능 (탐지 불가) — P0 100명 범위에서 운영 수준 모니터링

**위험 수용 사유**
- 100명 비공개 베타 / 초대 코드 발급 (별도 통제) / 보상 토큰 미발급 단계 → 부정 가입 동기 낮음
- 의료 자문 및 본인 인증 ADR은 P1 후반 / P2 진입 시 작성 예정 (절차서 7장 컴플라이언스 강화 시점과 일치)

## 재결정 트리거

다음 중 1건 이상 충족 시 본 ADR 부분 supersede + 후속 ADR 작성:

1. 베타 사용자 200명 초과
2. CHRO 토큰 / 보상 기능 도입 (P4) → 부정 가입 동기 발생
3. 의료기기인증 / SOC2 / HIPAA 감사 진입
4. 사용자 디바이스 분실 재가입 요청 월 5건 초과 → 정식 로그인 도입 압박
5. 의료 자문에서 본인 인증 강화 권고

## Alternatives Considered

- **이메일 OTP**: 본인 인증 강도 ↑, 재로그인 가능. 단 메일 서비스 (Resend / Postmark) 별도 비용 + Cloudflare 외부 의존. P0 단계 부담. P1 후반 우선 도입 후보.
- **Kakao OAuth**: 한국 사용자 친화. 단 비공개 베타 단계에서 Kakao 콘솔 / 비즈 인증 등 사전 작업. P1 후반 도입 후보.
- **Google OAuth**: 글로벌 친화. 단 P0 한국어 우선이라 사용자 인지도 낮음. P2 우선.
- **익명 device-id**: friction 0. 단 ADR 0003 식별 요건과 충돌, 디바이스 전환 시 동일 사용자 식별 불가. 의료 데이터 부정 접근 시 추적 불가. 거부.
- **비밀번호**: 표준이나 P0 단계에서 비밀번호 정책 / 복구 / 해싱 전 구간 구현 비용 큼. 단순 가입 정책 의도와 어긋남. 거부.
- **PASS 본인 인증 / 휴대폰 인증**: 가장 강한 한국 표준. 단 PASS 가입 비용 + 베타 단계 과한 사용자 부담. P2 우선.
