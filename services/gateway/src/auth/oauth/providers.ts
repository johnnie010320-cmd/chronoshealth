// SNS 로그인 제공사 레지스트리 — kakao / google / naver (애플은 2단계에서 별도 모듈).
// 표준 Authorization Code 플로우. 각 제공사의 authorize/token/userinfo 차이를 흡수해
// { externalId, email, name } 로 정규화한다.
//
// 클라이언트 키는 wrangler secret 으로만 주입(bindings.ts). 미설정 시 OAuthConfigError.

import type { Bindings } from '../../bindings.js';
import { buildAppleClientSecret, hasAppleConfig } from './apple.js';

export type OAuthProvider = 'kakao' | 'google' | 'naver' | 'apple';

export const SUPPORTED_PROVIDERS: readonly OAuthProvider[] = ['kakao', 'google', 'naver', 'apple'];

export function isSupportedProvider(v: string): v is OAuthProvider {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(v);
}

export type NormalizedUser = {
  externalId: string;
  email: string | null;
  name: string | null;
};

export class OAuthConfigError extends Error {
  constructor(public provider: OAuthProvider) {
    super(`oauth provider not configured: ${provider}`);
  }
}

export class OAuthFlowError extends Error {
  constructor(
    public code:
      | 'TOKEN_EXCHANGE_FAILED'
      | 'USERINFO_FAILED'
      | 'NO_EMAIL'
      | 'INVALID_ID_TOKEN',
  ) {
    super(code);
  }
}

type ProviderRuntime = {
  provider: OAuthProvider;
  usesPkce: boolean;
  clientId: string;
  clientSecret: string | undefined;
  scope: string;
  authorizeUrl: string;
  extraAuthParams: Record<string, string>;
  // "다른 계정으로 가입" 시 provider 계정 선택/재인증을 강제하는 파라미터.
  // (캐시된 소셜 세션을 무시하고 계정을 다시 고르게 함.)
  switchAuthParams: Record<string, string>;
};

// env 에서 제공사 키를 읽어 런타임 설정 구성. 미설정 시 throw.
// 애플은 client_secret이 ES256 JWT라 비동기 생성 → 전체를 async로.
export async function getProviderRuntime(
  provider: OAuthProvider,
  env: Bindings,
): Promise<ProviderRuntime> {
  switch (provider) {
    case 'kakao': {
      const clientId = env.KAKAO_REST_API_KEY;
      if (!clientId) throw new OAuthConfigError('kakao');
      return {
        provider,
        usesPkce: false,
        clientId,
        clientSecret: env.KAKAO_CLIENT_SECRET, // 선택(카카오 콘솔에서 활성화한 경우만)
        scope: 'account_email',
        authorizeUrl: 'https://kauth.kakao.com/oauth/authorize',
        extraAuthParams: {},
        // 카카오: prompt=login 으로 로그인 화면 강제 → 다른 카카오 계정으로 전환 가능.
        switchAuthParams: { prompt: 'login' },
      };
    }
    case 'google': {
      const clientId = env.GOOGLE_CLIENT_ID;
      const clientSecret = env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) throw new OAuthConfigError('google');
      return {
        provider,
        usesPkce: true,
        clientId,
        clientSecret,
        scope: 'openid email profile',
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        extraAuthParams: { access_type: 'online', prompt: 'select_account' },
        // 구글은 기본으로도 select_account(계정 선택)이 걸려 있음 — 전환 시 동일.
        switchAuthParams: { prompt: 'select_account' },
      };
    }
    case 'naver': {
      const clientId = env.NAVER_CLIENT_ID;
      const clientSecret = env.NAVER_CLIENT_SECRET;
      if (!clientId || !clientSecret) throw new OAuthConfigError('naver');
      return {
        provider,
        usesPkce: false,
        clientId,
        clientSecret,
        scope: '',
        authorizeUrl: 'https://nid.naver.com/oauth2.0/authorize',
        extraAuthParams: {},
        // 네이버: auth_type=reprompt 로 재인증 강제 → 다른 네이버 계정으로 전환 가능.
        switchAuthParams: { auth_type: 'reprompt' },
      };
    }
    case 'apple': {
      if (!hasAppleConfig(env)) throw new OAuthConfigError('apple');
      return {
        provider,
        usesPkce: false,
        clientId: env.APPLE_SERVICE_ID as string,
        clientSecret: await buildAppleClientSecret(env), // ES256 JWT
        scope: 'name email',
        authorizeUrl: 'https://appleid.apple.com/auth/authorize',
        // name/email scope 요청 시 애플은 response_mode=form_post(콜백이 POST) 필수.
        extraAuthParams: { response_mode: 'form_post' },
        // 애플은 계정 선택 강제 파라미터가 없음(기기/브라우저의 Apple ID 재사용) — best effort로 빈 값.
        switchAuthParams: {},
      };
    }
  }
}

