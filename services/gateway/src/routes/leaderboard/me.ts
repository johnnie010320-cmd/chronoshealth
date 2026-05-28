import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { readLatestReport } from '../../avatar/storage.js';
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
  const response = rankUser({
    scope,
    ...(countryCode ? { country: countryCode } : {}),
    age,
    sex: latest.sex,
    report: latest.payload,
    stressLevel: latest.stressLevel ?? 'medium',
  });

  return c.json(response);
});
