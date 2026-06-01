import type { RiskSurveyRequest, RiskSurveyResponse } from '../schemas/risk-survey.js';

export type Severity = 'info' | 'recommend' | 'attention';

export type CareRule = {
  ruleId: string;
  severity: Severity;
};

export type CareCategory = 'diet' | 'exercise' | 'medical';

export type CareContext = {
  bmi: number | null;
  age: number;
  exerciseMinutesPerWeek: number;
  alcoholDrinksPerWeek: number;
  smoking: RiskSurveyRequest['smoking'];
  sleepHoursPerNight: number;
  stressLevel: 'low' | 'medium' | 'high';
};

function bmiOf(heightCm: number, weightKg: number): number | null {
  if (heightCm <= 0 || weightKg <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

// 5-rule diet / 5-rule exercise / 5-rule medical heuristic set.
// Future R5 enhancement: LLM at ML serving (P3). Current is deterministic.
export function evaluateCareRules(
  survey: RiskSurveyRequest,
  report: RiskSurveyResponse,
): { context: CareContext; diet: CareRule[]; exercise: CareRule[]; medical: CareRule[] } {
  const age = report.bioAge.chronologicalAge;
  const bmi = bmiOf(survey.heightCm, survey.weightKg);

  const context: CareContext = {
    bmi,
    age,
    exerciseMinutesPerWeek: survey.exerciseMinutesPerWeek,
    alcoholDrinksPerWeek: survey.alcoholDrinksPerWeek,
    smoking: survey.smoking,
    sleepHoursPerNight: survey.sleepHoursPerNight,
    stressLevel: survey.stressLevel,
  };

  const diet: CareRule[] = [];
  if (bmi !== null) {
    if (bmi >= 30) diet.push({ ruleId: 'diet.bmi.obese', severity: 'attention' });
    else if (bmi >= 25) diet.push({ ruleId: 'diet.bmi.overweight', severity: 'recommend' });
    else if (bmi < 18.5) diet.push({ ruleId: 'diet.bmi.underweight', severity: 'recommend' });
    else diet.push({ ruleId: 'diet.bmi.healthy', severity: 'info' });
  }
  if (survey.alcoholDrinksPerWeek >= 14) {
    diet.push({ ruleId: 'diet.alcohol.heavy', severity: 'attention' });
  } else if (survey.alcoholDrinksPerWeek >= 7) {
    diet.push({ ruleId: 'diet.alcohol.moderate', severity: 'recommend' });
  } else {
    diet.push({ ruleId: 'diet.alcohol.light', severity: 'info' });
  }
  if (survey.familyHistoryDiabetes) {
    diet.push({ ruleId: 'diet.family.diabetes', severity: 'recommend' });
  }

  const exercise: CareRule[] = [];
  if (survey.exerciseMinutesPerWeek < 75) {
    exercise.push({ ruleId: 'exercise.low', severity: 'attention' });
  } else if (survey.exerciseMinutesPerWeek < 150) {
    exercise.push({ ruleId: 'exercise.moderate', severity: 'recommend' });
  } else if (survey.exerciseMinutesPerWeek <= 600) {
    exercise.push({ ruleId: 'exercise.healthy', severity: 'info' });
  } else {
    exercise.push({ ruleId: 'exercise.excessive', severity: 'recommend' });
  }
  if (survey.sleepHoursPerNight < 6) {
    exercise.push({ ruleId: 'exercise.sleep.short', severity: 'attention' });
  } else if (survey.sleepHoursPerNight > 9) {
    exercise.push({ ruleId: 'exercise.sleep.long', severity: 'recommend' });
  }
  if (survey.stressLevel === 'high') {
    exercise.push({ ruleId: 'exercise.stress.high', severity: 'recommend' });
  }

  const medical: CareRule[] = [];
  if (survey.smoking === 'current') {
    medical.push({ ruleId: 'medical.smoking.current', severity: 'attention' });
  } else if (survey.smoking === 'former') {
    medical.push({ ruleId: 'medical.smoking.former', severity: 'info' });
  }
  if (survey.systolicBp !== null && survey.systolicBp >= 140) {
    medical.push({ ruleId: 'medical.bp.high', severity: 'attention' });
  } else if (survey.familyHistoryHypertension) {
    medical.push({ ruleId: 'medical.family.hypertension', severity: 'recommend' });
  }
  if (survey.fastingGlucose !== null && survey.fastingGlucose >= 126) {
    medical.push({ ruleId: 'medical.glucose.high', severity: 'attention' });
  } else if (survey.fastingGlucose !== null && survey.fastingGlucose >= 100) {
    medical.push({ ruleId: 'medical.glucose.borderline', severity: 'recommend' });
  }
  if (survey.ldlCholesterol !== null && survey.ldlCholesterol >= 160) {
    medical.push({ ruleId: 'medical.cholesterol.high', severity: 'attention' });
  }
  if (age >= 40 && medical.length === 0) {
    medical.push({ ruleId: 'medical.checkup.recommended', severity: 'info' });
  }

  return { context, diet, exercise, medical };
}
