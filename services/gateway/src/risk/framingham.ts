import { fillDefaults, chronologicalAge } from './defaults.js';
import type { RiskSurveyRequest } from '../schemas/risk-survey.js';

// Framingham 일반 CVD 10년 위험 (D'Agostino RB Sr et al. Circulation 2008).
// 5년 위험은 10년에서 1 - sqrt(1 - r10) 근사 (constant hazard 가정).
//
// 계수: Table 5 (men) + Table 6 (women) of D'Agostino 2008.
// https://www.ahajournals.org/doi/10.1161/CIRCULATIONAHA.107.699579
//
// 입력:
// - age (35~74 권장 범위)
// - totalChol (mg/dL)
// - hdl (mg/dL)
// - sbp (mmHg)
// - smoker (binary)
// - diabetes (binary; 공복혈당 ≥126 또는 자가 보고 — 우리는 공복혈당 사용)
// - treatedHypertension (binary; 우리는 가족력으로는 알 수 없으므로 false 가정)

const MEN = {
  ageB: 3.06117,
  totalCholB: 1.12370,
  hdlB: -0.93263,
  sbpUntreatedB: 1.93303,
  sbpTreatedB: 1.99881,
  smokerB: 0.65451,
  diabetesB: 0.57367,
  meanLP: 23.9802,
  baselineS0_10y: 0.88936,
};

const WOMEN = {
  ageB: 2.32888,
  totalCholB: 1.20904,
  hdlB: -0.70833,
  sbpUntreatedB: 2.76157,
  sbpTreatedB: 2.82263,
  smokerB: 0.52873,
  diabetesB: 0.69154,
  meanLP: 26.1931,
  baselineS0_10y: 0.95012,
};

export type FraminghamResult = {
  probability5y: number;
  probability10y: number;
};

export function framinghamCvdRisk(input: RiskSurveyRequest): FraminghamResult {
  const f = fillDefaults(input);
  const age = chronologicalAge(f.birthYear);
  const c = f.sex === 'female' ? WOMEN : MEN;

  // 범위 외(35 미만) 입력은 35로 클램프 (Framingham 검증 범위 밖이므로 위험 과소평가 가능 — 의료 자문 시 보완).
  const ageClamped = Math.max(35, Math.min(74, age));

  const smoker = f.smoking === 'current' ? 1 : 0;
  const diabetes = f.fastingGlucose >= 126 ? 1 : 0;
  // 고혈압 치료 여부는 자가 보고 없음. 보수적으로 untreated로 분류 (현 단계).
  // 의료 자문 시 별도 문항 추가 + treated 계수 사용 검토.

  const lp =
    c.ageB * Math.log(ageClamped) +
    c.totalCholB * Math.log(f.totalCholesterolApprox) +
    c.hdlB * Math.log(f.hdlCholesterol) +
    c.sbpUntreatedB * Math.log(f.systolicBp) +
    c.smokerB * smoker +
    c.diabetesB * diabetes;

  const r10 = 1 - Math.pow(c.baselineS0_10y, Math.exp(lp - c.meanLP));
  const r10Bounded = Math.max(0, Math.min(0.99, r10));

  // 10년 → 5년 근사 (지수 hazard 가정): 1 - (1-r10)^0.5
  const r5 = 1 - Math.sqrt(1 - r10Bounded);

  return {
    probability5y: r5,
    probability10y: r10Bounded,
  };
}
