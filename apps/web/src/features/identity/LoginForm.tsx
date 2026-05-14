'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { AlertIcon } from '@/components/HealthIcons';
import { KakaoLogo, GoogleLogo } from '@/components/SocialIcons';

// ADR 0010 정합: 본 화면은 UI 미리보기. submit / 소셜 버튼 모두 alert 안내.
// 실제 인증은 본인 인증 보강 ADR(P1 후반/P2 예정) 후 구현.
export function LoginForm() {
  const { t } = useI18n();
  const L = t.login;

  const notify = () => {
    if (typeof window !== 'undefined') {
      window.alert(L.unavailable);
    }
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    notify();
  };

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
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
      >
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{L.notice}</span>
      </div>

      <section className="card-shadow rounded-3xl bg-white p-5 dark:bg-stone-900">
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
          {L.email.sectionTitle}
        </h2>
        <form onSubmit={onFormSubmit} className="space-y-3">
          <FieldText
            label={L.email.emailLabel}
            type="email"
            name="email"
            placeholder={L.email.emailPlaceholder}
            autoComplete="email"
          />
          <FieldText
            label={L.email.passwordLabel}
            type="password"
            name="password"
            placeholder={L.email.passwordPlaceholder}
            autoComplete="current-password"
          />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
          >
            {L.email.submit}
          </button>
        </form>
      </section>

      <Divider label={L.divider} />

      <section className="card-shadow rounded-3xl bg-white p-5 dark:bg-stone-900">
        <h2 className="mb-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
          {L.phone.sectionTitle}
        </h2>
        <form onSubmit={onFormSubmit} className="space-y-3">
          <FieldText
            label={L.phone.phoneLabel}
            type="tel"
            name="phone"
            placeholder={L.phone.phonePlaceholder}
            autoComplete="tel"
          />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-900 transition active:scale-[0.98] hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            {L.phone.submit}
          </button>
        </form>
      </section>

      <Divider label={L.divider} />

      <div className="space-y-3">
        <button
          type="button"
          onClick={notify}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#FEE500] px-6 py-3.5 text-sm font-semibold text-[#191919] transition active:scale-[0.98] hover:brightness-95"
        >
          <KakaoLogo className="h-5 w-5" />
          {L.kakao}
        </button>
        <button
          type="button"
          onClick={notify}
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

function FieldText({
  label,
  type,
  name,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  name: string;
  placeholder?: string;
  autoComplete?: string;
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
