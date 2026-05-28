'use client';

import type { ReactElement } from 'react';

type Props = {
  code: string;
  title: string;
  body: string;
  phases: string;
  phaseLabel: string;
  Icon: (p: { className?: string; strokeWidth?: number }) => ReactElement;
};

export function ModuleCard({ code, title, body, phases, phaseLabel, Icon }: Props) {
  return (
    <article className="card-shadow rounded-2xl bg-white/85 p-4 backdrop-blur dark:bg-stone-900/70">
      <header className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {code}
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
              {phaseLabel} {phases}
            </span>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-stone-900 dark:text-stone-100">
            {title}
          </h3>
        </div>
      </header>
      <p className="mt-3 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
        {body}
      </p>
    </article>
  );
}
