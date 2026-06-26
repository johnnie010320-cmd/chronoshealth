// 크로노스→폼코치 SSO 핸드오프용 서명 토큰(HMAC-SHA256).
// 폼코치 워커가 동일 시크릿으로 검증 → service_role 로 매직링크 발급.
// 토큰에는 PII 최소화: 전화번호(폼코치 식별 키) + 표시명 + sport + 만료.

export type SsoPayload = {
  phone: string;
  name: string;
  sport: string;
  exp: number; // epoch ms
};

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

// `<b64url(payloadJson)>.<b64url(hmac)>`
export async function signSsoToken(secret: string, payload: SsoPayload): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = b64url(await hmac(secret, body));
  return `${body}.${sig}`;
}
