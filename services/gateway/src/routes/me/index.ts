import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  maskEmail,
  maskName,
  maskPhone,
  readMeProfile,
  updateMeProfile,
  ProfileUpdateError,
} from '../../me/storage.js';
import {
  AvatarError,
  ALLOWED_MIME,
  deleteAvatar,
  hasAvatar,
  readAvatar,
  upsertAvatar,
  validateAvatarPayload,
} from '../../me/avatar.js';
import { ProfileUpdateRequest } from '../../schemas/signup.js';
import type { Bindings } from '../../bindings.js';

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
  const avatar = await hasAvatar(c.env.IDENTITY_DB, pseudonymId);

  return c.json({
    profile: {
      userPseudonymId: profile.userPseudonymId,
      name: profile.name == null ? null : reveal ? profile.name : maskName(profile.name),
      email: reveal ? profile.email : maskEmail(profile.email),
      phone: profile.phone == null ? null : reveal ? profile.phone : maskPhone(profile.phone),
      birthYear: profile.birthYear,
      sex: profile.sex,
      nationality: profile.nationality,
      createdAt: profile.createdAt,
      consentTermsVersion: profile.consentTermsVersion,
      consentPrivacyVersion: profile.consentPrivacyVersion,
      consentRecordedAt: profile.consentRecordedAt,
      isProfileComplete: profile.isProfileComplete,
      revealed: reveal,
      hasAvatar: avatar.exists,
      avatarUpdatedAt: avatar.updatedAt,
    },
  });
});

// ADR 0013 — Step 2 본인정보 입력/갱신.
meRoute.put('/profile', authMiddleware, rateLimit(30), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = ProfileUpdateRequest.safeParse(raw);
  if (!parsed.success) {
    const ageIssue = parsed.error.issues.find((i) => i.message === 'AGE_RESTRICTED');
    if (ageIssue) {
      return c.json({ error: { code: 'AGE_RESTRICTED' } }, 403);
    }
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }

  try {
    await updateMeProfile(c.env.IDENTITY_DB, pseudonymId, parsed.data);
  } catch (err) {
    if (err instanceof ProfileUpdateError) {
      switch (err.code) {
        case 'PHONE_EXISTS':
          return c.json({ error: { code: 'PHONE_EXISTS' } }, 409);
        case 'DB_ERROR':
          return c.json({ error: { code: 'INTERNAL_ERROR' } }, 500);
      }
    }
    throw err;
  }

  const updated = await readMeProfile(c.env.IDENTITY_DB, pseudonymId);
  return c.json({ profile: updated });
});

// ---- 프로필 사진 ----------------------------------------------------------

const AvatarUpsertRequest = z
  .object({
    mimeType: z.enum(ALLOWED_MIME),
    dataB64: z.string().min(1),
  })
  .strict();

meRoute.get('/avatar', authMiddleware, rateLimit(200), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const avatar = await readAvatar(c.env.IDENTITY_DB, pseudonymId);
  if (!avatar) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  return c.json({
    mimeType: avatar.mimeType,
    dataB64: avatar.dataB64,
    byteSize: avatar.byteSize,
    updatedAt: avatar.updatedAt,
  });
});

meRoute.put('/avatar', authMiddleware, rateLimit(30), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = AvatarUpsertRequest.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  try {
    const { mimeType, byteSize } = validateAvatarPayload(
      parsed.data.mimeType,
      parsed.data.dataB64,
    );
    await upsertAvatar(c.env.IDENTITY_DB, pseudonymId, mimeType, parsed.data.dataB64, byteSize);
    return c.json({ ok: true, byteSize });
  } catch (err) {
    if (err instanceof AvatarError) {
      const status = err.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return c.json({ error: { code: err.code } }, status);
    }
    throw err;
  }
});

meRoute.delete('/avatar', authMiddleware, rateLimit(30), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const removed = await deleteAvatar(c.env.IDENTITY_DB, pseudonymId);
  return c.json({ deleted: removed });
});
