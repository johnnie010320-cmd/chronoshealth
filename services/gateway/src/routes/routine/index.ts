import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  RoutineRangeQuery,
  RoutineUpsertRequest,
} from '../../schemas/routine.js';
import {
  readRoutineByDate,
  readRoutineRange,
  upsertRoutineEntry,
} from '../../routine/storage.js';
import { summarize } from '../../routine/summary.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'routine-v0.1.0';

export const routineRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

routineRoute.post('/daily', authMiddleware, rateLimit(200), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = RoutineUpsertRequest.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }

  await upsertRoutineEntry(c.env.DB, pseudonymId, parsed.data);
  const saved = await readRoutineByDate(c.env.DB, pseudonymId, parsed.data.entryDate);
  return c.json({ entry: saved, modelVersion: MODEL_VERSION });
});

routineRoute.get('/range', authMiddleware, rateLimit(200), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const parsed = RoutineRangeQuery.safeParse({
    from: c.req.query('from'),
    to: c.req.query('to'),
  });
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const entries = await readRoutineRange(c.env.DB, pseudonymId, parsed.data.from, parsed.data.to);
  const summary = summarize(entries, parsed.data.from, parsed.data.to);
  return c.json({ entries, summary, modelVersion: MODEL_VERSION });
});

routineRoute.get('/today', authMiddleware, rateLimit(200), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const today = new Date().toISOString().slice(0, 10);
  const entry = await readRoutineByDate(c.env.DB, pseudonymId, today);
  return c.json({ entry, today, modelVersion: MODEL_VERSION });
});
