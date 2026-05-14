# ADR 0003 — 개인정보 격리: identity-vault 단독 서비스

- **Status**: Accepted
- **Date**: 2026-05-13
- **Decider**: Johnnie
- **Related**: 절차서 2.2

## Context

크로노스 헬스는 의료 데이터, 가족력, 정신건강 등 민감 정보를 처리한다. HIPAA / GDPR / 개인정보보호법(특히 민감정보) 위반 시 영업 정지 + 매출 4% 과징금 + 형사처벌 가능. 분석 / ML 파이프라인이 PII와 결합되면 모든 코드 경로가 컴플라이언스 대상이 되어 감사 비용 폭증.

## Decision

**개인식별정보(PII)는 `services/identity/` 격리 서비스에서만 다룬다.**

- identity-vault는 `(user_pseudonym_id ↔ PII)` 매핑만 보유
- 외부(다른 서비스 / 분석 DB / ML) 는 `user_pseudonym_id` 만 사용
- PII 접근은 identity-vault API를 통해서만 (RPC) — DB 직접 접근 금지
- 모든 접근은 `audit_log` (append-only, 7년 보관) 기록
- identity-vault 코드 변경은 **사람 2명 리뷰 + 컴플라이언스 리뷰어** 필수 (.claude/hooks/pre-edit.sh 가드)
- 별도 AWS 서브계정 + 별도 KMS 키 + VPC 격리

## Consequences

**긍정**
- 분석 / ML 코드는 HIPAA / GDPR 직접 적용 대상에서 분리
- "잊혀질 권리" 요청 시 identity-vault 매핑만 끊으면 분석 DB는 통계적 익명 상태로 잔존
- 외부 감사(SOC2, 의료기기인증) 시 범위 축소

**부정 / 위험**
- 서비스 간 RPC 호출 증가 → p95 지연 +30~50ms 예상
- identity-vault 단일 장애점 → HA 구성 필수 (P0 단계)
- 개발 편의성 일부 희생 (디버깅 시 사용자 추적 불편)

## Alternatives Considered

- **컬럼 단위 암호화 (단일 DB)**: PII 누출 표면적은 동일. 분석 코드가 여전히 HIPAA 대상.
- **Row-level security**: 권한 누락 사고 발생 시 PII 노출. RLS 정책 변경 추적 어려움.
- **외부 IDaaS (Auth0 등)**: 의료 데이터는 보관 불가. 인증만 위탁 가능.
