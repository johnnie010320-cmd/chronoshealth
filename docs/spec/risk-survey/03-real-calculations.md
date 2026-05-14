# Slice 03 — risk-survey / Framingham + PhenoAge 계산식

- **Spec**: `docs/spec/risk-survey.md` (결정 사항 #2)
- **Estimate**: 3일
- **Linear**: TBD
- **Dependencies**: Slice 02 (API 흐름 안정화 완료 필요)
- **Status**: Blocked until Slice 02 done

## 목적

Slice 02의 mock 응답을 실제 공개 논문 계수 기반 계산으로 교체.

## 완료 정의 (Definition of Done)

- [ ] **PhenoAge 회귀** — 생체 나이 산출 (D'Almeida 2018 공개 계수)
- [ ] **Framingham Risk Score** — 10년 심혈관 위험 (D'Agostino 2008 공개 계수)
- [ ] 생체 나이 신뢰구간 (CI 95%) 산출 — bootstrap 또는 분석적
- [ ] top 3 기여 인자 추출 (각 변수 정규화 후 가중치 절대값 기준)
- [ ] 개선 행동 5개 — 규칙 기반 매핑 (예: 흡연 → "금연 시 생체 나이 -3년")
- [ ] 5년 위험 → 카테고리 변환 (`low` < 5% / `moderate` 5~20% / `high` > 20%)
- [ ] hotlines 임계치 30% 초과 → 자동 포함
- [ ] 단위 테스트 커버리지 ≥ 90% (계산 로직)
- [ ] 결정형 재현성 — 동일 입력 1000회 호출 → 모든 응답 동일 (model_version 제외)

## 영향 영역

- `services/gateway/src/risk/phenoage.ts` — PhenoAge 회귀 구현
- `services/gateway/src/risk/framingham.ts` — Framingham 구현
- `services/gateway/src/risk/contributors.ts` — top 3 추출
- `services/gateway/src/risk/improvement.ts` — 행동 매핑
- `services/gateway/src/risk/index.ts` — 통합 (Slice 02의 mock 대체)
- `services/gateway/test/risk/*.test.ts` — 각 함수 단위 테스트
- `docs/spec/risk-survey.md` — `model_version` `rs-mock-v0` → `rs-v0.1.0`

## 의존성

- 공개 논문 계수 (코드 주석에 출처 명시)
- 한국인 코호트 보정 — **잠정 미적용**. 의료 자문 합류 시 ADR로 추가 결정

## 검증 시나리오

### Positive
- 30세 남성, 평균 답변 → 생체 나이 28~32, Framingham low
- 60세 흡연자, 가족력 + 미운동 → 생체 나이 65~70, Framingham high
- 동일 입력 1000회 → 모든 응답 비트 단위 동일

### Negative
- 입력값 누락(필수 nullable=false 필드) → 500 (Slice 02 Zod에서 차단되어야 정상이나 회귀 가드)
- 극단 입력 (수축기 혈압 250) → 합리적 출력 (NaN 금지, 발산 금지)

### 회귀
- Slice 02 mock 시나리오 응답 형식 동일 (Zod 스키마 변경 0)
- 응답 grep 금지 단어 없음
- 계산식 변경 시 model_version 자동 갱신
- 단위 테스트 100% 통과

## 비목표

- ML 모델 사용 (P3 영역)
- 한국인 코호트 식 (의료 자문 후 별도 슬라이스)
- 결과 UI (Slice 04)

## 출처 (코드 주석에 반영)

- D'Almeida JF et al. (2018) — PhenoAge equation
- D'Agostino RB Sr. et al. (2008) — Framingham general CVD risk
- 한국인 코호트 보정 미적용 사실 명시
