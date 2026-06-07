'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  fetchMeProfile,
  submitProfileUpdate,
  type ProfileUpdateBody,
} from '@/lib/api-client';
import {
  UsersIcon,
  AlertIcon,
  ChevronRightIcon,
} from '@/components/HealthIcons';
import { ProfileUpdateRequest } from '@/lib/signup-schema';

export default function OnboardingPage() {
  const { t } = useI18n();
  const O = t.onboarding;
  const S = t.signup;
  const F = S.fields;
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!readSession()) {
      router.replace('/login');
      return;
    }
    // 이미 본인정보 완료한 사용자는 홈으로
    fetchMeProfile(false)
      .then((data) => {
        if (data.profile.isProfileComplete) {
          router.replace('/');
        } else {
          setReady(true);
        }
      })
      .catch(() => {
        setReady(true);
      });
  }, [router]);

  if (!ready) return null;

  function numOrNaN(v: FormDataEntryValue | null): number {
    const s = String(v ?? '').trim();
    return s === '' ? NaN : Number(s);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const raw = {
        name: String(fd.get('name') ?? '').trim(),
        phone: String(fd.get('phone') ?? '').trim(),
        birthYear: numOrNaN(fd.get('birthYear')),
        sex: fd.get('sex') as string,
        nationality: fd.get('nationality') as string,
      };
      const parsed = ProfileUpdateRequest.safeParse(raw);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        if (first?.message === 'AGE_RESTRICTED') {
          setError(O.error.AGE_RESTRICTED);
        } else {
          setError(O.error.INVALID_INPUT);
        }
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      await submitProfileUpdate(parsed.data as ProfileUpdateBody);
      router.replace('/');
    } catch (err) {
      const code = err instanceof Error ? err.message : 'generic';
      setError((O.error as Record<string, string>)[code] ?? O.error.generic);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title={O.pageTitle} decoration="dots" hideBottomNav>
      <form onSubmit={handleSubmit} className="space-y-5 pb-32">
        <header className="space-y-2 px-1 pt-3">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            {O.heroTitle}
          </h1>
          <p className="text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
            {O.heroBody}
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

        <section className="card-shadow rounded-3xl bg-white p-5 dark:bg-stone-900">
          <div className="mb-4 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
              <UsersIcon className="h-5 w-5" />
            </span>
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {S.section.identity}
            </h2>
          </div>
          <div className="space-y-3">
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
          </div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-stone-200/60 bg-white/80 px-5 pt-3 pb-5 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-950/80">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-between rounded-2xl bg-stone-900 px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-stone-900"
          >
            <span>{submitting ? O.submitting : O.submit}</span>
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  min,
  maxLength,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  min?: number;
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
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={
          type === 'number' ? 'decimal' : type === 'tel' ? 'tel' : undefined
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
