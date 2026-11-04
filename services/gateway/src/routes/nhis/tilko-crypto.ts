// 틸코(Tilko) 암호화 — 공식 샘플(Tilko_Php) 규약 그대로.
//  · AES-128-CBC, 키=16바이트 랜덤, IV=16바이트 0, PKCS7 패딩 → base64 (WebCrypto).
//  · ENC-Key = base64( RSA/PKCS1-v1.5( AES키, 서버 공개키(SPKI) ) ).
//    Workers WebCrypto 는 PKCS1-v1.5 암호화를 지원하지 않으므로 BigInt 로 직접 구현.
//    (공개키 n/e 추출만 WebCrypto importKey→exportKey(jwk) 사용.)
// Node 18+/Workers 공통: globalThis.crypto.subtle / getRandomValues 사용 → 로컬 테스트 가능.

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i] as number);
  return btoa(bin);
}

// Uint8Array → ArrayBuffer (WebCrypto BufferSource 인자용; TS lib 제네릭 호환).
function ab(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return b64ToBytes(b64);
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let x = 0n;
  for (let i = 0; i < bytes.length; i += 1) x = (x << 8n) | BigInt(bytes[i] as number);
  return x;
}

function bigIntToBytes(x: bigint, len: number): Uint8Array {
  const out = new Uint8Array(len);
  let v = x;
  for (let i = len - 1; i >= 0; i -= 1) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    e >>= 1n;
    b = (b * b) % mod;
  }
  return result;
}

// SPKI(base64) 공개키 → { n, e, k(모듈러스 바이트길이) }.
async function rsaParams(spkiB64: string): Promise<{ n: bigint; e: bigint; k: number }> {
  const spki = b64ToBytes(spkiB64);
  const key = await crypto.subtle.importKey(
    'spki',
    ab(spki),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt'],
  );
  const jwk = (await crypto.subtle.exportKey('jwk', key)) as JsonWebKey;
  const nBytes = b64urlToBytes(jwk.n as string);
  const n = bytesToBigInt(nBytes);
  const e = bytesToBigInt(b64urlToBytes(jwk.e as string));
  return { n, e, k: nBytes.length };
}

// RSAES-PKCS1-v1_5 암호화(RFC 8017 7.2.1). data(16바이트 AES키) → base64 암호문.
export async function rsaPkcs1v15EncryptB64(spkiB64: string, data: Uint8Array): Promise<string> {
  const { n, e, k } = await rsaParams(spkiB64);
  if (data.length > k - 11) throw new Error('RSA_MESSAGE_TOO_LONG');
  // EM = 0x00 || 0x02 || PS(랜덤 非0, 길이 k-mLen-3) || 0x00 || M
  const psLen = k - data.length - 3;
  const ps = new Uint8Array(psLen);
  crypto.getRandomValues(ps);
  for (let i = 0; i < psLen; i += 1) {
    while (ps[i] === 0) {
      const one = new Uint8Array(1);
      crypto.getRandomValues(one);
      ps[i] = one[0] as number;
    }
  }
  const em = new Uint8Array(k);
  em[0] = 0x00;
  em[1] = 0x02;
  em.set(ps, 2);
  em[2 + psLen] = 0x00;
  em.set(data, 3 + psLen);
  const c = modPow(bytesToBigInt(em), e, n);
  return bytesToB64(bigIntToBytes(c, k));
}

export function randomAesKey(): Uint8Array {
  const k = new Uint8Array(16);
  crypto.getRandomValues(k);
  return k;
}

const ZERO_IV = new Uint8Array(16);

// AES-128-CBC(IV=0) 암호화 → base64 (PKCS7은 WebCrypto 기본).
export async function aesEncryptB64(aesKey: Uint8Array, plain: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', ab(aesKey), { name: 'AES-CBC' }, false, ['encrypt']);
  const data = new TextEncoder().encode(plain);
  const ct = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: ab(ZERO_IV) }, key, ab(data));
  return bytesToB64(new Uint8Array(ct));
}

// AES-128-CBC(IV=0) 복호화(base64 → 평문). 응답이 암호화된 경우 대비.
export async function aesDecrypt(aesKey: Uint8Array, b64: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', ab(aesKey), { name: 'AES-CBC' }, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: ab(ZERO_IV) }, key, ab(b64ToBytes(b64)));
  return new TextDecoder().decode(pt);
}
