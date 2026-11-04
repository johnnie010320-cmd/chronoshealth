'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { AlertIcon } from '@/components/HealthIcons';
import { PasswordField } from '@/components/PasswordField';
import {
  requestPasswordReset,
  verifyPasswordResetToken,
  confirmPasswordReset,
} from '@/lib/api-client';
import { clearSession } from '@/lib/session';
import { validatePasswordPolicy } from '@/lib/signup-schema';

// 비밀번호 재설정(이메일 링크) — VeriDash 와 같은 UX.
//   /forgot-password : 이메일만 입력 → 항상 같은 안내("계정이 있으면 링크를 보냈습니다")
//   /reset-password?token=… : 진입 시 링크 확인(소모 X) → 새 비밀번호 2회 입력 → 변경 → /login?reset=1
//   만료·사용됨·무효 링크 → 안내 + "새 링크 받기"

const PRIMARY_BTN =
  'inline-flex w-full items-center justify-center rounded-2xl bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900';
const LINK_TEXT = 'text-[12px] text-stone-500 hover:underline dark:text-stone-400';

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100"
    >
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function Header({ title, body }: { title: string; body?: string }) {
  return (
    <header className="space-y-2 px-1">
      <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
        {title}
      </h1>
      {body && (
        <p className="text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">{body}</p>
      )}
    </header>
  );
}

export function ForgotPasswordForm() {
  const { t, locale } = useI18n();
  const L = t.login;
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim().toLowerCase(), locale);
      setSent(true);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'generic';
      setError((L.error as Record<string, string>)[code] ?? L.error.generic);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <Header title={L.resetSentTitle} body={L.resetSentBody} />
        <div className="card-shadow space-y-3 rounded-3xl bg-white p-5 dark:bg-stone-900">
          <button type="button" onClick={() => setSent(false)} className={PRIMARY_BTN}>
            {L.resetResend}
          </button>
          <p className="text-center">
            <Link href="/login" className={LINK_TEXT}>
              {L.resetBackToLogin}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title={L.resetTitle} body={L.resetBody} />
      {error && <ErrorBox message={error} />}
      <form
        onSubmit={onSubmit}
        className="card-shadow space-y-3 rounded-3xl bg-white p-5 dark:bg-stone-900"
      >
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-stone-700 dark:text-stone-300">
            {L.resetEmailLabel}
          </span>
          <input
            type="email"
            name="email"
            required
            placeholder={L.email.emailPlaceholder}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:bg-stone-900"
          />
        </label>
        <button type="submit" disabled={busy || email.trim() === ''} className={PRIMARY_BTN}>
          {busy ? L.resetSubmitting : L.resetSubmit}
        </button>
        <p className="text-center">
          <Link href="/login" className={LINK_TEXT}>
            {L.resetBackToLogin}
          </Link>
        </p>
      </form>
    </div>
  );
}

type LinkState = 'checking' | 'ready' | 'invalid';

export function ResetPasswordForm() {
  const { t } = useI18n();
  const L = t.login;
  const router = useRouter();
  // 토큰은 최초 1회만 URL 에서 읽어 ref 에 보관(StrictMode 이중 effect 에도 유지).
  const tokenRef = useRef<string | null>(null);
  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [invalidMsg, setInvalidMsg] = useState<string>(L.error.RESET_TOKEN_INVALID);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errText = (code: string) =>
    (L.error as Record<string, string>)[code] ?? L.error.generic;
  const isTokenError = (code: string) => code.startsWith('RESET_TOKEN_');

  // 링크 확인 — 정적 export 라 쿼리는 클라이언트에서 읽는다. verify 는 토큰을 소모하지 않는다.
  useEffect(() => {
    if (tokenRef.current === null) {
      tokenRef.current = new URLSearchParams(window.location.search).get('token') ?? '';
      // 주소창·기록에 토큰이 남지 않게 쿼리 제거(값은 메모리에만).
      if (tokenRef.current) window.history.replaceState(null, '', window.location.pathname);
    }
    const tk = tokenRef.current;
    if (!tk) {
      setLinkState('invalid');
      return;
    }
    let alive = true;
    verifyPasswordResetToken(tk)
      .then(() => alive && setLinkState('ready'))
      .catch((err: unknown) => {
        if (!alive) return;
        const code = err instanceof Error ? err.message : 'RESET_TOKEN_INVALID';
        setInvalidMsg(errText(isTokenError(code) ? code : 'RESET_TOKEN_INVALID'));
        setLinkState('invalid');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const policy = validatePasswordPolicy(pw);
    if (policy) {
      setError(errText(policy));
      return;
    }
    if (pw !== confirm) {
      setError(errText('PASSWORD_MISMATCH'));
      return;
    }
    setBusy(true);
    try {
      await confirmPasswordReset(tokenRef.current ?? '', pw);
      // 서버가 모든 세션을 무효화 — 로컬 세션 표식도 정리 후 새 비밀번호로 재로그인.
      clearSession();
      router.replace('/login?reset=1');
    } catch (err) {
      const code = err instanceof Error ? err.message : 'generic';
      if (isTokenError(code)) {
        setInvalidMsg(errText(code));
        setLinkState('invalid');
      } else {
        setError(errText(code));
      }
    } finally {
      setBusy(false);
    }
  }

  if (linkState === 'checking') {
    return (
      <div className="space-y-6">
        <Header title={L.resetNewTitle} />
        <p className="px-1 text-[13px] text-stone-500 dark:text-stone-400">{L.resetChecking}</p>
      </div>
    );
  }

  if (linkState === 'invalid') {
    return (
      <div className="space-y-6">
        <Header title={L.resetLinkInvalidTitle} />
        <ErrorBox message={invalidMsg} />
        <div className="card-shadow space-y-3 rounded-3xl bg-white p-5 dark:bg-stone-900">
          <Link href="/forgot-password" className={PRIMARY_BTN}>
            {L.resetRequestNew}
          </Link>
          <p className="text-center">
            <Link href="/login" className={LINK_TEXT}>
              {L.resetBackToLogin}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title={L.resetNewTitle} body={L.resetNewBody} />
      {error && <ErrorBox message={error} />}
      <form
        onSubmit={onSubmit}
        className="card-shadow space-y-3 rounded-3xl bg-white p-5 dark:bg-stone-900"
      >
        <PasswordField
          label={L.setPasswordNewLabel}
          name="newPassword"
          placeholder="••••••••"
          autoComplete="new-password"
          value={pw}
          onChange={setPw}
          showLabel={t.signup.showPassword}
          hideLabel={t.signup.hidePassword}
        />
        <PasswordField
          label={L.resetConfirmLabel}
          name="confirmPassword"
          placeholder="••••••••"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          showLabel={t.signup.showPassword}
          hideLabel={t.signup.hidePassword}
        />
        <button
          type="submit"
          disabled={busy || pw === '' || confirm === ''}
          className={PRIMARY_BTN}
        >
          {busy ? L.resetNewSubmitting : L.resetNewSubmit}
        </button>
      </form>
    </div>
  );
}
