'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { ClockIcon, ChevronRightIcon } from './HealthIcons';

type Props = {
  customBody?: string;
};

export function ComingSoon({ customBody }: Props) {
  const { t } = useI18n();
  return (
    <section className="card-shadow mt-6 rounded-3xl bg-white p-8 text-center dark:bg-stone-900">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
        <ClockIcon className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-stone-900 dark:text-stone-100">
        {t.comingSoon.title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        {customBody ?? t.comingSoon.body}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
      >
        <span>{t.comingSoon.backHome}</span>
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </section>
  );
}
