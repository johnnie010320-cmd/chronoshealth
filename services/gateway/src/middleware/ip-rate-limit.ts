import { createMiddleware } from 'hono/factory';

// IP당 호출 제한 (signup 등 미인증 라우트용 — 일 단위).
// Worker isolate 인메모리 — 재배포 / 새 isolate 시 초기화. P0/P1 한정 (spec docs/spec/identity.md 6.1).

const requestLog = new Map<string, number[]>();
const DAY_MS = 24 * 60 * 60 * 1000;

function clientIp(c: { req: { header: (n: string) => string | undefined } }): string {
  return (
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

export const ipRateLimit = (maxPerDay: number) =>
  createMiddleware(async (c, next) => {
    const ip = clientIp(c);
    const now = Date.now();
    const dayAgo = now - DAY_MS;

    const previous = requestLog.get(ip) ?? [];
    const recent = previous.filter((t) => t > dayAgo);

    if (recent.length >= maxPerDay) {
      return c.json({ error: { code: 'RATE_LIMITED' } }, 429);
    }

    recent.push(now);
    requestLog.set(ip, recent);
    await next();
    return;
  });

export const __clearIpRateLimit = (): void => {
  requestLog.clear();
};
