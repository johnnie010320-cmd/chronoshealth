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
    fields: {
      birthYear: { label: 'Birth year', placeholder: 'e.g., 1990' },
      sex: {
        label: 'Sex',
        options: { male: 'Male', female: 'Female', other: 'Other' },
      },
      heightCm: { label: 'Height (cm)', placeholder: 'e.g., 175' },
      weightKg: { label: 'Weight (kg)', placeholder: 'e.g., 70' },
      smoking: {
        label: 'Smoking',
        options: {
          never: 'Never',
          former: 'Former',
          current: 'Current',
        },
      },
      alcoholDrinksPerWeek: { label: 'Alcoholic drinks per week' },
      exerciseMinutesPerWeek: { label: 'Exercise minutes per week' },
      sleepHoursPerNight: { label: 'Sleep hours per night' },
      systolicBp: { label: 'Systolic BP', placeholder: 'e.g., 120' },
      diastolicBp: { label: 'Diastolic BP', placeholder: 'e.g., 80' },
      fastingGlucose: { label: 'Fasting glucose', placeholder: 'e.g., 95' },
      ldlCholesterol: { label: 'LDL cholesterol', placeholder: 'e.g., 110' },
      hdlCholesterol: { label: 'HDL cholesterol', placeholder: 'e.g., 50' },
      familyHistoryDiabetes: { label: 'Family history of diabetes' },
      familyHistoryHypertension: { label: 'Family history of hypertension' },
      familyHistoryCardiovascular: {
        label: 'Family history of cardiovascular disease',
      },
      stressLevel: {
        label: 'Stress level',
        options: { low: 'Low', medium: 'Medium', high: 'High' },
      },
      selfRatedHealth: {
        label: 'Self-rated health',
        options: {
          excellent: 'Excellent',
          good: 'Good',
          fair: 'Fair',
          poor: 'Poor',
        },
      },
      consentToStore: { label: 'I consent to storing my responses' },
      consentToResearch: {
        label: 'I consent to anonymized use for research',
      },
    },
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
  signup: {
    pageTitle: 'Sign up',
    heroTitle: 'Sign up before you start',
    heroBody:
      'Your name, phone, and email are kept in an isolated identity store and are never shared outside this service.',
    section: {
      identity: 'About you',
      consent: 'Consent',
    },
    fields: {
      name: { label: 'Name', placeholder: 'Your name' },
      email: { label: 'Email', placeholder: 'you@example.com' },
      phone: { label: 'Phone', placeholder: '+1-555-555-5555' },
      birthYear: { label: 'Birth year', placeholder: 'e.g., 1990' },
      sex: {
        label: 'Sex',
        options: { male: 'Male', female: 'Female', other: 'Other' },
      },
    },
    consent: {
      medical: {
        label: 'Health data processing (required)',
        description:
          'I consent to using my survey, measurements, and family history for risk estimation.',
      },
      terms: {
        label: 'Terms of service and privacy policy (required)',
        description:
          'I agree to the terms of service and privacy policy.',
      },
    },
    submit: 'Sign up and start',
    submitting: 'Signing up…',
    bottomNote:
      'Identity verification and password sign-in arrive later. This is a private beta.',
    error: {
      validation: 'Input check needed',
      AGE_RESTRICTED: 'You must be 19+ to sign up.',
      CONSENT_REQUIRED: 'Health data and terms consent are required.',
      IDENTITY_EXISTS:
        'This account already exists. Multi-device login will arrive with identity verification later.',
      RATE_LIMITED: 'Daily signup limit (10) exceeded.',
      INVALID_INPUT: 'Please re-check your inputs.',
      INVALID_JSON: 'Invalid request format.',
      generic: 'Server error',
    },
  },
};
