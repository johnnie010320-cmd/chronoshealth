'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import {
  HomeIcon,
  FileTextIcon,
  HeartPulseIcon,
  UsersIcon,
  UserCircleIcon,
  MenuIcon,
  HomeFilledIcon,
  FileTextFilledIcon,
  HeartFilledIcon,
  UsersFilledIcon,
  UserCircleFilledIcon,
  GridFilledIcon,
} from './HealthIcons';

type IconCmp = (p: { className?: string; strokeWidth?: number }) => ReactElement;

type Item = {
  href: string;
  labelKey: 'home' | 'reports' | 'care' | 'community' | 'profile' | 'menu';
  Icon: IconCmp;
  ActiveIcon: IconCmp; // 활성 시 채워진 아이콘(삼성 헬스식)
};

// 하단 주 네비 — 혜택(rewards)은 전체 메뉴(/menu)로 이동, 커뮤니티를 주 탭으로 승격(2026-06-17 죠니).
const ITEMS: Item[] = [
  { href: '/', labelKey: 'home', Icon: HomeIcon, ActiveIcon: HomeFilledIcon },
  { href: '/reports', labelKey: 'reports', Icon: FileTextIcon, ActiveIcon: FileTextFilledIcon },
  { href: '/care', labelKey: 'care', Icon: HeartPulseIcon, ActiveIcon: HeartFilledIcon },
  { href: '/community', labelKey: 'community', Icon: UsersIcon, ActiveIcon: UsersFilledIcon },
  { href: '/profile', labelKey: 'profile', Icon: UserCircleIcon, ActiveIcon: UserCircleFilledIcon },
  { href: '/menu', labelKey: 'menu', Icon: MenuIcon, ActiveIcon: GridFilledIcon },
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
      className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-20 mx-auto max-w-md rounded-2xl border border-stone-200/70 bg-white/90 px-1 py-1.5 shadow-lg backdrop-blur-md dark:border-stone-800/70 dark:bg-stone-950/90"
    >
      <ul className="flex items-stretch justify-around">
        {ITEMS.map(({ href, labelKey, Icon, ActiveIcon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium transition ${
                  active
                    ? 'text-brand-700 dark:text-brand-300'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100'
                }`}
              >
                <span
                  className={`inline-flex h-7 w-12 items-center justify-center rounded-full transition ${
                    active ? 'bg-brand-100 dark:bg-brand-500/20' : ''
                  }`}
                >
                  {active ? (
                    <ActiveIcon className="h-[18px] w-[18px]" />
                  ) : (
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  )}
                </span>
                <span className="tracking-tight">{t.nav[labelKey]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
