# Spec — simulation (M7 What-if 시뮬레이션)

- **Status**: **Draft** (2026-05-28)
- **Created**: 2026-05-28
- **Author**: 지니 (초안) / 죠니 (검토 대기)
- **Related**:
  - `docs/spec/product-mvp.md` §M7 (모듈 정의)
  - `docs/spec/risk-survey.md` (입력 23문항 + Framingham + 휴리스틱 — 본 명세 의존)
  - ADR 0009 (Hono on CF Workers), ADR 0008 (D1)
- **Phase**: P1 후반 (rs-v0.1.0 라이브 직후)
- **Estimate**: 3개 슬라이스 / 합계 4일 (BE 1.5일 + FE 2일 + 라이브 검증 0.5일)

> 사용자가 자신의 23문항 응답을 기반으로 **"수면 +1h / 운동 +90분/주 / 음주 −5잔/주 …"** 같은 행동 변경 가설을 입력하면, 즉시 **변경 후 생체 나이 + 5종 질병 위험 + 예측 잔여 연수(CI 포함)** 를 산출한다. M3 예측 엔진(`rs-v0.1.0`)을 재호출하는 얇은 wrapper.

---

## 1. 목표

1. **즉시 피드백**: 사용자 행동 1개 변경 시 ≤ 1초 안에 결과 갱신
2. **개입 우선순위 가시화**: 동일 절댓값 변경 시 어떤 행동이 가장 큰 영향을 주는지 비교 가능
3. **베이스라인 보존**: 원본 23문항 응답은 변경하지 않고, 가설 입력만 위로 덮어쓰는 형태

## 2. 비목표

- ❌ 약물·영양제 변경 시뮬레이션 (의료 행위 — 절대 금지)
- ❌ 체중 ±N kg 외 신체 측정값 시뮬레이션 (P3 이후, 의료 자문 필요)
- ❌ 시계열 누적 예측 ("3년 뒤", "5년 뒤") — P3 이후
- ❌ ML 기반 개인화 — 본 슬라이스는 결정형(rs-v0.1.0)만
- ❌ 시뮬레이션 결과의 D1 저장 — 휘발성(클라이언트 측 단발성 계산)
- ❌ 토큰 보상 트리거 — M10 P4 이후

## 3. 변경 가능 변수 (P1 한정)

| 변수 | 단위 | 범위 | 비고 |
|------|------|------|------|
| `exerciseMinutesPerWeek` | 분 | 0 ~ 1000 | 운동 분량 |
| `sleepHoursPerNight` | 시간 | 3 ~ 12 | 수면 시간 |
| `alcoholDrinksPerWeek` | 잔 | 0 ~ 70 | 음주 빈도 |
| `smoking` | enum | `never\|former\|current` | 흡연 상태 (현재→과거→비흡연 단방향만, 발암 위험 단계 가드) |
| `weightKg` | kg | 35 ~ 200 (±15kg 변경 권장) | 체중 |
| `stressLevel` | enum | `low\|medium\|high` | 자가 인식 |

위 6개는 라이프스타일 범위. 나머지 17개 항목(연령·성별·키·혈압·혈당·콜레스테롤·가족력 등)은 변경 불가.

## 4. API 인터페이스

```
POST /api/v1/simulate
Authorization: Bearer <session-token>
Content-Type: application/json

Request:
{
  "base": <risk-survey 23문항 페이로드 — 사용자가 가장 최근 제출한 본인 답변>,
  "overrides": {
    "exerciseMinutesPerWeek"?: number,
    "sleepHoursPerNight"?: number,
    "alcoholDrinksPerWeek"?: number,
    "smoking"?: 'never'|'former'|'current',
    "weightKg"?: number,
    "stressLevel"?: 'low'|'medium'|'high'
  }
}

Response 200:
{
  "baseline": <RiskSurveyResponse>,        // 원본 답변 기반 (rs-v0.1.0 출력)
  "simulated": <RiskSurveyResponse>,        // overrides 적용 결과
  "delta": {
    "bioAgeYears": number,                  // simulated − baseline (음수 = 더 젊어짐)
    "predictedYearsRemaining": {            // CI 포함
      "median": number, "ci95": [number, number]
    },
    "diseaseRiskPctPoints": {
      "cvd": number, "diabetes": number, "ckd": number, "dementia": number, "cancer": number
    }
  },
  "disclaimer": "본 시뮬레이션은 결정형 계수 기반 추정으로 의료 자문을 대체하지 않습니다.",
  "modelVersion": "rs-v0.1.0"
}

Errors:
  400 INVALID_INPUT     overrides 범위 밖
  400 INVALID_JSON
  401 UNAUTHORIZED
  403 SMOKING_REGRESSION  current→never 단방향 강제 (never→current 금지)
  429 RATE_LIMITED
```

