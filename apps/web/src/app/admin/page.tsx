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

type TileStatus = 'active' | 'soon' | 'off';
type Tile = {
  key: string;
  href: string | null;
  title: string;
  desc: string;
  status: TileStatus;
  metric?: string | undefined;
  sub?: string | undefined;
};
type BadgeLabels = { soon: string; off: string };

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

  const stats = state.status === 'ok' ? state.stats : null;
  const n = (v: number) => v.toLocaleString();
  // 지표는 관련 관리 타일 배지로 흡수 — 별도 통계 그리드 없이 중복 제거.
  const metric = (label: string, v: number | undefined) =>
    stats && v !== undefined ? `${label} ${n(v)}` : undefined;

  // 상단 — 회원 관리
  const members: Tile[] = [
    {
      key: 'users',
      href: '/admin/users',
      title: D.actionUsers,
      desc: D.actionUsersDesc,
      status: 'active',
      metric: metric(D.statTotalUsers, stats?.totalUsers),
    },
    {
      key: 'beta',
      href: null,
      title: D.actionBetaSignups,
      desc: D.actionBetaSignupsDesc,
      status: 'off', // 출시 후 종료 — /admin/beta-signups 는 대시보드로 리다이렉트.
      metric: metric(D.statBetaSignups, stats?.totalBetaSignups),
    },
  ];

  // 중앙 — 데이터 관리
  const data: Tile[] = [
    {
      key: 'communities',
      href: '/admin/communities',
      title: D.actionCommunities,
      desc: D.actionCommunitiesDesc,
      status: 'active',
      metric: metric(D.statCommunityPosts, stats?.totalCommunityPosts),
      sub: stats
        ? `${D.statCommunityComments} ${n(stats.totalCommunityComments)} · ${D.statLikes} ${n(stats.totalLikes)}`
        : undefined,
    },
    {
      key: 'commHub',
      href: '/admin/community-hub',
      title: D.actionCommHub,
      desc: D.actionCommHubDesc,
      status: 'active',
    },
    {
      key: 'notices',
      href: '/admin/notices',
      title: D.actionNotices,
      desc: D.actionNoticesDesc,
      status: 'active',
    },
    {
      key: 'surveyStats',
      href: '/admin/survey-stats',
      title: D.actionSurveyStats,
      desc: D.actionSurveyStatsDesc,
      status: 'active',
      metric: metric(D.statRiskReports, stats?.totalRiskReports),
    },
    {
      key: 'moderation',
      href: null,
      title: D.actionModeration,
      desc: D.actionModerationDesc,
      status: 'soon',
    },
    {
      key: 'riskReports',
      href: null,
      title: D.actionRiskReports,
      desc: D.actionRiskReportsDesc,
      status: 'soon',
      metric: metric(D.statRiskReports, stats?.totalRiskReports),
    },
  ];

  // 하단 — 사이트 관리
  const site: Tile[] = [
    {
      key: 'content',
      href: '/admin/content',
      title: D.actionContent,
      desc: D.actionContentDesc,
      status: 'active',
    },
    {
      key: 'devlog',
      href: '/admin/devlog',
      title: D.actionDevlog,
      desc: D.actionDevlogDesc,
      status: 'active',
    },
    {
      key: 'audit',
      href: '/admin/audit-log',
      title: D.actionAudit,
      desc: D.actionAuditDesc,
      status: 'active',
    },
    {
      key: 'ledgerAdjust',
      href: null,
      title: D.actionLedgerAdjust,
      desc: D.actionLedgerAdjustDesc,
      status: 'soon',
      metric: metric(D.statLedgerEntries, stats?.totalLedgerEntries),
      sub: stats ? `${D.statLedgerSum} ${n(stats.totalLedgerSum)}` : undefined,
    },
    {
      key: 'affiliates',
      href: null,
      title: D.actionAffiliates,
      desc: D.actionAffiliatesDesc,
      status: 'soon',
    },
    {
      key: 'featureRequests',
      href: null,
      title: D.actionFeatureRequests,
      desc: D.actionFeatureRequestsDesc,
      status: 'soon',
    },
    {
      key: 'health',
      href: null,
      title: D.actionHealth,
      desc: D.actionHealthDesc,
      status: 'soon',
    },
  ];

  const badges: BadgeLabels = { soon: D.badgeSoon, off: D.badgeOff };

  return (
    <AdminShell title={D.title}>
      {state.status === 'err' && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {A.error[state.code as keyof typeof A.error] ?? A.error.generic}
        </div>
      )}

      <TileGroup title={D.groupMembers} tiles={members} badges={badges} />
      <TileGroup title={D.groupData} tiles={data} badges={badges} />
      <TileGroup title={D.groupSite} tiles={site} badges={badges} />

      <p className="mt-3 px-1 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
        {D.statsLiveNote} {D.soonNote}
      </p>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        {A.disclaimer}
      </div>
    </AdminShell>
  );
}

function TileGroup({
  title,
  tiles,
  badges,
}: {
  title: string;
  tiles: Tile[];
  badges: BadgeLabels;
}) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tiles.map((tile) => (
          <TileCard key={tile.key} tile={tile} badges={badges} />
        ))}
      </div>
    </section>
  );
}

function TileCard({ tile, badges }: { tile: Tile; badges: BadgeLabels }) {
  const disabled = tile.status !== 'active';
  const base =
    'card-shadow flex flex-col rounded-2xl bg-white px-4 py-3 dark:bg-stone-900';

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-sm font-semibold ${
            disabled
              ? 'text-stone-400 dark:text-stone-500'
              : 'text-stone-900 dark:text-stone-100'
          }`}
        >
          {tile.title}
        </p>
        {tile.status === 'active' ? (
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
        ) : (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              tile.status === 'off'
                ? 'bg-stone-200 text-stone-500 dark:bg-stone-700 dark:text-stone-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
            }`}
          >
            {tile.status === 'off' ? badges.off : badges.soon}
          </span>
        )}
      </div>
      <p
        className={`mt-0.5 text-[11px] leading-snug ${
          disabled
            ? 'text-stone-400 opacity-80 dark:text-stone-500'
            : 'text-stone-500 dark:text-stone-400'
        }`}
      >
        {tile.desc}
      </p>
      {tile.metric && (
        <p className="mt-2 text-[12px] font-bold tabular-nums text-stone-800 dark:text-stone-100">
          {tile.metric}
        </p>
      )}
      {tile.sub && (
        <p className="mt-0.5 text-[10px] tabular-nums text-stone-400 dark:text-stone-500">
          {tile.sub}
        </p>
      )}
    </>
  );

  if (tile.status === 'active' && tile.href) {
    return (
      <Link
        href={tile.href}
        className={`${base} transition active:scale-[0.99] active:bg-stone-50 dark:active:bg-stone-800`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div aria-disabled="true" className={`${base} cursor-not-allowed opacity-90`}>
      {inner}
    </div>
  );
}
