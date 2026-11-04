import { hashPassword, validatePasswordPolicy } from './password.js';
import { generateSessionToken } from './tokens.js';
import { normalizeEmail } from './email.js';

// 비밀번호 재설정 — 이메일 링크 방식 (2026-10-18, 구 P1 '이메일+전화' 지식기반 확인을 대체).
// 흐름: request(이메일) → 1회용 토큰 발급·메일 발송 → verify(페이지 진입 시 유효성만 확인, 소모 X)
//       → confirm(토큰 + 새 비밀번호) → 비밀번호 교체 + 토큰 소모 + 해당 사용자 세션 전부 무효화.
// 저장: 토큰 원문은 메일 링크에만, DB 는 SHA-256 hex 만 (migration identity/0010).
// 시각: 모두 ISO-8601 UTC 문자열로 바인딩 — datetime('now') 형식과 섞지 않는다(문자열 비교).

export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30분
// 같은 계정에 1시간 동안 발급 가능한 링크 수. 초과분은 조용히 건너뛴다(응답은 동일).
export const RESET_MAX_PER_USER_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;

export type ResetTokenErrorCode =
  | 'RESET_TOKEN_INVALID'
  | 'RESET_TOKEN_EXPIRED'
  | 'RESET_TOKEN_USED';

export type ConfirmErrorCode =
  | ResetTokenErrorCode
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_LONG'
  | 'PASSWORD_KOREAN_NOT_ALLOWED'
  | 'PASSWORD_NOT_COMPLEX'
  | 'DB_ERROR';

export class PasswordResetError extends Error {
  constructor(public code: ConfirmErrorCode) {
    super(code);
  }
}

export async function hashResetToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  let hex = '';
  for (const b of new Uint8Array(digest)) hex += b.toString(16).padStart(2, '0');
  return hex;
}

export type RequestOutcome =
  | { issued: true; token: string; expiresAt: string }
  | { issued: false; reason: 'NO_ACCOUNT' | 'USER_LIMIT' };

// 계정이 있으면 토큰을 발급해 원문을 돌려준다(메일 발송은 호출부). 없으면 issued:false.
// 호출부는 어느 경우든 동일한 응답을 내야 한다(계정 존재 여부 비노출).
export async function issuePasswordResetToken(
  db: D1Database,
  rawEmail: string,
  nowMs: number = Date.now(),
): Promise<RequestOutcome> {
  const user = await db
    .prepare('SELECT user_pseudonym_id FROM users WHERE lower(email) = ? LIMIT 1')
    .bind(normalizeEmail(rawEmail))
    .first<{ user_pseudonym_id: string }>();
  if (!user) return { issued: false, reason: 'NO_ACCOUNT' };

  const since = new Date(nowMs - HOUR_MS).toISOString();
  const recent = await db
    .prepare(
      `SELECT COUNT(*) AS c FROM password_reset_tokens
        WHERE user_pseudonym_id = ? AND created_at > ?`,
    )
    .bind(user.user_pseudonym_id, since)
    .first<{ c: number }>();
  if ((recent?.c ?? 0) >= RESET_MAX_PER_USER_PER_HOUR) {
    return { issued: false, reason: 'USER_LIMIT' };
  }

  const token = generateSessionToken(); // 32바이트 랜덤 base64url
  const tokenHash = await hashResetToken(token);
  const nowIso = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + RESET_TOKEN_TTL_MS).toISOString();

  await db.batch([
    // 이전에 보낸 미사용 링크는 무효화 — 가장 최근 메일의 링크만 유효.
    db
      .prepare(
        `UPDATE password_reset_tokens SET used_at = ?
          WHERE user_pseudonym_id = ? AND used_at IS NULL`,
      )
      .bind(nowIso, user.user_pseudonym_id),
    db
      .prepare(
        `INSERT INTO password_reset_tokens
           (token_hash, user_pseudonym_id, created_at, expires_at, used_at)
         VALUES (?, ?, ?, ?, NULL)`,
      )
      .bind(tokenHash, user.user_pseudonym_id, nowIso, expiresAt),
  ]);

  return { issued: true, token, expiresAt };
}

