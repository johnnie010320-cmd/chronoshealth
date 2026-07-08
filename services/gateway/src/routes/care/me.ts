import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { readLatestReport } from '../../avatar/storage.js';
import { readLatestSurveyInput } from '../../care/storage.js';
import { evaluateCareRules } from '../../care/heuristics.js';
import { listAffiliatesByCategory, type Locale } from '../../care/affiliates.js';
import type { Bindings } from '../../bindings.js';

const DISCLAIMER = '본 권장은 일반 정보이며 의료 자문을 대체하지 않습니다.';
// v0.2.0 — 제휴 카드가 코드 상수에서 D1 care_affiliates 로 이관 (migration 0037).
const MODEL_VERSION = 'care-v0.2.0';

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
  // 카테고리별 3회가 아니라 1회 질의 후 그룹핑 (SLO p95 200ms).
  const affiliates = await listAffiliatesByCategory(c.env.DB, locale);

  return c.json({
    diet: { rules: evaluation.diet, affiliates: affiliates.diet },
    exercise: { rules: evaluation.exercise, affiliates: affiliates.exercise },
    medical: { rules: evaluation.medical, affiliates: affiliates.medical },
    context: evaluation.context,
    modelVersion: MODEL_VERSION,
    disclaimer: DISCLAIMER,
  });
});
