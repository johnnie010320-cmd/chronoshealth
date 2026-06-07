import { Hono } from 'hono';
import { ipRateLimit } from '../../middleware/ip-rate-limit.js';
import { existsEmail } from '../../me/storage.js';
import { CheckEmailQuery } from '../../schemas/signup.js';
import type { Bindings } from '../../bindings.js';

// 회원가입 폼 전용 이메일 중복 확인.
// Account enumeration 방어: IP별 30회/일 + 응답 시간 일정화 (200~400ms delay).

const IP_LIMIT_PER_DAY = 30;

async function constantDelay(): Promise<void> {
  // 200~400ms 무작위 delay.
  const ms = 200 + Math.floor(Math.random() * 200);
  await new Promise((res) => setTimeout(res, ms));
}

export const checkEmailRoute = new Hono<{ Bindings: Bindings }>();

checkEmailRoute.get('/', ipRateLimit(IP_LIMIT_PER_DAY), async (c) => {
  const parsed = CheckEmailQuery.safeParse({ email: c.req.query('email') ?? '' });
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const [exists] = await Promise.all([
    existsEmail(c.env.IDENTITY_DB, parsed.data.email),
    constantDelay(),
  ]);
  return c.json({ available: !exists });
});
