// 스토리보드 p31 — 나의 건강 AI 처방.
// 위험 추정·루틴 데이터·만성질환 입력을 LLM 에 전달해 식습관/운동/수면 교정 코칭을 생성.
// 의료 자문 아님 명시 (apps/web CLAUDE.md 규칙 4 — 신뢰구간 + 면책).

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { listConditions } from '../../medical/storage.js';
import type { Bindings } from '../../bindings.js';

const MODEL = '@cf/meta/llama-3.1-8b-instruct';
const MODEL_VERSION = `ai-prescription-v0.1.0:${MODEL}`;

const PrescriptionRequest = z
  .object({
    bioAge: z.number().min(0).max(150).optional(),
    youthAge: z.number().min(0).max(150).optional(),
    chronologicalAge: z.number().min(0).max(150).optional(),
    risks: z
      .object({
        cvd: z.number().min(0).max(1).optional(),
        diabetes: z.number().min(0).max(1).optional(),
        ckd: z.number().min(0).max(1).optional(),
        dementia: z.number().min(0).max(1).optional(),
        cancer: z.number().min(0).max(1).optional(),
      })
      .optional(),
    routine: z
      .object({
        caloriesKcal: z.number().nullable().optional(),
        exerciseMinutes: z.number().nullable().optional(),
        sleepHours: z.number().nullable().optional(),
      })
      .optional(),
    locale: z.enum(['ko', 'en', 'ja', 'es']).default('ko'),
  })
  .strict();

type Prescription = {
  summary: string;
  diet: string[];
  exercise: string[];
  rest: string[];
};

export const aiPrescriptionRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

aiPrescriptionRoute.post(
  '/prescription',
  authMiddleware,
  rateLimit(20),
  async (c) => {
    const pseudonymId = c.get('userPseudonymId');
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: { code: 'INVALID_JSON' } }, 400);
    }
    const parsed = PrescriptionRequest.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
    }

    const conditions = await listConditions(c.env.DB, pseudonymId);
    const result = await callAi(c.env.AI, parsed.data, conditions);
    if (!result) {
      return c.json({ error: { code: 'AI_PARSE_FAILED' } }, 502);
    }
    return c.json({ prescription: result, modelVersion: MODEL_VERSION });
  },
);

const SYSTEM_PROMPT = `You are a wellness coach (NOT a doctor). Given health predictions and routines,
produce specific, concrete habit nudges. Reply with STRICT JSON only, no prose, no markdown fence.
Schema:
{"summary":"<1-2 sentence overview>",
 "diet":["<concrete tip>","..."],
 "exercise":["<concrete tip>","..."],
 "rest":["<concrete tip>","..."]}
Each list has 2-4 items, each item under 80 characters.
Never use the words "diagnose", "prescribe", "cure", "treat", "death" or their translations.
Always frame advice as suggestion, not prescription.
Match the locale provided.`;

async function callAi(
  ai: Bindings['AI'],
  req: z.infer<typeof PrescriptionRequest>,
  conditions: { code: string; category: string }[],
): Promise<Prescription | null> {
  const payload = JSON.stringify({
    bioAge: req.bioAge ?? null,
    youthAge: req.youthAge ?? null,
    chronologicalAge: req.chronologicalAge ?? null,
    risks: req.risks ?? null,
    routine: req.routine ?? null,
    conditions: conditions.map((c) => ({ code: c.code, category: c.category })),
    locale: req.locale,
  });
  const res = await ai.run(MODEL, {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: payload },
    ],
    temperature: 0.3,
    max_tokens: 600,
  });
  const text = typeof res.response === 'string' ? res.response : '';
  return parseJson(text);
}

function parseJson(raw: string): Prescription | null {
  if (!raw) return null;
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    const parsed = JSON.parse(stripped.slice(start, end + 1)) as Partial<Prescription>;
    if (
      typeof parsed.summary !== 'string' ||
      !Array.isArray(parsed.diet) ||
      !Array.isArray(parsed.exercise) ||
      !Array.isArray(parsed.rest)
    ) {
      return null;
    }
    return {
      summary: parsed.summary.slice(0, 400),
      diet: cleanList(parsed.diet),
      exercise: cleanList(parsed.exercise),
      rest: cleanList(parsed.rest),
    };
  } catch {
    return null;
  }
}

function cleanList(items: unknown[]): string[] {
  return items
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter((x) => x.length > 0 && x.length <= 120)
    .slice(0, 4);
}
