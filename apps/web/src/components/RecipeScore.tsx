'use client';

import { useI18n } from '@/lib/i18n';
import type { RecipeScore, RecipeGrade } from '@/lib/api-client';

// 등급별 색조 — 우수(에메랄드)/양호(스카이)/보통(앰버)/주의(로즈).
const GRADE_TONE: Record<RecipeGrade, string> = {
  excellent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  good: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  fair: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  caution: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
};

// 레시피 카드용 컴팩트 배지 — "82점 · 양호".
export function RecipeScoreBadge({ score }: { score: RecipeScore }) {
  const { t } = useI18n();
  const S = t.community.recipe.score;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${GRADE_TONE[score.grade]}`}
    >
      <span className="tabular-nums">{score.total}</span>
      <span className="opacity-80">{S.unit}</span>
      <span className="opacity-60">·</span>
      <span>{S.grades[score.grade]}</span>
    </span>
  );
}

// 레시피 미채점 시 표시하는 대기 배지.
export function RecipeScorePending() {
  const { t } = useI18n();
  const S = t.community.recipe.score;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400" />
      {S.pending}
    </span>
  );
}

function Axis({ label, value, tone }: { label: string; value: number; tone: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] font-medium text-stone-600 dark:text-stone-300">
        {label}
      </span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-7 shrink-0 text-right text-[11px] font-bold tabular-nums text-stone-700 dark:text-stone-200">
        {pct}
      </span>
    </div>
  );
}

// 레시피 상세용 점수 카드 — 총점 + 3축 막대 + 1인분 추정 + 코멘트 + 면책.
export function RecipeScoreCard({ score }: { score: RecipeScore }) {
  const { t } = useI18n();
  const S = t.community.recipe.score;
  return (
    <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {S.title}
        </h2>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${GRADE_TONE[score.grade]}`}
        >
          {S.grades[score.grade]}
        </span>
      </div>

      <div className="mt-2 flex items-end gap-1">
        <span className="text-4xl font-bold tabular-nums tracking-tight text-stone-900 dark:text-stone-100">
          {score.total}
        </span>
        <span className="mb-1 text-sm font-semibold text-stone-500 dark:text-stone-400">
          {S.unit}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <Axis label={S.calorie} value={score.calorieScore} tone="bg-amber-500" />
        <Axis label={S.nutrition} value={score.nutritionScore} tone="bg-emerald-500" />
        <Axis label={S.upf} value={score.upfScore} tone="bg-sky-500" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500 dark:text-stone-400">
        <span>
          {S.kcalLabel}{' '}
          <span className="font-bold tabular-nums text-stone-700 dark:text-stone-200">
            {score.estKcal}
          </span>{' '}
          {S.kcalUnit}
        </span>
        <span className="opacity-50">·</span>
        <span>{S.upfTiers[score.upfTier]}</span>
      </div>

      {score.summary && (
        <p className="mt-2 rounded-xl bg-stone-50 px-3 py-2 text-[12px] leading-relaxed text-stone-700 dark:bg-stone-800/60 dark:text-stone-200">
          {score.summary}
        </p>
      )}

      <p className="mt-2 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
        {S.disclaimer}
      </p>
    </section>
  );
}
