import { Hono } from 'hono';
import { RiskSurveyRequest } from '../schemas/risk-survey.js';
import { authMiddleware, type AuthVariables } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { estimate } from '../risk/index.js';
import { persistSurveyAndReport } from '../storage/risk-survey.js';
import type { Bindings } from '../bindings.js';

// Slice 03: 실제 계산식 (Framingham + 경험적 bio age 모델). modelVersion = 'rs-v0.1.0'.
const RATE_LIMIT_PER_DAY = 5;
const MIN_AGE = 19;

export const riskEstimateRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

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

    // Slice 05: consentToStore=true 일 때만 분석 DB 저장 (spec 05-storage-consent.md).
    // 저장 실패는 응답 자체를 막지 않음 — 사용자에게 결과는 항상 반환되어야 함.
    try {
      await persistSurveyAndReport(
        c.env.DB,
        c.get('userPseudonymId'),
        parsed.data,
        response,
      );
    } catch (err) {
      console.error('persistSurveyAndReport failed', err);
    }

    return c.json(response);
  },
);
