import { statsFor, bandFor, type AgeBand } from './distribution.js';
import {
  calcVitalityScore,
  VITALITY_TIER_CUTS,
  type VitalityTier,
} from '../avatar/vitality.js';
import {
  ecdfPercentile,
  ecdfRank,
  MIN_SAMPLE_SIZE,
  type EmpiricalCell,
} from './ecdf.js';
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

/** 순위 산출 근거 — 모의 정규분포인가, 실사용자 표본인가. */
export type RankBasis = 'modeled' | 'empirical';

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
  /** 'empirical' = 같은 (연령대 × 성별) 실사용자 표본, 'modeled' = 모의 정규분포 */
  basis: RankBasis;
  /** basis='empirical' 일 때 표본 수. 'modeled' 이면 null. */
  sampleSize: number | null;
  modelVersion: string;
  disclaimer: string;
};

const DISCLAIMER_MODELED = '본 랭킹은 모의 정규분포 기반 추정입니다.';
const DISCLAIMER_EMPIRICAL = '본 랭킹은 같은 연령대·성별 실사용자 표본 기반입니다.';
const MODEL_VERSION = 'lb-v0.2.0';

// 다음 tier 까지의 점수 차이.
function nextTierGap(score: number): number {
  const { excellent, good, fair } = VITALITY_TIER_CUTS;
  if (score < fair) return Math.round(fair - score);
  if (score < good) return Math.round(good - score);
  if (score < excellent) return Math.round(excellent - score);
  return 0;
}

// tier 분포: 정규분포 + 임계값(50/70/85) 기준 절단.
function tierCounts(mean: number, sd: number, total: number) {
  const cdfFair = normalCdf((VITALITY_TIER_CUTS.fair - mean) / sd);
  const cdfGood = normalCdf((VITALITY_TIER_CUTS.good - mean) / sd);
  const cdfExcellent = normalCdf((VITALITY_TIER_CUTS.excellent - mean) / sd);
  const attention = Math.round(total * cdfFair);
  const fair = Math.round(total * (cdfGood - cdfFair));
  const good = Math.round(total * (cdfExcellent - cdfGood));
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
  /**
   * 같은 (연령대 × 성별) 셀의 실측 표본. 표본이 MIN_SAMPLE_SIZE 이상이면
   * 모의 정규분포 대신 이 분포로 순위를 낸다. 미지정/미달이면 모의분포.
   */
  empirical?: EmpiricalCell;
}): RankResponse {
  const ageBand = bandFor(args.age);

  const vitality = calcVitalityScore({
    bioAgeValue: args.report.bioAge.value,
    chronologicalAge: args.report.bioAge.chronologicalAge,
    diseaseProbs: args.report.diseaseRisk.map((d) => d.probability5y),
    stressLevel: args.stressLevel,
  });

  const common = {
    scope: args.scope,
    ...(args.scope === 'country' && args.country
      ? { country: args.country }
      : {}),
    ageBand,
    sex: args.sex,
    userVitalityScore: vitality.value,
    vitalityTier: vitality.tier,
    delta: {
      monthOverMonth: null,
      nextTierGap: nextTierGap(vitality.value),
    },
    modelVersion: MODEL_VERSION,
  } as const;

  // 실측 표본 충분 → ECDF.
  if (args.empirical && args.empirical.sampleSize >= MIN_SAMPLE_SIZE) {
    const cell = args.empirical;
    return {
      ...common,
      percentile: ecdfPercentile(cell),
      rankWithin: { value: ecdfRank(cell), total: cell.sampleSize },
      tierDistribution: cell.tierDistribution,
      basis: 'empirical',
      sampleSize: cell.sampleSize,
      disclaimer: DISCLAIMER_EMPIRICAL,
    };
  }

  // 표본 미달 → 모의 정규분포 (P1 기본).
  const stats = statsFor({
    scope: args.scope,
    ...(args.country ? { country: args.country } : {}),
    ageBand,
    sex: args.sex,
  });

  const z = (vitality.value - stats.mean) / stats.sd;
  const percentile = Math.round(normalCdf(z) * 1000) / 10; // 0.1 자리
  const rankAbsolute = Math.max(
    1,
    Math.round(stats.population * (1 - percentile / 100)),
  );

  return {
    ...common,
    percentile,
    rankWithin: { value: rankAbsolute, total: stats.population },
    tierDistribution: tierCounts(stats.mean, stats.sd, stats.population),
    basis: 'modeled',
    sampleSize: null,
    disclaimer: DISCLAIMER_MODELED,
  };
}