export function buildAuthorizeUrl(
  rt: ProviderRuntime,
  opts: { redirectUri: string; state: string; codeChallenge?: string; forceSwitch?: boolean },
): string {
  const url = new URL(rt.authorizeUrl);
  const p = url.searchParams;
  p.set('response_type', 'code');
  p.set('client_id', rt.clientId);
  p.set('redirect_uri', opts.redirectUri);
  p.set('state', opts.state);
  if (rt.scope) p.set('scope', rt.scope);
  if (rt.usesPkce && opts.codeChallenge) {
    p.set('code_challenge', opts.codeChallenge);
    p.set('code_challenge_method', 'S256');
  }
  for (const [k, v] of Object.entries(rt.extraAuthParams)) p.set(k, v);
  // "다른 계정으로 가입" — provider 계정 재선택 강제 파라미터로 덮어씀.
  if (opts.forceSwitch) {
    for (const [k, v] of Object.entries(rt.switchAuthParams)) p.set(k, v);
  }
  return url.toString();
}

type TokenSet = { accessToken: string | null; idToken: string | null };

const TOKEN_URLS: Record<OAuthProvider, string> = {
  kakao: 'https://kauth.kakao.com/oauth/token',
  google: 'https://oauth2.googleapis.com/token',
  naver: 'https://nid.naver.com/oauth2.0/token',
  apple: 'https://appleid.apple.com/auth/token',
};

export async function exchangeCode(
  rt: ProviderRuntime,
  opts: { code: string; redirectUri: string; codeVerifier?: string; state: string },
): Promise<TokenSet> {
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('client_id', rt.clientId);
  body.set('code', opts.code);
  body.set('redirect_uri', opts.redirectUri);
  if (rt.clientSecret) body.set('client_secret', rt.clientSecret);
  if (rt.usesPkce && opts.codeVerifier) body.set('code_verifier', opts.codeVerifier);
  if (rt.provider === 'naver') body.set('state', opts.state);

  const tokenUrl = TOKEN_URLS[rt.provider];
  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  });
  if (!resp.ok) throw new OAuthFlowError('TOKEN_EXCHANGE_FAILED');
  const json = (await resp.json()) as {
    access_token?: string;
    id_token?: string;
    error?: string;
  };
  if (json.error || (!json.access_token && !json.id_token)) {
    throw new OAuthFlowError('TOKEN_EXCHANGE_FAILED');
  }
  return { accessToken: json.access_token ?? null, idToken: json.id_token ?? null };
}

// id_token(JWT) payload 디코드. 토큰은 방금 TLS 로 token endpoint 에서 직접 받았으므로
// (Authorization Code direct exchange) 서명 재검증 없이 클레임을 신뢰한다(OIDC 허용).
function decodeJwtPayload(idToken: string): Record<string, unknown> | null {
  const parts = idToken.split('.');
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchUser(rt: ProviderRuntime, tokens: TokenSet): Promise<NormalizedUser> {
  // 구글·애플: id_token(OIDC) 클레임에서 추출(별도 userinfo 호출 불필요).
  if (rt.provider === 'google' || rt.provider === 'apple') {
    if (!tokens.idToken) throw new OAuthFlowError('INVALID_ID_TOKEN');
    const claims = decodeJwtPayload(tokens.idToken);
    if (!claims || typeof claims.sub !== 'string') throw new OAuthFlowError('INVALID_ID_TOKEN');
    const email = typeof claims.email === 'string' ? claims.email : null;
    const verified = claims.email_verified === true || claims.email_verified === 'true';
    return {
      externalId: claims.sub,
      email: email && verified ? email : null,
      // 애플은 실명을 id_token에 안 담음(최초 콜백 POST body에만) → null, 온보딩에서 수집.
      name: typeof claims.name === 'string' ? claims.name : null,
    };
  }

  if (rt.provider === 'kakao') {
    if (!tokens.accessToken) throw new OAuthFlowError('USERINFO_FAILED');
    const resp = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (!resp.ok) throw new OAuthFlowError('USERINFO_FAILED');
    const json = (await resp.json()) as {
      id?: number | string;
      kakao_account?: {
        email?: string;
        is_email_valid?: boolean;
        is_email_verified?: boolean;
        profile?: { nickname?: string };
      };
    };
    if (json.id === undefined || json.id === null) throw new OAuthFlowError('USERINFO_FAILED');
    const acct = json.kakao_account;
    const emailOk = acct?.is_email_valid !== false && acct?.is_email_verified !== false;
    return {
      externalId: String(json.id),
      email: acct?.email && emailOk ? acct.email : null,
      name: acct?.profile?.nickname ?? null,
    };
  }

  // naver
  if (!tokens.accessToken) throw new OAuthFlowError('USERINFO_FAILED');
  const resp = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  if (!resp.ok) throw new OAuthFlowError('USERINFO_FAILED');
  const json = (await resp.json()) as {
    resultcode?: string;
    response?: { id?: string; email?: string; name?: string; nickname?: string };
  };
  const r = json.response;
  if (!r?.id) throw new OAuthFlowError('USERINFO_FAILED');
  return {
    externalId: r.id,
    email: r.email ?? null,
    name: r.name ?? r.nickname ?? null,
  };
}
