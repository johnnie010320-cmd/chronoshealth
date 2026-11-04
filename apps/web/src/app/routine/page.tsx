'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { loadHealthProfile } from '@/lib/health-profile';
import { fileToFoodshotB64 } from '@/lib/foodshot-image';
import {
  estimateCalories,
  estimateFoodshot,
  fetchRoutineToday,
  fetchRoutineRange,
  submitRoutineDaily,
  type CalorieEstimateLine,
  type ExerciseIntensity,
  type ExerciseType,
  type RoutineEntry,
  type RoutineSummary,
} from '@/lib/api-client';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

type FormState = {
  caloriesKcal: string;
  exerciseMinutes: string;
  sleepHours: string;
  note: string;
};

const EMPTY_FORM: FormState = {
  caloriesKcal: '',
  exerciseMinutes: '',
  sleepHours: '',
  note: '',
};

// 운동 종류 — MET(대사당량) + 백엔드 분류(exerciseType/intensity) 매핑.
type ExKey = 'walk' | 'run' | 'yoga' | 'cycle' | 'strength';
const EXERCISES: { key: ExKey; met: number; cat: ExerciseType; intensity: ExerciseIntensity }[] = [
  { key: 'walk', met: 3.0, cat: 'cardio', intensity: 'low' },
  { key: 'run', met: 8.3, cat: 'cardio', intensity: 'high' },
  { key: 'yoga', met: 2.5, cat: 'both', intensity: 'low' },
  { key: 'cycle', met: 7.0, cat: 'cardio', intensity: 'medium' },
  { key: 'strength', met: 5.0, cat: 'strength', intensity: 'medium' },
];
const DURATIONS = [15, 30, 45, 60, 90];
const REST_KEYS = ['reading', 'pet', 'plant', 'meditation'] as const;
type RestKey = (typeof REST_KEYS)[number];
type RestState = Record<RestKey, { on: boolean; min: string }>;
const EMPTY_REST: RestState = {
  reading: { on: false, min: '' },
  pet: { on: false, min: '' },
  plant: { on: false, min: '' },
  meditation: { on: false, min: '' },
};

function parseNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// 취침~기상(HH:MM) → 수면 시간(시간, 소수 2자리). 자정을 넘어가는 경우 +24h 보정.
function sleepHoursFrom(bed: string, wake: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(bed) || !/^\d{2}:\d{2}$/.test(wake)) return null;
  const bp = bed.split(':');
  const wp = wake.split(':');
  const bh = Number(bp[0]);
  const bm = Number(bp[1]);
  const wh = Number(wp[0]);
  const wm = Number(wp[1]);
  if (![bh, bm, wh, wm].every(Number.isFinite)) return null;
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
}

function hoursToHm(h: number): string {
  const total = Math.round(h * 60);
  return `${Math.floor(total / 60)}시간 ${total % 60}분`;
}

// 오늘의 상세(운동 종류·취침/기상·휴식 활동)는 로컬 보관(백엔드 수치는 별도 저장).
const DETAIL_KEY = 'chronos.routineDetail';
type StoredDetail = {
  pseudonymId: string;
  date: string;
  exKey: ExKey | null;
  bed: string;
  wake: string;
  rest: RestState;
};
function loadDetail(date: string): Partial<StoredDetail> | null {
  if (typeof window === 'undefined') return null;
  const session = readSession();
  if (!session) return null;
  try {
    const raw = window.localStorage.getItem(`${DETAIL_KEY}.${date}`);
    if (!raw) return null;
    const p = JSON.parse(raw) as StoredDetail;
    if (p.pseudonymId !== session.userPseudonymId || p.date !== date) return null;
    return p;
  } catch {
    return null;
  }
}
function saveDetail(date: string, detail: Omit<StoredDetail, 'pseudonymId' | 'date'>): void {
  if (typeof window === 'undefined') return;
  const session = readSession();
  if (!session) return;
  window.localStorage.setItem(
    `${DETAIL_KEY}.${date}`,
    JSON.stringify({ ...detail, pseudonymId: session.userPseudonymId, date }),
  );
}

