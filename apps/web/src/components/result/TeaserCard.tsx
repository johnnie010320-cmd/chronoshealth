'use client';

import Link from 'next/link';
import { ChevronRightIcon, LeafIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';

export function TeaserCard() {
  const { t } = useI18n();
  const T = t.result.teaser;

  return (
    <section className="card-shadow rounded-3xl bg-gradient-to-br from-brand-50 to-teal-50 p-5 dark:from-brand-950 dark:to-teal-950">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-white dark:bg-brand-500">
          <LeafIcon className="h-4 w-4" />
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-300">
          {T.eyebrow}
        </p>
      </div>
      <h3 className="mt-3 text-base font-bold text-stone-900 dark:text-stone-100">
        {T.title}
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">
        {T.body}
      </p>
      <div className="mt-4 grid gap-2">
        <Link
          href="/roadmap"
          className="inline-flex items-center justify-between rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
        >
          <span>{T.roadmapCta}</span>
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
        <Link
          href="/beta-signup"
          className="inline-flex items-center justify-between rounded-2xl border border-stone-300 bg-white/80 px-4 py-3 text-sm font-medium text-stone-800 transition active:scale-[0.98] dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-200"
        >
          <span>{T.betaSignupCta}</span>
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
