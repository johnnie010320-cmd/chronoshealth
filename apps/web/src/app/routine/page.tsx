'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { fileToFoodshotB64 } from '@/lib/foodshot-image';
import {
  estimateCalories,
  estimateFoodshot,
  fetchRoutineToday,
  fetchRoutineRange,
  submitRoutineDaily,
  type CalorieEstimateLine,
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

function parseNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

type FoodRow = { name: string; amount: string };

export default function RoutinePage() {
  const { t, locale } = useI18n();
  const R = t.routine;
  const F = R.food;
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

  useEffect(() => {
    if (!readSession()) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
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
      // 인식 결과로 음식 항목과 칼로리를 자동 채움(최대 10항목).
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
    try {
      const body: RoutineEntry = {
        entryDate: todayIso(),
        caloriesKcal: parseNumberOrNull(form.caloriesKcal),
        exerciseMinutes: parseNumberOrNull(form.exerciseMinutes),
        sleepHours: parseNumberOrNull(form.sleepHours),
        note: form.note.trim() === '' ? null : form.note.trim(),
      };
      await submitRoutineDaily(body);
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
      </section>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
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

          {/* 사진으로 칼로리 추정 — 카메라/갤러리 → AI Vision(foodshot) */}
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
        </section>

        <NumberField
          label={R.fieldCalories.label}
          placeholder={R.fieldCalories.placeholder}
          value={form.caloriesKcal}
          onChange={(v) => setForm((f) => ({ ...f, caloriesKcal: v }))}
        />
        <NumberField
          label={R.fieldExercise.label}
          placeholder={R.fieldExercise.placeholder}
          value={form.exerciseMinutes}
          onChange={(v) => setForm((f) => ({ ...f, exerciseMinutes: v }))}
        />
        <NumberField
          label={R.fieldSleep.label}
          placeholder={R.fieldSleep.placeholder}
          value={form.sleepHours}
          onChange={(v) => setForm((f) => ({ ...f, sleepHours: v }))}
          allowDecimal
        />
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
        <section className="mt-5">
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
