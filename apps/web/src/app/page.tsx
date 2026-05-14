'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PulseBackground } from '@/components/PulseBackground';
import {
  HeartPulseIcon,
  LeafIcon,
  ShieldIcon,
  ChevronRightIcon,
} from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';

export default function HomePage() {
  const { t } = useI18n();
  const L = t.landing;

  return (
    <AppShell decoration="dots">
      <section className="card-shadow relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-teal-500 px-6 py-10 text-white">
        <PulseBackground variant="bottom" />
        <div className="relative">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-80">
            {L.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight">
            {L.headingLine1}
            <br />
            {L.headingLine2}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/90">{L.body}</p>
          <div className="mt-8 flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur">
              <HeartPulseIcon className="h-5 w-5" />
            </span>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur">
              <LeafIcon className="h-5 w-5" />
            </span>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur">
              <ShieldIcon className="h-5 w-5" />
            </span>
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {L.howItWorks}
        </h2>
        <Step n={1} title={L.step1Title} body={L.step1Body} />
        <Step n={2} title={L.step2Title} body={L.step2Body} />
        <Step n={3} title={L.step3Title} body={L.step3Body} />
      </section>

      <section className="mt-10">
        <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          {L.disclaimer}
        </div>

        <Link
          href="/survey"
          className="mt-5 inline-flex w-full items-center justify-between rounded-2xl bg-stone-900 px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
        >
          <span>{L.cta}</span>
          <ChevronRightIcon className="h-5 w-5" />
        </Link>
      </section>
    </AppShell>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="card-shadow flex items-start gap-3 rounded-2xl bg-white/80 p-4 backdrop-blur dark:bg-stone-900/70">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          {title}
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
          {body}
        </p>
      </div>
    </div>
  );
}
