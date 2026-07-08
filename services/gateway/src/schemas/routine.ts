import { z } from 'zod';

// YYYY-MM-DD format. UTC-naive (timezone is client responsibility).
const ENTRY_DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'entryDate must be YYYY-MM-DD')
  .refine((d) => {
    const date = new Date(`${d}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    const cap = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) + 86400000);
    return date.getTime() <= cap.getTime();
  }, 'entryDate cannot be in the future');

export const RoutineUpsertRequest = z
  .object({
    entryDate: ENTRY_DATE,
    caloriesKcal: z.number().int().min(0).max(20000).nullable(),
    exerciseMinutes: z.number().int().min(0).max(1440).nullable(),
    // 운동 강도 — low(걷기)/medium(보통)/high(호흡 가쁨). 선택.
    exerciseIntensity: z.enum(['low', 'medium', 'high']).nullable().default(null),
    sleepHours: z.number().min(0).max(24).nullable(),
    note: z.string().max(280).nullable(),
    // 식단 점수용 영양 데이터(AI 추정 합계). 선택 — 없으면 null.
    proteinG: z.number().min(0).max(5000).nullable().default(null),
    carbG: z.number().min(0).max(5000).nullable().default(null),
    fatG: z.number().min(0).max(5000).nullable().default(null),
    upfTier: z.enum(['clean', 'processed', 'ultra']).nullable().default(null),
    // 운동 점수 세분화 — 밸런스(운동 종류) + 리커버리(스트레칭). 선택.
    exerciseType: z.enum(['cardio', 'strength', 'both']).nullable().default(null),
    didStretch: z.boolean().nullable().default(null),
    // 입력한 음식 항목 목록(항목명·양·칼로리). 선택 — 최대 30개.
    foodItems: z
      .array(
        z.object({
          name: z.string().max(120),
          amount: z.string().max(60),
          calories: z.number().min(0).max(20000).nullable(),
        }),
      )
      .max(30)
      .nullable()
      .default(null),
  })
  .strict()
  .refine(
    (v) =>
      v.caloriesKcal !== null ||
      v.exerciseMinutes !== null ||
      v.sleepHours !== null ||
      (v.note !== null && v.note.trim().length > 0),
    'at least one field must be provided',
  );
export type RoutineUpsertRequest = z.infer<typeof RoutineUpsertRequest>;

// 조회 범위 경계용 날짜 — 단일 입력(ENTRY_DATE)과 달리 "미래 금지"를 적용하지 않는다.
// 달력 월 조회 시 to=월말일이 오늘보다 미래일 수 있고, 미래 날짜는 그냥 빈 결과일 뿐이므로 허용.
const RANGE_DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
  .refine((d) => !Number.isNaN(new Date(`${d}T00:00:00Z`).getTime()), 'invalid date');

export const RoutineRangeQuery = z
  .object({
    from: RANGE_DATE,
    to: RANGE_DATE,
  })
  .refine((v) => v.from <= v.to, 'from must be <= to');
export type RoutineRangeQuery = z.infer<typeof RoutineRangeQuery>;
