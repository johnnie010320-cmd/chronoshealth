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

// 라우트 전용 버킷 + 임의 창(windowMs) 버전 — 위 ipRateLimit 은 모든 라우트가 IP 카운터 1개를 공유한다.
// 비밀번호 재설정처럼 '로그인 한도와 섞이면 안 되는' 라우트용. 미들웨어 인스턴스마다 독립 카운터.
const bucketLog = new Map<string, number[]>();
let bucketSeq = 0;

export const ipRateLimitWindow = (max: number, windowMs: number) => {
  const bucket = `ipb${bucketSeq++}`;
  return createMiddleware(async (c, next) => {
    const key = `${bucket}:${clientIp(c)}`;
    const now = Date.now();
    const recent = (bucketLog.get(key) ?? []).filter((t) => t > now - windowMs);
    if (recent.length >= max) {
      return c.json({ error: { code: 'RATE_LIMITED' } }, 429);
    }
    recent.push(now);
    bucketLog.set(key, recent);
    await next();
    return;
  });
};

// 임의 키(예: 정규화한 이메일)별 제한 — 판정만 하고 기록까지 한다. 초과 시 false.
// 계정 존재 여부와 무관하게 같은 입력이면 같은 결과를 내므로 계정 존재를 드러내지 않는다.
export function hitKeyLimit(namespace: string, key: string, max: number, windowMs: number): boolean {
  const k = `key:${namespace}:${key}`;
  const now = Date.now();
  const recent = (bucketLog.get(k) ?? []).filter((t) => t > now - windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  bucketLog.set(k, recent);
  return true;
}

export const __clearIpRateLimit = (): void => {
  requestLog.clear();
  bucketLog.clear();
};
