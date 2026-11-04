'use client';

import { useI18n } from '@/lib/i18n';
import { TrophyIcon } from '@/components/HealthIcons';

type Props = {
  scopeLabel: string;
  percentile: number;
  rankValue: number;
  rankTotal: number;
  /** 'amber' = 순위 강조(금). 색만 page 에서 지정, 로직/문구 동일. */
  tone?: 'default' | 'amber';
};

export function RankCard({
  scopeLabel,
  percentile,
  rankValue,
  rankTotal,
  tone = 'default',
}: Props) {
  const { t } = useI18n();
  const L = t.leaderboard;
  const topPct = Math.max(0.1, Math.round((100 - percentile) * 10) / 10);

  const intl = new Intl.NumberFormat();
  const amber = tone === 'amber';

  return (
    <article
      className={`card-shadow relative overflow-hidden rounded-3xl p-5 ${
        amber ? 'card-amber' : 'bg-white dark:bg-stone-900'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {scopeLabel}
        </p>
        <span
          aria-hidden
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
            amber
              ? 'bg-amber-400 text-white'
              : 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300'
          }`}
        >
          <TrophyIcon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className={`text-3xl font-bold ${
            amber
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-stone-900 dark:text-stone-100'
          }`}
        >
          {L.percentile} {topPct}%
        </span>
      </div>
      <p className="mt-1 text-[12px] text-stone-600 dark:text-stone-400">
        {L.rankWithin}{' '}
        <span className="font-semibold text-stone-900 dark:text-stone-100">
          {intl.format(rankValue)}
        </span>{' '}
        / {intl.format(rankTotal)}
      </p>
    </article>
  );
}
