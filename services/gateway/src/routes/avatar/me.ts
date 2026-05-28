import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { readLatestReport, readUserName } from '../../avatar/storage.js';
import { calcVitalityScore } from '../../avatar/vitality.js';
import { predictedYearsRemaining } from '../../avatar/pyr.js';
import type { Bindings } from '../../bindings.js';

// spec docs/spec/avatar-chronos.md §5.
// ADR 0003 — name 은 identity-vault 에서 응답 직전에만 조회.

const DISCLAIMER = '본 카드는 예측 추정으로 의료 자문을 대체하지 않습니다.';

export const avatarMeRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

avatarMeRoute.get('/', authMiddleware, async (c) => {
  const pseudonymId = c.get('userPseudonymId');

  const latest = await readLatestReport(c.env.DB, pseudonymId);
  if (!latest) {
    return c.json({ error: { code: 'NO_REPORT' } }, 404);
  }

  const name = await readUserName(c.env.IDENTITY_DB, pseudonymId);

  const chronologicalAge = latest.payload.bioAge.chronologicalAge;
  const diseaseProbs = latest.payload.diseaseRisk.map((d) => d.probability5y);

  const vitality = calcVitalityScore({
    bioAgeValue: latest.payload.bioAge.value,
    chronologicalAge,
    diseaseProbs,
    stressLevel: latest.stressLevel ?? 'medium',
  });

  const pyr = predictedYearsRemaining({
    country: 'KR',
    chronologicalAge,
    bioAge: latest.payload.bioAge.value,
    sex: latest.sex,
  });

  // 5종 나이 P1 한정 — bioAge 기반 휴리스틱 (avatar-chronos.md §9 미해결, P3 정밀화)
  const bioAge = latest.payload.bioAge.value;
  const fiveAges = {
    life: bioAge,
    vitality: bioAge - Math.round((vitality.value - 70) / 10),
    skin: bioAge,
    vascular: bioAge,
    joint: bioAge + (latest.stressLevel === 'high' ? 2 : 0),
  };

  return c.json({
    name: name ?? '',
    chronologicalAge,
    vitalityScore: vitality,
    predictedYearsRemaining: pyr,
    fiveAges,
    lastReportAt: latest.generatedAt,
    modelVersion: latest.payload.modelVersion,
    disclaimer: DISCLAIMER,
  });
});
