// OAuth 로그인 핵심 — 소셜 계정 → 크로노스 회원 매핑 + 세션 발급.
//
// 연결 정책(계정 탈취 방지):
//   1) (provider, external_id)로 이미 연결된 회원 → 그 회원으로 로그인.
//   2) 아니면 제공사가 준 "검증된 이메일"로 기존 회원 조회 → 있으면 그 회원에 소셜 연결.
//      (providers.ts 가 미검증 이메일은 null 로 떨어뜨리므로 여기 도달하는 email 은 검증본.)
//   3) 둘 다 없으면 신규 회원 생성(본인정보·약관동의는 온보딩에서 별도 수집).
//
// 회원가입 의도(signupIntent)일 때는 1)·2)처럼 이미 가입된 계정이면 바로 로그인시키지 않고
// status:'already_registered' 로 돌려보낸다 → 라우트가 선택 화면(로그인 / 다른 계정으로 가입)으로 유도.
//
// 이메일이 없으면(NO_EMAIL) 신규 생성·연결 불가 → 라우트에서 로그인 화면 에러로 유도.

import {
  generatePseudonymId,
  generateSessionToken,
  sessionExpiresAt,
} from '../tokens.js';
import { normalizeEmail } from '../email.js';
import { OAuthFlowError, type NormalizedUser, type OAuthProvider } from './providers.js';

export type OAuthResolution =
  | {
      status: 'ok';
      userPseudonymId: string;
      sessionToken: string;
      expiresAt: string;
      isNewUser: boolean;
    }
  // 회원가입 의도인데 이미 가입된 계정 — 세션 발급/연결 없이 선택 화면으로 유도.
  | { status: 'already_registered' };

async function issueSession(
  db: D1Database,
  userPseudonymId: string,
): Promise<{ sessionToken: string; expiresAt: string }> {
  const sessionToken = generateSessionToken();
  const expiresAt = sessionExpiresAt();
  await db
    .prepare(
      `INSERT INTO session_tokens (token, user_pseudonym_id, expires_at) VALUES (?, ?, ?)`,
    )
    .bind(sessionToken, userPseudonymId, expiresAt)
    .run();
  return { sessionToken, expiresAt };
}

async function findLinked(
  db: D1Database,
  provider: OAuthProvider,
  externalId: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT user_pseudonym_id FROM oauth_accounts WHERE provider = ? AND external_id = ? LIMIT 1`,
    )
    .bind(provider, externalId)
    .first<{ user_pseudonym_id: string }>();
  return row?.user_pseudonym_id ?? null;
}

export async function findOrCreateOAuthUser(
  db: D1Database,
  provider: OAuthProvider,
  user: NormalizedUser,
  opts: { signupIntent?: boolean } = {},
): Promise<OAuthResolution> {
  const signupIntent = opts.signupIntent === true;

  // 1) 이미 연결된 소셜 계정.
  const linked = await findLinked(db, provider, user.externalId);
  if (linked) {
    // 회원가입 의도면 바로 로그인시키지 않고 선택 화면으로.
    if (signupIntent) return { status: 'already_registered' };
    const s = await issueSession(db, linked);
    return { status: 'ok', userPseudonymId: linked, ...s, isNewUser: false };
  }

  // 이후 단계는 검증된 이메일 필수.
  if (!user.email) throw new OAuthFlowError('NO_EMAIL');
  const email = normalizeEmail(user.email);

  // 2) 같은 이메일의 기존 회원.
  const existing = await db
    .prepare(`SELECT user_pseudonym_id FROM users WHERE lower(email) = ? LIMIT 1`)
    .bind(email)
    .first<{ user_pseudonym_id: string }>();
  if (existing) {
    // 회원가입 의도면 소셜 연결·로그인하지 않고 선택 화면으로.
    if (signupIntent) return { status: 'already_registered' };
    await db
      .prepare(
        `INSERT INTO oauth_accounts (provider, external_id, user_pseudonym_id, email)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(provider, user.externalId, existing.user_pseudonym_id, user.email)
      .run();
    const s = await issueSession(db, existing.user_pseudonym_id);
    return { status: 'ok', userPseudonymId: existing.user_pseudonym_id, ...s, isNewUser: false };
  }

  // 3) 신규 회원 생성. 본인정보(name/phone/birth/sex/nationality)·약관동의는 온보딩에서.
  //    소셜 표시명은 실명이 아닐 수 있어 name 은 채우지 않음(온보딩에서 수집).
  const userPseudonymId = generatePseudonymId();
  const sessionToken = generateSessionToken();
  const expiresAt = sessionExpiresAt();
  try {
    await db.batch([
      db
        .prepare(`INSERT INTO users (user_pseudonym_id, email) VALUES (?, ?)`)
        .bind(userPseudonymId, email),
      db
        .prepare(
          `INSERT INTO oauth_accounts (provider, external_id, user_pseudonym_id, email)
           VALUES (?, ?, ?, ?)`,
        )
        .bind(provider, user.externalId, userPseudonymId, user.email),
      db
        .prepare(
          `INSERT INTO session_tokens (token, user_pseudonym_id, expires_at) VALUES (?, ?, ?)`,
        )
        .bind(sessionToken, userPseudonymId, expiresAt),
    ]);
    return { status: 'ok', userPseudonymId, sessionToken, expiresAt, isNewUser: true };
  } catch (err) {
    // 동시 생성 경합(email UNIQUE 등) — 방금 다른 요청이 같은 회원을 만들었다는 뜻.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE') || msg.includes('constraint')) {
      // 회원가입 의도면 "이미 가입됨"으로 안내(세션 발급·연결 안 함).
      if (signupIntent) return { status: 'already_registered' };
      const relinked = await findLinked(db, provider, user.externalId);
      if (relinked) {
        const s = await issueSession(db, relinked);
        return { status: 'ok', userPseudonymId: relinked, ...s, isNewUser: false };
      }
      const raced = await db
        .prepare(`SELECT user_pseudonym_id FROM users WHERE lower(email) = ? LIMIT 1`)
        .bind(email)
        .first<{ user_pseudonym_id: string }>();
      if (raced) {
        await db
          .prepare(
            `INSERT OR IGNORE INTO oauth_accounts (provider, external_id, user_pseudonym_id, email)
             VALUES (?, ?, ?, ?)`,
          )
          .bind(provider, user.externalId, raced.user_pseudonym_id, user.email)
          .run();
        const s = await issueSession(db, raced.user_pseudonym_id);
        return { status: 'ok', userPseudonymId: raced.user_pseudonym_id, ...s, isNewUser: false };
      }
    }
    throw err;
  }
}
