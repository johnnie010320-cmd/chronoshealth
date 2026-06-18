import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { searchNicknames } from '../../messaging/nickname.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'members-v0.1.0';

export const membersRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

// 닉네임 자동검색 — DM/대화방 초대/커뮤니티 관리자 지정 시 기존 회원 선택용.
// 닉네임(공개 핸들)만 반환, 본인 제외. PII 0.
membersRoute.get('/search', authMiddleware, rateLimit(120), async (c) => {
  const me = c.get('userPseudonymId');
  const raw = (c.req.query('q') ?? '').trim();
  // LIKE 특수문자 제거 → 순수 prefix 매칭.
  const q = raw.replace(/[%_]/g, '').slice(0, 32);
  if (q.length < 1) {
    return c.json({ nicknames: [], modelVersion: MODEL_VERSION });
  }
  const nicknames = await searchNicknames(c.env.IDENTITY_DB, q, 8, me);
  return c.json({ nicknames, modelVersion: MODEL_VERSION });
});
