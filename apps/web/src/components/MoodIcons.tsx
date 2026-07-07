'use client';

// 오늘의 컨디션 — 이모지 대신 앱 라인 아이콘 톤에 맞춘 세련된 표정 SVG.
// 24 viewBox · currentColor · 선택 시 컨디션별 색조.
import type { DiaryMood } from '@/lib/api-client';

export type MoodTone = 'emerald' | 'sky' | 'amber' | 'indigo' | 'rose';

export const MOOD_TONE: Record<DiaryMood, MoodTone> = {
  great: 'emerald',
  good: 'sky',
  soso: 'amber',
  tired: 'indigo',
  bad: 'rose',
};

// 선택된 컨디션 버튼의 테두리·배경·아이콘색.
export const MOOD_ACTIVE: Record<MoodTone, string> = {
  emerald:
    'border-emerald-500 bg-emerald-50 text-emerald-600 dark:border-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-300',
  sky: 'border-sky-500 bg-sky-50 text-sky-600 dark:border-sky-500 dark:bg-sky-900/40 dark:text-sky-300',
  amber:
    'border-amber-500 bg-amber-50 text-amber-600 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-300',
  indigo:
    'border-indigo-500 bg-indigo-50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-900/40 dark:text-indigo-300',
  rose: 'border-rose-500 bg-rose-50 text-rose-600 dark:border-rose-500 dark:bg-rose-900/30 dark:text-rose-300',
};

function Face({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9.25" />
      {children}
    </svg>
  );
}

// 눈 점(채움).
function Dot({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r="0.95" fill="currentColor" stroke="none" />;
}

export function MoodFace({ mood, className }: { mood: DiaryMood; className?: string }) {
  switch (mood) {
    case 'great':
      // 활짝 웃는 눈 + 큰 미소.
      return (
        <Face className={className}>
          <path d="M7.8 10.9c.55-1 1.65-1 2.2 0" />
          <path d="M14 10.9c.55-1 1.65-1 2.2 0" />
          <path d="M7.4 13.6c1.2 2.5 7.9 2.5 9.2 0" />
        </Face>
      );
    case 'good':
      // 편안한 눈 + 잔잔한 미소.
      return (
        <Face className={className}>
          <Dot cx={9} cy={10.6} />
          <Dot cx={15} cy={10.6} />
          <path d="M8.4 14c1.05 1.7 6.15 1.7 7.2 0" />
        </Face>
      );
    case 'soso':
      // 무표정 — 일자 입.
      return (
        <Face className={className}>
          <Dot cx={9} cy={10.8} />
          <Dot cx={15} cy={10.8} />
          <path d="M8.7 14.6h6.6" />
        </Face>
      );
    case 'tired':
      // 지침 — 반쯤 감긴 눈 + 작은 입.
      return (
        <Face className={className}>
          <path d="M7.9 10.5c.65.9 1.55.9 2.2 0" />
          <path d="M13.9 10.5c.65.9 1.55.9 2.2 0" />
          <path d="M10 14.9c.7-.7 1.6.5 2.4-.2" />
        </Face>
      );
    case 'bad':
    default:
      // 힘듦 — 걱정 눈썹 + 찡그린 입.
      return (
        <Face className={className}>
          <path d="M7.7 9.2 10 10.2" />
          <path d="M16.3 9.2 14 10.2" />
          <Dot cx={9.1} cy={11.5} />
          <Dot cx={14.9} cy={11.5} />
          <path d="M8 15.4c1.2-2.6 6.8-2.6 8 0" />
        </Face>
      );
  }
}
