import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { readLatestReport } from '../../avatar/storage.js';
import { calcVitalityScore } from '../../avatar/vitality.js';
import { bandFor } from '../../leaderboard/distribution.js';
import { readEmpiricalCell, upsertVitalitySnapshot } from '../../leaderboard/ecdf.js';
import { rankUser } from '../../leaderboard/percentile.js';
import type { Bindings } from '../../bindings.js';

// spec docs/spec/leaderboard.md §4.

const VALID_COUNTRIES = ['KR', 'US', 'JP', 'ES', 'OTHER'] as const;

export const leaderboardMeRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

leaderboardMeRoute.get('/', authMiddleware, async (c) => {
  const scope = c.req.query('scope');
  const country = c.req.query('country');

  if (scope !== 'world' && scope !== 'country') {
    return c.json({ error: { code: 'INVALID_SCOPE' } }, 400);
  }

  let countryCode: 'KR' | 'US' | 'JP' | 'ES' | 'OTHER' | undefined;
  if (scope === 'country') {
    if (!country || !VALID_COUNTRIES.includes(country as 'KR')) {
      return c.json({ error: { code: 'INVALID_COUNTRY' } }, 400);
    }
    countryCode = country as 'KR' | 'US' | 'JP' | 'ES' | 'OTHER';
  }

  const pseudonymId = c.get('userPseudonymId');
  const latest = await readLatestReport(c.env.DB, pseudonymId);
  if (!latest) {
    return c.json({ error: { code: 'NO_REPORT' } }, 404);
  }

  const age = new Date().getFullYear() - latest.birthYear;
  const ageBand = bandFor(age);
  const stressLevel = latest.stressLevel ?? 'medium';

  const vitality = calcVitalityScore({
    bioAgeValue: latest.payload.bioAge.value,
    chronologicalAge: latest.payload.bioAge.chronologicalAge,
    diseaseProbs: latest.payload.diseaseRisk.map((d) => d.probability5y),
    stressLevel,
  });

  // 표본 자기치유 — 조회할 때마다 최신 점수를 반영(사용자당 1행).
  await upsertVitalitySnapshot(c.env.DB, {
    userPseudonymId: pseudonymId,
    vitalityScore: vitality.value,
    ageBand,
    sex: latest.sex,
    updatedAt: new Date().toISOString(),
  });

  // 실측 ECDF 는 scope=world 만. 국가 스코프는 사용자 국가를 수집하지 않으므로
  // (ADR 0003 — analysis DB 에 국가 미보유) 모의분포를 유지한다.
  const empirical =
    scope === 'world'
      ? await readEmpiricalCell(c.env.DB, {
          ageBand,
          sex: latest.sex,
          score: vitality.value,
        })
      : undefined;

  const response = rankUser({
    scope,
    ...(countryCode ? { country: countryCode } : {}),
    age,
    sex: latest.sex,
    report: latest.payload,
    stressLevel,
    ...(empirical ? { empirical } : {}),
  });

  return c.json(response);
});
