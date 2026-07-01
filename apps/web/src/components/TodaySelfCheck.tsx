'use client';

// 홈 "오늘의 셀프 체크" 멀티탭 카드.
// ① 오늘의 루틴: 컨디션·음식(AI 칼로리)·운동(강도)·수면·메모 입력 → 루틴(+다이어리) 반영
// ② 건강 그래프: 최근 14일 생활패턴(음식·운동·수면) → 종합 생활 점수 + 세부 3지표
// ③ 가이드: 오늘의 셀프 체크 팁 + 케어/설문 진입
// 의료·윤리: "진단" 아님. "생활 점수/추이" + 면책. (apps/web CLAUDE.md 규칙)

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { fileToFoodshotB64 } from '@/lib/foodshot-image';
import { loadHealthProfile, type StableHealthProfile } from '@/lib/health-profile';
import { dietScore, worstUpf, type DietScore } from '@/lib/diet-score';
import { exerciseScore, type ExerciseScore } from '@/lib/exercise-score';
import {
  fetchRoutineToday,
  fetchRoutineRange,
  submitRoutineDaily,
  addDiary,
  symptomCheck,
  estimateCalories,
  estimateFoodshot,
  type RoutineEntry,
  type RoutineSummary,
  type DiaryMood,
  type ExerciseIntensity,
  type ExerciseType,
  type SymptomAssessment,
  type CalorieEstimateLine,
  type UpfTier,
} from '@/lib/api-client';

