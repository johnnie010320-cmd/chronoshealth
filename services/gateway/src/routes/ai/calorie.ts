import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { aiText } from './ai-text.js';
import type { Bindings } from '../../bindings.js';

// Cloudflare Workers AI. 구 llama-3.1-8b-instruct 가 2026-05-30 폐기(AiError 5028) → 현행 모델로 교체.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MODEL_VERSION = `ai-calorie-v0.1.1:${MODEL}`;

const FoodItem = z
  .object({
    name: z.string().min(1).max(80),
    amount: z.string().min(1).max(60),
  })
  .strict();

const EstimateRequest = z
  .object({
    items: z.array(FoodItem).min(1).max(10),
    locale: z.enum(['ko', 'en', 'ja', 'es']).default('ko'),
  })
  .strict();

type EstimateRequest = z.infer<typeof EstimateRequest>;

type LineEstimate = {
  name: string;
  amount: string;
  calories: number;
};

type EstimateResult = {
  breakdown: LineEstimate[];
  totalCalories: number;
};

export const aiCalorieRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

aiCalorieRoute.post(
  '/estimate-calories',
  authMiddleware,
  // 무료 quota 보호 — 사용자당 분당 10회, IP당 분당 30회로 충분.
  rateLimit(30),
  async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: { code: 'INVALID_JSON' } }, 400);
    }
    const parsed = EstimateRequest.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
    }

    const result = await estimateWithAI(c.env.AI, parsed.data);
    if (!result) {
      return c.json({ error: { code: 'AI_PARSE_FAILED' } }, 502);
    }
    return c.json({ ...result, modelVersion: MODEL_VERSION });
  },
);

const SYSTEM_PROMPT = `You are a nutrition assistant that estimates calories.
You will receive a list of foods with amounts. Reply with STRICT JSON only,
no prose, no markdown fence. Schema:
{"breakdown":[{"name":"<echoed name>","amount":"<echoed amount>","calories":<integer kcal>}],
 "totalCalories":<integer kcal>}
Use typical values for the food and amount. If amount is ambiguous (e.g. "a bowl"),
assume a standard adult serving. Always return integer kcal >= 0. Round to nearest 5 kcal.
Do not refuse; if uncertain, give your best estimate.`;

async function estimateWithAI(
  ai: Bindings['AI'],
  req: EstimateRequest,
): Promise<EstimateResult | null> {
  const userPayload = JSON.stringify({ items: req.items, locale: req.locale });
  const res = await ai.run(MODEL, {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPayload },
    ],
    temperature: 0.1,
    max_tokens: 512,
  });
  const text = aiText(res);
  const parsed = parseAiJson(text);
  if (!parsed) return null;

  // 강건성 — 모델이 가끔 breakdown 길이를 줄이거나 늘리므로, 입력 items 기준으로 정렬·보정.
  const breakdown: LineEstimate[] = req.items.map((input, idx) => {
    const found = parsed.breakdown[idx] ?? parsed.breakdown.find(
      (b) => b.name?.toLowerCase().trim() === input.name.toLowerCase().trim(),
    );
    const cal = clampInt(found?.calories);
    return {
      name: input.name,
      amount: input.amount,
      calories: cal,
    };
  });
  const total = breakdown.reduce((s, b) => s + b.calories, 0);
  return { breakdown, totalCalories: total };
}

function clampInt(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(5000, Math.round(v)));
}

function parseAiJson(
  raw: string,
): { breakdown: Array<{ name?: string; amount?: string; calories?: number }>; totalCalories?: number } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // 모델이 ```json 펜스를 두르는 경우 제거.
  const stripped = trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  // 첫 { 부터 마지막 } 까지만 추출 (모델 prologue/epilogue 방어).
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  const json = stripped.slice(start, end + 1);
  try {
    const parsed = JSON.parse(json) as {
      breakdown?: Array<{ name?: string; amount?: string; calories?: number }>;
      totalCalories?: number;
    };
    if (!parsed || !Array.isArray(parsed.breakdown)) return null;
    const total = typeof parsed.totalCalories === 'number' ? parsed.totalCalories : undefined;
    return total === undefined
      ? { breakdown: parsed.breakdown }
      : { breakdown: parsed.breakdown, totalCalories: total };
  } catch {
    return null;
  }
}
