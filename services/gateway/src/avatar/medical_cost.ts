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
  const total = perYear * years;

  // 10년 단위 분해 — 나이 증가에 따라 의료비 증가 곡선 (60대까지 1.0, 70대 1.5, 80대 2.0).
  const perDecade: number[] = [];
  let remaining = years;
  let age = opts.chronologicalAge;
  while (remaining > 0) {
    const decadeYears = Math.min(10, remaining);
    const ageMultiplier = age >= 80 ? 2.0 : age >= 70 ? 1.5 : age >= 60 ? 1.2 : 1.0;
    perDecade.push(Math.round(perYear * ageMultiplier * decadeYears));
    remaining -= decadeYears;
    age += decadeYears;
  }

  return {
    totalKrw: total,
    perDecadeKrw: perDecade,
    basis: '한국 보건복지부 통계 평균 의료비 ~140만원/년 (1인 기준) 기준 — 예측 추정',
    modelVersion: 'lifetime-cost-v0.1.0',
  };
}
