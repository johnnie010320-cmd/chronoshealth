'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ChevronRightIcon, ShieldIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { useIsAdmin } from '@/lib/admin-state';
import type { Dictionary } from '@/locales/ko';

type ItemKey = keyof Dictionary['menu'];
type GroupKey =
  | 'groupTwin'
  | 'groupRoutine'
  | 'groupAiAge'
  | 'groupAiCare'
  | 'groupCommunity'
  | 'groupAffiliates'
  | 'groupRewards'
  | 'groupProfile';
type PhaseHintKey = 'phaseHintP2' | 'phaseHintR5' | 'phaseHintR6' | 'phaseHintR7' | 'phaseHintR8';

type MenuItem = {
  itemKey: ItemKey;
  href: string;
  disabled?: boolean;
  phaseHint?: PhaseHintKey;
};

type MenuGroup = {
  groupKey: GroupKey;
  items: MenuItem[];
};

const MENU_GROUPS: MenuGroup[] = [
  {
    groupKey: 'groupTwin',
    items: [
      { itemKey: 'itemData1', href: '/survey' },
      { itemKey: 'itemData2', href: '/menu', disabled: true, phaseHint: 'phaseHintP2' },
      { itemKey: 'itemData3', href: '/menu', disabled: true, phaseHint: 'phaseHintP2' },
      { itemKey: 'itemWearable', href: '/menu', disabled: true, phaseHint: 'phaseHintP2' },
    ],
  },
  {
    groupKey: 'groupRoutine',
    items: [
      { itemKey: 'itemRoutineFood', href: '/routine' },
      { itemKey: 'itemRoutineExercise', href: '/routine' },
      { itemKey: 'itemRoutineSleep', href: '/routine' },
    ],
  },
  {
    groupKey: 'groupAiAge',
    items: [
      { itemKey: 'itemBioAge', href: '/reports' },
      { itemKey: 'itemYouthAge', href: '/reports' },
      { itemKey: 'itemSkinAge', href: '/reports' },
      { itemKey: 'itemJointAge', href: '/reports' },
    ],
  },
  {
    groupKey: 'groupAiCare',
    items: [
      { itemKey: 'itemCareDiet', href: '/care' },
      { itemKey: 'itemCareExercise', href: '/care' },
      { itemKey: 'itemCareMedical', href: '/care' },
    ],
  },
  {
    groupKey: 'groupCommunity',
    items: [
      { itemKey: 'itemCommunityVideo', href: '/community/new' },
      { itemKey: 'itemCommunityComment', href: '/community' },
      { itemKey: 'itemCommunityHot', href: '/community' },
      { itemKey: 'itemCommunityRanking', href: '/leaderboard' },
    ],
  },
  {
    groupKey: 'groupAffiliates',
    items: [
      { itemKey: 'itemAffiliatesAll', href: '/menu', disabled: true, phaseHint: 'phaseHintR5' },
    ],
  },
  {
    groupKey: 'groupRewards',
    items: [
      { itemKey: 'itemRewardsBalance', href: '/rewards' },
      { itemKey: 'itemRewardsEarn', href: '/rewards' },
      { itemKey: 'itemRewardsSpend', href: '/rewards' },
    ],
  },
  {
    groupKey: 'groupProfile',
    items: [
      { itemKey: 'itemProfileEdit', href: '/profile' },
      { itemKey: 'itemProfileMyPosts', href: '/community' },
      { itemKey: 'itemProfileMyComments', href: '/community' },
      { itemKey: 'itemProfileLogout', href: '/profile' },
    ],
  },
];

type AdminMenuItem = { label: string; href: string };

export default function MenuPage() {
  const { t } = useI18n();
  const M = t.menu;
  const A = t.admin;
  const isAdmin = useIsAdmin();

  const adminItems: AdminMenuItem[] = [
    { label: A.menuItemDashboard, href: '/admin' },
    { label: A.menuItemUsers, href: '/admin/users' },
    { label: A.menuItemBetaSignups, href: '/admin/beta-signups' },
    { label: A.menuItemContent, href: '/admin/content' },
  ];

  return (
    <AppShell title={M.pageTitle} decoration="dots">
      <div className="space-y-5 pb-10 pt-4">
        {isAdmin === true && (
          <section>
            <h2 className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-300">
              <ShieldIcon className="h-3 w-3" />
              {A.menuGroupTitle}
            </h2>
            <ul className="card-shadow divide-y divide-rose-100 overflow-hidden rounded-2xl bg-rose-50/50 dark:divide-rose-900/40 dark:bg-rose-950/20">
              {adminItems.map((item) => (
                <li key={item.href + item.label}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-stone-800 transition active:bg-rose-100/60 dark:text-stone-100 dark:active:bg-rose-950/40"
                  >
                    <span className="truncate text-[13px] font-medium">{item.label}</span>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-rose-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {MENU_GROUPS.map((group) => (
          <section key={group.groupKey}>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {M[group.groupKey]}
            </h2>
            <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
              {group.items.map((item) => {
                const label = M[item.itemKey] as string;
                const hint = item.phaseHint ? (M[item.phaseHint] as string) : null;
                if (item.disabled) {
                  return (
                    <li
                      key={item.itemKey}
                      aria-disabled="true"
                      className="flex items-center justify-between gap-3 px-4 py-3 text-stone-400 dark:text-stone-500"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{label}</p>
                        {hint && (
                          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider opacity-70">
                            {hint}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                        {M.disabledLabel}
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.itemKey}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-stone-700 transition active:bg-stone-50 dark:text-stone-200 dark:active:bg-stone-800"
                    >
                      <span className="truncate text-[13px] font-medium">
                        {label}
                      </span>
                      <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          {M.disclaimer}
        </div>
      </div>
    </AppShell>
  );
}
