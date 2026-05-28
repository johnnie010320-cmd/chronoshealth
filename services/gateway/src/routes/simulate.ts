import { Hono } from 'hono';
import { SimulateRequest } from '../schemas/simulate.js';
import { runSimulation, SimulateError } from '../risk/simulate.js';
import { authMiddleware, type AuthVariables } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import type { Bindings } from '../bindings.js';

// spec docs/spec/simulation.md §4. M7 What-if.
// 사용자당 시간당 60회 권장이나 rateLimit 은 일 단위 → 일 240회 (시간 60 × 4h 안전 마진).
const RATE_LIMIT_PER_DAY = 240;
const MIN_AGE = 19;

export const simulateRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

simulateRoute.post('/', authMiddleware, rateLimit(RATE_LIMIT_PER_DAY), async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }

  const parsed = SimulateRequest.safeParse(raw);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'INVALID_INPUT', details: parsed.error.format() } },
      400,
    );
  }

  const age = new Date().getFullYear() - parsed.data.base.birthYear;
  if (age < MIN_AGE) {
    return c.json({ error: { code: 'AGE_RESTRICTED' } }, 403);
  }

  try {
    const response = runSimulation(parsed.data);
    return c.json(response);
  } catch (err) {
    if (err instanceof SimulateError) {
      switch (err.code) {
        case 'SMOKING_REGRESSION':
          return c.json({ error: { code: 'SMOKING_REGRESSION' } }, 403);
      }
    }
    throw err;
  }
});
