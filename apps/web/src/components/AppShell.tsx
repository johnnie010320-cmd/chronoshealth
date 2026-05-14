'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { HeartPulseIcon, ArrowLeftIcon } from './HealthIcons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '@/lib/i18n';

type Props = {
  children: ReactNode;
  showBack?: boolean;
  backHref?: string;
  title?: string;
  decoration?: 'pulse' | 'dots' | 'none';
};

export function AppShell({
  children,
  showBack,
  backHref = '/',
  title,
  decoration = 'dots',
}: Props) {
  const { t } = useI18n();

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col overflow-x-hidden">
      {decoration === 'dots' && (
        <div
          aria-hidden
          className="bg-dot-pattern pointer-events-none absolute inset-0 -z-10"
        />
      )}

      <header className="safe-top sticky top-0 z-10 flex items-center justify-between gap-2 px-5 py-3 backdrop-blur-md">
        {showBack ? (
          <Link
            href={backHref}
            aria-label={t.common.back}
            className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-200/60 dark:text-stone-200 dark:hover:bg-stone-800/60"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-stone-900 dark:text-stone-100"
            aria-label={t.brand}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-white dark:bg-brand-500">
              <HeartPulseIcon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              {t.brand}
            </span>
          </Link>
        )}

        <div className="flex items-center gap-2">
          {title ? (
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
              {title}
            </span>
          ) : (
            <span className="text-[10px] font-medium uppercase tracking-widest text-brand-700 dark:text-brand-400">
              {t.beta}
            </span>
          )}
          <LanguageSwitcher />
        </div>
      </header>

      <div className="flex-1 px-5 pb-8">{children}</div>

      <div className="safe-bottom" />
    </div>
  );
}
