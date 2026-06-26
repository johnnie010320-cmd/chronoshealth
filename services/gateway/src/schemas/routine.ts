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

export const RoutineRangeQuery = z
  .object({
    from: ENTRY_DATE,
    to: ENTRY_DATE,
  })
  .refine((v) => v.from <= v.to, 'from must be <= to');
export type RoutineRangeQuery = z.infer<typeof RoutineRangeQuery>;
