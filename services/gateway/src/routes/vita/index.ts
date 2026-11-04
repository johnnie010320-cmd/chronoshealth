import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { VitaSubmitRequest } from '../../schemas/vita.js';
import { readLatestVitaResult, saveVitaResult } from '../../vita/storage.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'vita-v8.0.0';

export const vitaRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

// VITA 자가진단 제출 — 영역별 점수 저장. 코드·총점은 서버에서 산출(정본).
vitaRoute.post('/', authMiddleware, rateLimit(60), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = VitaSubmitRequest.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const saved = await saveVitaResult(c.env.DB, pseudonymId, parsed.data.sectionScores, MODEL_VERSION);
  return c.json({ result: saved, modelVersion: MODEL_VERSION });
});

// 최신 진단 결과 조회(없으면 result=null).
vitaRoute.get('/latest', authMiddleware, rateLimit(200), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const result = await readLatestVitaResult(c.env.DB, pseudonymId);
  return c.json({ result, modelVersion: MODEL_VERSION });
});
