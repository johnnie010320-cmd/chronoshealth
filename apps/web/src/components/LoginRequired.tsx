'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { UserCircleIcon, ChevronRightIcon } from './HealthIcons';

// 로그인이 필요한 보호 화면 진입 시 표시.
// 로그인 / 회원가입 두 CTA 노출.
export function LoginRequired() {
  const { t } = useI18n();
  const L = t.loginRequired;
  return (
    <section className="card-shadow mt-6 rounded-3xl bg-white p-8 text-center dark:bg-stone-900">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
        <UserCircleIcon className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-stone-900 dark:text-stone-100">
        {L.title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        {L.body}
      </p>
      <div className="mt-6 space-y-2">
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-between rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
        >
          <span>{L.loginCta}</span>
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
        <Link
          href="/signup"
          className="inline-flex w-full items-center justify-between rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition active:scale-[0.98] hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          <span>{L.signupCta}</span>
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