type FoodRow = { name: string; amount: string };

export default function RoutinePage() {
  const { t, locale } = useI18n();
  const R = t.routine;
  const F = R.food;
  const EX = R.exercise;
  const RS = R.rest;
  const ST = R.sectionTitles;
  const [signedIn, setSignedIn] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [entries, setEntries] = useState<RoutineEntry[]>([]);
  const [summary, setSummary] = useState<RoutineSummary | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'err'>('idle');
  const [errCode, setErrCode] = useState<string | null>(null);
  const [foodRows, setFoodRows] = useState<FoodRow[]>([{ name: '', amount: '' }]);
  const [estimating, setEstimating] = useState(false);
  const [estimateLines, setEstimateLines] = useState<CalorieEstimateLine[] | null>(null);
  const [estimateErr, setEstimateErr] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [photoApplied, setPhotoApplied] = useState(false);
  // 운동/휴식 상세
  const [exKey, setExKey] = useState<ExKey | null>(null);
  const [bed, setBed] = useState('');
  const [wake, setWake] = useState('');
  const [rest, setRest] = useState<RestState>(EMPTY_REST);
  const [weightKg] = useState<number>(() => loadHealthProfile()?.weightKg ?? 65);

  useEffect(() => {
    if (!readSession()) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    const detail = loadDetail(todayIso());
    if (detail) {
      if (detail.exKey) setExKey(detail.exKey);
      if (detail.bed) setBed(detail.bed);
      if (detail.wake) setWake(detail.wake);
      if (detail.rest) setRest({ ...EMPTY_REST, ...detail.rest });
    }
    void Promise.all([
      fetchRoutineToday().catch(() => null),
      fetchRoutineRange(daysAgoIso(6), todayIso()).catch(() => null),
    ]).then(([today, range]) => {
      if (today?.entry) {
        setForm({
          caloriesKcal: today.entry.caloriesKcal != null ? String(today.entry.caloriesKcal) : '',
          exerciseMinutes:
            today.entry.exerciseMinutes != null ? String(today.entry.exerciseMinutes) : '',
          sleepHours: today.entry.sleepHours != null ? String(today.entry.sleepHours) : '',
          note: today.entry.note ?? '',
        });
      }
      if (range) {
        setEntries(range.entries);
        setSummary(range.summary);
      }
    });
  }, []);

  // 취침/기상이 모두 입력되면 수면 시간 자동 반영.
  const sleepFromTimes = useMemo(() => sleepHoursFrom(bed, wake), [bed, wake]);
  useEffect(() => {
    if (sleepFromTimes != null) {
      setForm((f) => ({ ...f, sleepHours: String(sleepFromTimes) }));
    }
  }, [sleepFromTimes]);

  const exMin = parseNumberOrNull(form.exerciseMinutes);
  const burnKcal = useMemo(() => {
    const ex = EXERCISES.find((e) => e.key === exKey);
    if (!ex || !exMin || exMin <= 0) return null;
    return Math.round(ex.met * weightKg * (exMin / 60));
  }, [exKey, exMin, weightKg]);

  const maxBar = useMemo(() => {
    if (entries.length === 0) return { calories: 1, exercise: 1, sleep: 1 };
    let cal = 0;
    let ex = 0;
    let sl = 0;
    for (const e of entries) {
      if ((e.caloriesKcal ?? 0) > cal) cal = e.caloriesKcal ?? 0;
      if ((e.exerciseMinutes ?? 0) > ex) ex = e.exerciseMinutes ?? 0;
      if ((e.sleepHours ?? 0) > sl) sl = e.sleepHours ?? 0;
    }
    return { calories: cal || 1, exercise: ex || 1, sleep: sl || 1 };
  }, [entries]);

  if (!signedIn) {
    return (
      <AppShell title={R.pageTitle} decoration="dots">
        <LoginRequired />
      </AppShell>
    );
  }

  function pickExercise(key: ExKey) {
    setExKey((cur) => (cur === key ? null : key));
  }
  function pickDuration(min: number) {
    setForm((f) => ({ ...f, exerciseMinutes: String(min) }));
  }

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
      setForm((f) => ({ ...f, caloriesKcal: String(res.totalCalories) }));
    } catch (err) {
      setEstimateErr(err instanceof Error ? err.message : 'generic');
    } finally {
      setEstimating(false);
    }
  }

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
      setFoodRows(
        res.estimatedItems.slice(0, 10).map((it) => ({ name: it.name, amount: it.amount })),
      );
      setEstimateLines(
        res.estimatedItems.map((it) => ({
          name: it.name,
          amount: it.amount,
          calories: it.calories,
        })),
      );
      setForm((f) => ({ ...f, caloriesKcal: String(res.totalCalories) }));
      setPhotoApplied(true);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'errPhoto';
      setPhotoErr(code in R.error ? code : 'errPhoto');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setErrCode(null);
    const ex = EXERCISES.find((x) => x.key === exKey);
    try {
      const body: RoutineEntry = {
        entryDate: todayIso(),
        caloriesKcal: parseNumberOrNull(form.caloriesKcal),
        exerciseMinutes: parseNumberOrNull(form.exerciseMinutes),
        exerciseType: ex ? ex.cat : null,
        exerciseIntensity: ex ? ex.intensity : null,
        sleepHours: parseNumberOrNull(form.sleepHours),
        note: form.note.trim() === '' ? null : form.note.trim(),
      };
      await submitRoutineDaily(body);
      // 운동 종류/취침·기상/휴식 활동 상세는 로컬에 보관.
      saveDetail(todayIso(), { exKey, bed, wake, rest });
      const range = await fetchRoutineRange(daysAgoIso(6), todayIso());
      setEntries(range.entries);
      setSummary(range.summary);
      setStatus('saved');
    } catch (err) {
      const code = err instanceof Error ? err.message : 'generic';
      setErrCode(code);
      setStatus('err');
    }
  }

  function scrollToHistory() {
    if (typeof document !== 'undefined') {
      document.getElementById('routine-weekly')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const caloriesNum = parseNumberOrNull(form.caloriesKcal);
  const sleepNum = parseNumberOrNull(form.sleepHours);

  return (
    <AppShell title={R.pageTitle} decoration="dots">
      <section className="card-shadow mt-4 rounded-3xl bg-gradient-to-br from-brand-700 via-teal-600 to-emerald-500 px-6 py-6 text-white">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-90">
          {R.eyebrow}
        </p>
        <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight">{R.title}</h1>
        <p className="mt-1 text-[12px] text-white/80">
          {R.todayLabel}: {todayIso()}
        </p>
        {/* 오늘 요약 — 현재 입력값 기준 */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <HeroStat label={R.barLabels.calories} value={caloriesNum != null ? `${caloriesNum}` : '—'} unit={R.unitCal} />
          <HeroStat
            label={R.barLabels.exercise}
            value={burnKcal != null ? `~${burnKcal}` : exMin != null ? `${exMin}` : '—'}
            unit={burnKcal != null ? R.unitCal : R.unitMin}
          />
          <HeroStat label={R.barLabels.sleep} value={sleepNum != null ? `${sleepNum}` : '—'} unit={R.unitHr} />
        </div>
      </section>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        {/* ── 1. 식사 ─────────────────────────────────────────── */}
        <SectionTitle title={ST.food} tone="text-emerald-600 dark:text-emerald-400" />
        <section className="card-shadow space-y-2 rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
              {F.sectionTitle}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
              {F.aiBadge}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
            {F.sectionHint}
          </p>

          {/* 사진으로 칼로리 추정 */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 px-3 py-2.5 dark:border-stone-800 dark:bg-stone-800/30">
            <p className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
              {F.photoTitle}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">
              {F.photoHint}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label
                className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[12px] font-semibold text-stone-700 transition active:scale-[0.97] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 ${
                  photoBusy ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
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
                className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[12px] font-semibold text-stone-700 transition active:scale-[0.97] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 ${
                  photoBusy ? 'pointer-events-none opacity-60' : ''
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
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
                {R.error[photoErr as keyof typeof R.error] ?? F.errPhoto}
              </p>
            )}
          </div>

          <ul className="space-y-2">
            {foodRows.map((row, idx) => (
              <li key={idx} className="grid grid-cols-[1fr_auto_28px] items-center gap-2">
                <input
                  type="text"
                  value={row.name}
                  placeholder={F.namePlaceholder}
                  maxLength={80}
                  onChange={(e) =>
                    setFoodRows((prev) => prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
                  }
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
                />
                <input
                  type="text"
                  value={row.amount}
                  placeholder={F.amountPlaceholder}
                  maxLength={60}
                  onChange={(e) =>
                    setFoodRows((prev) => prev.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)))
                  }
                  className="w-24 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
                />
                <button
                  type="button"
                  aria-label={F.removeRow}
                  onClick={() => setFoodRows((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={foodRows.length === 1}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 disabled:opacity-30 dark:hover:bg-stone-800"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() =>
                setFoodRows((prev) => (prev.length >= 10 ? prev : [...prev, { name: '', amount: '' }]))
              }
              disabled={foodRows.length >= 10}
              className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-stone-700 transition active:scale-[0.97] disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
            >
              {F.addRow}
            </button>
            <button
              type="button"
              onClick={handleEstimate}
              disabled={
                estimating || foodRows.every((r) => r.name.trim() === '' || r.amount.trim() === '')
              }
              className="rounded-xl bg-brand-700 px-3 py-1.5 text-[12px] font-semibold text-white transition active:scale-[0.97] disabled:opacity-60"
            >
              {estimating ? F.estimating : F.estimateCta}
            </button>
          </div>

          {estimateErr && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
              {R.error[estimateErr as keyof typeof R.error] ?? F.errEstimate}
            </div>
          )}

          {estimateLines && estimateLines.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-[12px] text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              <p className="font-semibold">
                {F.estimateResultPrefix} {estimateLines.reduce((s, l) => s + l.calories, 0)} {R.unitCal}
              </p>
              <ul className="mt-1 space-y-0.5">
                {estimateLines.map((line, i) => (
                  <li key={i} className="flex items-center justify-between text-[11px]">
                    <span className="truncate">
                      {line.name} · {line.amount}
                    </span>
                    <span className="tabular-nums font-semibold">
                      {line.calories} {R.unitCal}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[10px] opacity-70">{F.estimateNote}</p>
            </div>
          )}

          <NumberField
            label={R.fieldCalories.label}
            placeholder={R.fieldCalories.placeholder}
            value={form.caloriesKcal}
            onChange={(v) => setForm((f) => ({ ...f, caloriesKcal: v }))}
          />
        </section>

        {/* ── 2. 운동 ─────────────────────────────────────────── */}
        <SectionTitle title={ST.exercise} tone="text-sky-600 dark:text-sky-400" />
        <section className="card-shadow space-y-3 rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
          <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
            {EX.sectionHint}
          </p>
          <div>
            <p className="mb-1.5 text-[11px] font-bold text-stone-600 dark:text-stone-300">
              {EX.typeTitle}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {EXERCISES.map((e) => (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => pickExercise(e.key)}
                  className={`rounded-xl border px-3 py-2 text-[12px] font-semibold transition active:scale-[0.97] ${
                    exKey === e.key
                      ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-200'
                      : 'border-stone-200 bg-white text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200'
                  }`}
                >
                  {EX.types[e.key]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-bold text-stone-600 dark:text-stone-300">
              {EX.timeTitle}
            </p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => pickDuration(d)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.97] ${
                    exMin === d
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-stone-200 bg-white text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200'
                  }`}
                >
                  {d}
                  {R.unitMin}
                </button>
              ))}
            </div>
          </div>

          {burnKcal != null && exKey && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2.5 text-[12.5px] text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
              <span className="font-bold">{EX.resultPrefix}:</span> {EX.types[exKey]} ({exMin}
              {R.unitMin}) → {EX.burnPrefix} <span className="font-extrabold">{burnKcal}</span>{' '}
              {EX.burnSuffix}
            </div>
          )}

          <NumberField
            label={EX.manualLabel}
            placeholder={R.fieldExercise.placeholder}
            value={form.exerciseMinutes}
            onChange={(v) => setForm((f) => ({ ...f, exerciseMinutes: v }))}
          />

          <button
            type="button"
            onClick={scrollToHistory}
            className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-sky-300 bg-white px-3 py-2 text-[12px] font-semibold text-sky-700 transition active:scale-[0.97] dark:border-sky-800 dark:bg-stone-900 dark:text-sky-300"
          >
            {EX.historyCta}
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
        </section>

        {/* ── 3. 휴식 (수면) ──────────────────────────────────── */}
        <SectionTitle title={ST.rest} tone="text-violet-600 dark:text-violet-400" />
        <section className="card-shadow space-y-3 rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
          <div>
            <p className="mb-1.5 text-[11px] font-bold text-stone-600 dark:text-stone-300">
              {RS.sleepTitle}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <TimeField label={RS.bedLabel} value={bed} onChange={setBed} />
              <TimeField label={RS.wakeLabel} value={wake} onChange={setWake} />
            </div>
            {sleepFromTimes != null && (
              <p className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-[12px] font-semibold text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
                {RS.summaryPrefix}: {bed} ~ {wake} ({hoursToHm(sleepFromTimes)})
              </p>
            )}
            <div className="mt-2">
              <NumberField
                label={R.fieldSleep.label}
                placeholder={R.fieldSleep.placeholder}
                value={form.sleepHours}
                onChange={(v) => setForm((f) => ({ ...f, sleepHours: v }))}
                allowDecimal
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
              {RS.activitiesTitle}
            </p>
            <p className="mb-1.5 text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">
              {RS.activitiesHint}
            </p>
            <div className="space-y-2">
              {REST_KEYS.map((k) => (
                <div
                  key={k}
                  className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900"
                >
                  <button
                    type="button"
                    onClick={() => setRest((r) => ({ ...r, [k]: { ...r[k], on: !r[k].on } }))}
                    className="flex items-center gap-2"
                    aria-pressed={rest[k].on}
                  >
                    <span
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                        rest[k].on ? 'bg-violet-500' : 'bg-stone-300 dark:bg-stone-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                          rest[k].on ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                    <span className="text-[12.5px] font-semibold text-stone-800 dark:text-stone-200">
                      {RS.activities[k]}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={rest[k].min}
                      disabled={!rest[k].on}
                      onChange={(e) =>
                        setRest((r) => ({ ...r, [k]: { ...r[k], min: e.target.value.replace(/[^0-9]/g, '') } }))
                      }
                      placeholder="0"
                      maxLength={3}
                      className="w-14 rounded-lg border border-stone-200 bg-white px-2 py-1 text-right text-[12px] text-stone-900 disabled:opacity-40 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
                    />
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">{RS.minutesUnit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 메모 */}
        <TextField
          label={R.fieldNote.label}
          placeholder={R.fieldNote.placeholder}
          value={form.note}
          maxLength={280}
          onChange={(v) => setForm((f) => ({ ...f, note: v }))}
        />

        <button
          type="submit"
          disabled={status === 'saving'}
          className="inline-flex w-full items-center justify-between rounded-2xl bg-stone-900 px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
        >
          <span>{status === 'saving' ? R.submitting : R.submit}</span>
          <ChevronRightIcon className="h-5 w-5" />
        </button>

        {status === 'saved' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            {R.saved}
          </div>
        )}
        {status === 'err' && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            {R.error[errCode as keyof typeof R.error] ?? R.error.generic}
          </div>
        )}
      </form>

      {summary && (
        <section id="routine-weekly" className="mt-5 scroll-mt-20">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {R.weeklyTitle}
            </h2>
            <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">
              {R.weeklyEyebrow} · {R.streakLabel} {summary.streakDays}
              {R.streakUnit}
            </span>
          </div>

          <div className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
            <BarRow
              label={R.barLabels.calories}
              unit={R.unitCal}
              entries={entries}
              maxValue={maxBar.calories}
              getValue={(e) => e.caloriesKcal}
            />
            <BarRow
              label={R.barLabels.exercise}
              unit={R.unitMin}
              entries={entries}
              maxValue={maxBar.exercise}
              getValue={(e) => e.exerciseMinutes}
              className="mt-3"
            />
            <BarRow
              label={R.barLabels.sleep}
              unit={R.unitHr}
              entries={entries}
              maxValue={maxBar.sleep}
              getValue={(e) => e.sleepHours}
              className="mt-3"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatBox
              label={`${R.totalsLabel} · ${R.barLabels.calories}`}
              value={`${summary.totals.calories} ${R.unitCal}`}
            />
            <StatBox
              label={`${R.totalsLabel} · ${R.barLabels.exercise}`}
              value={`${summary.totals.exerciseMinutes} ${R.unitMin}`}
            />
            <StatBox
              label={`${R.averagesLabel} · ${R.barLabels.sleep}`}
              value={`${summary.averages.sleepHours} ${R.unitHr}`}
            />
            <StatBox
              label={`${R.averagesLabel} · ${R.barLabels.calories}`}
              value={`${summary.averages.calories} ${R.unitCal}`}
            />
          </div>
        </section>
      )}

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {R.disclaimer}
      </div>

      <div className="mt-3 flex justify-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 dark:text-brand-300"
        >
          <span>{R.backToHome}</span>
          <ChevronRightIcon className="h-3 w-3" />
        </Link>
      </div>
    </AppShell>
  );
}

function SectionTitle({ title, tone }: { title: string; tone: string }) {
  return (
    <h2 className={`px-1 pt-1 text-[15px] font-extrabold ${tone}`}>{title}</h2>
  );
}

function HeroStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-3 py-2 text-center backdrop-blur">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-white/75">{label}</p>
      <p className="mt-0.5 text-[15px] font-extrabold leading-none">
        {value}
        <span className="ml-0.5 text-[10px] font-semibold text-white/80">{unit}</span>
      </p>
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-brand-500 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
      />
    </label>
  );
}

function NumberField({
  label,
  placeholder,
  value,
  onChange,
  allowDecimal,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  allowDecimal?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
        {label}
      </span>
      <input
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
      />
    </label>
  );
}

function TextField({
  label,
  placeholder,
  value,
  maxLength,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  maxLength: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
        {label}
      </span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
      />
    </label>
  );
}

function BarRow({
  label,
  unit,
  entries,
  maxValue,
  getValue,
  className,
}: {
  label: string;
  unit: string;
  entries: RoutineEntry[];
  maxValue: number;
  getValue: (e: RoutineEntry) => number | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        <span>{label}</span>
        <span>{unit}</span>
      </div>
      <div className="mt-1 grid grid-cols-7 items-end gap-1">
        {fill7Days(entries).map((entry, idx) => {
          const v = entry ? getValue(entry) : null;
          const ratio = v != null && maxValue > 0 ? v / maxValue : 0;
          const h = Math.max(4, ratio * 56);
          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              <span
                className={`block w-full rounded-md ${
                  v != null
                    ? 'bg-gradient-to-t from-brand-600 to-teal-400'
                    : 'bg-stone-100 dark:bg-stone-800'
                }`}
                style={{ height: `${h}px` }}
                aria-label={v != null ? `${v}` : 'no-data'}
              />
              <span className="text-[9px] font-medium text-stone-500 dark:text-stone-400">
                {dayShort(idx)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fill7Days(entries: RoutineEntry[]): (RoutineEntry | null)[] {
  const out: (RoutineEntry | null)[] = [];
  const byDate = new Map(entries.map((e) => [e.entryDate, e]));
  for (let i = 6; i >= 0; i -= 1) {
    out.push(byDate.get(daysAgoIso(i)) ?? null);
  }
  return out;
}

function dayShort(idx: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (6 - idx));
  return String(d.getUTCDate());
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-shadow flex flex-col gap-0.5 rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {label}
      </span>
      <span className="text-base font-bold tracking-tight text-stone-900 dark:text-stone-100">
        {value}
      </span>
    </div>
  );
}
