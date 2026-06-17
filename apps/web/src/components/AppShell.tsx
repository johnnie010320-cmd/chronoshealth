'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { HeartPulseIcon, ArrowLeftIcon } from './HealthIcons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';
import { BottomNav } from './BottomNav';
import { useI18n } from '@/lib/i18n';
import { useTwinNickname } from '@/lib/profile-state';

type Props = {
  children: ReactNode;
  showBack?: boolean;
  backHref?: string;
  title?: string;
  decoration?: 'pulse' | 'dots' | 'none';
  hideBottomNav?: boolean;
};

export function AppShell({
  children,
  showBack,
  backHref = '/',
  title,
  decoration = 'dots',
  hideBottomNav = false,
}: Props) {
  const { t } = useI18n();
  const nickname = useTwinNickname();

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

        <div className="flex min-w-0 items-center gap-1">
          {title && (
            <span className="mr-1 truncate text-sm font-medium text-stone-700 dark:text-stone-300">
              {title}
            </span>
          )}
          {!title && nickname && (
            <span className="mr-0.5 max-w-[7.5rem] truncate rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              {nickname}
            </span>
          )}
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </header>

      <div className={`flex-1 px-5 ${hideBottomNav ? 'pb-8' : 'pb-24'}`}>
        {children}
      </div>

      {!hideBottomNav && <BottomNav />}
      <div className="safe-bottom" />
    </div>
  );
}
