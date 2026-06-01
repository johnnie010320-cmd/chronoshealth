import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { readLatestReport } from '../../avatar/storage.js';
import { readLatestSurveyInput } from '../../care/storage.js';
import { evaluateCareRules } from '../../care/heuristics.js';
import { listAffiliates, type Locale } from '../../care/affiliates.js';
import type { Bindings } from '../../bindings.js';

const DISCLAIMER = '본 권장은 일반 정보이며 의료 자문을 대체하지 않습니다.';
const MODEL_VERSION = 'care-v0.1.0';

function parseLocale(value: string | null | undefined): Locale {
  if (value === 'ko' || value === 'en' || value === 'ja' || value === 'es') return value;
  return 'ko';
}

export const careMeRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

careMeRoute.get('/', authMiddleware, async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const locale = parseLocale(c.req.query('locale'));

  const [report, survey] = await Promise.all([
    readLatestReport(c.env.DB, pseudonymId),
    readLatestSurveyInput(c.env.DB, pseudonymId),
  ]);

  if (!report || !survey) {
    return c.json({ error: { code: 'NO_REPORT' } }, 404);
  }

  const evaluation = evaluateCareRules(survey, report.payload);

  return c.json({
    diet: {
      rules: evaluation.diet,
      affiliates: listAffiliates('diet', locale),
    },
    exercise: {
      rules: evaluation.exercise,
      affiliates: listAffiliates('exercise', locale),
    },
    medical: {
      rules: evaluation.medical,
      affiliates: listAffiliates('medical', locale),
    },
    context: evaluation.context,
    modelVersion: MODEL_VERSION,
    disclaimer: DISCLAIMER,
  });
});
