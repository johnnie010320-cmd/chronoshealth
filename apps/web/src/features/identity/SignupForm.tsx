'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  SignupRequest,
  validatePasswordPolicy,
} from '@/lib/signup-schema';
import { submitSignup } from '@/lib/api-client';
import { writeSession } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import {
  UsersIcon,
  ShieldIcon,
  AlertIcon,
} from '@/components/HealthIcons';
import { KakaoLogo, GoogleLogo, AppleLogo } from '@/components/SocialIcons';

const TERMS_VERSION = 'v1.0';
const PRIVACY_VERSION = 'v1.0';

export function SignupForm() {
  const { t } = useI18n();
  const S = t.signup;
  const F = S.fields;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const notifySocialUnavailable = () => {
    if (typeof window !== 'undefined') {
      window.alert(S.social.unavailable);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const password = String(fd.get('password') ?? '');
      const passwordConfirm = String(fd.get('passwordConfirm') ?? '');

      if (password !== passwordConfirm) {
        setError(S.error.PASSWORD_MISMATCH);
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const policy = validatePasswordPolicy(password);
      if (policy) {
        setError(S.error[policy]);
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const raw = {
        name: String(fd.get('name') ?? '').trim(),
        email: String(fd.get('email') ?? '').trim(),
        phone: String(fd.get('phone') ?? '').trim(),
        birthYear: numOrNaN(fd.get('birthYear')),
        sex: fd.get('sex') as string,
        password,
        nationality: fd.get('nationality') as string,
        consentMedical: fd.has('consentMedical'),
        consentTerms: fd.has('consentTerms'),
        consentPrivacy: fd.has('consentPrivacy'),
        consentTermsVersion: TERMS_VERSION,
        consentPrivacyVersion: PRIVACY_VERSION,
      };

      const parsed = SignupRequest.safeParse(raw);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        if (first?.message === 'AGE_RESTRICTED') {
          setError(S.error.AGE_RESTRICTED);
        } else {
          const fieldPath = first?.path.join('.') ?? '';
          setError(
            `${S.error.validation} — ${fieldPath || 'unknown'}: ${first?.message ?? ''}`,
          );
        }
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
      router.push('/survey');
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
    <form onSubmit={handleSubmit} className="space-y-6 pb-32">
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
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FEE500] px-6 py-3.5 text-sm font-semibold text-[#191919] transition active:scale-[0.98] hover:brightness-95"
        >
          <KakaoLogo className="h-5 w-5" />
          {S.social.kakao}
        </button>
        <button
          type="button"
          onClick={notifySocialUnavailable}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-800 transition active:scale-[0.98] hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          <GoogleLogo className="h-5 w-5" />
          {S.social.google}
        </button>
        <button
          type="button"
          onClick={notifySocialUnavailable}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-black px-6 py-3.5 text-sm font-semibold text-white transition active:scale-[0.98] hover:bg-stone-800"
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
        icon={<UsersIcon className="h-5 w-5" />}
        title={S.section.identity}
        n="1"
      >
        <Field
          label={F.name.label}
          name="name"
          type="text"
          required
          maxLength={40}
          placeholder={F.name.placeholder}
          autoComplete="name"
        />
        <Field
          label={F.email.label}
          name="email"
          type="email"
          required
          maxLength={254}
          placeholder={F.email.placeholder}
          autoComplete="email"
        />
        <Field
          label={F.phone.label}
          name="phone"
          type="tel"
          required
          placeholder={F.phone.placeholder}
          autoComplete="tel"
        />
        <Field
          label={F.birthYear.label}
          name="birthYear"
          type="number"
          required
          min={1900}
          placeholder={F.birthYear.placeholder}
        />
        <SelectField
          label={F.sex.label}
          name="sex"
          required
          options={[
            { value: 'male', label: F.sex.options.male },
            { value: 'female', label: F.sex.options.female },
            { value: 'other', label: F.sex.options.other },
          ]}
        />
        <SelectField
          label={F.nationality.label}
          name="nationality"
          required
          options={[
            { value: 'KR', label: F.nationality.options.KR },
            { value: 'US', label: F.nationality.options.US },
            { value: 'JP', label: F.nationality.options.JP },
            { value: 'ES', label: F.nationality.options.ES },
            { value: 'OTHER', label: F.nationality.options.OTHER },
          ]}
        />
      </Section>

      <Section
        icon={<ShieldIcon className="h-5 w-5" />}
        title={S.section.credentials}
        n="2"
      >
        <Field
          label={F.password.label}
          name="password"
          type="password"
          required
          maxLength={128}
          placeholder={F.password.placeholder}
          autoComplete="new-password"
        />
        <Field
          label={F.passwordConfirm.label}
          name="passwordConfirm"
          type="password"
          required
          maxLength={128}
          placeholder={F.passwordConfirm.placeholder}
          autoComplete="new-password"
        />
      </Section>

      <Section
        icon={<ShieldIcon className="h-5 w-5" />}
        title={S.section.consent}
        n="3"
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-stone-900"
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
    </form>
  );
}

function numOrNaN(v: FormDataEntryValue | null): number {
  const s = String(v ?? '').trim();
  return s === '' ? NaN : Number(s);
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

function Field({
  label,
  name,
  type = 'text',
  required,
  min,
  max,
  maxLength,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-stone-700 dark:text-stone-300">
        {label}
        {required && (
          <span className="ml-1 text-rose-500" aria-hidden>
            *
          </span>
        )}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        min={min}
        max={max}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={
          type === 'number' ? 'decimal' : type === 'tel' ? 'tel' : type === 'email' ? 'email' : undefined
        }
        className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:bg-stone-900"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  required,
  options,
}: {
  label: string;
  name: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-stone-700 dark:text-stone-300">
        {label}
        {required && (
          <span className="ml-1 text-rose-500" aria-hidden>
            *
          </span>
        )}
      </span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:focus:bg-stone-900"
      >
        <option value="" disabled>
          —
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
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
