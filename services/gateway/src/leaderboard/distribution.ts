// spec docs/spec/leaderboard.md §3, §5.
// P1 한정 모의 정규분포. P2 후반 ECDF 로 교체.

type Sex = 'male' | 'female' | 'other';

export const AGE_BANDS = [
  '19-24',
  '25-29',
  '30-34',
  '35-39',
  '40-44',
  '45-49',
  '50-54',
  '55-59',
  '60-64',
  '65-69',
  '70-74',
  '75+',
] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

type Stats = { mean: number; sd: number; population: number };

// 평균 활력 점수는 연령대 ↑ 시 감소. sd 는 16 전후.
// population 은 추정값 (연령 분포 기반).
const WORLD_BY_AGE: Record<AgeBand, Stats> = {
  '19-24': { mean: 80, sd: 12, population: 600_000_000 },
  '25-29': { mean: 78, sd: 13, population: 620_000_000 },
  '30-34': { mean: 76, sd: 14, population: 600_000_000 },
  '35-39': { mean: 74, sd: 14, population: 580_000_000 },
  '40-44': { mean: 70, sd: 15, population: 540_000_000 },
  '45-49': { mean: 67, sd: 15, population: 500_000_000 },
  '50-54': { mean: 63, sd: 16, population: 460_000_000 },
  '55-59': { mean: 59, sd: 16, population: 420_000_000 },
  '60-64': { mean: 55, sd: 17, population: 360_000_000 },
  '65-69': { mean: 50, sd: 17, population: 300_000_000 },
  '70-74': { mean: 45, sd: 18, population: 240_000_000 },
  '75+': { mean: 38, sd: 18, population: 320_000_000 },
};

// 국가 — 한국 / 미국 / 일본 / 스페인. 인구는 동일 연령대 비례.
const COUNTRY_FACTOR: Record<'KR' | 'US' | 'JP' | 'ES', number> = {
  KR: 51_700_000 / 8_000_000_000,
  US: 333_000_000 / 8_000_000_000,
  JP: 125_000_000 / 8_000_000_000,
  ES: 47_500_000 / 8_000_000_000,
};

// 성별 평균 보정 — female +2 (한국 통계청 기대수명 보정 추세 단순화)
const SEX_OFFSET: Record<Sex, number> = { female: 2, male: 0, other: 1 };

export function bandFor(age: number): AgeBand {
  if (age < 25) return '19-24';
  if (age < 30) return '25-29';
  if (age < 35) return '30-34';
  if (age < 40) return '35-39';
  if (age < 45) return '40-44';
  if (age < 50) return '45-49';
  if (age < 55) return '50-54';
  if (age < 60) return '55-59';
  if (age < 65) return '60-64';
  if (age < 70) return '65-69';
  if (age < 75) return '70-74';
  return '75+';
}

export function statsFor(args: {
  scope: 'world' | 'country';
  country?: 'KR' | 'US' | 'JP' | 'ES' | 'OTHER';
  ageBand: AgeBand;
  sex: Sex;
}): Stats {
  const base = WORLD_BY_AGE[args.ageBand];
  let population = base.population;
  if (args.scope === 'country') {
    const factor =
      args.country && args.country !== 'OTHER'
        ? COUNTRY_FACTOR[args.country]
        : COUNTRY_FACTOR.KR;
    population = Math.round(base.population * factor);
  }
  return {
    mean: base.mean + SEX_OFFSET[args.sex],
    sd: base.sd,
    population,
  };
}
