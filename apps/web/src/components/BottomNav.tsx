'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import {
  HomeIcon,
  ActivityIcon,
  FileTextIcon,
  ChartIcon,
  UserCircleIcon,
} from './HealthIcons';

type IconCmp = (p: { className?: string; strokeWidth?: number }) => ReactElement;

type Item = {
  href: string;
  labelKey: 'home' | 'survey' | 'reports' | 'stats' | 'profile';
  Icon: IconCmp;
};

const ITEMS: Item[] = [
  { href: '/', labelKey: 'home', Icon: HomeIcon },
  { href: '/survey', labelKey: 'survey', Icon: ActivityIcon },
  { href: '/reports', labelKey: 'reports', Icon: FileTextIcon },
  { href: '/stats', labelKey: 'stats', Icon: ChartIcon },
  { href: '/profile', labelKey: 'profile', Icon: UserCircleIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname() ?? '/';

  return (
    <nav
      aria-label="primary"
      className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-stone-200/60 bg-white/85 px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-950/85"
    >
      <ul className="flex items-stretch justify-around">
        {ITEMS.map(({ href, labelKey, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition ${
                  active
                    ? 'text-brand-700 dark:text-brand-300'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                <span className="tracking-tight">{t.nav[labelKey]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
