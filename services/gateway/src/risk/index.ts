import { estimateBioAge } from './bio-age.js';
import { estimateDiseaseRisks } from './disease-risks.js';
import { generateImprovements } from './improvements.js';
import {
  DISCLAIMER,
  type RiskSurveyRequest,
  type RiskSurveyResponse,
} from '../schemas/risk-survey.js';

export const MODEL_VERSION = 'rs-v0.1.0';

// 절차서 / spec 결정 #6: 5년 위험 합산 30% 초과 시 hotlines 자동 노출.
// "위험 합산"은 5개 위험 카테고리 중 최고값 사용 (가장 보수적).
const HOTLINES_THRESHOLD = 0.3;

const HOTLINES_KR = {
  suicidePrevention: '1393',
  mentalHealthCrisis: '1577-0199',
};

export function estimate(input: RiskSurveyRequest): RiskSurveyResponse {
  const bioAge = estimateBioAge(input);
  const diseaseRisk = estimateDiseaseRisks(input);
  const improvement = generateImprovements(input);

  const maxRisk = Math.max(...diseaseRisk.map((r) => r.probability5y));
  const showHotlines = maxRisk >= HOTLINES_THRESHOLD;

  return {
    reportId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    modelVersion: MODEL_VERSION,
    bioAge: {
      value: bioAge.value,
      chronologicalAge: bioAge.chronologicalAge,
      ci95: bioAge.ci95,
      topContributors: bioAge.contributors.map((c) => ({
        factor: c.factor,
        direction: c.direction,
        magnitude: c.magnitude,
      })),
    },
    diseaseRisk: diseaseRisk.map((d) => ({
      code: d.code,
      label: d.label,
      probability5y: d.probability5y,
      riskCategory: d.riskCategory,
      modifiableFactors: d.modifiableFactors,
    })),
    improvement: improvement.map((i) => ({
      action: i.action,
      expectedBioAgeDeltaYears: i.expectedBioAgeDeltaYears,
      confidence: i.confidence,
    })),
    disclaimer: DISCLAIMER,
    hotlines: {
      suicidePrevention: showHotlines ? HOTLINES_KR.suicidePrevention : null,
      mentalHealthCrisis: showHotlines ? HOTLINES_KR.mentalHealthCrisis : null,
    },
  };
}
