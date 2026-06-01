'use client';

import { AppShell } from '@/components/AppShell';
import { HeartPulseIcon, LeafIcon, ShieldIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';

export default function CarePage() {
  const { t } = useI18n();
  const C = t.care;

  const items = [
    {
      Icon: LeafIcon,
      title: C.itemDietTitle,
      body: C.itemDietBody,
    },
    {
      Icon: HeartPulseIcon,
      title: C.itemExerciseTitle,
      body: C.itemExerciseBody,
    },
    {
      Icon: ShieldIcon,
      title: C.itemMedicalTitle,
      body: C.itemMedicalBody,
    },
  ];

  return (
    <AppShell title={C.pageTitle} decoration="dots">
      <section className="card-shadow mt-4 rounded-3xl bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 px-6 py-6 text-white">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-90">
          {C.eyebrow}
        </p>
        <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight">
          {C.title}
        </h1>
        <p className="mt-3 text-[13px] leading-relaxed text-white/90">{C.body}</p>
      </section>

      <ul className="mt-4 space-y-3">
        {items.map(({ Icon, title, body }) => (
          <li
            key={title}
            className="card-shadow flex items-start gap-3 rounded-2xl bg-white p-4 dark:bg-stone-900"
          >
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {title}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
                {body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {C.note}
      </div>

      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        {C.disclaimer}
      </div>
    </AppShell>
  );
}
