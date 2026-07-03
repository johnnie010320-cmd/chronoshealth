import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  RoutineRangeQuery,
  RoutineUpsertRequest,
} from '../../schemas/routine.js';
import {
  deleteRoutineEntry,
  readRoutineByDate,
  readRoutineRange,
  upsertRoutineEntry,
} from '../../routine/storage.js';
import { summarize } from '../../routine/summary.js';
import { appendLedger, EARN_AMOUNTS, hasEarnedFor } from '../../rewards/ledger.js';
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

  // 오늘의 루틴 기록(입력·저장 → 그래프 생성) 시 하루 2코인 적립. entryDate 기준 1회.
  try {
    const dayKey = parsed.data.entryDate;
    const alreadyDaily = await hasEarnedFor(c.env.DB, pseudonymId, 'routine_daily', dayKey);
    if (!alreadyDaily) {
      await appendLedger(c.env.DB, pseudonymId, {
        kind: 'routine_daily',
        amount: EARN_AMOUNTS.routine_daily,
        sourceRef: dayKey,
      });
    }
  } catch (err) {
    console.error('appendLedger routine_daily failed', err);
  }

  // R8: 7일 연속 기록 달성 시 적립 (entryDate 기준 주차 1회).
  try {
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 6);
    const to = new Date();
    const window = await readRoutineRange(
      c.env.DB,
      pseudonymId,
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10),
    );
    const summary = summarize(window, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
    if (summary.streakDays >= 7) {
      const weekKey = parsed.data.entryDate;
      const already = await hasEarnedFor(c.env.DB, pseudonymId, 'routine_streak_7', weekKey);
      if (!already) {
        await appendLedger(c.env.DB, pseudonymId, {
          kind: 'routine_streak_7',
          amount: EARN_AMOUNTS.routine_streak_7,
          sourceRef: weekKey,
        });
      }
    }
  } catch (err) {
    console.error('appendLedger routine_streak_7 failed', err);
  }

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

// 날짜별 루틴 기록 삭제 — 삭제 시 range/today 재조회로 그래프·점수 자동 반영(DB 단일 진실원천).
routineRoute.delete('/:date', authMiddleware, rateLimit(60), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const date = c.req.param('date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const deleted = await deleteRoutineEntry(c.env.DB, pseudonymId, date);
  return c.json({ deleted });
});
