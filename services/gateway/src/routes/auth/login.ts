import { Hono } from 'hono';
import { LoginRequest, SetPasswordRequest } from '../../schemas/signup.js';
import { loginUser, LoginError } from '../../auth/login.js';
import { setPasswordForLegacy, SetPasswordError } from '../../auth/set-password.js';
import { ipRateLimit } from '../../middleware/ip-rate-limit.js';
import type { Bindings } from '../../bindings.js';

// spec docs/spec/identity/02-login.md (예정) / ADR 0012 정합.
const LOGIN_IP_LIMIT_PER_DAY = 60;

export const loginRoute = new Hono<{ Bindings: Bindings }>();

loginRoute.post('/', ipRateLimit(LOGIN_IP_LIMIT_PER_DAY), async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }

  const parsed = LoginRequest.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }

  try {
    const result = await loginUser(c.env.IDENTITY_DB, parsed.data);
    return c.json(result, 200);
  } catch (err) {
    if (err instanceof LoginError) {
      switch (err.code) {
        case 'INVALID_CREDENTIALS':
          return c.json({ error: { code: 'INVALID_CREDENTIALS' } }, 401);
        case 'PASSWORD_REQUIRED':
          return c.json({ error: { code: 'PASSWORD_REQUIRED' } }, 409);
        case 'DB_ERROR':
          return c.json({ error: { code: 'INTERNAL_ERROR' } }, 500);
      }
    }
    throw err;
  }
});

export const setPasswordRoute = new Hono<{ Bindings: Bindings }>();

setPasswordRoute.post('/', ipRateLimit(LOGIN_IP_LIMIT_PER_DAY), async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }

  const parsed = SetPasswordRequest.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }

  try {
    const result = await setPasswordForLegacy(c.env.IDENTITY_DB, parsed.data);
    return c.json(result, 200);
  } catch (err) {
    if (err instanceof SetPasswordError) {
      switch (err.code) {
        case 'NOT_FOUND':
          return c.json({ error: { code: 'NOT_FOUND' } }, 404);
        case 'ALREADY_SET':
          return c.json({ error: { code: 'ALREADY_SET' } }, 409);
        case 'PASSWORD_TOO_SHORT':
        case 'PASSWORD_TOO_LONG':
        case 'PASSWORD_KOREAN_NOT_ALLOWED':
        case 'PASSWORD_NOT_COMPLEX':
          return c.json({ error: { code: err.code } }, 400);
        case 'DB_ERROR':
          return c.json({ error: { code: 'INTERNAL_ERROR' } }, 500);
      }
    }
    throw err;
  }
});