type TabKey = 'today' | 'graph' | 'guide';
type FoodRow = { name: string; amount: string };
type DayNutri = {
  proteinG: number | null;
  carbG: number | null;
  fatG: number | null;
  upfTier: UpfTier | null;
};
const EMPTY_NUTRI: DayNutri = { proteinG: null, carbG: null, fatG: null, upfTier: null };

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// AI 추정 라인들 → 하루 합계 매크로 + 최악 UPF 등급.
function aggregateNutri(
  lines: { proteinG?: number; carbG?: number; fatG?: number; upf?: UpfTier }[],
): DayNutri {
  let p = 0;
  let c = 0;
  let f = 0;
  let any = false;
  for (const l of lines) {
    if (typeof l.proteinG === 'number') { p += l.proteinG; any = true; }
    if (typeof l.carbG === 'number') { c += l.carbG; any = true; }
    if (typeof l.fatG === 'number') { f += l.fatG; any = true; }
  }
  const upfTier = worstUpf(lines.map((l) => l.upf));
  if (!any && upfTier == null) return EMPTY_NUTRI;
  return { proteinG: any ? round1(p) : null, carbG: any ? round1(c) : null, fatG: any ? round1(f) : null, upfTier };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const INTENSITIES: ExerciseIntensity[] = ['low', 'medium', 'high'];
const EXERCISE_TYPES: ExerciseType[] = ['cardio', 'strength', 'both'];

// 항목 가중치(합 100): 운동 30 + 수면 20 + 음식 50.
const SCORE_WEIGHT = { exercise: 30, sleep: 20, food: 50 } as const;

// 한 항목의 원점수(0~100)와 가중 환산점수(원점수×가중치/100).
type ScorePart = { raw: number; weighted: number; weight: number };
type DayScoreParts = {
  exercise: ScorePart;
  sleep: ScorePart;
  food: ScorePart;
  total: number; // 가중 환산점수 합(0~100)
};

// 비의료 "생활 점수"를 항목별 원점수 + 가중 환산점수로 분해.
// 운동: 강도&시간40 + 밸런스30 + 리커버리30 (exercise-score). 수면: 7.5h 최적 편차. 음식: 식단 점수(칼로리30+영양30+UPF40).
function dayScoreParts(e: RoutineEntry, profile: StableHealthProfile | null): DayScoreParts {
  const exRaw = exerciseScore(e).total;
  const slRaw = e.sleepHours != null ? 100 * (1 - Math.min(Math.abs(e.sleepHours - 7.5) / 4, 1)) : 0;
  const fdRaw = dietScore(e, profile).total;
  const part = (raw: number, weight: number): ScorePart => ({
    raw: Math.round(Math.max(0, Math.min(100, raw))),
    weighted: Math.round(((raw * weight) / 100) * 10) / 10,
    weight,
  });
  const exercise = part(exRaw, SCORE_WEIGHT.exercise);
  const sleep = part(slRaw, SCORE_WEIGHT.sleep);
  const food = part(fdRaw, SCORE_WEIGHT.food);
  // 통합 점수는 반올림 누적오차를 피하려 원점수에서 직접 산출.
  const total = Math.round(
    Math.max(0, Math.min(100, (exRaw * SCORE_WEIGHT.exercise + slRaw * SCORE_WEIGHT.sleep + fdRaw * SCORE_WEIGHT.food) / 100)),
  );
  return { exercise, sleep, food, total };
}

// 추세 그래프: 전환 가능한 지표(통합/운동/수면/음식)와 기간(7·14·30일).
type MetricKey = 'total' | 'exercise' | 'sleep' | 'food';
const METRIC_KEYS: MetricKey[] = ['total', 'exercise', 'sleep', 'food'];
const PERIODS = [7, 14, 30] as const;
type Period = (typeof PERIODS)[number];

// 하루치 항목별 원점수 + 통합 점수(추세용). 기록 없는 날은 has=false, 값 0.
type DayPoint = {
  date: string;
  has: boolean;
  total: number;
  exercise: number;
  sleep: number;
  food: number;
};

function metricValue(p: DayPoint, m: MetricKey): number {
  return m === 'total' ? p.total : m === 'exercise' ? p.exercise : m === 'sleep' ? p.sleep : p.food;
}

// 오늘 팁: 가중치 대비 가장 손실(개선 여지)이 큰 항목을 고른다. 셋 다 양호하면 칭찬.
type TipKey = 'exercise' | 'sleep' | 'food' | 'praise' | 'empty';
function pickTipKey(parts: DayScoreParts | null): TipKey {
  if (!parts) return 'empty';
  const cats = [parts.exercise, parts.sleep, parts.food];
  if (cats.every((c) => c.raw >= 80)) return 'praise';
  const deficits: { key: Exclude<TipKey, 'praise' | 'empty'>; gap: number }[] = [
    { key: 'exercise', gap: parts.exercise.weight - parts.exercise.weighted },
    { key: 'sleep', gap: parts.sleep.weight - parts.sleep.weighted },
    { key: 'food', gap: parts.food.weight - parts.food.weighted },
  ];
  return deficits.reduce((top, c) => (c.gap > top.gap ? c : top)).key;
}

const MOODS: DiaryMood[] = ['great', 'good', 'soso', 'tired', 'bad'];
const MOOD_EMOJI: Record<DiaryMood, string> = {
  great: '😄',
  good: '🙂',
  soso: '😐',
  tired: '😪',
  bad: '😣',
};

export function TodaySelfCheck() {
  const { t } = useI18n();
  const S = t.home.selfCheck;
  const [tab, setTab] = useState<TabKey>('graph');
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(!!readSession());
  }, []);

  return (
    <section className="card-shadow mt-3 overflow-hidden rounded-2xl bg-white dark:bg-stone-900">
      {/* 탭 헤더 */}
      <div className="flex border-b border-stone-100 dark:border-stone-800">
        {(
          [
            ['graph', S.tabGraph],
            ['today', S.tabToday],
            ['guide', S.tabGuide],
          ] as [TabKey, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 px-2 py-2.5 text-[12px] font-semibold transition ${
              tab === key
                ? 'border-b-2 border-brand-600 text-brand-700 dark:text-brand-300'
                : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'today' && (
          <TodayTab signedIn={signedIn} S={S} onShowGraph={() => setTab('graph')} />
        )}
        {tab === 'graph' && <GraphTab signedIn={signedIn} S={S} />}
        {tab === 'guide' && <SymptomTab signedIn={signedIn} S={S} />}
      </div>
    </section>
  );
}

type SelfCheckLabels = ReturnType<typeof useI18n>['t']['home']['selfCheck'];

// ── 탭1: 오늘 체크 ──────────────────────────────────────────────────────────
function TodayTab({
  signedIn,
  S,
  onShowGraph,
}: {
  signedIn: boolean;
  S: SelfCheckLabels;
  onShowGraph: () => void;
}) {
  const { t, locale } = useI18n();
  const F = t.routine.food;
  const RErr = t.routine.error;
  const unitCal = t.routine.unitCal;
  const [mood, setMood] = useState<DiaryMood | null>(null);
  const [exercise, setExercise] = useState('');
  const [intensity, setIntensity] = useState<ExerciseIntensity | null>(null);
  const [exType, setExType] = useState<ExerciseType | null>(null); // 운동 밸런스: 유산소/근력/혼합
  const [didStretch, setDidStretch] = useState<boolean | null>(null); // 리커버리: 스트레칭 수행
  const [sleep, setSleep] = useState('');
  const [note, setNote] = useState('');
  const [calories, setCalories] = useState(''); // 음식 → AI 칼로리 추정값(편집 가능)
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // 음식/칼로리 입력
  const [foodRows, setFoodRows] = useState<FoodRow[]>([{ name: '', amount: '' }]);
  const [estimating, setEstimating] = useState(false);
  const [estimateLines, setEstimateLines] = useState<CalorieEstimateLine[] | null>(null);
  const [estimateErr, setEstimateErr] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [photoApplied, setPhotoApplied] = useState(false);
  const [nutri, setNutri] = useState<DayNutri>(EMPTY_NUTRI); // 식단 점수용 매크로+UPF

  useEffect(() => {
    if (!signedIn) return;
    fetchRoutineToday()
      .then((r) => {
        if (r.entry) {
          if (r.entry.exerciseMinutes != null) setExercise(String(r.entry.exerciseMinutes));
          if (r.entry.exerciseIntensity) setIntensity(r.entry.exerciseIntensity);
          if (r.entry.exerciseType) setExType(r.entry.exerciseType);
          if (r.entry.didStretch != null) setDidStretch(r.entry.didStretch);
          if (r.entry.sleepHours != null) setSleep(String(r.entry.sleepHours));
          if (r.entry.note) setNote(r.entry.note);
          if (r.entry.caloriesKcal != null) setCalories(String(r.entry.caloriesKcal));
          setNutri({
            proteinG: r.entry.proteinG ?? null,
            carbG: r.entry.carbG ?? null,
            fatG: r.entry.fatG ?? null,
            upfTier: r.entry.upfTier ?? null,
          });
        }
      })
      .catch(() => {});
  }, [signedIn]);

  function num(v: string): number | null {
    const x = v.trim();
    if (x === '') return null;
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  // 텍스트 음식 입력 → AI 칼로리 추정
  async function handleEstimate() {
    const cleaned = foodRows
      .map((r) => ({ name: r.name.trim(), amount: r.amount.trim() }))
      .filter((r) => r.name !== '' && r.amount !== '');
    if (cleaned.length === 0) return;
    setEstimating(true);
    setEstimateErr(null);
    try {
      const res = await estimateCalories(cleaned, locale);
      setEstimateLines(res.breakdown);
      setCalories(String(res.totalCalories));
      setNutri(aggregateNutri(res.breakdown));
    } catch (err) {
      setEstimateErr(err instanceof Error ? err.message : 'generic');
    } finally {
      setEstimating(false);
    }
  }

  // 음식 사진 → AI Vision 인식 → 칼로리 추정
  async function handlePhoto(file: File | null) {
    if (!file) return;
    setPhotoErr(null);
    setPhotoApplied(false);
    setEstimateErr(null);
    setPhotoBusy(true);
    try {
      const imageB64 = await fileToFoodshotB64(file);
      const res = await estimateFoodshot(imageB64, locale);
      if (res.estimatedItems.length === 0) {
        setPhotoErr('errPhoto');
        return;
      }
      setFoodRows(res.estimatedItems.slice(0, 10).map((it) => ({ name: it.name, amount: it.amount })));
      setEstimateLines(
        res.estimatedItems.map((it) => ({ name: it.name, amount: it.amount, calories: it.calories })),
      );
      setCalories(String(res.totalCalories));
      setNutri(aggregateNutri(res.estimatedItems));
      setPhotoApplied(true);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'errPhoto';
      setPhotoErr(code in RErr ? code : 'errPhoto');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setDone(false);
    try {
      await submitRoutineDaily({
        entryDate: todayIso(),
        caloriesKcal: num(calories), // 음식 입력으로 추정한 칼로리(식단점수·처방 신뢰도 반영)
        exerciseMinutes: num(exercise),
        exerciseIntensity: intensity,
        exerciseType: exType,
        didStretch,
        sleepHours: num(sleep),
        note: note.trim() || null,
        proteinG: nutri.proteinG,
        carbG: nutri.carbG,
        fatG: nutri.fatG,
        upfTier: nutri.upfTier,
      });
      if (mood) {
        try {
          await addDiary({ entryDate: todayIso(), mood, body: note.trim() });
        } catch {
          /* 다이어리 실패는 무시(루틴은 반영됨) */
        }
      }
      setDone(true);
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) return <LoginPrompt S={S} />;

  return (
    <div className="space-y-3">
      {/* 컨디션 */}
      <div>
        <p className="mb-1 text-[11px] font-semibold text-stone-600 dark:text-stone-400">
          {S.moodLabel}
        </p>
        <div className="flex gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              aria-label={S.mood[m]}
              className={`flex h-10 flex-1 items-center justify-center rounded-xl border text-xl transition ${
                mood === m
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/40'
                  : 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900'
              }`}
            >
              {MOOD_EMOJI[m]}
            </button>
          ))}
        </div>
      </div>

      {/* 운동 / 수면 */}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-stone-600 dark:text-stone-400">
            {S.exerciseLabel}
          </span>
          <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900">
            <input
              type="number"
              inputMode="numeric"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-sm text-stone-900 outline-none dark:text-stone-100"
            />
            <span className="shrink-0 text-[11px] text-stone-400">{S.exerciseUnit}</span>
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-stone-600 dark:text-stone-400">
            {S.sleepLabel}
          </span>
          <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900">
            <input
              type="number"
              inputMode="decimal"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-sm text-stone-900 outline-none dark:text-stone-100"
            />
            <span className="shrink-0 text-[11px] text-stone-400">{S.sleepUnit}</span>
          </div>
        </label>
      </div>

      {/* 운동 강도 */}
      <div>
        <p className="mb-1 text-[11px] font-semibold text-stone-600 dark:text-stone-400">
          {S.intensityLabel}
        </p>
        <div className="flex gap-1.5">
          {INTENSITIES.map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => setIntensity((cur) => (cur === lv ? null : lv))}
              className={`flex-1 rounded-xl border px-2 py-2 text-[12px] font-semibold transition ${
                intensity === lv
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900/40 dark:text-brand-200'
                  : 'border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'
              }`}
            >
              {S.intensity[lv]}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-stone-400">{S.intensityHint}</p>
      </div>

      {/* 운동 종류(밸런스) — 유산소/근력/혼합 */}
      <div>
        <p className="mb-1 text-[11px] font-semibold text-stone-600 dark:text-stone-400">
          {S.exercise.typeLabel}
        </p>
        <div className="flex gap-1.5">
          {EXERCISE_TYPES.map((ty) => (
            <button
              key={ty}
              type="button"
              onClick={() => setExType((cur) => (cur === ty ? null : ty))}
              className={`flex-1 rounded-xl border px-2 py-2 text-[12px] font-semibold transition ${
                exType === ty
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900/40 dark:text-brand-200'
                  : 'border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'
              }`}
            >
              {S.exercise.type[ty]}
            </button>
          ))}
        </div>
      </div>

      {/* 리커버리 — 운동 후 스트레칭/쿨다운 여부 */}
      <div>
        <p className="mb-1 text-[11px] font-semibold text-stone-600 dark:text-stone-400">
          {S.exercise.stretchLabel}
        </p>
        <div className="flex gap-1.5">
          {([['yes', true], ['no', false]] as [('yes' | 'no'), boolean][]).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setDidStretch((cur) => (cur === v ? null : v))}
              className={`flex-1 rounded-xl border px-2 py-2 text-[12px] font-semibold transition ${
                didStretch === v
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900/40 dark:text-brand-200'
                  : 'border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'
              }`}
            >
              {S.exercise.stretch[k]}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-stone-400">{S.exercise.stretchHint}</p>
      </div>

      {/* 음식 → AI 칼로리 추정(텍스트/사진). 칼로리는 생활점수·AI 처방 신뢰도에 반영 */}
      <div className="rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 dark:border-stone-800 dark:bg-stone-800/30">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
            {F.sectionTitle}
          </span>
          <span className="text-[9px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
            {F.aiBadge}
          </span>
        </div>

        {/* 사진으로 추정 */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label
            className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-2 py-2 text-[11px] font-semibold text-stone-700 transition active:scale-[0.97] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 ${
              photoBusy ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>{F.photoCamera}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={photoBusy}
              onChange={(e) => {
                void handlePhoto(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </label>
          <label
            className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-2 py-2 text-[11px] font-semibold text-stone-700 transition active:scale-[0.97] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 ${
              photoBusy ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>{F.photoGallery}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={photoBusy}
              onChange={(e) => {
                void handlePhoto(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {photoBusy && (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-300 border-t-brand-600 dark:border-stone-700 dark:border-t-brand-400" />
            {F.photoAnalyzing}
          </div>
        )}
        {photoApplied && !photoBusy && (
          <p className="mt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            {F.photoApplied}
          </p>
        )}
        {photoErr && (
          <p className="mt-2 text-[11px] font-medium text-rose-600 dark:text-rose-300">
            {RErr[photoErr as keyof typeof RErr] ?? F.errPhoto}
          </p>
        )}

        {/* 음식 직접 입력 */}
        <ul className="mt-2 space-y-1.5">
          {foodRows.map((row, idx) => (
            <li key={idx} className="grid grid-cols-[1fr_84px_24px] items-center gap-1.5">
              <input
                type="text"
                value={row.name}
                placeholder={F.namePlaceholder}
                maxLength={80}
                onChange={(e) =>
                  setFoodRows((prev) => prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
                }
                className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[13px] text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
              />
              <input
                type="text"
                value={row.amount}
                placeholder={F.amountPlaceholder}
                maxLength={60}
                onChange={(e) =>
                  setFoodRows((prev) => prev.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)))
                }
                className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[13px] text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
              />
              <button
                type="button"
                aria-label={F.removeRow}
                onClick={() => setFoodRows((prev) => prev.filter((_, i) => i !== idx))}
                disabled={foodRows.length === 1}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 disabled:opacity-30 dark:hover:bg-stone-800"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setFoodRows((prev) => (prev.length >= 10 ? prev : [...prev, { name: '', amount: '' }]))}
            disabled={foodRows.length >= 10}
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition active:scale-[0.97] disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          >
            {F.addRow}
          </button>
          <button
            type="button"
            onClick={() => void handleEstimate()}
            disabled={estimating || foodRows.every((r) => r.name.trim() === '' || r.amount.trim() === '')}
            className="rounded-lg bg-brand-700 px-2.5 py-1.5 text-[11px] font-semibold text-white transition active:scale-[0.97] disabled:opacity-60"
          >
            {estimating ? F.estimating : F.estimateCta}
          </button>
        </div>

        {estimateErr && (
          <p className="mt-2 text-[11px] font-medium text-rose-600 dark:text-rose-300">
            {RErr[estimateErr as keyof typeof RErr] ?? F.errEstimate}
          </p>
        )}
        {estimateLines && estimateLines.length > 0 && (
          <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-2 text-[12px] text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
            <p className="font-semibold">
              {F.estimateResultPrefix} {estimateLines.reduce((s, l) => s + l.calories, 0)} {unitCal}
            </p>
            <ul className="mt-1 space-y-0.5">
              {estimateLines.map((line, i) => (
                <li key={i} className="flex items-center justify-between text-[11px]">
                  <span className="truncate">
                    {line.name} · {line.amount}
                  </span>
                  <span className="tabular-nums font-semibold">
                    {line.calories} {unitCal}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[10px] opacity-70">{F.estimateNote}</p>
          </div>
        )}

        {/* 칼로리 직접 입력/보정 */}
        <label className="mt-2 flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-semibold text-stone-600 dark:text-stone-400">
            {F.sectionTitle} · {unitCal}
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[13px] text-stone-900 placeholder:text-stone-400 outline-none focus:border-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
      </div>

      {/* 메모 */}
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
        placeholder={S.notePlaceholder}
        className="block w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-brand-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="flex-1 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
        >
          {busy ? S.saving : done ? S.saved : S.saveCta}
        </button>
        <Link
          href="/routine"
          className="rounded-xl border border-stone-300 px-3 py-2.5 text-[12px] font-semibold text-stone-700 transition active:scale-[0.98] hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          {S.detailCta}
        </Link>
      </div>
      {done && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-brand-700 dark:text-brand-300">{S.savedHint}</p>
          <button
            type="button"
            onClick={onShowGraph}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-brand-300 bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700 transition active:scale-[0.97] hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
          >
            {S.viewGraphCta}
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── 탭2: 건강 그래프 ────────────────────────────────────────────────────────
function GraphTab({ signedIn, S }: { signedIn: boolean; S: SelfCheckLabels }) {
  const [entries, setEntries] = useState<RoutineEntry[] | null>(null);
  const [summary, setSummary] = useState<RoutineSummary | null>(null);
  const [profile, setProfile] = useState<StableHealthProfile | null>(null);
  const [metric, setMetric] = useState<MetricKey>('total');
  const [period, setPeriod] = useState<Period>(14);

  const load = useCallback(async () => {
    // 최근 30일 확보 → 7·14·30일 추이를 클라이언트에서 전환.
    const r = await fetchRoutineRange(daysAgoIso(29), todayIso());
    setEntries(r.entries);
    setSummary(r.summary);
  }, []);

  useEffect(() => {
    if (signedIn) {
      setProfile(loadHealthProfile());
      load().catch(() => setEntries([]));
    }
  }, [signedIn, load]);

  // 최근 30일 일자별 항목 원점수 + 통합 점수(기록 없으면 0).
  const daily = useMemo<DayPoint[]>(() => {
    const byDate = new Map((entries ?? []).map((e) => [e.entryDate, e]));
    const out: DayPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = daysAgoIso(i);
      const e = byDate.get(date);
      if (e) {
        const pp = dayScoreParts(e, profile);
        out.push({ date, has: true, total: pp.total, exercise: pp.exercise.raw, sleep: pp.sleep.raw, food: pp.food.raw });
      } else {
        out.push({ date, has: false, total: 0, exercise: 0, sleep: 0, food: 0 });
      }
    }
    return out;
  }, [entries, profile]);

  // 오늘 항목별 생활 점수 + 식단 점수 세부(칼로리/영양/UPF).
  const todayEntry = (entries ?? []).find((e) => e.entryDate === todayIso()) ?? null;
  const todayParts: DayScoreParts | null = todayEntry ? dayScoreParts(todayEntry, profile) : null;
  const todayExercise: ExerciseScore | null = todayEntry ? exerciseScore(todayEntry) : null;
  const todayDiet: DietScore | null = todayEntry ? dietScore(todayEntry, profile) : null;

  if (!signedIn) return <LoginPrompt S={S} />;
  if (entries === null) {
    return (
      <div className="flex justify-center py-8">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-brand-600" />
      </div>
    );
  }

  const todayScore = daily[daily.length - 1]?.total ?? 0;
  const tier =
    todayScore >= 80 ? S.tierExcellent : todayScore >= 60 ? S.tierGood : todayScore >= 40 ? S.tierFair : S.tierLow;
  const tierColor =
    todayScore >= 80
      ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/40'
      : todayScore >= 60
        ? 'text-brand-700 bg-brand-50 dark:text-brand-200 dark:bg-brand-900/40'
        : todayScore >= 40
          ? 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30'
          : 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/30';
  const avg = summary?.averages;
  const recordDays = (entries ?? []).filter((e) =>
    (e.exerciseMinutes ?? 0) > 0 || (e.sleepHours ?? 0) > 0 || (e.caloriesKcal ?? 0) > 0,
  ).length;

  return (
    <div className="space-y-3">
      {/* 오늘의 팁 — 가장 개선 여지가 큰 항목 기준 맞춤 안내 */}
      <WellnessTip parts={todayParts} S={S} />

      {/* 오늘 점수 + tier */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {S.scoreLabel}
          </p>
          <p className="text-3xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
            {todayScore}
            <span className="ml-1 text-sm font-medium text-stone-400">{S.scoreUnit}</span>
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tierColor}`}>{tier}</span>
      </div>

      {/* 추세: 지표 전환(통합·운동·수면·음식) + 기간(7·14·30일) + 스파크라인 + 평균·최고 */}
      <TrendChart daily={daily} metric={metric} period={period} setMetric={setMetric} setPeriod={setPeriod} S={S} />

      {/* 오늘 항목별 생활 점수(운동·수면·음식 원점수 + 가중 환산 + 통합) */}
      {todayParts && <LifestyleBreakdown parts={todayParts} S={S} />}

      {/* 오늘 운동 점수 세부(강도&시간40 + 밸런스30 + 리커버리30) + AI 가비 코멘트 */}
      {todayExercise && <ExerciseBreakdown x={todayExercise} S={S} />}

      {/* 오늘 식단 점수 세부(칼로리30 + 영양30 + UPF40) */}
      {todayDiet && <DietBreakdown d={todayDiet} S={S} />}

      {/* 세부 3지표 */}
      <div className="grid grid-cols-3 gap-2">
        <Metric label={S.avgExercise} value={`${Math.round(avg?.exerciseMinutes ?? 0)}`} unit={S.exerciseUnit} />
        <Metric label={S.avgSleep} value={(avg?.sleepHours ?? 0).toFixed(1)} unit={S.sleepUnit} />
        <Metric label={S.recordDays} value={`${recordDays}`} unit={S.daysUnit} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-stone-500 dark:text-stone-400">
          {S.streakLabel} <b className="text-brand-700 dark:text-brand-300">{summary?.streakDays ?? 0}{S.daysUnit}</b>
        </span>
        <Link href="/routine" className="text-[11px] font-semibold text-brand-700 dark:text-brand-300">
          {S.detailCta} →
        </Link>
      </div>

      <p className="rounded-lg bg-stone-50 px-2.5 py-1.5 text-[10px] leading-relaxed text-stone-500 dark:bg-stone-800/60 dark:text-stone-400">
        {S.graphDisclaimer}
      </p>
    </div>
  );
}

// 오늘의 팁 — 개선 여지가 큰 항목(또는 칭찬/기록유도)을 한 줄로 안내.
function WellnessTip({ parts, S }: { parts: DayScoreParts | null; S: SelfCheckLabels }) {
  const T = S.tip;
  const key = pickTipKey(parts);
  const emoji = key === 'praise' ? '🎉' : key === 'empty' ? '✍️' : '💡';
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white px-3 py-2.5 dark:border-brand-900/50 dark:from-brand-950/40 dark:to-stone-900">
      <span aria-hidden className="text-lg leading-none">{emoji}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">
          {T.title}
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-stone-700 dark:text-stone-200">{T[key]}</p>
      </div>
    </div>
  );
}

// 추세 차트 — 지표/기간 전환 가능한 스파크라인 + 평균·최고.
function TrendChart({
  daily,
  metric,
  period,
  setMetric,
  setPeriod,
  S,
}: {
  daily: DayPoint[];
  metric: MetricKey;
  period: Period;
  setMetric: (m: MetricKey) => void;
  setPeriod: (p: Period) => void;
  S: SelfCheckLabels;
}) {
  const Tr = S.trend;
  const series = daily.slice(Math.max(0, daily.length - period));
  const recorded = series.filter((p) => p.has);
  const avg = recorded.length
    ? Math.round(recorded.reduce((s, p) => s + metricValue(p, metric), 0) / recorded.length)
    : 0;
  const best = recorded.length ? Math.max(...recorded.map((p) => metricValue(p, metric))) : 0;
  const metricLabel: Record<MetricKey, string> = {
    total: Tr.metricTotal,
    exercise: Tr.metricExercise,
    sleep: Tr.metricSleep,
    food: Tr.metricFood,
  };

  // SVG 좌표(280x60, 상하 여백 6).
  const W = 280;
  const H = 60;
  const n = series.length;
  const pts = series.map((p, i) => {
    const x = n <= 1 ? 0 : (i / (n - 1)) * W;
    const y = H - 6 - (metricValue(p, metric) / 100) * (H - 12);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `0,${H} ${line} ${W},${H}`;

  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 dark:border-stone-800 dark:bg-stone-900/40">
      {/* 지표 전환 */}
      <div className="flex gap-1">
        {METRIC_KEYS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={`flex-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold transition ${
              metric === m
                ? 'bg-brand-600 text-white'
                : 'bg-stone-100 text-stone-500 hover:text-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            {metricLabel[m]}
          </button>
        ))}
      </div>

      {/* 스파크라인 */}
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-16 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(13 148 136)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(13 148 136)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#scoreFill)" />
        <polyline
          points={line}
          fill="none"
          stroke="rgb(13 148 136)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map(([x, y], i) =>
          series[i]?.has ? <circle key={i} cx={x} cy={y} r="2" fill="rgb(13 148 136)" /> : null,
        )}
      </svg>

      {/* 기간 전환 + 평균·최고 */}
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                period === p
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                  : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
              }`}
            >
              {p}
              {S.daysUnit}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5 text-[10px] tabular-nums text-stone-500 dark:text-stone-400">
          <span>
            {Tr.avg} <b className="text-stone-800 dark:text-stone-100">{avg}</b>
          </span>
          <span>
            {Tr.best} <b className="text-brand-700 dark:text-brand-300">{best}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

// 오늘 항목별 생활 점수 — 운동·수면·음식의 원점수(0~100)와 가중 환산점수(30/20/50) + 통합 점수.
function LifestyleBreakdown({ parts, S }: { parts: DayScoreParts; S: SelfCheckLabels }) {
  const L = S.lifestyle;
  const rows: { label: string; part: ScorePart }[] = [
    { label: L.exercise, part: parts.exercise },
    { label: L.sleep, part: parts.sleep },
    { label: L.food, part: parts.food },
  ];
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 dark:border-stone-800 dark:bg-stone-900/40">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">{L.title}</span>
        <span className="text-[9px] font-medium text-stone-400">{L.colHint}</span>
      </div>
      <div className="mt-2 space-y-2">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-stone-700 dark:text-stone-300">{r.label}</span>
              <span className="tabular-nums text-stone-500 dark:text-stone-400">
                <b className="text-stone-800 dark:text-stone-100">{r.part.raw}</b>
                <span className="text-[9px]">/100</span>
                <span className="mx-1.5 text-stone-300 dark:text-stone-600">→</span>
                <b className="text-brand-700 dark:text-brand-300">{r.part.weighted}</b>
                <span className="text-[9px]">/{r.part.weight}</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${r.part.raw}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-stone-100 pt-2 dark:border-stone-800">
        <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">{L.total}</span>
        <span className="text-[13px] font-bold tabular-nums text-brand-700 dark:text-brand-300">
          {parts.total}
          <span className="ml-0.5 text-[10px] font-medium text-stone-400">/100</span>
        </span>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-stone-400">{L.note}</p>
    </div>
  );
}

// 오늘 운동 점수 세부 — 강도&시간/밸런스/리커버리 미니 바 + AI 가비 코멘트.
function ExerciseBreakdown({ x, S }: { x: ExerciseScore; S: SelfCheckLabels }) {
  const X = S.exercise;
  const bars: { label: string; val: number; max: number }[] = [
    { label: X.intensityTitle, val: x.intensity, max: 40 },
    { label: X.balanceTitle, val: x.balance, max: 30 },
    { label: X.recoveryTitle, val: x.recovery, max: 30 },
  ];
  // AI 가비 한마디 — 전반 우수면 칭찬, 아니면 최저 항목을 짚어준다.
  const coachKey: 'praise' | ExerciseScore['weakest'] = x.total >= 85 ? 'praise' : x.weakest;
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 dark:border-stone-800 dark:bg-stone-800/30">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">{X.scoreTitle}</span>
        <span className="text-[12px] font-bold tabular-nums text-brand-700 dark:text-brand-300">
          {x.total}
          <span className="ml-0.5 text-[10px] font-medium text-stone-400">/100</span>
        </span>
      </div>
      <div className="mt-2 space-y-1.5">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[10px] font-medium text-stone-500 dark:text-stone-400">
              {b.label}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${Math.round((b.val / b.max) * 100)}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right text-[10px] tabular-nums font-semibold text-stone-600 dark:text-stone-300">
              {b.val}/{b.max}
            </span>
          </div>
        ))}
      </div>
      {/* AI 가비 한마디 */}
      <div className="mt-2 flex items-start gap-2 rounded-lg bg-brand-50 px-2.5 py-2 dark:bg-brand-900/30">
        <span aria-hidden className="text-sm leading-none">🤖</span>
        <p className="text-[11px] leading-relaxed text-brand-800 dark:text-brand-100">
          <b className="font-semibold">{X.coachName}</b> {X.coach[coachKey]}
        </p>
      </div>
      {(!x.hasType || !x.hasStretch) && (
        <p className="mt-1.5 text-[10px] leading-relaxed text-amber-600 dark:text-amber-400">{X.hintInput}</p>
      )}
      <p className="mt-1 text-[10px] leading-relaxed text-stone-400">{X.formulaNote}</p>
    </div>
  );
}

// 오늘 식단 점수 세부 — 칼로리/영양/UPF 미니 바 + 데이터 보강 안내.
function DietBreakdown({ d, S }: { d: DietScore; S: SelfCheckLabels }) {
  const F = S.diet;
  const bars: { label: string; val: number; max: number }[] = [
    { label: F.calorie, val: d.calorie, max: 30 },
    { label: F.nutrition, val: d.macro, max: 30 },
    { label: F.upf, val: d.upf, max: 40 },
  ];
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 dark:border-stone-800 dark:bg-stone-800/30">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">{F.title}</span>
        <span className="text-[12px] font-bold tabular-nums text-brand-700 dark:text-brand-300">
          {d.total}
          <span className="ml-0.5 text-[10px] font-medium text-stone-400">/100</span>
        </span>
      </div>
      <div className="mt-2 space-y-1.5">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-[10px] font-medium text-stone-500 dark:text-stone-400">
              {b.label}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${Math.round((b.val / b.max) * 100)}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right text-[10px] tabular-nums font-semibold text-stone-600 dark:text-stone-300">
              {b.val}/{b.max}
            </span>
          </div>
        ))}
      </div>
      {(!d.hasMacro || !d.hasUpf) && (
        <p className="mt-2 text-[10px] leading-relaxed text-amber-600 dark:text-amber-400">{F.hintEstimate}</p>
      )}
      {!d.hasTarget && (
        <p className="mt-1 text-[10px] leading-relaxed text-stone-400">{F.hintProfile}</p>
      )}
      <p className="mt-1 text-[10px] leading-relaxed text-stone-400">{F.formulaNote}</p>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl bg-stone-50 px-2 py-2 text-center dark:bg-stone-800/60">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-stone-400">{label}</p>
      <p className="text-sm font-bold tabular-nums text-stone-900 dark:text-stone-100">
        {value}
        <span className="ml-0.5 text-[10px] font-medium text-stone-400">{unit}</span>
      </p>
    </div>
  );
}

// ── 탭3: 자가 진단 ──────────────────────────────────────────────────────────
// 네이버/구글 수준의 일반 건강 정보. 단정 진단 아님 + 필수 경고문 항상 노출.
function SymptomTab({ signedIn, S }: { signedIn: boolean; S: SelfCheckLabels }) {
  const { locale } = useI18n();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [result, setResult] = useState<SymptomAssessment | null>(null);

  async function run() {
    const q = text.trim();
    if (q.length < 2) return;
    setBusy(true);
    setErr(false);
    setResult(null);
    try {
      setResult(await symptomCheck(q, locale));
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) return <LoginPrompt S={S} />;

  const Sy = S.symptom;
  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder={Sy.placeholder}
        className="block w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-brand-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      />
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy || text.trim().length < 2}
        className="w-full rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
      >
        {busy ? Sy.submitting : Sy.submit}
      </button>

      {err && <p className="text-[12px] text-rose-600 dark:text-rose-300">{Sy.error}</p>}
      {!result && !err && (
        <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{Sy.empty}</p>
      )}

      {result && (
        <div className="space-y-2.5">
          <SymptomSection title={Sy.possibleCauses} items={result.possibleCauses} tone="neutral" />
          <SymptomSection title={Sy.selfCare} items={result.selfCare} tone="brand" />
          <SymptomSection title={Sy.seeDoctor} items={result.seeDoctor} tone="warn" />
        </div>
      )}

      {/* 필수 경고문 — 결과 유무와 무관하게 항상 노출 */}
      <div className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900/50 dark:bg-rose-950/30">
        <p className="text-[11px] font-semibold leading-relaxed text-rose-800 dark:text-rose-200">
          ⚠️ {Sy.disclaimer}
        </p>
        <p className="text-[10px] leading-relaxed text-rose-700 dark:text-rose-300">{Sy.emergency}</p>
      </div>
    </div>
  );
}

function SymptomSection({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'neutral' | 'brand' | 'warn';
}) {
  if (!items || items.length === 0) return null;
  const dot =
    tone === 'warn' ? 'bg-rose-500' : tone === 'brand' ? 'bg-brand-500' : 'bg-stone-400';
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {title}
      </p>
      <ul className="mt-1 space-y-1">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px] text-stone-800 dark:text-stone-200">
            <span aria-hidden className={`mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full ${dot}`} />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoginPrompt({ S }: { S: SelfCheckLabels }) {
  return (
    <div className="py-6 text-center">
      <p className="text-[13px] text-stone-600 dark:text-stone-400">{S.loginPrompt}</p>
      <Link
        href="/login"
        className="mt-3 inline-flex rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
      >
        {S.loginCta}
      </Link>
    </div>
  );
}
