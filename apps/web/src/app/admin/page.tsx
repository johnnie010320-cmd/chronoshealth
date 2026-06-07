'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { fetchAdminStats, type AdminStats } from '@/lib/api-client';

type Loaded =
  | { status: 'loading' }
  | { status: 'ok'; stats: AdminStats }
  | { status: 'err'; code: string };

type Action = {
  href: string;
  title: string;
  desc: string;
  active: boolean;
};

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const A = t.admin;
  const D = A.dashboard;
  const [state, setState] = useState<Loaded>({ status: 'loading' });

  useEffect(() => {
    fetchAdminStats()
      .then((data) => setState({ status: 'ok', stats: data.stats }))
      .catch((e) => {
        const code = e instanceof Error ? e.message : 'generic';
        setState({ status: 'err', code });
      });
  }, []);

  const actions: Action[] = [
    {
      href: '/admin/users',
      title: D.actionUsers,
      desc: D.actionUsersDesc,
      active: true,
    },
    {
      href: '/admin',
      title: D.actionNotices,
      desc: D.actionNoticesDesc,
      active: false,
    },
    {
      href: '/admin/content',
      title: D.actionContent,
      desc: D.actionContentDesc,
      active: true,
    },
    {
      href: '/admin',
      title: D.actionModeration,
      desc: D.actionModerationDesc,
      active: false,
    },
    {
      href: '/admin',
      title: D.actionAffiliates,
      desc: D.actionAffiliatesDesc,
      active: false,
    },
    {
      href: '/admin',
      title: D.actionLedgerAdjust,
      desc: D.actionLedgerAdjustDesc,
      active: false,
    },
    {
      href: '/admin',
      title: D.actionFeatureRequests,
      desc: D.actionFeatureRequestsDesc,
      active: false,
    },
    {
      href: '/admin',
      title: D.actionHealth,
      desc: D.actionHealthDesc,
      active: false,
    },
  ];

  return (
    <AdminShell title={D.title}>
      {state.status === 'loading' && (
        <div className="mt-6 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {state.status === 'err' && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {A.error[state.code as keyof typeof A.error] ?? A.error.generic}
        </div>
      )}

      {state.status === 'ok' && (
        <section className="mt-3 grid grid-cols-2 gap-3">
          <StatCard label={D.statTotalUsers} value={state.stats.totalUsers} />
          <StatCard label={D.statRiskReports} value={state.stats.totalRiskReports} />
          <StatCard label={D.statCommunityPosts} value={state.stats.totalCommunityPosts} />
          <StatCard label={D.statCommunityComments} value={state.stats.totalCommunityComments} />
          <StatCard label={D.statLikes} value={state.stats.totalLikes} />
          <StatCard label={D.statLedgerEntries} value={state.stats.totalLedgerEntries} />
          <StatCard label={D.statLedgerSum} value={state.stats.totalLedgerSum} />
        </section>
      )}

      <section className="mt-5">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {D.quickActionsTitle}
        </h2>
        <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
          {actions.map((action) => (
            <li key={action.title}>
              {action.active ? (
                <Link
                  href={action.href}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-stone-700 transition active:bg-stone-50 dark:text-stone-200 dark:active:bg-stone-800"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{action.title}</p>
                    <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                      {action.desc}
                    </p>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
                </Link>
              ) : (
                <div
                  aria-disabled="true"
                  className="flex items-center justify-between gap-3 px-4 py-3 text-stone-400 dark:text-stone-500"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="mt-0.5 text-[11px] opacity-70">{action.desc}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                    ⏳
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        {A.disclaimer}
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-shadow flex flex-col gap-1 rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {label}
      </span>
      <span className="text-2xl font-bold tabular-nums tracking-tight text-stone-900 dark:text-stone-100">
        {value.toLocaleString()}
      </span>
    </div>
  );
}
