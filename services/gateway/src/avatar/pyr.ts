import { residualLifeExpectancy } from './life-expectancy.js';

// spec docs/spec/avatar-chronos.md §4 Predicted Years Remaining.
// PYR_median = max(0, lifeExpectancyByCountryAgeSex − (bioAge − chronologicalAge))
// PYR_ci95   = [PYR_median × 0.85, PYR_median × 1.15]
//
// 사용자의 chronologicalAge 기준 잔여기대수명에서, 생체 나이가 가속/감속된 만큼 가감.
// (bioAge 가 chronologicalAge 보다 크면 노화 가속 → 잔여 ↓)

export type PYR = {
  median: number;
  ci95: [number, number];
};

export function predictedYearsRemaining(args: {
  country: 'KR' | 'US' | 'JP' | 'ES' | 'OTHER';
  chronologicalAge: number;
  bioAge: number;
  sex: 'male' | 'female' | 'other';
}): PYR {
  const base = residualLifeExpectancy(args.country, args.chronologicalAge, args.sex);
  const accelerationYears = args.bioAge - args.chronologicalAge;
  const median = Math.max(0, Math.round((base - accelerationYears) * 10) / 10);
  const lower = Math.round(median * 0.85 * 10) / 10;
  const upper = Math.round(median * 1.15 * 10) / 10;
  return { median, ci95: [lower, upper] };
}
