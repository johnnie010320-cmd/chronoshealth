// 스토리보드 p26 — 생애 예상 의료비.
// 통계 추정 (의료자문 아님) — 한국 보건복지부 통계, OECD 자료 기반.
// 기준: 평균 1인 생애 의료비 ~1.4억원 (한국, 75세 기대수명 가정).
// 모델은 추정값으로, 사용자에게 보여줄 때 면책 명시.

export type LifetimeMedicalCost = {
  totalKrw: number;
  perDecadeKrw: number[];
  basis: string;
  modelVersion: string;
};

const BASELINE_PER_YEAR_KRW = 1_400_000; // 평균 연간 의료비 (보건복지부 시계열 가정).
const RISK_MULTIPLIER: Record<string, number> = {
  cvd: 1.4,
  diabetes: 1.25,
  ckd: 1.5,
  dementia: 1.6,
  cancer: 1.8,
};

export function estimateLifetimeCost(opts: {
  chronologicalAge: number;
  predictedRemainingYears: number;
  bioAgePenalty?: number;
  risks?: Partial<Record<keyof typeof RISK_MULTIPLIER, number>>;
}): LifetimeMedicalCost {
  let multiplier = 1;
  for (const [k, v] of Object.entries(opts.risks ?? {})) {
    if (v == null) continue;
    const factor = RISK_MULTIPLIER[k] ?? 1;
    // 5년 위험도 v(0~1) 비례하여 multiplier 가산.
    multiplier += (factor - 1) * Math.min(1, v * 4);
  }
  // bio age 페널티 (실제 나이 대비 bio age 가 높을수록 의료비 가산).
  if (opts.bioAgePenalty && opts.bioAgePenalty > 0) {
    multiplier *= 1 + Math.min(0.5, opts.bioAgePenalty * 0.02);
  }
  const years = Math.max(0, Math.round(opts.predictedRemainingYears));
  const perYear = Math.round(BASELINE_PER_YEAR_KRW * multiplier);

  // 10년 단위 분해 — 나이 증가에 따라 의료비 증가 곡선 (60대 미만 1.0, 60대 1.2, 70대 1.5, 80대+ 2.0).
  //
  // v0.1.0 결함: totalKrw = perYear × years 로 계산해 연령 배수 곡선을 총액에 전혀
  // 반영하지 않았다. 그래서 화면의 총액이 10년 단위 합보다 작았다.
  // (예: 40세 · 잔여 40년 → 총액 5,600만원 vs 분해 합 7,280만원)
  // 총액은 분해 합과 항상 같아야 한다.
  //
  // 또 배수를 "10년 구간의 시작 나이" 로 한 번만 정해, 구간 중간에 60/70/80 을 넘어가는
  // 해들이 통째로 낮은 배수를 받았다. 연 단위로 배수를 매긴 뒤 10년씩 묶는다.
  const perDecade: number[] = [];
  let total = 0;
  for (let start = 0; start < years; start += 10) {
    const decadeYears = Math.min(10, years - start);
    let decadeCost = 0;
    for (let y = 0; y < decadeYears; y += 1) {
      decadeCost += perYear * ageMultiplier(opts.chronologicalAge + start + y);
    }
    // 반올림한 값을 더한다 — 총액이 표시되는 분해 합과 1원도 어긋나지 않도록.
    const rounded = Math.round(decadeCost);
    perDecade.push(rounded);
    total += rounded;
  }

  return {
    totalKrw: total,
    perDecadeKrw: perDecade,
    basis: '한국 보건복지부 통계 평균 의료비 ~140만원/년 (1인 기준) 기준 — 예측 추정',
    modelVersion: 'lifetime-cost-v0.2.0',
  };
}

// 연령대별 의료비 배수 (스토리보드 p26 곡선).
function ageMultiplier(age: number): number {
  if (age >= 80) return 2.0;
  if (age >= 70) return 1.5;
  if (age >= 60) return 1.2;
  return 1.0;
}
