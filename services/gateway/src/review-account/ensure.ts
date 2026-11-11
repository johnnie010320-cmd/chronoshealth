// 스토어 심사용 데모 계정 지키기 (2026-11-10 죠니: "현재의 비밀번호로 늘 동작하도록").
// Apple·Google 심사관은 같은 이메일·비밀번호로 로그인한다. 심사관이 회원 탈퇴를 시험하거나 비밀번호가 바뀌면
// 다음 심사가 로그인부터 막힌다 → cron(10분)이 계정·비밀번호·VITA 결과를 원래대로 되돌린다.
// 탈퇴는 그대로 진짜 지워진다(탈퇴 직후 로그인 실패 = 정상). 다음 cron 에서 새 계정으로 다시 만든다.
// 비밀번호는 코드에 두지 않는다 — wrangler secret REVIEW_ACCOUNT_PASSWORD. 없으면 아무것도 안 한다.

import type { Bindings } from '../bindings.js';
import { generatePseudonymId } from '../auth/tokens.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { readLatestVitaResult, saveVitaResult } from '../vita/storage.js';

export const REVIEW_EMAIL = 'review@vitalabsinc.com';

const PROFILE = { name: '김비타', phone: '010-0000-2026', birthYear: 1985, sex: 'female', nationality: 'KR' } as const;
const CONSENT_VERSION = 'v1.0';
// 영역별 점수(높을수록 관리 필요) — 화면이 고르게 채워지도록 최적·주의·경고가 섞인 값.
const VITA_SCORES = {
  energy: 38,
  glucose: 27,
  gut: 44,
  inflammation: 31,
  detox: 18,
  circulation: 35,
  hormone: 22,
  sleep: 52,
  musculoskeletal: 29,
  neuro: 41,
};
const VITA_MODEL_VERSION = 'vita-v8.1.0';

export type EnsureResult = 'skipped' | 'ok' | 'created' | 'password_reset';

export async function ensureReviewAccount(env: Bindings): Promise<EnsureResult> {
  const password = env.REVIEW_ACCOUNT_PASSWORD;
  if (!password) return 'skipped';
  const db = env.IDENTITY_DB;

  const row = await db
    .prepare(
      'SELECT user_pseudonym_id, password_hash, password_salt, password_algo FROM users WHERE lower(email) = ? LIMIT 1',
    )
    .bind(REVIEW_EMAIL)
    .first<{ user_pseudonym_id: string; password_hash: string | null; password_salt: string | null; password_algo: string | null }>();

  let pid: string;
  let result: EnsureResult = 'ok';
  if (!row) {
    pid = generatePseudonymId();
    const h = await hashPassword(password);
    const now = new Date().toISOString();
    await db.batch([
      db
        .prepare(
          `INSERT INTO users (
            user_pseudonym_id, email, password_hash, password_salt, password_algo,
            consent_terms_version, consent_privacy_version, consent_recorded_at, marketing_opt_in,
            name, phone, birth_year, sex, nationality
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
        )
        .bind(
          pid,
          REVIEW_EMAIL,
          h.hash,
          h.salt,
          h.algo,
          CONSENT_VERSION,
          CONSENT_VERSION,
          now,
          PROFILE.name,
          PROFILE.phone,
          PROFILE.birthYear,
          PROFILE.sex,
          PROFILE.nationality,
        ),
      ...(['medical', 'terms'] as const).map((kind) =>
        db
          .prepare(`INSERT INTO consent_log (user_pseudonym_id, consent_kind, granted, source) VALUES (?, ?, 1, 'signup')`)
          .bind(pid, kind),
      ),
      db
        .prepare(
          `INSERT INTO consent_log (user_pseudonym_id, consent_kind, granted, source) VALUES (?, 'research', 1, 'signup_privacy')`,
        )
        .bind(pid),
    ]);
    result = 'created';
  } else {
    pid = row.user_pseudonym_id;
    const same =
      row.password_hash !== null &&
      row.password_salt !== null &&
      row.password_algo !== null &&
      (await verifyPassword(password, { hash: row.password_hash, salt: row.password_salt, algo: row.password_algo }));
    if (!same) {
      const h = await hashPassword(password);
      await db
        .prepare('UPDATE users SET password_hash = ?, password_salt = ?, password_algo = ? WHERE user_pseudonym_id = ?')
        .bind(h.hash, h.salt, h.algo, pid)
        .run();
      result = 'password_reset';
    }
  }

  if ((await readLatestVitaResult(env.DB, pid)) === null) {
    await saveVitaResult(env.DB, env.IDENTITY_DB, pid, { sectionScores: VITA_SCORES }, VITA_MODEL_VERSION);
  }
  return result;
}
