import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  maskEmail,
  maskName,
  maskPhone,
  readMeProfile,
} from '../../me/storage.js';
import type { Bindings } from '../../bindings.js';

// 본인 PII 조회 — 자신의 계정 정보 (마스킹 기본, ?reveal=1 시 전체).
// reveal=1 도 본인 한정 (다른 사용자 ID 조회 불가). admin unmask는 별도 admin 라우트.

export const meRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

meRoute.get('/', authMiddleware, rateLimit(120), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const reveal = c.req.query('reveal') === '1';

  const profile = await readMeProfile(c.env.IDENTITY_DB, pseudonymId);
  if (!profile) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }

  return c.json({
    profile: {
      userPseudonymId: profile.userPseudonymId,
      name: reveal ? profile.name : maskName(profile.name),
      email: reveal ? profile.email : maskEmail(profile.email),
      phone: reveal ? profile.phone : maskPhone(profile.phone),
      birthYear: profile.birthYear,
      sex: profile.sex,
      nationality: profile.nationality,
      createdAt: profile.createdAt,
      consentTermsVersion: profile.consentTermsVersion,
      consentPrivacyVersion: profile.consentPrivacyVersion,
      consentRecordedAt: profile.consentRecordedAt,
      revealed: reveal,
    },
  });
});
