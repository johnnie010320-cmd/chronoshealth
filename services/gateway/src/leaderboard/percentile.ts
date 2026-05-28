import { statsFor, bandFor, type AgeBand } from './distribution.js';
import {
  calcVitalityScore,
  type VitalityTier,
} from '../avatar/vitality.js';
import type { RiskSurveyResponse } from '../schemas/risk-survey.js';

// spec docs/spec/leaderboard.md §3, §4.

// Abramowitz & Stegun 26.2.17 — 정규 CDF 근사 (오차 < 7.5e-8).
function normalCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * ax);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1.0 + sign * y);
}

export type RankResponse = {
  scope: 'world' | 'country';
  country?: 'KR' | 'US' | 'JP' | 'ES' | 'OTHER';
  ageBand: AgeBand;
  sex: 'male' | 'female' | 'other';
  userVitalityScore: number;
  vitalityTier: VitalityTier;
  percentile: number;
  rankWithin: { value: number; total: number };
  tierDistribution: {
    excellent: number;
    good: number;
    fair: number;
    attention: number;
  };
  delta: {
    monthOverMonth: null;
    nextTierGap: number;
  };
  modelVersion: string;
  disclaimer: string;
};

const DISCLAIMER = '본 랭킹은 모의 정규분포 기반 추정입니다.';
const MODEL_VERSION = 'lb-v0.1.0';

// 다음 tier 까지의 점수 차이.
function nextTierGap(score: number): number {
  if (score < 50) return Math.round(50 - score);
  if (score < 70) return Math.round(70 - score);
  if (score < 85) return Math.round(85 - score);
  return 0;
}

// tier 분포: 정규분포 + 임계값(50/70/85) 기준 절단.
function tierCounts(mean: number, sd: number, total: number) {
  const cdf50 = normalCdf((50 - mean) / sd);
  const cdf70 = normalCdf((70 - mean) / sd);
  const cdf85 = normalCdf((85 - mean) / sd);
  const attention = Math.round(total * cdf50);
  const fair = Math.round(total * (cdf70 - cdf50));
  const good = Math.round(total * (cdf85 - cdf70));
  const excellent = total - attention - fair - good;
  return { attention, fair, good, excellent };
}

export function rankUser(args: {
  scope: 'world' | 'country';
  country?: 'KR' | 'US' | 'JP' | 'ES' | 'OTHER';
  age: number;
  sex: 'male' | 'female' | 'other';
  report: RiskSurveyResponse;
  stressLevel: 'low' | 'medium' | 'high';
}): RankResponse {
  const ageBand = bandFor(args.age);
  const stats = statsFor({
    scope: args.scope,
    ...(args.country ? { country: args.country } : {}),
    ageBand,
    sex: args.sex,
  });

  const vitality = calcVitalityScore({
    bioAgeValue: args.report.bioAge.value,
    chronologicalAge: args.report.bioAge.chronologicalAge,
    diseaseProbs: args.report.diseaseRisk.map((d) => d.probability5y),
    stressLevel: args.stressLevel,
  });

  const z = (vitality.value - stats.mean) / stats.sd;
  const percentile = Math.round(normalCdf(z) * 1000) / 10; // 0.1 자리
  const rankAbsolute = Math.max(
    1,
    Math.round(stats.population * (1 - percentile / 100)),
  );

  return {
    scope: args.scope,
    ...(args.scope === 'country' && args.country
      ? { country: args.country }
      : {}),
    ageBand,
    sex: args.sex,
    userVitalityScore: vitality.value,
    vitalityTier: vitality.tier,
    percentile,
    rankWithin: { value: rankAbsolute, total: stats.population },
    tierDistribution: tierCounts(stats.mean, stats.sd, stats.population),
    delta: {
      monthOverMonth: null,
      nextTierGap: nextTierGap(vitality.value),
    },
    modelVersion: MODEL_VERSION,
    disclaimer: DISCLAIMER,
  };
}
