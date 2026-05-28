// ADR 0011: HMAC-SHA256(server_salt, lower(trim(email))) → 결정적 pseudonym.
// 동일 이메일 재등록 차단 (analysis.beta_signups UNIQUE INDEX) +
// 평문 이메일은 identity 도메인에만 보관.

const TEXT_ENC = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// CF Workers WebCrypto. 동기 보장 X — async 필수.
// salt 는 BETA_SIGNUP_HMAC_SALT 환경 변수 (wrangler secret), 평문 노출 금지.
export async function emailPseudonym(salt: string, email: string): Promise<string> {
  if (!salt || salt.length < 16) {
    throw new Error('BETA_SIGNUP_HMAC_SALT missing or too short (min 16 chars)');
  }
  const key = await crypto.subtle.importKey(
    'raw',
    TEXT_ENC.encode(salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    TEXT_ENC.encode(normalizeEmail(email)),
  );
  return bytesToHex(new Uint8Array(mac));
}

// IP 익명화 — 일 단위 솔트로 SHA-256.
// 일 단위 회전 + per-day salt 결합 → IP 평문 미보관, 동일 IP 같은 날 추적은 가능.
export async function ipHash(salt: string, ip: string, dayUtc: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    TEXT_ENC.encode(`${dayUtc}|${salt}|${ip}`),
  );
  return bytesToHex(new Uint8Array(buf));
}

export function utcDayStamp(nowMs: number = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10); // YYYY-MM-DD
}
