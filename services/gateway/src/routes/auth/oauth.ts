import { Hono } from 'hono';
import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { ipRateLimit } from '../../middleware/ip-rate-limit.js';
import { setSessionCookies } from '../../auth/cookies.js';
import {
  getProviderRuntime,
  buildAuthorizeUrl,
  exchangeCode,
  fetchUser,
  isSupportedProvider,
  OAuthConfigError,
  OAuthFlowError,
} from '../../auth/oauth/providers.js';
import { findOrCreateOAuthUser } from '../../auth/oauth/flow.js';
import {
  signState,
  verifyState,
  randomToken,
  generateCodeVerifier,
  codeChallengeS256,
  sanitizeReturnPath,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_TTL_MS,
} from '../../auth/oauth/state.js';
import type { Bindings } from '../../bindings.js';

const OAUTH_IP_LIMIT_PER_DAY = 120;

export const oauthRoute = new Hono<{ Bindings: Bindings }>();

// 게이트웨이는 same-origin 프록시 뒤에 있어 자기 host(workers.dev)만 본다.
// 브라우저가 실제 접속한 오리진(vitacodeapp.com 등)을 프록시가 넘겨준 헤더로 복원.
// redirect_uri 는 provider 콘솔 등록값과 정확히 일치해야 하므로 이 오리진 기준으로 만든다.
function publicOrigin(c: { req: { header: (n: string) => string | undefined; url: string } }, env: Bindings): string {
  const host = c.req.header('x-forwarded-host');
  const proto = c.req.header('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;
  if (env.APP_PUBLIC_ORIGIN) return env.APP_PUBLIC_ORIGIN;
  try {
    return new URL(c.req.url).origin;
  } catch {
    return 'https://vitacodeapp.com';
  }
}

function redirectUriFor(origin: string, provider: string): string {
  return `${origin}/api/v1/auth/oauth/${provider}/callback`;
}

function loginErrorRedirect(origin: string, code: string): string {
  return `${origin}/login?error=${encodeURIComponent(code)}`;
}

// GET /:provider/start — provider 인가 화면으로 302.
oauthRoute.get('/:provider/start', ipRateLimit(OAUTH_IP_LIMIT_PER_DAY), async (c) => {
  const provider = c.req.param('provider');
  const origin = publicOrigin(c, c.env);
  if (!isSupportedProvider(provider)) {
    return c.redirect(loginErrorRedirect(origin, 'oauth_unsupported'), 302);
  }

  let rt;
  try {
    rt = await getProviderRuntime(provider, c.env);
  } catch (err) {
    if (err instanceof OAuthConfigError) {
      return c.redirect(loginErrorRedirect(origin, 'oauth_config'), 302);
    }
    throw err;
  }

  const secret = c.env.OAUTH_STATE_SECRET;
  if (!secret) return c.redirect(loginErrorRedirect(origin, 'oauth_config'), 302);

  const nonce = randomToken(24);
  const verifier = generateCodeVerifier();
  const returnPath = sanitizeReturnPath(c.req.query('return'));
  const redirectUri = redirectUriFor(origin, provider);
  // 회원가입 화면에서 온 요청(intent=signup) — 이미 가입된 계정이면 선택 화면으로 유도.
  const signupIntent = c.req.query('intent') === 'signup';
  // "다른 계정으로 가입"(switch=1) — provider 계정 재선택/재인증 강제.
  const forceSwitch = c.req.query('switch') === '1';

  const stateToken = await signState(secret, {
    p: provider,
    n: nonce,
    r: returnPath,
    v: verifier,
    exp: Date.now() + OAUTH_STATE_TTL_MS,
    ...(signupIntent ? { i: 's' as const } : {}),
  });

  // 애플은 콜백이 cross-site POST(form_post)라 SameSite=Lax 쿠키가 전송 안 됨 → None 필요.
  // 나머지(GET 콜백)는 Lax로 충분(최상위 GET 네비게이션엔 Lax도 전송됨).
  const sameSite: 'Lax' | 'None' = provider === 'apple' ? 'None' : 'Lax';
  setCookie(c, OAUTH_STATE_COOKIE, stateToken, {
    httpOnly: true,
    secure: true,
    sameSite,
    path: '/',
    maxAge: Math.floor(OAUTH_STATE_TTL_MS / 1000),
  });

  const codeChallenge = rt.usesPkce ? await codeChallengeS256(verifier) : undefined;
  const authorizeUrl = buildAuthorizeUrl(rt, {
    redirectUri,
    state: nonce,
    ...(codeChallenge ? { codeChallenge } : {}),
    ...(forceSwitch ? { forceSwitch: true } : {}),
  });
  return c.redirect(authorizeUrl, 302);
});

// 콜백 공통 처리 — GET(카카오·구글·네이버 쿼리) / POST(애플 form_post) 공용.
async function handleCallback(
  c: Context<{ Bindings: Bindings }>,
  provider: string,
  params: {
    code?: string | undefined;
    stateParam?: string | undefined;
    providerError?: string | undefined;
  },
) {
  const origin = publicOrigin(c, c.env);
  if (!isSupportedProvider(provider)) {
    return c.redirect(loginErrorRedirect(origin, 'oauth_unsupported'), 302);
  }

  // provider 가 에러로 되돌린 경우(사용자 취소 등).
  if (params.providerError) {
    return c.redirect(loginErrorRedirect(origin, 'oauth_denied'), 302);
  }

  const { code, stateParam } = params;
  const stateCookie = getCookie(c, OAUTH_STATE_COOKIE);
  // 1회용 — 결과와 무관하게 즉시 폐기.
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/' });

  const secret = c.env.OAUTH_STATE_SECRET;
  if (!code || !stateParam || !stateCookie || !secret) {
    return c.redirect(loginErrorRedirect(origin, 'oauth_state'), 302);
  }

  const state = await verifyState(secret, stateCookie);
  if (!state || state.p !== provider || state.n !== stateParam) {
    return c.redirect(loginErrorRedirect(origin, 'oauth_state'), 302);
  }

  let rt;
  try {
    rt = await getProviderRuntime(provider, c.env);
  } catch {
    return c.redirect(loginErrorRedirect(origin, 'oauth_config'), 302);
  }

  const redirectUri = redirectUriFor(origin, provider);

  try {
    const tokens = await exchangeCode(rt, {
      code,
      redirectUri,
      codeVerifier: state.v,
      state: stateParam,
    });
    const user = await fetchUser(rt, tokens);
    const signupIntent = state.i === 's';
    const result = await findOrCreateOAuthUser(c.env.IDENTITY_DB, provider, user, {
      signupIntent,
    });

    // 회원가입 의도인데 이미 가입된 계정 → 로그인시키지 않고 선택 화면으로.
    if (result.status === 'already_registered') {
      return c.redirect(`${origin}/signup?exists=${encodeURIComponent(provider)}`, 302);
    }

    setSessionCookies(c, result.sessionToken, result.userPseudonymId);

    const dest = result.isNewUser ? '/onboarding' : sanitizeReturnPath(state.r);
    return c.redirect(`${origin}${dest}`, 302);
  } catch (err) {
    if (err instanceof OAuthFlowError && err.code === 'NO_EMAIL') {
      return c.redirect(loginErrorRedirect(origin, 'oauth_no_email'), 302);
    }
    console.error('oauth callback failed', provider, err);
    return c.redirect(loginErrorRedirect(origin, 'oauth_failed'), 302);
  }
}

// GET 콜백 — 카카오·구글·네이버(쿼리 파라미터).
oauthRoute.get('/:provider/callback', ipRateLimit(OAUTH_IP_LIMIT_PER_DAY), async (c) => {
  return handleCallback(c, c.req.param('provider'), {
    code: c.req.query('code'),
    stateParam: c.req.query('state'),
    providerError: c.req.query('error'),
  });
});

// POST 콜백 — 애플(response_mode=form_post, application/x-www-form-urlencoded).
oauthRoute.post('/:provider/callback', ipRateLimit(OAUTH_IP_LIMIT_PER_DAY), async (c) => {
  let body: Record<string, unknown> = {};
  try {
    body = (await c.req.parseBody()) as Record<string, unknown>;
  } catch {
    /* 빈 바디 처리 → 아래에서 oauth_state 로 귀결 */
  }
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  return handleCallback(c, c.req.param('provider'), {
    code: str(body.code),
    stateParam: str(body.state),
    providerError: str(body.error),
  });
});
