---
description: 신규 기능 명세 초안 작성 (절차서 4.1 명세 우선 개발)
---

# /spec <기능명>

`docs/spec/<기능명>.md` 생성. 코드 변경 전 합의를 위한 기준 문서.

## 양식

```markdown
# Spec — <기능명>

- **Status**: Draft | In Review | Accepted | Implemented | Superseded
- **Created**: YYYY-MM-DD
- **Author**: <이름>
- **Related ADR**: ADR-NNNN (해당 시)

## 1. 목표 (Goal)
무엇을 해결하는가? 사용자 가치 한 문장.

## 2. 비목표 (Non-goal)
이번 슬라이스에서 의도적으로 다루지 않는 것.

## 3. API 인터페이스
요청/응답 스키마 (OpenAPI 또는 Zod 형태). 컨트랙트인 경우 함수 시그니처.

## 4. 데이터
- 새 테이블/컬럼 (마이그레이션 필요 여부)
- purpose_code
- 보존 기간 / 익명화 단계 (브론즈/실버/골드)
- PII 포함 여부 (Yes → identity-vault 격리)

## 5. 위험
- 보안 (인증/권한)
- 개인정보 (PII 노출 / 동의 / 잊혀질 권리)
- 윤리 (의료법 금지 표현 / 미성년자 / 위험 임계)
- 성능 (SLO 영향)
- 비용 (인프라 / 가스)

## 6. 미해결 질문
사람이 결정해야 하는 항목.

## 7. 검증 시나리오
완료 판정 기준 — Positive / Negative / 회귀
```

## 절차

1. `/spec` 실행 → 위 양식 채워서 PR
2. 사람 1명 + 컴플라이언스 리뷰어 동시 검토
3. Accepted 후에야 `/slice` 가능
