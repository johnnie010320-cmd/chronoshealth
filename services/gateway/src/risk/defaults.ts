import type { RiskSurveyRequest } from '../schemas/risk-survey.js';

// 누락된 측정값의 성별 평균 기본값 (KNHANES / NHANES 공개 통계 근사).
// 미지의 측정값은 위험 추정에 중립 입력으로 사용. 의료 자문 시 갱신.

const DEFAULTS_MALE = {
  systolicBp: 122,
  diastolicBp: 78,
  fastingGlucose: 92,
  hdlCholesterol: 48,
  ldlCholesterol: 115,
};

const DEFAULTS_FEMALE = {
  systolicBp: 118,
  diastolicBp: 75,
  fastingGlucose: 90,
  hdlCholesterol: 58,
  ldlCholesterol: 110,
};

export type FilledInput = RiskSurveyRequest & {
  systolicBp: number;
  diastolicBp: number;
  fastingGlucose: number;
  hdlCholesterol: number;
  ldlCholesterol: number;
  totalCholesterolApprox: number;
  bmi: number;
};

export function fillDefaults(input: RiskSurveyRequest): FilledInput {
  const base = input.sex === 'female' ? DEFAULTS_FEMALE : DEFAULTS_MALE;
  const systolicBp = input.systolicBp ?? base.systolicBp;
  const diastolicBp = input.diastolicBp ?? base.diastolicBp;
  const fastingGlucose = input.fastingGlucose ?? base.fastingGlucose;
  const hdlCholesterol = input.hdlCholesterol ?? base.hdlCholesterol;
  const ldlCholesterol = input.ldlCholesterol ?? base.ldlCholesterol;
  // Friedewald 역산 근사: TC ≈ LDL + HDL + (TG/5). TG 없으므로 30으로 추정.
  const totalCholesterolApprox = ldlCholesterol + hdlCholesterol + 30;
  const bmi = input.weightKg / Math.pow(input.heightCm / 100, 2);

  return {
    ...input,
    systolicBp,
    diastolicBp,
    fastingGlucose,
    hdlCholesterol,
    ldlCholesterol,
    totalCholesterolApprox,
    bmi,
  };
}

export function chronologicalAge(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear;
}
