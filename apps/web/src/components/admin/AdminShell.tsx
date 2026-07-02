'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { AdminGuard } from './AdminGuard';
import { useI18n } from '@/lib/i18n';

type Tab = {
  href: string;
  label: string;
};

export function AdminShell({
  children,
  title,
  showBack,
}: {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}) {
  const { t } = useI18n();
  const A = t.admin;
  const pathname = usePathname() ?? '/admin';

  // 용어 일치 — 대시보드 타일과 동일 명칭 사용(사용자 관리 / 약관·면책).
  const tabs: Tab[] = [
    { href: '/admin', label: A.dashboard.title },
    { href: '/admin/users', label: A.dashboard.actionUsers },
    { href: '/admin/content', label: A.dashboard.actionContent },
  ];

  return (
    <AdminGuard>
      <AppShell
        title={title ?? A.pageTitle}
        decoration="dots"
        hideBottomNav
        {...(showBack !== undefined ? { showBack } : {})}
        backHref="/admin"
      >
        <nav
          aria-label={A.sidebarTitle}
          className="mt-2 flex gap-1 overflow-x-auto px-1 pb-1"
        >
          {tabs.map((tab) => {
            const active =
              tab.href === '/admin'
                ? pathname === '/admin'
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                  active
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                    : 'bg-white text-stone-600 hover:text-stone-900 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-stone-100'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </AppShell>
    </AdminGuard>
  );
}