type TokenRow = {
  user_pseudonym_id: string;
  expires_at: string;
  used_at: string | null;
};

export type TokenCheck =
  | { ok: true; userPseudonymId: string; tokenHash: string }
  | { ok: false; code: ResetTokenErrorCode };

// 토큰 상태만 확인(소모하지 않음). 재설정 페이지 진입 시 + confirm 사전 확인에 사용.
// 메일 스캐너가 링크를 미리 열어도 페이지 JS 가 아니면 토큰은 남는다(GET 으로 소모 안 함).
export async function checkPasswordResetToken(
  db: D1Database,
  token: string,
  nowMs: number = Date.now(),
): Promise<TokenCheck> {
  const tokenHash = await hashResetToken(token);
  const row = await db
    .prepare(
      `SELECT user_pseudonym_id, expires_at, used_at FROM password_reset_tokens
        WHERE token_hash = ? LIMIT 1`,
    )
    .bind(tokenHash)
    .first<TokenRow>();
  if (!row) return { ok: false, code: 'RESET_TOKEN_INVALID' };
  if (row.used_at) return { ok: false, code: 'RESET_TOKEN_USED' };
  if (row.expires_at <= new Date(nowMs).toISOString()) {
    return { ok: false, code: 'RESET_TOKEN_EXPIRED' };
  }
  return { ok: true, userPseudonymId: row.user_pseudonym_id, tokenHash };
}

// 토큰 + 새 비밀번호 → 비밀번호 교체, 토큰 소모, 해당 사용자의 기존 세션 전부 삭제.
// 새 세션은 발급하지 않는다 — 사용자는 로그인 화면에서 새 비밀번호로 다시 로그인.
export async function confirmPasswordReset(
  db: D1Database,
  token: string,
  newPassword: string,
  nowMs: number = Date.now(),
): Promise<{ userPseudonymId: string }> {
  const policy = validatePasswordPolicy(newPassword);
  if (!policy.ok) throw new PasswordResetError(policy.reason ?? 'PASSWORD_NOT_COMPLEX');

  const check = await checkPasswordResetToken(db, token, nowMs);
  if (!check.ok) throw new PasswordResetError(check.code);

  const hashed = await hashPassword(newPassword);
  const nowIso = new Date(nowMs).toISOString();

  // 1회용 보장 — 조건부 UPDATE 로 먼저 소모. 동시 요청 중 하나만 changes=1.
  let consumed: number;
  try {
    const r = await db
      .prepare(
        `UPDATE password_reset_tokens SET used_at = ?
          WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`,
      )
      .bind(nowIso, check.tokenHash, nowIso)
      .run();
    consumed = r.meta?.changes ?? 0;
  } catch {
    throw new PasswordResetError('DB_ERROR');
  }
  if (consumed !== 1) throw new PasswordResetError('RESET_TOKEN_USED');

  try {
    await db.batch([
      db
        .prepare(
          `UPDATE users SET password_hash = ?, password_salt = ?, password_algo = ?
            WHERE user_pseudonym_id = ?`,
        )
        .bind(hashed.hash, hashed.salt, hashed.algo, check.userPseudonymId),
      // 기존 세션 전면 무효화(계정 탈취 대비) — 구 reset-password 와 동일.
      db
        .prepare('DELETE FROM session_tokens WHERE user_pseudonym_id = ?')
        .bind(check.userPseudonymId),
      // 같은 사용자에게 남은 다른 미사용 링크도 함께 무효화.
      db
        .prepare(
          `UPDATE password_reset_tokens SET used_at = ?
            WHERE user_pseudonym_id = ? AND used_at IS NULL`,
        )
        .bind(nowIso, check.userPseudonymId),
    ]);
  } catch {
    throw new PasswordResetError('DB_ERROR');
  }

  return { userPseudonymId: check.userPseudonymId };
}

