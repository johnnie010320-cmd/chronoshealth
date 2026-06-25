// 스토리보드 p21/p22 — 푸드샷 (사진 → AI 인식 → 칼로리).
// Cloudflare Workers AI Vision: @cf/llava-hf/llava-1.5-7b-hf.
// 입력: 음식 사진 base64. 출력: 음식명 추정 + 칼로리 추정.

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { aiText } from './ai-text.js';
import type { Bindings } from '../../bindings.js';

const VISION_MODEL = '@cf/llava-hf/llava-1.5-7b-hf';
// 구 llama-3.1-8b-instruct 가 2026-05-30 폐기(AiError 5028) → 현행 모델로 교체.
const LLM_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MODEL_VERSION = `ai-foodshot-v0.1.1:${VISION_MODEL}+${LLM_MODEL}`;

const FoodshotRequest = z
  .object({
    imageB64: z.string().min(1).max(512 * 1024),
    locale: z.enum(['ko', 'en', 'ja', 'es']).default('ko'),
  })
  .strict();

type FoodshotResult = {
  description: string;
  estimatedItems: { name: string; amount: string; calories: number }[];
  totalCalories: number;
};

export const aiFoodshotRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

aiFoodshotRoute.post(
  '/foodshot',
  authMiddleware,
  // 비전 모델은 neurons 가 비싸므로 더 보수적인 limit.
  rateLimit(10),
  async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: { code: 'INVALID_JSON' } }, 400);
    }
    const parsed = FoodshotRequest.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
    }
    try {
      const result = await runFoodshot(c.env.AI, parsed.data.imageB64, parsed.data.locale);
      if (!result) {
        return c.json({ error: { code: 'AI_PARSE_FAILED' } }, 502);
      }
      return c.json({ ...result, modelVersion: MODEL_VERSION });
    } catch (e) {
      console.error('foodshot error', e);
      return c.json({ error: { code: 'AI_ERROR' } }, 502);
    }
  },
);

async function runFoodshot(
  ai: Bindings['AI'],
  imageB64: string,
  locale: 'ko' | 'en' | 'ja' | 'es',
): Promise<FoodshotResult | null> {
  // 1단계: 비전 모델로 음식 인식 (자연어 설명).
  const visionRes = await ai.run(VISION_MODEL, {
    image: base64ToArray(imageB64),
    prompt:
      'Identify each food item visible in the image and estimate their portions. Reply in plain English.',
    max_tokens: 256,
  });
  const description =
    typeof visionRes.description === 'string'
      ? (visionRes.description as string)
      : typeof visionRes.response === 'string'
      ? visionRes.response
      : '';
  if (!description.trim()) return null;

  // 2단계: LLM 으로 JSON 화 + 칼로리 추정.
  const llmRes = await ai.run(LLM_MODEL, {
    messages: [
      {
        role: 'system',
        content: `Given a description of foods, produce STRICT JSON only:
{"estimatedItems":[{"name":"<food>","amount":"<portion>","calories":<integer kcal>}],
 "totalCalories":<integer>}
2-6 items. Round kcal to nearest 5. Use the locale "${locale}" for the names.`,
      },
      { role: 'user', content: description },
    ],
    temperature: 0.2,
    max_tokens: 400,
  });
  const text = aiText(llmRes);
  const parsed = parseJson(text);
  if (!parsed) return null;
  return {
    description: description.trim().slice(0, 400),
    estimatedItems: parsed.estimatedItems,
    totalCalories: parsed.totalCalories,
  };
}

function base64ToArray(b64: string): number[] {
  const binary = atob(b64);
  const arr = new Array<number>(binary.length);
  for (let i = 0; i < binary.length; i += 1) arr[i] = binary.charCodeAt(i);
  return arr;
}

function parseJson(
  raw: string,
): { estimatedItems: { name: string; amount: string; calories: number }[]; totalCalories: number } | null {
  if (!raw) return null;
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const s = stripped.indexOf('{');
  const e = stripped.lastIndexOf('}');
  if (s < 0 || e < s) return null;
  try {
    const obj = JSON.parse(stripped.slice(s, e + 1)) as {
      estimatedItems?: Array<{ name?: string; amount?: string; calories?: number }>;
      totalCalories?: number;
    };
    if (!Array.isArray(obj.estimatedItems)) return null;
    const items = obj.estimatedItems
      .filter((i) => typeof i.name === 'string' && typeof i.calories === 'number')
      .map((i) => ({
        name: String(i.name).slice(0, 80),
        amount: String(i.amount ?? '').slice(0, 60),
        calories: Math.max(0, Math.min(5000, Math.round(i.calories ?? 0))),
      }))
      .slice(0, 6);
    const total =
      typeof obj.totalCalories === 'number'
        ? Math.max(0, Math.round(obj.totalCalories))
        : items.reduce((s, i) => s + i.calories, 0);
    return { estimatedItems: items, totalCalories: total };
  } catch {
    return null;
  }
}
