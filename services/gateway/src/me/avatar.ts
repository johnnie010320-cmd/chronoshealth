// 프로필 사진 저장/조회 (identity-vault). 클라이언트가 캔버스로 리사이즈한
// 256x256 base64 이미지를 받는다. 한도: base64 256KB.

const MAX_B64_BYTES = 256 * 1024;
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AvatarMime = (typeof ALLOWED_MIME)[number];

export type AvatarRow = {
  mimeType: AvatarMime;
  dataB64: string;
  byteSize: number;
  updatedAt: string;
};

export class AvatarError extends Error {
  constructor(public code: 'PAYLOAD_TOO_LARGE' | 'INVALID_MIME' | 'INVALID_DATA') {
    super(code);
  }
}

export function validateAvatarPayload(
  mimeType: string,
  dataB64: string,
): { mimeType: AvatarMime; byteSize: number } {
  if (!ALLOWED_MIME.includes(mimeType as AvatarMime)) {
    throw new AvatarError('INVALID_MIME');
  }
  if (dataB64.length === 0 || dataB64.length > MAX_B64_BYTES) {
    throw new AvatarError('PAYLOAD_TOO_LARGE');
  }
  // base64 정합성 — atob 가능한지만 검사 (Workers 환경에는 atob 존재).
  let byteSize = 0;
  try {
    const binary = atob(dataB64);
    byteSize = binary.length;
  } catch {
    throw new AvatarError('INVALID_DATA');
  }
  return { mimeType: mimeType as AvatarMime, byteSize };
}

export async function readAvatar(
  identityDb: D1Database,
  userPseudonymId: string,
): Promise<AvatarRow | null> {
  const row = await identityDb
    .prepare(
      `SELECT mime_type, data_b64, byte_size, updated_at
         FROM user_avatars WHERE user_pseudonym_id = ? LIMIT 1`,
    )
    .bind(userPseudonymId)
    .first<{
      mime_type: string;
      data_b64: string;
      byte_size: number;
      updated_at: string;
    }>();
  if (!row) return null;
  return {
    mimeType: row.mime_type as AvatarMime,
    dataB64: row.data_b64,
    byteSize: row.byte_size,
    updatedAt: row.updated_at,
  };
}

export async function hasAvatar(
  identityDb: D1Database,
  userPseudonymId: string,
): Promise<{ exists: boolean; updatedAt: string | null }> {
  const row = await identityDb
    .prepare(
      `SELECT updated_at FROM user_avatars WHERE user_pseudonym_id = ? LIMIT 1`,
    )
    .bind(userPseudonymId)
    .first<{ updated_at: string }>();
  return row ? { exists: true, updatedAt: row.updated_at } : { exists: false, updatedAt: null };
}

export async function upsertAvatar(
  identityDb: D1Database,
  userPseudonymId: string,
  mimeType: AvatarMime,
  dataB64: string,
  byteSize: number,
): Promise<void> {
  await identityDb
    .prepare(
      `INSERT INTO user_avatars (user_pseudonym_id, mime_type, data_b64, byte_size)
         VALUES (?, ?, ?, ?)
       ON CONFLICT (user_pseudonym_id) DO UPDATE SET
         mime_type = excluded.mime_type,
         data_b64 = excluded.data_b64,
         byte_size = excluded.byte_size,
         updated_at = datetime('now')`,
    )
    .bind(userPseudonymId, mimeType, dataB64, byteSize)
    .run();
}

export async function deleteAvatar(
  identityDb: D1Database,
  userPseudonymId: string,
): Promise<boolean> {
  const res = await identityDb
    .prepare(`DELETE FROM user_avatars WHERE user_pseudonym_id = ?`)
    .bind(userPseudonymId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}
