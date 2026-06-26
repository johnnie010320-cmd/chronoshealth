// 자가 진단(증상 자가 체크) — 네이버/구글 검색 수준의 일반 건강 정보 제공.
// 의료법 안전: 단정 진단/약물·치료 처방 금지. "가능성/참고"로만 프레이밍.
// 필수 경고 문구는 웹 UI 에서 항상 노출(서버 응답과 무관하게 보장).

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { aiText } from './ai-text.js';
import type { Bindings } from '../../bindings.js';

const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';
const MODEL_VERSION = `ai-symptom-v0.1.0:${MODEL}`;

const SymptomRequest = z
  .object({
    symptoms: z.string().trim().min(2).max(500),
    locale: z.enum(['ko', 'en', 'ja', 'es']).default('ko'),
  })
  .strict();

type Assessment = {
  possibleCauses: string[];
  selfCare: string[];
  seeDoctor: string[];
};

export const aiSymptomRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

const SYSTEM_PROMPT = `You are a general health information assistant, NOT a doctor. A user describes symptoms.
Provide general, non-alarming information similar to a reputable consumer health website (like a web search).
Reply with STRICT JSON only, no prose, no markdown fence:
{"possibleCauses":["..."],"selfCare":["..."],"seeDoctor":["..."]}
- possibleCauses: 2-5 COMMON, general possibilities, each phrased as "may be related to ...". NEVER state the user definitely has a specific disease. NEVER claim certainty.
- selfCare: 2-4 general self-care suggestions. NEVER recommend specific medicines, drug names, doses, or treatments.
- seeDoctor: 2-4 warning signs indicating the person should see a doctor or seek urgent care.
Each item under 90 characters. Do not diagnose, prescribe, or name medications.
Write every text field in fluent, natural language for the given locale (natural Korean for "ko"). Do not output broken text.`;

aiSymptomRoute.post('/symptom-check', authMiddleware, rateLimit(20), async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = SymptomRequest.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }

  const payload = JSON.stringify({ symptoms: parsed.data.symptoms, locale: parsed.data.locale });
  const res = await c.env.AI.run(MODEL, {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: payload },
    ],
    temperature: 0.3,
    max_tokens: 700,
  });
  const assessment = parseAssessment(aiText(res));
  if (!assessment) {
    return c.json({ error: { code: 'AI_PARSE_FAILED' } }, 502);
  }
  return c.json({ assessment, modelVersion: MODEL_VERSION });
});

function parseAssessment(raw: string): Assessment | null {
  if (!raw) return null;
  const stripped = raw
    .trim()
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    const p = JSON.parse(stripped.slice(start, end + 1)) as Partial<Assessment>;
    if (
      !Array.isArray(p.possibleCauses) ||
      !Array.isArray(p.selfCare) ||
      !Array.isArray(p.seeDoctor)
    ) {
      return null;
    }
    return {
      possibleCauses: clean(p.possibleCauses),
      selfCare: clean(p.selfCare),
      seeDoctor: clean(p.seeDoctor),
    };
  } catch {
    return null;
  }
}

function clean(items: unknown[]): string[] {
  return items
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter((x) => x.length > 0 && x.length <= 140)
    .slice(0, 5);
}
