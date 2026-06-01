'use client';

import { AppShell } from '@/components/AppShell';
import { ShieldIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';

export default function RewardsPage() {
  const { t } = useI18n();
  const R = t.rewards;

  return (
    <AppShell title={R.pageTitle} decoration="dots">
      <section className="card-shadow mt-4 rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-rose-500 px-6 py-6 text-white">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-90">
          {R.eyebrow}
        </p>
        <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight">
          {R.title}
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-white/90">{R.body}</p>
      </section>

      <section className="card-shadow mt-4 rounded-2xl bg-white p-5 dark:bg-stone-900">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {R.balanceLabel}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-stone-400 dark:text-stone-500">
            —
          </span>
          <span className="text-[12px] font-medium text-stone-500 dark:text-stone-400">
            {R.balancePlaceholder}
          </span>
        </div>
      </section>

      <section className="card-shadow mt-3 rounded-2xl bg-white p-5 dark:bg-stone-900">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {R.earnTitle}
        </p>
        <ul className="mt-3 space-y-2">
          {R.earnItems.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2 text-[12px] text-stone-700 dark:bg-stone-800/60 dark:text-stone-200"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                <ShieldIcon className="h-3 w-3" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="card-shadow mt-3 rounded-2xl bg-white p-5 dark:bg-stone-900">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {R.spendTitle}
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
          {R.spendBody}
        </p>
      </section>

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {R.note}
      </div>

      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        {R.disclaimer}
      </div>
    </AppShell>
  );
}
