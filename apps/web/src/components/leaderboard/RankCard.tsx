'use client';

import { useI18n } from '@/lib/i18n';

type Props = {
  scopeLabel: string;
  percentile: number;
  rankValue: number;
  rankTotal: number;
};

export function RankCard({ scopeLabel, percentile, rankValue, rankTotal }: Props) {
  const { t } = useI18n();
  const L = t.leaderboard;
  const topPct = Math.max(0.1, Math.round((100 - percentile) * 10) / 10);

  const intl = new Intl.NumberFormat();

  return (
    <article className="card-shadow rounded-3xl bg-white p-5 dark:bg-stone-900">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {scopeLabel}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-stone-900 dark:text-stone-100">
          {L.percentile} {topPct}%
        </span>
      </div>
      <p className="mt-1 text-[12px] text-stone-600 dark:text-stone-400">
        {L.rankWithin}{' '}
        <span className="font-medium text-stone-900 dark:text-stone-100">
          {intl.format(rankValue)}
        </span>{' '}
        / {intl.format(rankTotal)}
      </p>
    </article>
  );
}
