'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ComingSoon } from '@/components/ComingSoon';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  fetchRoutineToday,
  fetchRoutineRange,
  submitRoutineDaily,
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

export default function RoutinePage() {
  const { t } = useI18n();
  const R = t.routine;
  const [signedIn, setSignedIn] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [entries, setEntries] = useState<RoutineEntry[]>([]);
  const [summary, setSummary] = useState<RoutineSummary | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'err'>('idle');
  const [errCode, setErrCode] = useState<string | null>(null);

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
        <ComingSoon customBody={t.userMenu.loginUnavailable} />
      </AppShell>
    );
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
