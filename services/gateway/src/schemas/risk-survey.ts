import { z } from 'zod';

export const DISCLAIMER =
  '본 리포트는 의료 행위를 대체할 수 없으며 건강 증진 참고용입니다.';

export const RiskCategory = z.enum(['low', 'moderate', 'high']);
export type RiskCategory = z.infer<typeof RiskCategory>;

// 절차서 7.3 / CLAUDE.md 의료 윤리 가드:
// 응답에 다음 단어 절대 포함 금지 (compliance-reviewer / CI grep 가드와 동일):
//   진단 / 처방 / 치료 / 여명 / 사망일 / deathday / diagnose / prescribe

// 주의: `new Date().getFullYear()`를 z.max()에 직접 넣으면 모듈 import 시점에 평가됨.
// CF Workers는 isolate startup 시점 Date를 epoch(1970)로 고정하므로 max=1970 버그 발생.
// refine 콜백 안에서 호출하면 요청 처리 시점(정확한 시간)에 평가됨.
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
  // 현재 흡연이면 주당 흡연량(갑/주). 비흡연·과거흡연이면 null.
  smokingPacksPerWeek: z.number().min(0).max(140).nullable().default(null),

  // 음주: (주종·주량 잔/주) 목록. alcoholDrinksPerWeek(표준잔/주 합계)은 클라이언트가 파생 전송(계산 입력).
  alcoholEntries: z
    .array(
      z.object({
        type: z.enum(['beer', 'soju', 'wine', 'spirits', 'makgeolli', 'other']),
        amountPerWeek: z.number().min(0).max(200),
      }),
    )
    .max(10)
    .default([]),
  alcoholDrinksPerWeek: z.number().int().min(0).max(100),

  // 운동: (유산소/근력/기타)×(강/중/약)×시간 목록. exerciseMinutesPerWeek(강도가중 유효분)은 클라이언트 파생.
  exercises: z
    .array(
      z.object({
        kind: z.enum(['aerobic', 'strength', 'other']),
        intensity: z.enum(['high', 'medium', 'low']),
        minutesPerWeek: z.number().int().min(0).max(2000),
      }),
    )
    .max(10)
    .default([]),
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
  // 기타 가족력 자유 입력(복수). 계산엔 미반영, 저장·표시용.
  familyHistoryOther: z.array(z.string().trim().min(1).max(60)).max(10).default([]),

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
