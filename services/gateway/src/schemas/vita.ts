import { z } from 'zod';

// VITA 영역별 점수(0~100, 20문항×5점). 10개 영역 전부 필수.
const score = z.number().int().min(0).max(100);
// 영역 하나의 20문항 답(0~5).
const answerRow = z.array(z.number().int().min(0).max(5)).length(20);

const SectionScores = z.object({
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
});

const Answers = z.object({
  energy: answerRow,
  glucose: answerRow,
  gut: answerRow,
  inflammation: answerRow,
  detox: answerRow,
  circulation: answerRow,
  hormone: answerRow,
  sleep: answerRow,
  musculoskeletal: answerRow,
  neuro: answerRow,
});

// v8.1(2026-11-11): 200문항 답 원본(answers)을 함께 받는다 — 있으면 서버가 영역 점수를 다시 계산(정본).
// 옛 화면(점수만 보냄)도 계속 받는다.
export const VitaSubmitRequest = z
  .object({
    sectionScores: SectionScores.optional(),
    answers: Answers.optional(),
  })
  .refine((v) => v.sectionScores !== undefined || v.answers !== undefined);

export type VitaSubmit = z.infer<typeof VitaSubmitRequest>;
export type VitaSectionScores = z.infer<typeof SectionScores>;
