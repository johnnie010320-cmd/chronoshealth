import { Hono } from 'hono';
import { RiskSurveyRequest } from '../schemas/risk-survey.js';
import { authMiddleware, type AuthVariables } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { estimate } from '../risk/index.js';

// Slice 03: 실제 계산식 (Framingham + 경험적 bio age 모델). modelVersion = 'rs-v0.1.0'.
const RATE_LIMIT_PER_DAY = 5;
const MIN_AGE = 19;

export const riskEstimateRoute = new Hono<{ Variables: AuthVariables }>();

riskEstimateRoute.post(
  '/',
  authMiddleware,
  rateLimit(RATE_LIMIT_PER_DAY),
  async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: { code: 'INVALID_JSON' } }, 400);
    }

    const parsed = RiskSurveyRequest.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_INPUT',
            details: parsed.error.format(),
          },
        },
        400,
      );
    }

    const age = new Date().getFullYear() - parsed.data.birthYear;
    if (age < MIN_AGE) {
      return c.json({ error: { code: 'AGE_RESTRICTED' } }, 403);
    }

    const response = estimate(parsed.data);
    return c.json(response);
  },
);
