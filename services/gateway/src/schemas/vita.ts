import { z } from 'zod';

// VITA 영역별 점수(0~60). 10개 영역 전부 필수.
const score = z.number().int().min(0).max(60);

export const VitaSubmitRequest = z.object({
  sectionScores: z.object({
    energy: score,
    glucose: score,
    gut: score,
    inflammation: score,
    detox: score,
    circulation: score,
    hormone: score,
    sleep: score,
    musculoskeletal: score,
    neuro: score,
  }),
});

export type VitaSubmit = z.infer<typeof VitaSubmitRequest>;
export type VitaSectionScores = VitaSubmit['sectionScores'];
