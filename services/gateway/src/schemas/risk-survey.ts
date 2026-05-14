import { z } from 'zod';

export const DISCLAIMER =
  '본 리포트는 의료 행위를 대체할 수 없으며 건강 증진 참고용입니다.';

export const RiskCategory = z.enum(['low', 'moderate', 'high']);
export type RiskCategory = z.infer<typeof RiskCategory>;

// 절차서 7.3 / CLAUDE.md 의료 윤리 가드:
// 응답에 다음 단어 절대 포함 금지 (compliance-reviewer / CI grep 가드와 동일):
//   진단 / 처방 / 치료 / 여명 / 사망일 / deathday / diagnose / prescribe

export const RiskSurveyRequest = z.object({
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
  sex: z.enum(['male', 'female', 'other']),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(20).max(300),

  smoking: z.enum(['never', 'former', 'current']),
  alcoholDrinksPerWeek: z.number().int().min(0).max(100),
  exerciseMinutesPerWeek: z.number().int().min(0).max(2000),
  sleepHoursPerNight: z.number().min(0).max(24),

  systolicBp: z.number().min(60).max(250).nullable(),
  diastolicBp: z.number().min(30).max(150).nullable(),
  fastingGlucose: z.number().min(30).max(500).nullable(),
  ldlCholesterol: z.number().min(30).max(400).nullable(),
  hdlCholesterol: z.number().min(10).max(200).nullable(),

  familyHistoryDiabetes: z.boolean(),
  familyHistoryHypertension: z.boolean(),
  familyHistoryCardiovascular: z.boolean(),

  stressLevel: z.enum(['low', 'medium', 'high']),
  selfRatedHealth: z.enum(['excellent', 'good', 'fair', 'poor']),

  consentToStore: z.boolean(),
  consentToResearch: z.boolean(),
});
export type RiskSurveyRequest = z.infer<typeof RiskSurveyRequest>;

export type Contributor = {
  factor: string;
  direction: 'accelerate' | 'decelerate';
  magnitude: number;
};

export type DiseaseRisk = {
  code: string;
  label: string;
  probability5y: number;
  riskCategory: RiskCategory;
  modifiableFactors: string[];
};

export type Improvement = {
  action: string;
  expectedBioAgeDeltaYears: number;
  confidence: 'low' | 'medium' | 'high';
};

export type RiskSurveyResponse = {
  reportId: string;
  generatedAt: string;
  modelVersion: string;
  bioAge: {
    value: number;
    chronologicalAge: number;
    ci95: [number, number];
    topContributors: Contributor[];
  };
  diseaseRisk: DiseaseRisk[];
  improvement: Improvement[];
  disclaimer: string;
  hotlines: {
    suicidePrevention: string | null;
    mentalHealthCrisis: string | null;
  };
};