**Rate limit**: 사용자당 시간당 60회 (IP 600/h).

## 5. 계산 로직

1. `base` 와 `overrides` 를 머지 (overrides 우선)
2. 머지된 답변을 `services/gateway/src/risk/index.ts` 의 `runRiskEngine()` 에 전달 → `simulated` 산출
3. 같은 엔진을 `base` 로도 호출 → `baseline` 산출 (재계산은 가벼움, 캐시 불필요)
4. `delta.bioAgeYears = simulated.bioAge.value − baseline.bioAge.value`
5. `delta.predictedYearsRemaining` = M8 PYR 공식 (별도 spec — avatar-chronos.md §4) 으로 양쪽 계산 후 차분
6. 질병 위험 차분은 5종 각각 `simulatedPct − baselinePct`

엔진 변경 0 — 본 슬라이스는 wrapper 만.

## 6. UI 통합

`docs/spec/risk-survey/04-report-ui.md` 의 결과 카드 하단에 **"What-if 시뮬레이터"** 섹션 신설:

- 6개 슬라이더 (또는 incrementer)
- 변경 즉시 디바운스(200ms) 후 API 재호출
- 결과 카드: 현재(baseline) vs 시뮬레이션 두 칸 비교 + delta 뱃지(녹/적)
- "초기화" 버튼 → overrides 초기화

별도 `/simulate` 페이지 신설하지 않고 결과 카드에 inline (Slice 04 회귀 없도록 신규 컴포넌트로 격리).

## 7. 슬라이스 분해

### Slice S1: BE `/api/v1/simulate` (1.5일)
- `services/gateway/src/schemas/simulate.ts` — Zod (base + overrides)
- `services/gateway/src/risk/simulate.ts` — merge + 양쪽 runRiskEngine + delta
- `services/gateway/src/routes/simulate.ts` — Hono route
- `services/gateway/test/simulate.test.ts` — ≥ 12 단위 (정상/범위/금지표현/회귀/UNAUTHORIZED/RATE/SMOKING)

### Slice S2: FE What-if 컴포넌트 (1.5일)
- `apps/web/src/components/result/WhatIfPanel.tsx`
- `apps/web/src/components/result/DeltaBadge.tsx`
- `apps/web/src/lib/api-client.ts` — `submitSimulate`
- `apps/web/src/locales/{ko,en,ja,es}.ts` — `result.simulate.*` 키 그룹
- 디바운스 200ms, 슬라이더 6개

### Slice S3: 라이브 검증 (0.5일)
- 4언어 × 6변수 × 3시나리오 (정상/극단/원복)
- 회귀: 23문항 → 결과 카드 골든 패스
- 금지 표현 grep (의료 행위 표현 등)

## 8. 의료·법무 가드 (절대)

- ❌ 시뮬레이션 결과에 "이렇게 하면 OOO 병 안 걸린다" / "수명이 연장된다" 단정 표현 금지
- ✅ "예측 잔여 연수가 +X.X년 (95% CI)" / "5년 위험이 −X.X 포인트" 형태
- ❌ "진단" / "처방" / "치료" / 카운트다운 단어 금지 (apps/web 규칙 1·5)
- ✅ 면책: "본 시뮬레이션은 결정형 계수 기반 추정으로 의료 자문을 대체하지 않습니다."

## 9. 미해결 (P1 한정)

1. 슬라이더 초기값 — 사용자 마지막 답변 / 권장 기준 / 0 중
2. 변수별 가중치 노출 여부 (어떤 변수가 결과에 더 영향?)
3. PYR 산출식 — avatar-chronos.md §4 와 동기 (선행 spec 필요)

## 10. 변경 이력

- 2026-05-28: 초안 (지니), Draft 상태
