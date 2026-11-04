import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import type { Bindings } from '../../bindings.js';
import {
  issuePasswordResetToken,
  checkPasswordResetToken,
  confirmPasswordReset,
  buildResetEmail,
  PasswordResetError,
  type MailLocale,
} from '../../auth/password-reset.js';
import { normalizeEmail } from '../../auth/email.js';
import { clearSessionCookies } from '../../auth/cookies.js';
import { ipRateLimitWindow, hitKeyLimit } from '../../middleware/ip-rate-limit.js';
import { sendMail } from '../../mail/resend.js';
import { logger } from '../../lib/logger.js';

// 비밀번호 재설정(이메일 링크) — /api/v1/auth/password-reset/*
//   POST /request  { email, locale? } → 항상 200 { ok:true } (계정 존재 여부 비노출)
//   POST /verify   { token }          → 200 { valid:true } | 400 RESET_TOKEN_*
//   POST /confirm  { token, password }→ 200 { ok:true }    | 400 RESET_TOKEN_* / PASSWORD_*
// 구 POST /api/v1/auth/reset-password(이메일+전화 지식기반)는 제거됨.

const HOUR_MS = 60 * 60 * 1000;
// IP 당 / 이메일 당 요청 한도(isolate 인메모리 — ip-rate-limit.ts 와 같은 P1 방식).
// 계정별 발급 한도(3회/시간)는 D1 기준으로 auth/password-reset.ts 에서 따로 건다.
const REQUEST_IP_PER_HOUR = 10;
const REQUEST_EMAIL_PER_HOUR = 5;
const VERIFY_IP_PER_HOUR = 60;
const CONFIRM_IP_PER_HOUR = 20;

const TOKEN_SCHEMA = z.string().min(20).max(128).regex(/^[A-Za-z0-9_-]+$/);

const RequestBody = z
  .object({
    email: z.string().email().max(254),
    locale: z.enum(['ko', 'en', 'ja', 'es']).optional(),
  })
  .strict();
const VerifyBody = z.object({ token: TOKEN_SCHEMA }).strict();
const ConfirmBody = z
  .object({ token: TOKEN_SCHEMA, password: z.string().min(1).max(128) })
  .strict();

// 메일 링크 오리진 — 요청 헤더를 그대로 믿으면 Host 위조로 타인 메일에 공격자 도메인 링크가 실린다.
// 허용 목록에 있는 호스트만 쓰고, 나머지는 APP_PUBLIC_ORIGIN / 기본 운영 도메인.
const ALLOWED_LINK_HOSTS = new Set(['vitacodeapp.com', 'www.vitacodeapp.com']);
export function resetLinkOrigin(forwardedHost: string | undefined, env: Bindings): string {
  const host = (forwardedHost ?? '').trim().toLowerCase();
  if (ALLOWED_LINK_HOSTS.has(host)) return `https://${host}`;
  if (env.ENVIRONMENT === 'dev' && host === 'localhost:3000') return 'http://localhost:3000';
  return env.APP_PUBLIC_ORIGIN ?? 'https://vitacodeapp.com';
}

// 메일 발송은 응답 뒤로 미룬다 — 계정 유무에 따라 응답 시간이 달라지지 않게(타이밍 비노출).
function runInBackground(c: Context<{ Bindings: Bindings }>, p: Promise<void>): Promise<void> | null {
  try {
    c.executionCtx.waitUntil(p);
    return null;
  } catch {
    // 테스트(app.request) 등 ExecutionContext 가 없는 환경 — 직접 기다린다.
    return p;
  }
}

async function readJson(c: Context): Promise<{ ok: true; raw: unknown } | { ok: false }> {
  try {
    return { ok: true, raw: await c.req.json() };
  } catch {
    return { ok: false };
  }
}

export const passwordResetRoute = new Hono<{ Bindings: Bindings }>();

passwordResetRoute.post('/request', ipRateLimitWindow(REQUEST_IP_PER_HOUR, HOUR_MS), async (c) => {
  const body = await readJson(c);
  if (!body.ok) return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  const parsed = RequestBody.safeParse(body.raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

  const email = normalizeEmail(parsed.data.email);
  const locale: MailLocale = parsed.data.locale ?? 'ko';
  const neutral = () => c.json({ ok: true }, 200);

  // 이메일별 한도 — 계정 유무와 무관하게 같은 입력엔 같은 결과(429)라 존재 여부를 드러내지 않는다.
  if (!hitKeyLimit('pwreset-email', email, REQUEST_EMAIL_PER_HOUR, HOUR_MS)) {
    return c.json({ error: { code: 'RATE_LIMITED' } }, 429);
  }

  const env = c.env;
  const origin = resetLinkOrigin(c.req.header('x-forwarded-host'), env);

  const work = (async () => {
    let outcome;
    try {
      outcome = await issuePasswordResetToken(env.IDENTITY_DB, email);
    } catch {
      logger.error('password_reset.issue_failed', { reason: 'DB_ERROR' });
      return;
    }
    if (!outcome.issued) {
      if (outcome.reason === 'USER_LIMIT') logger.warn('password_reset.user_limit');
      return;
    }
    const link = `${origin}/reset-password?token=${encodeURIComponent(outcome.token)}`;
    const mail = buildResetEmail(locale, link);
    const sent = await sendMail(env, { to: email, ...mail });
    if (!sent.ok) {
      logger.error('password_reset.mail_failed', {
        reason: sent.reason,
        status: sent.status ?? null,
      });
    }
  })();

  const pending = runInBackground(c, work);
  if (pending) await pending;
  return neutral();
});

passwordResetRoute.post('/verify', ipRateLimitWindow(VERIFY_IP_PER_HOUR, HOUR_MS), async (c) => {
  const body = await readJson(c);
  if (!body.ok) return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  const parsed = VerifyBody.safeParse(body.raw);
  if (!parsed.success) return c.json({ error: { code: 'RESET_TOKEN_INVALID' } }, 400);

  try {
    const r = await checkPasswordResetToken(c.env.IDENTITY_DB, parsed.data.token);
    if (!r.ok) return c.json({ error: { code: r.code } }, 400);
    return c.json({ valid: true }, 200);
  } catch {
    logger.error('password_reset.verify_failed', { reason: 'DB_ERROR' });
    return c.json({ error: { code: 'INTERNAL_ERROR' } }, 500);
  }
});

passwordResetRoute.post('/confirm', ipRateLimitWindow(CONFIRM_IP_PER_HOUR, HOUR_MS), async (c) => {
  const body = await readJson(c);
  if (!body.ok) return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  const parsed = ConfirmBody.safeParse(body.raw);
  if (!parsed.success) {
    const tokenOk = TOKEN_SCHEMA.safeParse(
      (body.raw as { token?: unknown } | null)?.token,
    ).success;
    return c.json({ error: { code: tokenOk ? 'INVALID_INPUT' : 'RESET_TOKEN_INVALID' } }, 400);
  }

  try {
    await confirmPasswordReset(c.env.IDENTITY_DB, parsed.data.token, parsed.data.password);
    // 서버 세션은 전부 삭제됨 — 이 브라우저의 쿠키도 정리(새 비밀번호로 다시 로그인).
    clearSessionCookies(c);
    return c.json({ ok: true }, 200);
  } catch (err) {
    if (err instanceof PasswordResetError) {
      if (err.code === 'DB_ERROR') {
        logger.error('password_reset.confirm_failed', { reason: 'DB_ERROR' });
        return c.json({ error: { code: 'INTERNAL_ERROR' } }, 500);
      }
      return c.json({ error: { code: err.code } }, 400);
    }
    throw err;
  }
});
