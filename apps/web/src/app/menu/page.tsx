'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { IconBadge, type BadgeTone } from '@/components/IconBadge';
import {
  ChevronRightIcon,
  ClipboardIcon,
  SparkleIcon,
  ChartIcon,
  WatchIcon,
  TargetIcon,
  HeartPulseIcon,
  LeafIcon,
  DropletIcon,
  ActivityIcon,
  UtensilsIcon,
  DumbbellIcon,
  StethoscopeIcon,
  VideoIcon,
  ChatBubbleIcon,
  FlameIcon,
  TrophyIcon,
  UsersIcon,
  GiftIcon,
  CoinIcon,
  BellIcon,
  UserCircleIcon,
  BookIcon,
  FileTextIcon,
  LogoutIcon,
} from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { useUnseenNotice } from '@/lib/notice-state';
import type { Dictionary } from '@/locales/ko';

type IconCmp = (p: { className?: string; strokeWidth?: number }) => ReactElement;
type ItemKey = keyof Dictionary['menu'];

// 항목별 컬러 아이콘 배지(삼성 헬스식) — 도메인 색으로 시각 식별 강화.
const ITEM_VISUAL: Partial<Record<ItemKey, { Icon: IconCmp; tone: BadgeTone }>> = {
  itemData1: { Icon: ClipboardIcon, tone: 'violet' },
  itemData2: { Icon: SparkleIcon, tone: 'violet' },
  itemData3: { Icon: ChartIcon, tone: 'stone' },
  itemWearable: { Icon: WatchIcon, tone: 'sky' },
  itemRoutineDaily: { Icon: TargetIcon, tone: 'emerald' },
  itemBioAge: { Icon: HeartPulseIcon, tone: 'rose' },
  itemYouthAge: { Icon: LeafIcon, tone: 'emerald' },
  itemSkinAge: { Icon: DropletIcon, tone: 'sky' },
  itemJointAge: { Icon: ActivityIcon, tone: 'amber' },
  itemCareDiet: { Icon: UtensilsIcon, tone: 'amber' },
  itemCareExercise: { Icon: DumbbellIcon, tone: 'emerald' },
  itemCareMedical: { Icon: StethoscopeIcon, tone: 'rose' },
  itemCommunityVideo: { Icon: VideoIcon, tone: 'rose' },
  itemCommunityComment: { Icon: ChatBubbleIcon, tone: 'sky' },
  itemCommunityHot: { Icon: FlameIcon, tone: 'amber' },
  itemCommunityRanking: { Icon: TrophyIcon, tone: 'amber' },
  itemMessagesDm: { Icon: ChatBubbleIcon, tone: 'sky' },
  itemMessagesRoom: { Icon: UsersIcon, tone: 'violet' },
  itemAffiliatesAll: { Icon: GiftIcon, tone: 'violet' },
  itemRewardsBalance: { Icon: CoinIcon, tone: 'amber' },
  itemRewardsEarn: { Icon: TargetIcon, tone: 'emerald' },
  itemRewardsSpend: { Icon: GiftIcon, tone: 'rose' },
  itemNotices: { Icon: BellIcon, tone: 'rose' },
  itemFeatureRequest: { Icon: ChatBubbleIcon, tone: 'violet' },
  itemProfileEdit: { Icon: UserCircleIcon, tone: 'violet' },
  itemProfileDiary: { Icon: BookIcon, tone: 'amber' },
  itemProfileMyPosts: { Icon: FileTextIcon, tone: 'sky' },
  itemProfileMyComments: { Icon: ChatBubbleIcon, tone: 'sky' },
  itemProfileLogout: { Icon: LogoutIcon, tone: 'stone' },
};
type GroupKey =
  | 'groupTwin'
  | 'groupRoutine'
  | 'groupAiAge'
  | 'groupAiCare'
  | 'groupCommunity'
  | 'groupMessaging'
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
      { itemKey: 'itemData2', href: '/twin' },
      { itemKey: 'itemData3', href: '/menu', disabled: true, phaseHint: 'phaseHintP2' },
      { itemKey: 'itemWearable', href: '/menu', disabled: true, phaseHint: 'phaseHintP2' },
    ],
  },
  {
    groupKey: 'groupRoutine',
    items: [
      { itemKey: 'itemRoutineDaily', href: '/routine' },
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
    groupKey: 'groupMessaging',
    items: [
      { itemKey: 'itemMessagesDm', href: '/messages' },
      { itemKey: 'itemMessagesRoom', href: '/messages/room/new' },
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
      { itemKey: 'itemNotices', href: '/notices' },
      { itemKey: 'itemFeatureRequest', href: '/feature-requests' },
      { itemKey: 'itemProfileEdit', href: '/profile' },
      { itemKey: 'itemProfileDiary', href: '/diary' },
      { itemKey: 'itemProfileMyPosts', href: '/community?mine=1' },
      { itemKey: 'itemProfileMyComments', href: '/community' },
      { itemKey: 'itemProfileLogout', href: '/profile' },
    ],
  },
];

export default function MenuPage() {
  const { t } = useI18n();
  const M = t.menu;
  const { hasNew } = useUnseenNotice();

  return (
    <AppShell title={M.pageTitle} decoration="dots">
      <div className="space-y-5 pb-10 pt-4">
        {MENU_GROUPS.map((group) => (
          <section key={group.groupKey}>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {M[group.groupKey]}
            </h2>
            <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white/95 dark:divide-stone-800 dark:bg-stone-900">
              {group.items.map((item) => {
                const label = M[item.itemKey] as string;
                const hint = item.phaseHint ? (M[item.phaseHint] as string) : null;
                const visual = ITEM_VISUAL[item.itemKey];
                if (item.disabled) {
                  return (
                    <li
                      key={item.itemKey}
                      aria-disabled="true"
                      className="flex items-center gap-3 px-4 py-3 text-stone-400 dark:text-stone-500"
                    >
                      {visual && (
                        <IconBadge Icon={visual.Icon} tone="stone" size="sm" className="opacity-70" />
                      )}
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
                const showNoticeDot = item.href === '/notices' && hasNew;
                return (
                  <li key={item.itemKey}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3 text-stone-700 transition active:bg-stone-50 dark:text-stone-200 dark:active:bg-stone-800"
                    >
                      {visual && <IconBadge Icon={visual.Icon} tone={visual.tone} size="sm" />}
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate text-[13px] font-medium">{label}</span>
                        {showNoticeDot && (
                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                            {t.notices.newBadge}
                          </span>
                        )}
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
