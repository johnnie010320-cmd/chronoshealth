import { createMiddleware } from 'hono/factory';
import type { AuthVariables } from './auth.js';

/**
 * 사용자별 일 N회 호출 제한 (인메모리).
 *
 * 본 구현은 mock — Worker isolate 단위 메모리에만 누적, 재배포 / 새 isolate 시 초기화.
 * 정식 운영용은 CF KV 또는 D1 기반으로 Slice 03 이후 교체.
 */

const requestLog = new Map<string, number[]>();

const DAY_MS = 24 * 60 * 60 * 1000;

export const rateLimit = (maxPerDay: number) =>
  createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const pseudonym = c.get('userPseudonymId');
    const now = Date.now();
    const dayAgo = now - DAY_MS;

    const previous = requestLog.get(pseudonym) ?? [];
    const recent = previous.filter((t) => t > dayAgo);

    if (recent.length >= maxPerDay) {
      return c.json({ error: { code: 'RATE_LIMITED' } }, 429);
    }

    recent.push(now);
    requestLog.set(pseudonym, recent);
    await next();
    return;
  });

/** 테스트 전용 — 인메모리 카운터 초기화. */
export const __clearRateLimit = (): void => {
  requestLog.clear();
};
