'use client';

import { useI18n } from '@/lib/i18n';

type Props = {
  median: number;
  ci95: [number, number];
};

export function PyrBar({ median, ci95 }: Props) {
  const { t } = useI18n();
  const A = t.avatar;

  const [lo, hi] = ci95;
  const range = hi - lo;
  const maxAxis = Math.max(hi, 60);
  const ciLeftPct = (lo / maxAxis) * 100;
  const ciWidthPct = (range / maxAxis) * 100;
  const medianPct = (median / maxAxis) * 100;

  return (
    <section className="card-shadow rounded-3xl bg-white p-5 dark:bg-stone-900">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {A.pyr.label}
      </p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-stone-900 dark:text-stone-100">
          {median.toFixed(1)}
        </span>
        <span className="text-sm text-stone-600 dark:text-stone-400">
          {A.pyr.unit}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
        {A.pyr.ci} {lo.toFixed(1)} ~ {hi.toFixed(1)} {A.pyr.unit}
      </p>
      <div className="relative mt-4 h-2.5 rounded-full bg-stone-100 dark:bg-stone-800">
        <div
          aria-hidden
          className="absolute top-0 h-2.5 rounded-full bg-brand-200 dark:bg-brand-900"
          style={{ left: `${ciLeftPct}%`, width: `${ciWidthPct}%` }}
        />
        <div
          aria-hidden
          className="absolute top-[-3px] h-4 w-1 rounded-sm bg-brand-700 dark:bg-brand-400"
          style={{ left: `calc(${medianPct}% - 2px)` }}
        />
      </div>
    </section>
  );
}
