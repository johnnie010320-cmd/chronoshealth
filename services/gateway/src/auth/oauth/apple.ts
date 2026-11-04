// Sign in with Apple — client_secret 생성(ES256 JWT).
// 애플은 정적 secret이 아니라, Team ID/Key ID/.p8 개인키로 서명한 짧은 JWT를 client_secret으로 요구.
// WebCrypto ECDSA P-256 서명은 IEEE P1363(r||s) 형식 → 그대로 JWS ES256 서명값으로 사용.

import type { Bindings } from '../../bindings.js';

export class AppleConfigError extends Error {
  constructor() {
    super('apple oauth not configured');
  }
}

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlStr(s: string): string {
  return b64url(new TextEncoder().encode(s));
}

// PEM(.p8, PKCS#8) → DER(ArrayBuffer). importKey('pkcs8', ...)에 그대로 사용.
function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const buf = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return buf;
}

export function hasAppleConfig(env: Bindings): boolean {
  return Boolean(
    env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_SERVICE_ID && env.APPLE_PRIVATE_KEY,
  );
}

export async function buildAppleClientSecret(env: Bindings): Promise<string> {
  if (!hasAppleConfig(env)) throw new AppleConfigError();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: env.APPLE_KEY_ID };
  const payload = {
    iss: env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 60 * 60 * 24 * 180, // 180일(애플 상한 6개월)
    aud: 'https://appleid.apple.com',
    sub: env.APPLE_SERVICE_ID, // Services ID = client_id
  };
  const signingInput = `${b64urlStr(JSON.stringify(header))}.${b64urlStr(JSON.stringify(payload))}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(env.APPLE_PRIVATE_KEY as string),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${b64url(new Uint8Array(sig))}`;
}
