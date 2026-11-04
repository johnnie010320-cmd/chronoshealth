'use client';

// VITAcode 소개(랜딩) 페이지 — 공개(비로그인 접근 가능).
// 로그아웃 시 이 페이지로 이동한다(?loggedout=1 이면 로그아웃 안내 표시).

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { ChevronRightIcon } from '@/components/HealthIcons';

function WelcomeContent() {
  const { t } = useI18n();
  const W = t.welcome;
  const params = useSearchParams();
  const loggedOut = params.get('loggedout') === '1';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-10">
      {loggedOut && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-[13px] font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          {W.loggedOutNote}
        </div>
      )}

      <header className="mt-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand-700 dark:text-brand-300">
          {W.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-stone-900 dark:text-stone-100">
          {W.title}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[14px] leading-relaxed text-stone-600 dark:text-stone-400">
          {W.subtitle}
        </p>
      </header>

      <section className="mt-8 space-y-3">
        {W.features.map((f, i) => (
          <div
            key={i}
            className="card-shadow flex items-start gap-3 rounded-2xl bg-white p-4 dark:bg-stone-900"
          >
            <span
              aria-hidden
              className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-brand-500"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {f.title}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
                {f.body}
              </p>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-8 space-y-3">
        <Link
          href="/signup"
          className="inline-flex w-full items-center justify-between rounded-2xl bg-stone-900 px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
        >
          <span>{W.signupCta}</span>
          <ChevronRightIcon className="h-5 w-5" />
        </Link>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-4 text-base font-semibold text-stone-800 transition active:scale-[0.98] hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          {W.loginCta}
        </Link>
      </div>

      <nav className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-stone-500 dark:text-stone-400">
        <Link href="/health-data" className="hover:underline">건강데이터 처리방침</Link>
        <span aria-hidden className="text-stone-300 dark:text-stone-600">·</span>
        <Link href="/terms" className="hover:underline">서비스 약관</Link>
        <span aria-hidden className="text-stone-300 dark:text-stone-600">·</span>
        <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
      </nav>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
        {W.disclaimer}
      </p>
    </main>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeContent />
    </Suspense>
  );
}
