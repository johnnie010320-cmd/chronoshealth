'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { AlertIcon } from '@/components/HealthIcons';
import { KakaoLogo, GoogleLogo } from '@/components/SocialIcons';
import {
  submitLogin,
  submitSetPassword,
} from '@/lib/api-client';
import { writeSession } from '@/lib/session';
import { validatePasswordPolicy } from '@/lib/signup-schema';

// ADR 0012 — 비밀번호 단독 로그인 실동작.
// 카카오/Google은 placeholder (alert) — P2 OAuth ADR 도입 시 활성화.
export function LoginForm() {
  const { t } = useI18n();
  const L = t.login;
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSetPassword, setNeedsSetPassword] = useState(false);

  const notifySocial = () => {
    if (typeof window !== 'undefined') window.alert(L.unavailable);
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitLogin({ email: email.trim(), password });
      writeSession(res);
      router.push('/');
    } catch (err) {
      const code = err instanceof Error ? err.message : 'generic';
      if (code === 'PASSWORD_REQUIRED') {
        setNeedsSetPassword(true);
        setError(null);
      } else {
        setError(
          (L.error as Record<string, string>)[code] ?? L.error.generic,
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (needsSetPassword) {
    return (
      <SetPasswordForm
        email={email}
        onSuccess={() => router.push('/')}
        onCancel={() => setNeedsSetPassword(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          {L.heroTitle}
        </h1>
        <p className="text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
          {L.heroBody}
        </p>
      </header>

      <div
        role="note"
        className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-[12px] leading-relaxed text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
      >
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{L.notice}</span>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="card-shadow rounded-3xl bg-white p-5 dark:bg-stone-900">
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
          {L.email.sectionTitle}
        </h2>
        <form onSubmit={handleLogin} className="space-y-3">
          <FieldText
            label={L.email.emailLabel}
            type="email"
            name="email"
            placeholder={L.email.emailPlaceholder}
            autoComplete="email"
            value={email}
            onChange={setEmail}
          />
          <FieldText
            label={L.email.passwordLabel}
            type="password"
            name="password"
            placeholder={L.email.passwordPlaceholder}
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />
          <button
            type="submit"
            disabled={submitting || email.trim() === '' || password === ''}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
          >
            {submitting ? L.email.submitting : L.email.submit}
          </button>
        </form>
      </section>

      <Divider label={L.divider} />

      <div className="space-y-3">
        <button
          type="button"
          onClick={notifySocial}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FEE500] px-6 py-3.5 text-sm font-semibold text-[#191919] transition active:scale-[0.98] hover:brightness-95"
        >
          <KakaoLogo className="h-5 w-5" />
          {L.kakao}
        </button>
        <button
          type="button"
          onClick={notifySocial}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-800 transition active:scale-[0.98] hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          <GoogleLogo className="h-5 w-5" />
          {L.google}
        </button>
      </div>

      <p className="pt-2 text-center text-[13px] text-stone-600 dark:text-stone-400">
        {L.noAccount}{' '}
        <Link
          href="/signup"
          className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
        >
          {L.signupCta}
        </Link>
      </p>
    </div>
  );
}

function SetPasswordForm({
  email,
  onSuccess,
  onCancel,
}: {
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const L = t.login;
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const policy = validatePasswordPolicy(newPassword);
      if (policy) {
        setError((L.error as Record<string, string>)[policy] ?? L.error.generic);
        setSubmitting(false);
        return;
      }
      const res = await submitSetPassword({
        email: email.trim(),
        password: newPassword,
        phone: phone.trim(),
      });
      writeSession(res);
      onSuccess();
    } catch (err) {
      const code = err instanceof Error ? err.message : 'generic';
      setError((L.error as Record<string, string>)[code] ?? L.error.generic);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          {L.setPasswordTitle}
        </h1>
        <p className="text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
          {L.setPasswordBody}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card-shadow space-y-3 rounded-3xl bg-white p-5 dark:bg-stone-900">
        <FieldText
          label={L.setPasswordPhoneLabel}
          type="tel"
          name="phone"
          placeholder={L.setPasswordPhonePlaceholder}
          autoComplete="tel"
          value={phone}
          onChange={setPhone}
        />
        <FieldText
          label={L.setPasswordNewLabel}
          type="password"
          name="newPassword"
          placeholder="••••••••"
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition active:scale-[0.98] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          >
            ←
          </button>
          <button
            type="submit"
            disabled={submitting || phone.trim() === '' || newPassword === ''}
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
          >
            {submitting ? L.setPasswordSubmitting : L.setPasswordSubmit}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldText({
  label,
  type,
  name,
  placeholder,
  autoComplete,
  value,
  onChange,
}: {
  label: string;
  type: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-stone-700 dark:text-stone-300">
        {label}
      </span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={type === 'email' ? 'email' : type === 'tel' ? 'tel' : undefined}
        className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:bg-stone-900"
      />
    </label>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
      <span className="text-[11px] font-medium uppercase tracking-widest text-stone-400 dark:text-stone-500">
        {label}
      </span>
      <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
    </div>
  );
}
