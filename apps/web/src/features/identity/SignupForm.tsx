'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  SignupRequest,
  validatePasswordPolicy,
} from '@/lib/signup-schema';
import { submitSignup, checkEmailAvailable } from '@/lib/api-client';
import { writeSession } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import {
  ShieldIcon,
  AlertIcon,
} from '@/components/HealthIcons';
import { PasswordField } from '@/components/PasswordField';
import { KakaoLogo, GoogleLogo, AppleLogo } from '@/components/SocialIcons';

const TERMS_VERSION = 'v1.0';
const PRIVACY_VERSION = 'v1.0';

// ADR 0013 — Step 1 회원가입. 이메일+비밀번호+동의 3종.
// 가입 완료 후 자동으로 /onboarding 으로 이동하여 Step 2 진행.
export function SignupForm() {
  const { t } = useI18n();
  const S = t.signup;
  const F = S.fields;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [emailCheck, setEmailCheck] = useState<
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'available' }
    | { status: 'taken' }
  >({ status: 'idle' });
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const notifySocialUnavailable = () => {
    if (typeof window !== 'undefined') {
      window.alert(S.social.unavailable);
    }
  };

  useEffect(() => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailCheck({ status: 'idle' });
      return;
    }
    setEmailCheck({ status: 'checking' });
    checkTimerRef.current = setTimeout(async () => {
      try {
        const ok = await checkEmailAvailable(trimmed);
        setEmailCheck({ status: ok ? 'available' : 'taken' });
      } catch {
        setEmailCheck({ status: 'idle' });
      }
    }, 400);
    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, [email]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (password !== passwordConfirm) {
        setError(S.error.PASSWORD_MISMATCH);
        setSubmitting(false);
        return;
      }

      const policy = validatePasswordPolicy(password);
      if (policy) {
        setError(S.error[policy]);
        setSubmitting(false);
        return;
      }

      if (emailCheck.status === 'taken') {
        setError(S.error.IDENTITY_EXISTS);
        setSubmitting(false);
        return;
      }

      const fd = new FormData(e.currentTarget);
      const raw = {
        email: email.trim(),
        password,
        consentMedical: fd.has('consentMedical'),
        consentTerms: fd.has('consentTerms'),
        consentPrivacy: fd.has('consentPrivacy'),
        consentTermsVersion: TERMS_VERSION,
        consentPrivacyVersion: PRIVACY_VERSION,
      };

      const parsed = SignupRequest.safeParse(raw);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        const fieldPath = first?.path.join('.') ?? '';
        setError(
          `${S.error.validation} — ${fieldPath || 'unknown'}: ${first?.message ?? ''}`,
        );
        setSubmitting(false);
        return;
      }

      if (
        !parsed.data.consentMedical ||
        !parsed.data.consentTerms ||
        !parsed.data.consentPrivacy
      ) {
        setError(S.error.CONSENT_REQUIRED);
        setSubmitting(false);
        return;
      }

      const res = await submitSignup(parsed.data);
      writeSession(res);
      router.push('/onboarding');
    } catch (err) {
      const code = err instanceof Error ? err.message : String(err);
      const friendly =
        (S.error as Record<string, string>)[code] ??
        `${S.error.generic}: ${code}`;
      setError(friendly);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-32">
      <header className="space-y-2 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          {S.heroTitle}
        </h1>
        <p className="text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
          {S.heroBody}
        </p>
      </header>

      <div className="space-y-3">
        <button
          type="button"
          onClick={notifySocialUnavailable}
          className="inline-flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl bg-[#FEE500] px-6 py-3.5 text-[13px] font-semibold text-[#191919] transition active:scale-[0.98] hover:brightness-95"
        >
          <KakaoLogo className="h-5 w-5" />
          {S.social.kakao}
        </button>
        <button
          type="button"
          onClick={notifySocialUnavailable}
          className="inline-flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl border border-stone-300 bg-white px-6 py-3.5 text-[13px] font-semibold text-stone-800 transition active:scale-[0.98] hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          <GoogleLogo className="h-5 w-5" />
          {S.social.google}
        </button>
        <button
          type="button"
          onClick={notifySocialUnavailable}
          className="inline-flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl bg-black px-6 py-3.5 text-[13px] font-semibold text-white transition active:scale-[0.98] hover:bg-stone-800"
        >
          <AppleLogo className="h-5 w-5" />
          {S.social.apple}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
        <span className="text-[11px] font-medium uppercase tracking-widest text-stone-400 dark:text-stone-500">
          {S.social.divider}
        </span>
        <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
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

      <Section
        icon={<ShieldIcon className="h-5 w-5" />}
        title={S.section.credentials}
        n="1"
      >
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-stone-700 dark:text-stone-300">
            {F.email.label}
            <span className="ml-1 text-rose-500" aria-hidden>*</span>
          </span>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={254}
            placeholder={F.email.placeholder}
            autoComplete="email"
            inputMode="email"
            className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:bg-stone-900"
          />
          {emailCheck.status === 'taken' && (
            <span className="mt-1 block text-[11px] font-medium text-rose-600 dark:text-rose-300">
              {S.emailTaken}
            </span>
          )}
          {emailCheck.status === 'available' && (
            <span className="mt-1 block text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
              {S.emailAvailable}
            </span>
          )}
        </label>

        <PasswordField
          name="password"
          label={F.password.label}
          placeholder={F.password.placeholder}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          showLabel={S.showPassword}
          hideLabel={S.hidePassword}
          required
          maxLength={128}
        />
        <PasswordField
          name="passwordConfirm"
          label={F.passwordConfirm.label}
          placeholder={F.passwordConfirm.placeholder}
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          showLabel={S.showPassword}
          hideLabel={S.hidePassword}
          required
          maxLength={128}
        />
      </Section>

      <Section
        icon={<ShieldIcon className="h-5 w-5" />}
        title={S.section.consent}
        n="2"
      >
        <ConsentCheckbox
          name="consentMedical"
          label={S.consent.medical.label}
          description={S.consent.medical.description}
        />
        <ConsentCheckboxWithLink
          name="consentTerms"
          label={S.consent.terms.label}
          description={S.consent.terms.description}
          href="/terms"
        />
        <ConsentCheckboxWithLink
          name="consentPrivacy"
          label={S.consent.privacy.label}
          description={S.consent.privacy.description}
          href="/privacy"
        />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-stone-200/60 bg-white/80 px-5 pt-3 pb-5 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-950/80">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-stone-900 px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-stone-900"
        >
          {submitting && (
            <span
              aria-hidden
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          )}
          {submitting ? S.submitting : S.submit}
        </button>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          {S.bottomNote}
        </p>
      </div>

      <p className="text-center text-[12px] text-stone-600 dark:text-stone-400">
        {S.alreadyHaveAccount}{' '}
        <Link
          href="/login"
          className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
        >
          {S.loginCta}
        </Link>
      </p>
    </form>
  );
}

