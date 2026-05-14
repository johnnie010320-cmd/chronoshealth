import { z } from 'zod';

// services/gateway/src/schemas/risk-survey.ts와 동기. P1 후반에 packages/types로 이동 예정.

export const DISCLAIMER =
  '본 리포트는 의료 행위를 대체할 수 없으며 건강 증진 참고용입니다.';

export const RiskSurveyRequest = z.object({
  birthYear: z
    .number()
    .int()
    .min(1900)
    .refine((y) => y <= new Date().getFullYear(), {
      message: 'birthYear cannot be in the future',
    }),
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

export type RiskSurveyResponse = {
  reportId: string;
  generatedAt: string;
  modelVersion: string;
  bioAge: {
    value: number;
    chronologicalAge: number;
    ci95: [number, number];
    topContributors: Array<{
      factor: string;
      direction: 'accelerate' | 'decelerate';
      magnitude: number;
    }>;
  };
  diseaseRisk: Array<{
    code: string;
    label: string;
    probability5y: number;
    riskCategory: 'low' | 'moderate' | 'high';
    modifiableFactors: string[];
  }>;
  improvement: Array<{
    action: string;
    expectedBioAgeDeltaYears: number;
    confidence: 'low' | 'medium' | 'high';
  }>;
  disclaimer: string;
  hotlines: {
    suicidePrevention: string | null;
    mentalHealthCrisis: string | null;
  };
};
