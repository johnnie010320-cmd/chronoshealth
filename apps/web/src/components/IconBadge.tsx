// 삼성 헬스식 컬러 아이콘 배지 — 색 있는 둥근 배경 + 도메인 아이콘.
// 리스트 행·카드·섹션 헤더에서 시각적 도메인 식별을 강화.

import type { ReactElement } from 'react';

type IconCmp = (p: { className?: string; strokeWidth?: number }) => ReactElement;

export type BadgeTone =
  | 'violet'
  | 'sky'
  | 'amber'
  | 'rose'
  | 'emerald'
  | 'indigo'
  | 'stone';

// 라이트: 옅은 배경 + 진한 아이콘. 다크: 반투명 배경 + 밝은 아이콘.
const TONE: Record<BadgeTone, string> = {
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
  stone: 'bg-stone-100 text-stone-500 dark:bg-stone-700/50 dark:text-stone-300',
};

type BadgeSize = 'sm' | 'md' | 'lg';
const BOX: Record<BadgeSize, string> = {
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-10 w-10 rounded-xl',
  lg: 'h-12 w-12 rounded-2xl',
};
const GLYPH: Record<BadgeSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function IconBadge({
  Icon,
  tone = 'violet',
  size = 'md',
  className,
}: {
  Icon: IconCmp;
  tone?: BadgeTone;
  size?: BadgeSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ${BOX[size]} ${TONE[tone]} ${className ?? ''}`}
    >
      <Icon className={GLYPH[size]} strokeWidth={2} />
    </span>
  );
}
