---
name: chronos-prediction-engine
description: Bio Age 산출, 기대수명 추정, 질병 위험 시뮬레이션 로직 작업 시 호출. 의료 윤리 가이드 동시 적용.
---

# Chronos Prediction Engine Skill

## 핵심 위치
- `src/features/prediction/` (TypeScript 래퍼)
- `ml/` (Python FastAPI 추론 — Phase 2 분리)

## 입력 데이터 카테고리

| 카테고리 | 출처 | 갱신 주기 |
|---------|------|----------|
| 정적 — 인구통계 | 회원가입 | 1회 |
| 정적 — 가족력 | 사용자 입력 | 가끔 |
| 정적 — 유전체 | 외부 업로드 (선택) | 1회 |
| 동적 — 활동/수면 | 웨어러블 API | 일별 |
| 동적 — 심박/HRV | 웨어러블 API | 분 단위 → 일별 집계 |
| 동적 — 혈압/혈당 | EHR 또는 자가측정 | 비정기 |
| 환경 — 거주지 | 위치(동의 시) | 월 |
| 환경 — 스트레스 | 설문/음성분석 | 주 |

## 출력 형식 (zod 스키마)

```ts
import { z } from 'zod';

export const PredictionReport = z.object({
  bioAge: z.object({
    value: z.number(),                // 산출된 생물학적 나이
    ci95: z.tuple([z.number(), z.number()]),  // 95% 신뢰구간
    topContributors: z.array(z.object({
      factor: z.string(),
      direction: z.enum(['accelerate', 'decelerate']),
      weight: z.number(),
    })).max(3),
  }),
  lifeExpectancy: z.object({
    median: z.number(),               // 추정 중앙값 (절대 "예측 사망일" 표현 X)
    lower: z.number(),
    upper: z.number(),
  }),
  diseaseRisk: z.array(z.object({
    code: z.string(),
    label: z.string(),
    probability10y: z.number().min(0).max(1),
    modifiableFactors: z.array(z.string()),
  })).max(5),
  improvement: z.array(z.object({
    action: z.string(),               // "주 3회 30분 유산소"
    expectedDeltaYears: z.number(),
  })),
  disclaimer: z.string(),             // 항상 포함
  generatedAt: z.string().datetime(),
});
```

## 윤리 가드 (코드 레벨 강제)

```ts
function sanitizeReport(r: PredictionReport): PredictionReport {
  const forbidden = /진단|처방|치료|사망일|deathday/i;
  if (forbidden.test(JSON.stringify(r))) {
    throw new Error('Forbidden medical terms detected');
  }
  if (!r.disclaimer.includes('의학적 진단이 아님')) {
    r.disclaimer = '본 리포트는 의학적 진단이 아니며 건강 증진 참고용입니다. ' + r.disclaimer;
  }
  return r;
}
```

## ML 모델 정책

- 모델 버전은 응답 메타에 포함 (`modelVersion: 'chr-v1.0.2'`)
- 모델 변경 시 회귀 테스트 통과 + 변경 로그 (`docs/ml-changelog.md`)
- 학습 데이터 출처 명시 (UK Biobank, NHANES 등 공개 코호트 우선)
- 개인 데이터 학습 사용 시 사용자 별도 동의 필요

## 금지

- 단정형 (`"당신은 75세에 사망합니다"`) — 항상 범위/확률
- 18세 미만 대상 예측 — API에서 차단
- 임신/말기질환자 등 특수 상태 — 별도 가이드 분기
