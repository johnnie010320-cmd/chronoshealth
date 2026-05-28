'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PulseBackground } from '@/components/PulseBackground';
import { ModuleCard } from '@/components/roadmap/ModuleCard';
import { PhaseTimeline } from '@/components/roadmap/PhaseTimeline';
import {
  HeartPulseIcon,
  ActivityIcon,
  BrainIcon,
  FileTextIcon,
  DropletIcon,
  ChartIcon,
  ScopeIcon,
  LeafIcon,
  UsersIcon,
  ShieldIcon,
  ClockIcon,
  ChevronRightIcon,
} from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';

type IconCmp = (p: { className?: string; strokeWidth?: number }) => ReactElement;

const CURRENT_PHASE_ID = 'P0';

type ModuleKey =
  | 'm1'
  | 'm2'
  | 'm3'
  | 'm4'
  | 'm5'
  | 'm6'
  | 'm7'
  | 'm8'
  | 'm9'
  | 'm10'
  | 'm11'
  | 'mdid';

const MODULE_META: { key: ModuleKey; code: string; phases: string; Icon: IconCmp }[] = [
  { key: 'm1', code: 'M1', phases: 'P0~P3', Icon: ShieldIcon },
  { key: 'm2', code: 'M2', phases: 'P1~P3', Icon: ActivityIcon },
  { key: 'm3', code: 'M3', phases: 'P1~P5', Icon: BrainIcon },
  { key: 'm4', code: 'M4', phases: 'P2~P3', Icon: FileTextIcon },
  { key: 'm5', code: 'M5', phases: 'P3+', Icon: DropletIcon },
  { key: 'm6', code: 'M6', phases: 'P1~P3', Icon: ChartIcon },
  { key: 'm7', code: 'M7', phases: 'P1~P3', Icon: ScopeIcon },
  { key: 'm8', code: 'M8', phases: 'P1~P4', Icon: HeartPulseIcon },
  { key: 'm9', code: 'M9', phases: 'P3~P6', Icon: UsersIcon },
  { key: 'm10', code: 'M10', phases: 'P3~P6', Icon: LeafIcon },
  { key: 'm11', code: 'M11', phases: 'P2~P6', Icon: ClockIcon },
  { key: 'mdid', code: 'DID', phases: 'P3~P4', Icon: ShieldIcon },
];

const PHASE_ORDER = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'] as const;

export default function RoadmapPage() {
  const { t } = useI18n();
  const R = t.roadmap;

  const phaseEntries = PHASE_ORDER.map((id) => {
    const p = R.phases[id];
    return {
      id: id.toUpperCase(),
      name: p.name,
      weeks: p.weeks,
      summary: p.summary,
    };
  });

  return (
    <AppShell title={R.pageTitle} decoration="dots" showBack backHref="/">
      <section className="card-shadow relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-teal-500 px-6 py-10 text-white">
        <PulseBackground variant="bottom" />
        <div className="relative">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-80">
            {R.hero.eyebrow}
          </p>
          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight">
            {R.hero.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/90">
            {R.hero.body}
          </p>
        </div>
      </section>

      <section className="card-shadow mt-6 rounded-3xl bg-white p-5 dark:bg-stone-900">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          {R.currentLive.badge}
        </span>
        <h2 className="mt-3 text-base font-bold text-stone-900 dark:text-stone-100">
          {R.currentLive.title}
        </h2>
        <ul className="mt-3 space-y-2">
          {R.currentLive.items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[13px] leading-relaxed text-stone-700 dark:text-stone-300"
            >
              <span
                aria-hidden
                className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600 dark:bg-brand-400"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/survey"
          className="mt-5 inline-flex w-full items-center justify-between rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
        >
          <span>{R.currentLive.cta}</span>
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {R.phaseTimelineTitle}
        </h2>
        <div className="mt-3">
          <PhaseTimeline
            phases={phaseEntries}
            currentPhaseId={CURRENT_PHASE_ID}
            nowMarker={R.nowMarker}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {R.modulesTitle}
        </h2>
        <p className="mt-1 px-1 text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
          {R.modulesBody}
        </p>
        <div className="mt-4 space-y-3">
          {MODULE_META.map(({ key, code, phases, Icon }) => {
            const m = R.modules[key];
            return (
              <ModuleCard
                key={key}
                code={code}
                title={m.title}
                body={m.body}
                phases={phases}
                phaseLabel={R.phaseLabel}
                Icon={Icon}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {R.nonGoalsTitle}
        </h2>
        <ul className="mt-3 space-y-2 rounded-2xl border border-stone-200/70 bg-white/70 p-4 dark:border-stone-800 dark:bg-stone-900/60">
          {R.nonGoals.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12px] leading-relaxed text-stone-700 dark:text-stone-300"
            >
              <span
                aria-hidden
                className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400 dark:bg-stone-600"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card-shadow mt-10 rounded-3xl bg-gradient-to-br from-brand-50 to-teal-50 p-5 dark:from-brand-950 dark:to-teal-950">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
          {R.waitlist.title}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">
          {R.waitlist.body}
        </p>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="mt-4 inline-flex w-full cursor-not-allowed items-center justify-between rounded-2xl bg-stone-300 px-4 py-3 text-sm font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-400"
        >
          <span>{R.waitlist.cta}</span>
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </section>

      <section className="mt-8 mb-4">
        <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          {R.disclaimer}
        </div>
        <Link
          href="/"
          className="mt-5 inline-flex w-full items-center justify-center gap-1 rounded-2xl border border-stone-200 bg-white/70 px-5 py-3 text-sm font-medium text-stone-700 transition active:scale-[0.98] dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-200"
        >
          <span>{R.backHome}</span>
        </Link>
      </section>
    </AppShell>
  );
}
