'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import {
  HomeIcon,
  UsersIcon,
  UserCircleIcon,
  ScopeIcon,
  TwinIcon,
  HomeFilledIcon,
  UsersFilledIcon,
  UserCircleFilledIcon,
  ScopeFilledIcon,
  TwinFilledIcon,
} from './HealthIcons';

type IconCmp = (p: { className?: string; strokeWidth?: number }) => ReactElement;

type Item = {
  href: string;
  labelKey: 'home' | 'digitalTwin' | 'vitaCode' | 'community' | 'profile';
  Icon: IconCmp;
  ActiveIcon: IconCmp; // 활성 시 채워진 아이콘(삼성 헬스식)
  active: string; // 활성 글자색
  idle: string; // 비활성 글자색(도메인 시그니처 톤)
  pill: string; // 활성 아이콘 배경 pill
};

// 하단 주 네비 — 7→5 탭 개편(2026-10-06 죠니). 홈 / 디지털 트윈(데이터 입력) / VITA 코드(결과) / 커뮤니티 / My.
// 밀려난 AI 리포트·마이 루틴·AI 케어는 삭제가 아니라 전체 메뉴(/menu)로 이동.
// 탭별 도메인 시그니처 색(삼성/애플 헬스식 생동감) — 홈=violet · 트윈=cyan · VITA=amber · 커뮤니티=emerald · My=rose.
// (2026-10-09 죠니: VITA코드 ↔ 커뮤니티 색 맞교환)
// (2026-10-09 죠니: 흐릿해 가시성 떨어져 더 찐한 색으로 — active -700, idle도 투명도 제거 solid -600, pill 진하게)
const ITEMS: Item[] = [
  { href: '/', labelKey: 'home', Icon: HomeIcon, ActiveIcon: HomeFilledIcon, active: 'text-brand-800 dark:text-brand-200', idle: 'text-brand-600 dark:text-brand-300', pill: 'bg-brand-200 dark:bg-brand-500/30' },
  { href: '/reports', labelKey: 'digitalTwin', Icon: TwinIcon, ActiveIcon: TwinFilledIcon, active: 'text-cyan-800 dark:text-cyan-200', idle: 'text-cyan-700 dark:text-cyan-300', pill: 'bg-cyan-200 dark:bg-cyan-500/30' },
  { href: '/ai-diagnosis', labelKey: 'vitaCode', Icon: ScopeIcon, ActiveIcon: ScopeFilledIcon, active: 'text-amber-800 dark:text-amber-200', idle: 'text-amber-700 dark:text-amber-300', pill: 'bg-amber-200 dark:bg-amber-500/30' },
  { href: '/community', labelKey: 'community', Icon: UsersIcon, ActiveIcon: UsersFilledIcon, active: 'text-emerald-800 dark:text-emerald-200', idle: 'text-emerald-700 dark:text-emerald-300', pill: 'bg-emerald-200 dark:bg-emerald-500/30' },
  { href: '/profile', labelKey: 'profile', Icon: UserCircleIcon, ActiveIcon: UserCircleFilledIcon, active: 'text-rose-800 dark:text-rose-200', idle: 'text-rose-600 dark:text-rose-300', pill: 'bg-rose-200 dark:bg-rose-500/30' },
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
        {ITEMS.map(({ href, labelKey, Icon, ActiveIcon, active: activeCls, idle, pill }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-semibold transition ${
                  active ? activeCls : idle
                }`}
              >
                <span
                  className={`inline-flex h-7 w-12 items-center justify-center rounded-full transition ${
                    active ? pill : ''
                  }`}
                >
                  {active ? (
                    <ActiveIcon className="h-[18px] w-[18px]" />
                  ) : (
                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                  )}
                </span>
                <span className="tracking-tight whitespace-nowrap">{t.nav[labelKey]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
