import { z } from 'zod';
import { RiskSurveyRequest } from './risk-survey.js';

// spec docs/spec/simulation.md §4. M7 What-if.
// overrides 6변수 한정 — 그 외 신체측정값/가족력은 변경 불가 (P1).

const Smoking = z.enum(['never', 'former', 'current']);
const StressLevel = z.enum(['low', 'medium', 'high']);

export const Overrides = z
  .object({
    exerciseMinutesPerWeek: z.number().int().min(0).max(2000).optional(),
    sleepHoursPerNight: z.number().min(0).max(24).optional(),
    alcoholDrinksPerWeek: z.number().int().min(0).max(100).optional(),
    smoking: Smoking.optional(),
    weightKg: z.number().min(20).max(300).optional(),
    stressLevel: StressLevel.optional(),
  })
  .strict();

export type Overrides = z.infer<typeof Overrides>;

export const SimulateRequest = z.object({
  base: RiskSurveyRequest,
  overrides: Overrides,
});
export type SimulateRequest = z.infer<typeof SimulateRequest>;

export type DiseaseRiskDelta = {
  cvd: number;
  diabetes: number;
  ckd: number;
  dementia: number;
  cancer: number;
};

export type SimulateResponse = {
  baseline: import('./risk-survey.js').RiskSurveyResponse;
  simulated: import('./risk-survey.js').RiskSurveyResponse;
  delta: {
    bioAgeYears: number;
    predictedYearsRemaining: { median: number; ci95: [number, number] };
    diseaseRiskPctPoints: DiseaseRiskDelta;
  };
  disclaimer: string;
  modelVersion: string;
};
