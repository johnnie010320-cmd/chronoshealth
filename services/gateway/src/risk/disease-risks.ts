import { fillDefaults } from './defaults.js';
import { framinghamCvdRisk } from './framingham.js';
import type { RiskSurveyRequest } from '../schemas/risk-survey.js';

// 5가지 5년 위험:
// 1. CVD (Framingham 일반) — 정통 식
// 2. 뇌졸중 — CVD의 일부 (단순화: CVD의 30%)
// 3. 2형 당뇨 — ADA 가이드라인 + 공복혈당 + BMI + 가족력 (휴리스틱)
// 4. 고혈압 — 현재 혈압 + BMI + 가족력 (휴리스틱)
// 5. 전체 사망 (5년) — Framingham + 흡연 + BMI 합성 휴리스틱
//
// 휴리스틱 위험들은 정통 ML 모델 아님 → P3에서 학습 모델로 교체.

export type RiskCategory = 'low' | 'moderate' | 'high';

export type DiseaseRiskItem = {
  code: string;
  label: string;
  probability5y: number;
  riskCategory: RiskCategory;
  modifiableFactors: string[];
};

function categorize(prob: number, thresholds: [number, number]): RiskCategory {
  if (prob < thresholds[0]) return 'low';
  if (prob < thresholds[1]) return 'moderate';
  return 'high';
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(0.99, x));
}

export function estimateDiseaseRisks(
  input: RiskSurveyRequest,
): DiseaseRiskItem[] {
  const f = fillDefaults(input);
  const cvd = framinghamCvdRisk(input);

  const cvdItem: DiseaseRiskItem = {
    code: 'I20-I25',
    label: '심혈관 질환 (Framingham 일반)',
    probability5y: cvd.probability5y,
    riskCategory: categorize(cvd.probability5y, [0.025, 0.1]),
    modifiableFactors: collectCvdFactors(f),
  };

  // 뇌졸중: CVD의 약 30% (Framingham stroke vs general CVD 비율 근사)
  const strokeProb = cvd.probability5y * 0.3;
  const strokeItem: DiseaseRiskItem = {
    code: 'I60-I69',
    label: '뇌졸중',
    probability5y: strokeProb,
    riskCategory: categorize(strokeProb, [0.01, 0.04]),
    modifiableFactors: collectCvdFactors(f),
  };

  // 2형 당뇨 — 휴리스틱
  // 기본 위험 + 공복혈당 + BMI + 가족력 + 운동 부족
  let diabetes = 0.005;
  if (f.fastingGlucose >= 126) diabetes += 0.5;
  else if (f.fastingGlucose >= 110) diabetes += 0.15;
  else if (f.fastingGlucose >= 100) diabetes += 0.05;
  if (f.bmi >= 30) diabetes += 0.08;
  else if (f.bmi >= 25) diabetes += 0.03;
  if (f.familyHistoryDiabetes) diabetes += 0.05;
  if (f.exerciseMinutesPerWeek < 60) diabetes += 0.03;
  diabetes = clamp01(diabetes);

  const diabetesItem: DiseaseRiskItem = {
    code: 'E11',
    label: '제2형 당뇨병',
    probability5y: diabetes,
    riskCategory: categorize(diabetes, [0.03, 0.1]),
    modifiableFactors: collectDiabetesFactors(f),
  };

  // 고혈압 발생/악화 — 휴리스틱
  let hyper = 0.01;
  if (f.systolicBp >= 140) hyper = 0.95; // 이미 고혈압
  else if (f.systolicBp >= 130) hyper += 0.4;
  else if (f.systolicBp >= 120) hyper += 0.15;
  if (f.bmi >= 30) hyper += 0.1;
  else if (f.bmi >= 25) hyper += 0.05;
  if (f.familyHistoryHypertension) hyper += 0.05;
  if (f.alcoholDrinksPerWeek > 14) hyper += 0.05;
  if (f.exerciseMinutesPerWeek < 60) hyper += 0.03;
  hyper = clamp01(hyper);

  const hyperItem: DiseaseRiskItem = {
    code: 'I10',
    label: '고혈압',
    probability5y: hyper,
    riskCategory: categorize(hyper, [0.1, 0.3]),
    modifiableFactors: collectHypertensionFactors(f),
  };

  // 전체 사망 (5년) — 휴리스틱 합성 (Framingham 비례 + 흡연/BMI)
  let mortality = cvd.probability5y * 0.5; // CVD가 사망 원인의 약 30~40%
  if (f.smoking === 'current') mortality += 0.015;
  if (f.bmi >= 35) mortality += 0.01;
  else if (f.bmi < 18.5) mortality += 0.005;
  if (f.selfRatedHealth === 'poor') mortality += 0.01;
  mortality = clamp01(mortality);

  const mortalityItem: DiseaseRiskItem = {
    code: 'R99',
    label: '전체 위험 종합',
    probability5y: mortality,
    riskCategory: categorize(mortality, [0.02, 0.08]),
    modifiableFactors: collectMortalityFactors(f),
  };

  return [cvdItem, hyperItem, diabetesItem, strokeItem, mortalityItem];
}

function collectCvdFactors(f: ReturnType<typeof fillDefaults>): string[] {
  const items: string[] = [];
  if (f.smoking === 'current') items.push('금연');
  if (f.systolicBp >= 130) items.push('혈압 관리');
  if (f.ldlCholesterol >= 130) items.push('LDL 관리');
  if (f.exerciseMinutesPerWeek < 150) items.push('주 150분+ 운동');
  if (f.bmi >= 25) items.push('체중 관리');
  return items;
}

function collectDiabetesFactors(f: ReturnType<typeof fillDefaults>): string[] {
  const items: string[] = [];
  if (f.fastingGlucose >= 100) items.push('혈당 관리');
  if (f.bmi >= 25) items.push('체중 감량');
  if (f.exerciseMinutesPerWeek < 150) items.push('주 150분+ 운동');
  return items;
}

function collectHypertensionFactors(
  f: ReturnType<typeof fillDefaults>,
): string[] {
  const items: string[] = [];
  if (f.systolicBp >= 120) items.push('혈압 모니터링');
  if (f.bmi >= 25) items.push('체중 관리');
  if (f.alcoholDrinksPerWeek > 14) items.push('음주 감량');
  if (f.exerciseMinutesPerWeek < 150) items.push('규칙적 운동');
  return items;
}

function collectMortalityFactors(
  f: ReturnType<typeof fillDefaults>,
): string[] {
  const items: string[] = [];
  if (f.smoking === 'current') items.push('금연');
  if (f.bmi >= 30 || f.bmi < 18.5) items.push('체중 정상화');
  if (f.exerciseMinutesPerWeek < 60) items.push('규칙적 활동');
  return items;
}
