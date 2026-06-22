import { createMiddleware } from 'hono/factory';
import type { AuthVariables } from './auth.js';

/**
 * 사용자별 호출 제한 (인메모리).
 *
 * - 카운터는 **라우트(미들웨어 인스턴스)별 + 사용자별**로 분리된다.
 *   (이전 버그: pseudonym 단독 키 → 모든 라우트가 하루치 카운터 1개를 공유 →
 *    메시지 화면의 4초 폴링 등이 send 한도를 잠식해 전송이 429로 실패.)
 * - 기본 창은 1일(quota 성 라우트: 설문·AI 등). windowMs 로 분당 등으로 조정.
 *
 * 본 구현은 mock — Worker isolate 메모리에만 누적, 재배포/새 isolate 시 초기화.
 * 정식 운영용은 CF KV/D1 기반으로 Slice 03 이후 교체.
 */

const requestLog = new Map<string, number[]>();

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

let bucketSeq = 0;

export const rateLimit = (max: number, windowMs: number = DAY_MS) => {
  // 미들웨어 인스턴스마다 고유 버킷 → 라우트별 독립 카운터.
  const bucket = `b${bucketSeq++}`;
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const pseudonym = c.get('userPseudonymId');
    const key = `${bucket}:${pseudonym}`;
    const now = Date.now();
    const since = now - windowMs;

    const recent = (requestLog.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= max) {
      return c.json({ error: { code: 'RATE_LIMITED' } }, 429);
    }
    recent.push(now);
    requestLog.set(key, recent);
    await next();
    return;
  });
};

/** 테스트 전용 — 인메모리 카운터 초기화. */
export const __clearRateLimit = (): void => {
  requestLog.clear();
};