function Section({
  icon,
  title,
  n,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  n: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="card-shadow rounded-3xl bg-white p-5 dark:bg-stone-900">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {t.survey.section.step} {n}
          </p>
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            {title}
          </h2>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ConsentCheckbox({
  name,
  label,
  description,
}: {
  name: string;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3 transition hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-950/60 dark:hover:bg-stone-900">
      <input
        type="checkbox"
        name={name}
        required
        className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700 dark:accent-brand-400"
      />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium leading-snug text-stone-900 dark:text-stone-100">
          {label}
        </span>
        <span className="block text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
          {description}
        </span>
      </span>
    </label>
  );
}

function ConsentCheckboxWithLink({
  name,
  label,
  description,
  href,
}: {
  name: string;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3 transition hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-950/60 dark:hover:bg-stone-900">
      <input
        type="checkbox"
        name={name}
        required
        id={`consent-${name}`}
        className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700 dark:accent-brand-400"
      />
      <div className="flex-1 space-y-0.5">
        <label
          htmlFor={`consent-${name}`}
          className="block cursor-pointer text-sm font-medium leading-snug text-stone-900 dark:text-stone-100"
        >
          {label}
        </label>
        <Link
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-[12px] font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
        >
          {description} →
        </Link>
      </div>
    </div>
  );
}
