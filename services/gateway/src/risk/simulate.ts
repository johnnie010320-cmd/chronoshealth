import { estimate } from './index.js';
import { predictedYearsRemaining } from '../avatar/pyr.js';
import type {
  Overrides,
  SimulateRequest,
  SimulateResponse,
} from '../schemas/simulate.js';
import type {
  RiskSurveyRequest,
  RiskSurveyResponse,
} from '../schemas/risk-survey.js';

// spec docs/spec/simulation.md §3, §5.

export class SimulateError extends Error {
  constructor(public code: 'SMOKING_REGRESSION') {
    super(code);
  }
}

const SMOKING_RANK: Record<RiskSurveyRequest['smoking'], number> = {
  current: 2,
  former: 1,
  never: 0,
};

function applyOverrides(
  base: RiskSurveyRequest,
  overrides: Overrides,
): RiskSurveyRequest {
  if (overrides.smoking !== undefined) {
    if (SMOKING_RANK[overrides.smoking] > SMOKING_RANK[base.smoking]) {
      throw new SimulateError('SMOKING_REGRESSION');
    }
  }
  return {
    ...base,
    ...(overrides.exerciseMinutesPerWeek !== undefined
      ? { exerciseMinutesPerWeek: overrides.exerciseMinutesPerWeek }
      : {}),
    ...(overrides.sleepHoursPerNight !== undefined
      ? { sleepHoursPerNight: overrides.sleepHoursPerNight }
      : {}),
    ...(overrides.alcoholDrinksPerWeek !== undefined
      ? { alcoholDrinksPerWeek: overrides.alcoholDrinksPerWeek }
      : {}),
    ...(overrides.smoking !== undefined ? { smoking: overrides.smoking } : {}),
    ...(overrides.weightKg !== undefined ? { weightKg: overrides.weightKg } : {}),
    ...(overrides.stressLevel !== undefined
      ? { stressLevel: overrides.stressLevel }
      : {}),
  };
}

const DISEASE_CODES = ['cvd', 'diabetes', 'ckd', 'dementia', 'cancer'] as const;

function diseaseProbByCode(
  res: RiskSurveyResponse,
): Record<(typeof DISEASE_CODES)[number], number> {
  const out: Record<string, number> = {};
  for (const code of DISEASE_CODES) {
    const found = res.diseaseRisk.find((d) => d.code === code);
    out[code] = found?.probability5y ?? 0;
  }
  return out as Record<(typeof DISEASE_CODES)[number], number>;
}

const SIMULATE_DISCLAIMER =
  '본 시뮬레이션은 결정형 계수 기반 추정으로 의료 자문을 대체하지 않습니다.';

export function runSimulation(input: SimulateRequest): SimulateResponse {
  const baseline = estimate(input.base);
  const mergedReq = applyOverrides(input.base, input.overrides);
  const simulated = estimate(mergedReq);

  const chronologicalAge =
    new Date().getFullYear() - input.base.birthYear;

  const baselinePyr = predictedYearsRemaining({
    country: 'KR',
    chronologicalAge,
    bioAge: baseline.bioAge.value,
    sex: input.base.sex,
  });
  const simulatedPyr = predictedYearsRemaining({
    country: 'KR',
    chronologicalAge,
    bioAge: simulated.bioAge.value,
    sex: input.base.sex,
  });

  const baseDis = diseaseProbByCode(baseline);
  const simDis = diseaseProbByCode(simulated);

  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    baseline,
    simulated,
    delta: {
      bioAgeYears: round1(simulated.bioAge.value - baseline.bioAge.value),
      predictedYearsRemaining: {
        median: round1(simulatedPyr.median - baselinePyr.median),
        ci95: [
          round1(simulatedPyr.ci95[0] - baselinePyr.ci95[0]),
          round1(simulatedPyr.ci95[1] - baselinePyr.ci95[1]),
        ],
      },
      diseaseRiskPctPoints: {
        cvd: round1((simDis.cvd - baseDis.cvd) * 100),
        diabetes: round1((simDis.diabetes - baseDis.diabetes) * 100),
        ckd: round1((simDis.ckd - baseDis.ckd) * 100),
        dementia: round1((simDis.dementia - baseDis.dementia) * 100),
        cancer: round1((simDis.cancer - baseDis.cancer) * 100),
      },
    },
    disclaimer: SIMULATE_DISCLAIMER,
    modelVersion: 'rs-v0.1.0',
  };
}
