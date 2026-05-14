import { Hono } from 'hono';
import { SignupRequest } from '../../schemas/signup.js';
import { signupUser, SignupError } from '../../auth/signup.js';
import { ipRateLimit } from '../../middleware/ip-rate-limit.js';
import type { Bindings } from '../../bindings.js';

// spec docs/spec/identity/01-signup.md / ADR 0010 정합.
const SIGNUP_IP_LIMIT_PER_DAY = 10;

export const signupRoute = new Hono<{ Bindings: Bindings }>();

signupRoute.post('/', ipRateLimit(SIGNUP_IP_LIMIT_PER_DAY), async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }

  const parsed = SignupRequest.safeParse(raw);
  if (!parsed.success) {
    // birthYear refine 메시지가 'AGE_RESTRICTED'면 403으로 승격.
    const ageIssue = parsed.error.issues.find((i) => i.message === 'AGE_RESTRICTED');
    if (ageIssue) {
      return c.json({ error: { code: 'AGE_RESTRICTED' } }, 403);
    }
    return c.json(
      { error: { code: 'INVALID_INPUT', details: parsed.error.format() } },
      400,
    );
  }

  try {
    const result = await signupUser(c.env.IDENTITY_DB, parsed.data);
    return c.json(result, 201);
  } catch (err) {
    if (err instanceof SignupError) {
      switch (err.code) {
        case 'CONSENT_REQUIRED':
          return c.json({ error: { code: 'CONSENT_REQUIRED' } }, 403);
        case 'IDENTITY_EXISTS':
          return c.json({ error: { code: 'IDENTITY_EXISTS' } }, 409);
        case 'DB_ERROR':
          return c.json({ error: { code: 'INTERNAL_ERROR' } }, 500);
      }
    }
    throw err;
  }
});
