import { Hono } from 'hono';
import {
  DISCLAIMER,
  RiskSurveyRequest,
  type RiskSurveyResponse,
} from '../schemas/risk-survey.js';
import { authMiddleware, type AuthVariables } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';

// Slice 02 (mock). 실제 계산식은 Slice 03(Framingham + PhenoAge)에서
// MOCK_MODEL_VERSION → 'rs-v0.1.0'으로 교체.
const RATE_LIMIT_PER_DAY = 5;
const MIN_AGE = 19;
const MOCK_MODEL_VERSION = 'rs-mock-v0';

export const riskEstimateRoute = new Hono<{ Variables: AuthVariables }>();

riskEstimateRoute.post(
  '/',
  authMiddleware,
  rateLimit(RATE_LIMIT_PER_DAY),
  async (c) => {
    // 1. JSON 파싱
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: { code: 'INVALID_JSON' } }, 400);
    }

    // 2. Zod 검증
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

    // 3. 만 19세 미만 차단 (절차서 7.3)
    const now = new Date();
    const age = now.getFullYear() - parsed.data.birthYear;
    if (age < MIN_AGE) {
      return c.json({ error: { code: 'AGE_RESTRICTED' } }, 403);
    }

    // 4. 모의 응답 (Slice 03에서 Framingham + PhenoAge로 교체)
    const response: RiskSurveyResponse = {
      reportId: crypto.randomUUID(),
      generatedAt: now.toISOString(),
      modelVersion: MOCK_MODEL_VERSION,
      bioAge: {
        value: age,
        chronologicalAge: age,
        ci95: [Math.max(0, age - 2), age + 2],
        topContributors: [],
      },
      diseaseRisk: [
        {
          code: 'mock-1',
          label: 'Placeholder risk 1',
          probability5y: 0.05,
          riskCategory: 'low',
          modifiableFactors: [],
        },
      ],
      improvement: [],
      disclaimer: DISCLAIMER,
      hotlines: {
        suicidePrevention: null,
        mentalHealthCrisis: null,
      },
    };

    return c.json(response);
  },
);
