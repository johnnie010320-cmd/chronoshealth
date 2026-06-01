// ADR 0012 — PBKDF2-SHA256 비밀번호 해싱.
// CF Workers SubtleCrypto 네이티브.
// 16-byte 솔트 + 100,000 iteration + 32-byte 출력. base64 저장.

const ITERATIONS = 100_000;
const KEY_LEN_BITS = 256;
const SALT_BYTES = 16;
export const PASSWORD_ALGO = 'pbkdf2-sha256-100k';

const enc = new TextEncoder();

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(
  password: string,
  saltBytes: Uint8Array,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBytes,
      iterations: ITERATIONS,
    },
    key,
    KEY_LEN_BITS,
  );
  return new Uint8Array(bits);
}

export type HashedPassword = {
  hash: string; // base64
  salt: string; // base64
  algo: string;
};

export async function hashPassword(password: string): Promise<HashedPassword> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hashBytes = await pbkdf2(password, saltBytes);
  return {
    hash: bytesToB64(hashBytes),
    salt: bytesToB64(saltBytes),
    algo: PASSWORD_ALGO,
  };
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(
  candidate: string,
  expected: { hash: string; salt: string; algo: string },
): Promise<boolean> {
  if (expected.algo !== PASSWORD_ALGO) return false;
  const saltBytes = b64ToBytes(expected.salt);
  const candidateHash = await pbkdf2(candidate, saltBytes);
  const expectedHash = b64ToBytes(expected.hash);
  return timingSafeEqual(candidateHash, expectedHash);
}

// 클라이언트는 1차 검증 했지만 서버도 강제. 정책:
//   - 8~128자
//   - 영문 대문자 / 영문 소문자 / 숫자 / 특수문자 중 3종 이상
//   - 한국어 (가-힣) 차단
export const PASSWORD_POLICY = {
  minLen: 8,
  maxLen: 128,
  classesRequired: 3,
} as const;

export function validatePasswordPolicy(value: string): {
  ok: boolean;
  reason?:
    | 'PASSWORD_TOO_SHORT'
    | 'PASSWORD_TOO_LONG'
    | 'PASSWORD_KOREAN_NOT_ALLOWED'
    | 'PASSWORD_NOT_COMPLEX';
} {
  if (value.length < PASSWORD_POLICY.minLen) return { ok: false, reason: 'PASSWORD_TOO_SHORT' };
  if (value.length > PASSWORD_POLICY.maxLen) return { ok: false, reason: 'PASSWORD_TOO_LONG' };
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(value)) {
    return { ok: false, reason: 'PASSWORD_KOREAN_NOT_ALLOWED' };
  }
  const classes =
    Number(/[A-Z]/.test(value)) +
    Number(/[a-z]/.test(value)) +
    Number(/\d/.test(value)) +
    Number(/[^A-Za-z0-9]/.test(value));
  if (classes < PASSWORD_POLICY.classesRequired) {
    return { ok: false, reason: 'PASSWORD_NOT_COMPLEX' };
  }
  return { ok: true };
}
