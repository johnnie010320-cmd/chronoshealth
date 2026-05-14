# Slice 04 — risk-survey / 결과 리포트 UI

- **Spec**: `docs/spec/risk-survey.md`
- **Estimate**: 2일
- **Linear**: TBD
- **Dependencies**: Slice 02 (API 응답 형식 확정 필요)
- **Status**: Blocked until Slice 02 done

## 완료 정의 (Definition of Done)

- [ ] `/survey/result/:reportId` 라우트
- [ ] 생체 나이 카드 — 실제 나이 vs 산출 나이 비교 시각화 + top 3 기여 인자
- [ ] 5년 위험 카드 5개 — 질병명 / 확률 / 카테고리 색상 (low=green / moderate=yellow / high=red)
- [ ] 개선 행동 카드 5개 — 행동 + 예상 효과 + 신뢰도 표시
- [ ] **면책 문구 항상 화면 상단 또는 하단 고정 노출** ("본 리포트는 의학적 진단이 아닙니다")
- [ ] hotlines 응답에 포함된 경우 → 화면 상단 배너로 1393 / 1577-0199 즉시 노출
- [ ] 의료 윤리 가드: UI 어디에도 "진단" / "처방" / "사망일" / "여명" 표현 없음
- [ ] 모바일 반응형 (375px ~ 1920px)
- [ ] 결과는 reportId 기준 다시 로드 가능 (북마크 지원)
- [ ] 결과 페이지에 "이건 무엇" 도움말 (사용자 이해도 보조)

## 영향 영역

- `apps/web/src/app/(authed)/survey/result/[reportId]/page.tsx` — 신규
- `apps/web/src/features/risk-survey/components/BioAgeCard.tsx` — 신규
- `apps/web/src/features/risk-survey/components/DiseaseRiskCard.tsx` — 신규
- `apps/web/src/features/risk-survey/components/ImprovementCard.tsx` — 신규
- `apps/web/src/features/risk-survey/components/HotlinesBanner.tsx` — 신규
- `apps/web/src/features/risk-survey/components/Disclaimer.tsx` — 신규

## 의존성

- Slice 02 응답 스키마 (`@chronos/types` import)
- Slice 03 완료 시 카테고리 / top 3 / 개선 행동 데이터 의미 있는 값
- 디자인 토큰 — `packages/ui`에 정의 (다음 슬라이스에서)

## 검증 시나리오

### Positive
- mock 응답으로도 결과 UI 정상 렌더 (low/low/low 표시)
- 실제 계산 응답으로 high 위험 사용자 → red 카드 + hotlines 배너 동시 노출

### Negative
- 다른 사용자의 reportId 접근 시도 → 403 (서버 측 / 본 슬라이스 범위 밖)
- 응답 페이로드에 금지 단어 들어와도 UI 렌더 시점에 client-side 가드 (회귀)

### 회귀
- 기존 `/survey` 페이지 영향 없음
- 모바일 가로 스크롤 없음
- Lighthouse 접근성 ≥ 90

## 비목표

- PDF 출력 (P1 후반)
- 결과 공유 기능 (영구 미적용 — 윤리적 검토 필요)
- 시계열 비교 (P1 후반)
- 동의 / DB 저장 (Slice 05)
