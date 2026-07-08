'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { ClockIcon, ChevronRightIcon } from './HealthIcons';

type Props = {
  customBody?: string;
};

// 아직 연동되지 않은 기능(자리표시자 링크 등) 클릭 시 "준비중" 토스트.
// 재사용: const cs = useComingSoon(); … {cs.node} … onClick={cs.trigger}
export function useComingSoon(): { trigger: () => void; node: ReactNode } {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!show) return;
    const id = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(id);
  }, [show]);
  const trigger = () => setShow(true);
  const node = show ? (
    <div
      role="status"
      className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 text-[13px] font-semibold text-stone-800 shadow-lg backdrop-blur dark:border-stone-700 dark:bg-stone-900/95 dark:text-stone-100"
    >
      <span aria-hidden>🚧</span>
      {t.comingSoon.serviceMsg}
    </div>
  ) : null;
  return { trigger, node };
}

// 준비중 배지(작은 라벨) — 미연동 항목 표시용.
export function ComingSoonBadge() {
  const { t } = useI18n();
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      {t.comingSoon.badge}
    </span>
  );
}

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
