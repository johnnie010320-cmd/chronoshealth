'use client';

import { useI18n } from '@/lib/i18n';

type Tier = 'excellent' | 'good' | 'fair' | 'attention';

type Props = {
  distribution: Record<Tier, number>;
  userTier: Tier;
};

const ORDER: Tier[] = ['excellent', 'good', 'fair', 'attention'];

const TIER_BG: Record<Tier, string> = {
  excellent: 'bg-emerald-500',
  good: 'bg-brand-500',
  fair: 'bg-amber-500',
  attention: 'bg-rose-500',
};

export function TierBar({ distribution, userTier }: Props) {
  const { t } = useI18n();
  const L = t.leaderboard;
  const total = ORDER.reduce((acc, k) => acc + distribution[k], 0);

  return (
    <section>
      <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {L.tierDistribution}
      </h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="flex h-3 w-full">
          {ORDER.map((k) => {
            const pct = total > 0 ? (distribution[k] / total) * 100 : 0;
            return (
              <div
                key={k}
                aria-label={L.tiers[k]}
                title={`${L.tiers[k]} — ${pct.toFixed(1)}%`}
                style={{ width: `${pct}%` }}
                className={TIER_BG[k]}
              />
            );
          })}
        </div>
        <ul className="grid grid-cols-2 gap-y-2 p-3 text-[12px] sm:grid-cols-4">
          {ORDER.map((k) => {
            const pct = total > 0 ? (distribution[k] / total) * 100 : 0;
            return (
              <li key={k} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`inline-block h-2.5 w-2.5 rounded-sm ${TIER_BG[k]} ${
                    userTier === k ? 'ring-2 ring-stone-900 dark:ring-white' : ''
                  }`}
                />
                <span className="text-stone-700 dark:text-stone-300">
                  {L.tiers[k]}
                </span>
                <span className="ml-auto text-stone-500 dark:text-stone-400">
                  {pct.toFixed(1)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
