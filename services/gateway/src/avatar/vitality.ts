import type { RiskSurveyResponse } from '../schemas/risk-survey.js';

// spec docs/spec/avatar-chronos.md §3 Vitality Score 0~100.

export type VitalityTier = 'excellent' | 'good' | 'fair' | 'attention';

const STRESS_PENALTY: Record<string, number> = {
  low: 0,
  medium: 3,
  high: 8,
};

// 점수 임계 (spec §9 #1 미해결 항목, 현 가설값)
// 모의분포(percentile.ts)·실측 ECDF(ecdf.ts) 양쪽이 동일 임계를 써야 하므로 export.
export const VITALITY_TIER_CUTS = {
  excellent: 85,
  good: 70,
  fair: 50,
} as const;

const TIER_THRESHOLDS: Array<[number, VitalityTier]> = [
  [VITALITY_TIER_CUTS.excellent, 'excellent'],
  [VITALITY_TIER_CUTS.good, 'good'],
  [VITALITY_TIER_CUTS.fair, 'fair'],
  [0, 'attention'],
];

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// 5년 위험 합산 기준 baseline. 평균적 인구 ≈ 10% (5종 합산).
// 그 이상은 baseline 대비 비례 페널티.
const TOTAL_RISK_BASELINE = 0.10;
const RISK_PENALTY_PER_POINT = 200; // 0.5% over baseline = 1점 감점
const RISK_PENALTY_CAP = 50;

export function calcVitalityScore(args: {
  bioAgeValue: number;
  chronologicalAge: number;
  diseaseProbs: number[];
  stressLevel: 'low' | 'medium' | 'high';
}): { value: number; tier: VitalityTier } {
  const agingPenalty = clamp(args.bioAgeValue - args.chronologicalAge, 0, 30) * 1.5;
  const totalRisk = args.diseaseProbs.reduce((acc, p) => acc + p, 0);
  const riskPenalty = clamp(
    (totalRisk - TOTAL_RISK_BASELINE) * RISK_PENALTY_PER_POINT,
    0,
    RISK_PENALTY_CAP,
  );
  const stressPenalty = STRESS_PENALTY[args.stressLevel] ?? 3;

  const raw = 100 - agingPenalty - riskPenalty - stressPenalty;
  const value = Math.round(clamp(raw, 0, 100));

  const tier =
    TIER_THRESHOLDS.find((t) => value >= t[0])?.[1] ?? 'attention';
  return { value, tier };
}

export function vitalityFromReport(report: RiskSurveyResponse): {
  value: number;
  tier: VitalityTier;
} {
  return calcVitalityScore({
    bioAgeValue: report.bioAge.value,
    chronologicalAge: report.bioAge.chronologicalAge,
    diseaseProbs: report.diseaseRisk.map((d) => d.probability5y),
    stressLevel: 'medium',
  });
}