// ── 메일 본문 ──────────────────────────────────────────────────────────────
export type MailLocale = 'ko' | 'en' | 'ja' | 'es';

const MAIL_COPY: Record<
  MailLocale,
  { subject: string; heading: string; body: string; button: string; expiry: string; ignore: string }
> = {
  ko: {
    subject: '[VITAcode] 비밀번호 재설정 안내',
    heading: '비밀번호 재설정',
    body: 'VITAcode 계정의 비밀번호 재설정 요청을 받았습니다. 아래 버튼을 눌러 새 비밀번호를 설정해 주세요.',
    button: '새 비밀번호 설정',
    expiry: '이 링크는 {min}분 동안 한 번만 사용할 수 있습니다.',
    ignore: '본인이 요청하지 않았다면 이 메일을 무시하세요. 비밀번호는 바뀌지 않습니다.',
  },
  en: {
    subject: '[VITAcode] Reset your password',
    heading: 'Reset your password',
    body: 'We received a request to reset the password for your VITAcode account. Tap the button below to set a new password.',
    button: 'Set a new password',
    expiry: 'This link can be used once and expires in {min} minutes.',
    ignore: "If you didn't request this, you can ignore this email. Your password won't change.",
  },
  ja: {
    subject: '[VITAcode] パスワード再設定のご案内',
    heading: 'パスワードの再設定',
    body: 'VITAcode アカウントのパスワード再設定のリクエストを受け付けました。下のボタンから新しいパスワードを設定してください。',
    button: '新しいパスワードを設定',
    expiry: 'このリンクは{min}分間、1回のみ有効です。',
    ignore: 'お心当たりがない場合は、このメールを破棄してください。パスワードは変更されません。',
  },
  es: {
    subject: '[VITAcode] Restablece tu contraseña',
    heading: 'Restablecer contraseña',
    body: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta de VITAcode. Pulsa el botón para crear una nueva contraseña.',
    button: 'Crear nueva contraseña',
    expiry: 'Este enlace solo puede usarse una vez y caduca en {min} minutos.',
    ignore: 'Si no lo solicitaste, ignora este correo. Tu contraseña no cambiará.',
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildResetEmail(
  locale: MailLocale,
  link: string,
  ttlMinutes: number = RESET_TOKEN_TTL_MS / 60000,
): { subject: string; html: string; text: string } {
  const m = MAIL_COPY[locale];
  const expiry = m.expiry.replace('{min}', String(ttlMinutes));
  // 일본어는 Noto Sans JP 선언(미선언 시 한자가 한국어 자형으로 렌더됨).
  const font =
    locale === 'ja'
      ? "'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif"
      : "-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
  const safeLink = escapeHtml(link);
  const html = `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:${font};color:#1c1917;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;">
<tr><td style="padding:28px 24px;">
<p style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:.04em;color:#57534e;">VITAcode</p>
<h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(m.heading)}</h1>
<p style="margin:0 0 24px;font-size:14px;line-height:1.6;">${escapeHtml(m.body)}</p>
<p style="margin:0 0 24px;"><a href="${safeLink}" style="display:inline-block;padding:12px 20px;background:#1c1917;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;">${escapeHtml(m.button)}</a></p>
<p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#57534e;">${escapeHtml(expiry)}</p>
<p style="margin:0 0 16px;font-size:12px;line-height:1.6;color:#57534e;">${escapeHtml(m.ignore)}</p>
<p style="margin:0;font-size:11px;line-height:1.5;color:#a8a29e;word-break:break-all;">${safeLink}</p>
</td></tr></table>
</body></html>`;
  const text = `${m.heading}\n\n${m.body}\n\n${link}\n\n${expiry}\n${m.ignore}\n`;
  return { subject: m.subject, html, text };
}
