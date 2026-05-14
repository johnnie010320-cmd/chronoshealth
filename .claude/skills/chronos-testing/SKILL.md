---
name: chronos-testing
description: Chronos Health 테스트 패턴 (vitest 단위, Playwright E2E, ML 모델 회귀). 테스트 작성/수정 시 호출.
---

# Chronos Testing Skill

## 테스트 레이어

| 레이어 | 도구 | 위치 | 실행 |
|--------|------|------|------|
| 단위 (pure 함수) | Vitest | `*.test.ts` (소스 옆) | `npm test` |
| 컴포넌트 | Vitest + Testing Library | `*.test.tsx` | `npm test` |
| API Route | Vitest + supertest | `src/app/api/**/*.test.ts` | `npm test` |
| E2E | Playwright | `e2e/` | `npm run e2e` |
| ML 회귀 | pytest (Python) | `ml/tests/` | `cd ml && pytest` |

## 패턴

### Bio Age 계산 테스트 (예시)
```ts
import { describe, it, expect } from 'vitest';
import { computeBioAge } from './bio-age';

describe('computeBioAge', () => {
  it('30대 평균 데이터는 30 ±3 반환', () => {
    const result = computeBioAge({
      chronoAge: 30, hrv: 50, sleepEff: 0.85, vo2max: 40,
    });
    expect(result.value).toBeGreaterThan(27);
    expect(result.value).toBeLessThan(33);
  });

  it('필수 인자 누락 시 ValidationError', () => {
    expect(() => computeBioAge({ chronoAge: 30 } as any))
      .toThrow(/required/);
  });
});
```

### 금지 패턴
- Supabase mock 으로 통합 테스트 — 실제 dev DB 사용
- 비결정적 테스트 (랜덤 시드 없이 ML 출력 비교)
- 하드코딩된 날짜 (`new Date('2026-01-01')` 같은 고정값 사용)

## 윤리/규제 회귀 테스트 (필수)

```ts
it('예측 리포트는 항상 신뢰구간을 포함한다', () => {
  const report = generateReport(sampleData);
  expect(report.lifeExpectancy.lower).toBeDefined();
  expect(report.lifeExpectancy.upper).toBeDefined();
  expect(report.disclaimer).toContain('의학적 진단이 아님');
});

it('"진단" 단어가 모든 응답에서 제거되어 있다', () => {
  const report = generateReport(sampleData);
  expect(JSON.stringify(report)).not.toMatch(/진단|처방|치료/);
});
```

## 커버리지 목표

- `src/features/prediction/`: 90%+ (예측 정확도 직접 영향)
- `src/features/token/`: 95%+ (자금 관련)
- 기타: 70%+
