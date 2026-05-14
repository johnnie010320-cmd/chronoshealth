import type { Dictionary } from './ko';

export const en: Dictionary = {
  meta: {
    title: 'Chronos Health — Beta',
    description:
      'Preventive medicine starting from your health data. Get an instant biological age and 5-year risk estimate report.',
  },
  brand: 'Chronos Health',
  beta: 'BETA',
  language: {
    label: 'Language',
    ko: '한국어',
    en: 'English',
    ja: '日本語',
    es: 'Español',
  },
  common: {
    back: 'Back',
    cancel: 'Cancel',
    retry: 'Retry',
  },
  landing: {
    eyebrow: 'Preventive medicine · 2026',
    headingLine1: 'Habits today,',
    headingLine2: 'a longer life.',
    body: 'Estimate your biological age and 5-year health risks using your medical and lifestyle data.',
    howItWorks: 'How it works',
    step1Title: 'Answer 23 questions',
    step1Body: 'Lifestyle · measurements · family history. 2–3 minutes.',
    step2Title: 'Instant mock report',
    step2Body: 'Biological age + 5-year top risks + suggested actions.',
    step3Title: 'You own your data',
    step3Body: 'Storage and research use are optional. Revoke anytime.',
    disclaimer:
      'This service is not a substitute for medical care. For wellness reference only. Adults 19+ only.',
    cta: 'Start the survey',
  },
  survey: {
    pageTitle: 'Beta survey',
    heroTitle: 'Tell us about your health today',
    heroBody:
      '23 questions · 2–3 minutes · Answers are never stored without your consent.',
    section: {
      step: 'STEP',
      demographics: 'Demographics',
      lifestyle: 'Lifestyle',
      vitals: 'Measurements',
      vitalsHint:
        'Leave blank if unknown. Accuracy may decrease slightly.',
      familyHistory: 'Family history',
      perception: 'Self-perception',
      consent: 'Data consent (optional)',
    },
    submit: 'Get my mock report',
    submitting: 'Calculating…',
    bottomDisclaimer:
      'This report is not a substitute for medical care. For wellness reference only.',
    error: {
      validation: 'Input check needed',
      UNAUTHORIZED: 'Authentication required (beta token missing).',
      AGE_RESTRICTED: 'Adults 19+ only.',
      RATE_LIMITED: 'Daily request limit (5) exceeded.',
      INVALID_INPUT: 'Please re-check your inputs.',
      INVALID_JSON: 'Invalid request format.',
      generic: 'Server error',
    },
  },
  result: {
    pageTitle: 'My report',
    bioAgeEyebrow: 'Biological age estimate',
    bioAgeUnit: 'yrs',
    bioAgeDiffPrefix: 'vs. chronological',
    bioAgeDiffSuffix: 'yrs',
    bioAgeYearSuffix: 'yr',
    bioAgeCi: '95% CI',
    contributorsTitle: 'Top contributors',
    diseaseRiskTitle: '5-year key risks',
    diseaseRiskEmpty: 'No risks to display.',
    diseaseRiskCategory: {
      low: 'Low',
      moderate: 'Moderate',
      high: 'High',
    },
    diseaseRisk5yLabel: '5y',
    improvementTitle: 'Suggested actions',
    improvementEmpty:
      'Mock values shown. Personalized actions arrive when the real model is enabled.',
    improvementConfidence: 'Confidence',
    improvementBioAgeUnit: 'bio age',
    improvementFactorPrefix: 'Modifiable',
    modelLabel: 'Model',
    reportIdLabel: 'ID',
    resetCta: 'Restart survey',
    hotlines: {
      title: 'Help is available — please reach out',
      suicide: 'Suicide prevention',
      mentalHealth: 'Mental health crisis',
    },
  },
};
