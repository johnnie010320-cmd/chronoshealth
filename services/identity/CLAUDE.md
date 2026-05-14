# services/identity — Identity Vault

> ⚠️ **민감 영역.** 절대 규칙 위배 시 즉시 머지 차단. 사람 2명 리뷰 필수.

## 책임

- PII 단일 보관소: `user_pseudonym_id ↔ (이름·이메일·전화·주민·생체·가족력·정신건강)` 매핑
- 외부 서비스에는 **RPC를 통해 pseudonym만 노출**
- `audit_log` append-only 기록 (7년 보관)
- 동의(consent) 변경 이력 (append-only)

## 절대 규칙 (위배 시 머지 차단)

1. 이 디렉토리 외부에서 PII 컬럼 / 필드 정의 금지
2. 외부 서비스가 identity DB에 직접 SQL 접근 금지 (반드시 RPC)
3. PII 평문을 로그 / Sentry / 에러 메시지 / 분석 이벤트에 포함 금지
4. KMS 키는 별도 (다른 서비스와 공유 금지)
5. `audit_log`는 UPDATE / DELETE 불가 — 트리거로 강제
6. 잊혀질 권리 요청은 매핑 행만 제거 (분석 DB 행은 통계 익명 상태로 잔존)

## 코드 변경 절차

1. `/spec` 으로 docs/spec/identity-*.md 합의
2. 컴플라이언스 리뷰어 + 사람 2명 리뷰
3. 분석 / ML 코드와 같은 PR에 섞지 않음
4. 변경 후 `audit_log` 마이그레이션 / 인덱스 영향 보고서 첨부

## 의존성

- DB: PostgreSQL (전용 인스턴스 + 별도 KMS)
- VPC: identity-vpc (다른 서비스 VPC 분리)
- 로깅: 페이로드 마스킹 필수 (`logger.info({ user_pseudonym_id })` 만 허용)
