// 자가 진단(증상 자가 체크) — 네이버/구글 검색 수준의 일반 건강 정보 제공.
// 의료법 안전: 단정 진단/약물·치료 처방 금지. "가능성/참고"로만 프레이밍.
// 필수 경고 문구는 웹 UI 에서 항상 노출(서버 응답과 무관하게 보장).
//
// v0.2 세분화: 구조화 입력(부위·지속기간·강도·양상·빈도) + 긴급도 트리아지 + AI 후속 질문(대화형).

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { aiText } from './ai-text.js';
import type { Bindings } from '../../bindings.js';

// 구 llama-3.1-8b-instruct-fp8 는 폐기(AiError 5028) → 현행 모델로 교체.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MODEL_VERSION = `ai-symptom-v0.2.0:${MODEL}`;

const BodyRegion = z.enum([
  'head', 'chest', 'abdomen', 'back', 'limbs', 'joint', 'skin', 'whole', 'mind', 'other',
]);
const Duration = z.enum(['today', 'days', 'week', 'chronic']);
const Frequency = z.enum(['constant', 'intermittent']);
const TriageLevel = z.enum(['self_care', 'observe', 'see_doctor', 'emergency']);
type TriageLevel = z.infer<typeof TriageLevel>;

const SymptomRequest = z
  .object({
    symptoms: z.string().trim().min(2).max(500),
    locale: z.enum(['ko', 'en', 'ja', 'es']).default('ko'),
    // 구조화 입력(선택).
    bodyRegion: BodyRegion.nullable().default(null),
    duration: Duration.nullable().default(null),
    severity: z.number().int().min(1).max(5).nullable().default(null),
    characteristics: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
    frequency: Frequency.nullable().default(null),
    // 후속 질문 답변(대화형 2차 호출). 채워지면 AI 는 더 이상 질문하지 않고 정교화.
    followUp: z
      .array(z.object({ q: z.string().max(200), a: z.string().trim().min(1).max(300) }))
      .max(4)
      .default([]),
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

const SYSTEM_PROMPT = `You are a general health information assistant, NOT a doctor. A user describes symptoms, optionally with structured context (body region, duration, severity 1-5, characteristics, frequency) and answers to earlier follow-up questions.
Provide general, non-alarming information similar to a reputable consumer health website (like a web search).
Reply with STRICT JSON only, no prose, no markdown fence:
{"possibleCauses":["..."],"selfCare":["..."],"seeDoctor":["..."],"triageLevel":"self_care|observe|see_doctor|emergency","followUpQuestions":["..."]}
- possibleCauses: 2-5 COMMON, general possibilities, each phrased as "may be related to ...". NEVER state the user definitely has a specific disease. NEVER claim certainty.
- selfCare: 2-4 general self-care suggestions. NEVER recommend specific medicines, drug names, doses, or treatments.
- seeDoctor: 2-4 warning signs indicating the person should see a doctor or seek urgent care.
- triageLevel: overall urgency. "self_care" = mild, manage at home; "observe" = watch for a few days; "see_doctor" = should consult a clinician soon; "emergency" = red-flag symptoms needing urgent/emergency care.
- followUpQuestions: if the user has NOT already answered follow-up questions, ask 1-2 short clarifying questions that would meaningfully refine the assessment. If follow-up answers are already provided, return an empty array [].
Each text item under 90 characters. Do not diagnose, prescribe, or name medications.
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
  const d = parsed.data;

  const payload = JSON.stringify({
    symptoms: d.symptoms,
    locale: d.locale,
    context: {
      bodyRegion: d.bodyRegion,
      duration: d.duration,
      severity: d.severity,
      characteristics: d.characteristics,
      frequency: d.frequency,
    },
    followUpAnswers: d.followUp,
  });
  const res = await c.env.AI.run(MODEL, {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: payload },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });
  const result = parseResult(aiText(res), d.followUp.length > 0);
  if (!result) {
    return c.json({ error: { code: 'AI_PARSE_FAILED' } }, 502);
  }
  return c.json({ ...result, modelVersion: MODEL_VERSION });
});

type SymptomResult = {
  assessment: Assessment;
  triageLevel: TriageLevel;
  followUpQuestions: string[];
};

// alreadyAnswered=true 이면 후속 질문은 강제로 비움(무한 질문 방지).
function parseResult(raw: string, alreadyAnswered: boolean): SymptomResult | null {
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
    const p = JSON.parse(stripped.slice(start, end + 1)) as Partial<{
      possibleCauses: unknown[];
      selfCare: unknown[];
      seeDoctor: unknown[];
      triageLevel: unknown;
      followUpQuestions: unknown[];
    }>;
    if (
      !Array.isArray(p.possibleCauses) ||
      !Array.isArray(p.selfCare) ||
      !Array.isArray(p.seeDoctor)
    ) {
      return null;
    }
    const followUpQuestions = alreadyAnswered
      ? []
      : Array.isArray(p.followUpQuestions)
        ? clean(p.followUpQuestions).slice(0, 2)
        : [];
    return {
      assessment: {
        possibleCauses: clean(p.possibleCauses),
        selfCare: clean(p.selfCare),
        seeDoctor: clean(p.seeDoctor),
      },
      triageLevel: normTriage(p.triageLevel),
      followUpQuestions,
    };
  } catch {
    return null;
  }
}

function normTriage(v: unknown): TriageLevel {
  return v === 'self_care' || v === 'observe' || v === 'see_doctor' || v === 'emergency'
    ? v
    : 'observe';
}

function clean(items: unknown[]): string[] {
  return items
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter((x) => x.length > 0 && x.length <= 140)
    .slice(0, 5);
}
