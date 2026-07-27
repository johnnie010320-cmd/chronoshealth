// 온디맨드 번역 — 사용자끼리(메시지·커뮤니티 댓글) 서로 다른 모국어로 쓴 글을
// 읽는 사람의 앱 언어(ko/en/ja/es)로 번역해 준다. 원문은 보존하고, 번역은 저장하지 않는다(휘발).
//
// 별도 외부 번역 API 없이 기존 Workers AI 모델을 그대로 사용.
// 구 llama-3.1-8b-instruct-fp8 는 폐기(AiError 5028) → 현행 모델 사용.

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { aiText } from './ai-text.js';
import type { Bindings } from '../../bindings.js';

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MODEL_VERSION = `ai-translate-v0.1.0:${MODEL}`;

const TARGET_NAME: Record<string, string> = {
  ko: 'Korean',
  en: 'English',
  ja: 'Japanese',
  es: 'Spanish',
};

const TranslateRequest = z
  .object({
    text: z.string().trim().min(1).max(4000),
    target: z.enum(['ko', 'en', 'ja', 'es']),
  })
  .strict();

export const aiTranslateRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

aiTranslateRoute.post('/translate', authMiddleware, rateLimit(40), async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = TranslateRequest.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const { text, target } = parsed.data;
  const targetName = TARGET_NAME[target] ?? 'English';

  const systemPrompt = `You are a translation engine. Translate the user's message into ${targetName}.
Rules:
- Output ONLY the translated text. No explanations, no notes, no quotes, no language labels.
- Preserve line breaks, emoji, URLs, @mentions and #hashtags as-is.
- If the text is already written in ${targetName}, return it unchanged.
- Keep the tone natural and conversational.`;

  let res: unknown;
  try {
    res = await c.env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });
  } catch {
    return c.json({ error: { code: 'AI_UNAVAILABLE' } }, 502);
  }

  const translated = cleanup(aiText(res));
  if (!translated) {
    return c.json({ error: { code: 'AI_PARSE_FAILED' } }, 502);
  }
  return c.json({ translated, target, modelVersion: MODEL_VERSION });
});

// 모델이 가끔 코드펜스/따옴표/think 태그로 감싸는 경우를 제거.
function cleanup(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .trim()
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();
}
