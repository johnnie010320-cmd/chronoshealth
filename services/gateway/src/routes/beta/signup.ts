import { Hono } from 'hono';
import { BetaSignupRequest } from '../../schemas/beta-signup.js';
import { registerBetaSignup, BetaSignupError } from '../../beta/signup.js';
import { ipRateLimit } from '../../middleware/ip-rate-limit.js';
import type { Bindings } from '../../bindings.js';

// spec docs/spec/roadmap-ui.md Slice R3 / ADR 0011 정합.
// IP 시간당 제한은 향후 강화. 일 단위 20건으로 시작 (분 단위 burst는 Durable Object 도입 후).
const BETA_SIGNUP_IP_LIMIT_PER_DAY = 20;

export const betaSignupRoute = new Hono<{ Bindings: Bindings }>();

function clientIp(c: { req: { header: (n: string) => string | undefined } }): string {
  return (
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

betaSignupRoute.post('/', ipRateLimit(BETA_SIGNUP_IP_LIMIT_PER_DAY), async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }

  const parsed = BetaSignupRequest.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    // 연령대 화이트리스트 밖 (미성년 포함) → 403.
    const ageIssue = issues.find(
      (i) => i.path[0] === 'ageGroup',
    );
    if (ageIssue) {
      return c.json({ error: { code: 'UNDERAGE' } }, 403);
    }
    return c.json(
      { error: { code: 'INVALID_INPUT', details: parsed.error.format() } },
      400,
    );
  }

  if (!c.env.BETA_SIGNUP_HMAC_SALT) {
    console.error('BETA_SIGNUP_HMAC_SALT not configured');
    return c.json({ error: { code: 'INTERNAL_ERROR' } }, 500);
  }

  try {
    const result = await registerBetaSignup(
      {
        identityDb: c.env.IDENTITY_DB,
        analysisDb: c.env.DB,
        hmacSalt: c.env.BETA_SIGNUP_HMAC_SALT,
        ip: clientIp(c),
        userAgent: c.req.header('User-Agent') ?? null,
      },
      parsed.data,
    );
    return c.json(result, 201);
  } catch (err) {
    if (err instanceof BetaSignupError) {
      switch (err.code) {
        case 'CONSENT_REQUIRED':
          return c.json({ error: { code: 'CONSENT_REQUIRED' } }, 400);
        case 'ALREADY_REGISTERED':
          return c.json({ error: { code: 'ALREADY_REGISTERED' } }, 409);
        case 'DB_ERROR':
          return c.json({ error: { code: 'INTERNAL_ERROR' } }, 500);
      }
    }
    throw err;
  }
});
