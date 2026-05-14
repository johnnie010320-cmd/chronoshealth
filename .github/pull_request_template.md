# PR Summary

<!-- 한 줄 요약 (컨벤셔널 커밋 형식 권장) -->

## Spec / ADR
<!-- 근거 문서 링크: docs/spec/<file>.md 또는 docs/adr/NNNN-*.md -->

- Spec: 
- ADR:
- Linear: 

## 변경 사항

- [ ] 변경 영역: `apps/...` / `services/...` / `ml/...` / `contracts/...` / `infra/...` / `docs/...`
- [ ] 슬라이스 단위 (1~3일 이내)
- [ ] 마이그레이션 영향: 없음 / 있음 (4단계 분리 PR 여부)

## 검증 시나리오

- Positive: 
- Negative: 
- 회귀: 기존 기능 X 영향 없음 확인 

## 보안 / 컴플라이언스

- [ ] PII는 services/identity/ 외부로 노출 안 됨
- [ ] 의료 금지 표현(진단/처방/치료/여명/사망일) 미포함
- [ ] 비밀키 / `.env` 미포함
- [ ] 변경 라인 단위 테스트 추가됨
- [ ] (해당 시) 컴플라이언스 리뷰어 통과
- [ ] (해당 시) 솔리디티 감사관 통과 (Slither High 0건)
- [ ] (해당 시) ML 평가 리포트 첨부 (`docs/ml-experiments/EXP-NNNN.md`)

## 롤백 절차

<!-- 이 PR을 롤백하려면 어떻게 해야 하는가? -->

## 스크린샷 / 데모 (UI 변경 시)

<!-- 첨부 -->
