'use client';

// 나의 건강 일기 — 날짜별로 루틴(음식·운동·수면)·컨디션·AI 처방(식단·운동·휴식)을 모아 조회.
// 데이터: routineRange + diary(mood) + prescriptionHistory 를 날짜로 병합.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  fetchRoutineRange,
  fetchDiary,
  fetchPrescriptionHistory,
  type RoutineEntry,
  type AiPrescription,
  type DiaryMood,
} from '@/lib/api-client';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const MOOD_EMOJI: Record<DiaryMood, string> = {
  great: '😄',
  good: '🙂',
  soso: '😐',
  tired: '😪',
  bad: '😣',
};

type DayLog = {
  date: string;
  routine: RoutineEntry | null;
  mood: DiaryMood | null;
  prescription: AiPrescription | null;
};

export default function HealthDiaryPage() {
  const { t } = useI18n();
  const D = t.healthDiary;
  const S = t.home.selfCheck;
  const [status, setStatus] = useState<'loading' | 'unauth' | 'ok'>('loading');
  const [days, setDays] = useState<DayLog[]>([]);

  useEffect(() => {
    if (!readSession()) {
      setStatus('unauth');
      return;
    }
    const from = daysAgoIso(29);
    const to = todayIso();
    (async () => {
      const entries = await fetchRoutineRange(from, to)
        .then((r) => r.entries)
        .catch(() => [] as RoutineEntry[]);
      const diary = await fetchDiary().catch(() => []);
      const rx = await fetchPrescriptionHistory(from, to).catch(() => []);

      const map = new Map<string, DayLog>();
      const ensure = (date: string): DayLog => {
        let cur = map.get(date);
        if (!cur) {
          cur = { date, routine: null, mood: null, prescription: null };
          map.set(date, cur);
        }
        return cur;
      };
      for (const e of entries) ensure(e.entryDate).routine = e;
      for (const d of diary) ensure(d.entryDate).mood = d.mood;
      for (const p of rx) ensure(p.entryDate).prescription = p.prescription;

      setDays([...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1)));
      setStatus('ok');
    })();
  }, []);

  return (
    <AppShell title={D.pageTitle} showBack backHref="/">
      {status === 'unauth' && <LoginRequired />}

      {status === 'loading' && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {status === 'ok' && (
        <div className="space-y-3 pb-10 pt-2">
          <p className="px-1 text-[11px] text-stone-400">{D.rangeNote}</p>
          {days.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 text-center text-[13px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
              {D.empty}
            </div>
          ) : (
            days.map((d) => (
              <section
                key={d.date}
                className="card-shadow rounded-2xl bg-white p-4 dark:bg-stone-900"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">{d.date}</h2>
                  {d.mood && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                      <span className="text-base leading-none">{MOOD_EMOJI[d.mood]}</span>
                      {S.mood[d.mood]}
                    </span>
                  )}
                </div>

                {/* 루틴 */}
                <div className="mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                    {D.routineLabel}
                  </p>
                  {d.routine &&
                  (d.routine.exerciseMinutes != null ||
                    d.routine.sleepHours != null ||
                    d.routine.caloriesKcal != null ||
                    (d.routine.note ?? '') !== '') ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {d.routine.caloriesKcal != null && (
                        <Chip label={`${D.caloriesLabel} ${d.routine.caloriesKcal}kcal`} />
                      )}
                      {d.routine.exerciseMinutes != null && (
                        <Chip
                          label={`${S.exerciseLabel} ${d.routine.exerciseMinutes}${S.exerciseUnit}${
                            d.routine.exerciseIntensity ? ` · ${S.intensity[d.routine.exerciseIntensity]}` : ''
                          }`}
                        />
                      )}
                      {d.routine.sleepHours != null && (
                        <Chip label={`${S.sleepLabel} ${d.routine.sleepHours}${S.sleepUnit}`} />
                      )}
                      {d.routine.note && <Chip label={d.routine.note} />}
                    </div>
                  ) : (
                    <p className="mt-0.5 text-[12px] text-stone-400">{D.noRoutine}</p>
                  )}
                </div>

                {/* AI 처방 */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                    {D.prescriptionLabel}
                  </p>
                  {d.prescription ? (
                    <div className="mt-1 space-y-1.5">
                      {d.prescription.summary && (
                        <p className="text-[12px] leading-relaxed text-stone-700 dark:text-stone-200">
                          {d.prescription.summary}
                        </p>
                      )}
                      <RxLine title={D.dietLabel} items={d.prescription.diet} />
                      <RxLine title={D.exerciseLabel} items={d.prescription.exercise} />
                      <RxLine title={D.restLabel} items={d.prescription.rest} />
                    </div>
                  ) : (
                    <p className="mt-0.5 text-[12px] text-stone-400">{D.noPrescription}</p>
                  )}
                </div>
              </section>
            ))
          )}

          <Link
            href="/care"
            className="mt-2 block rounded-2xl bg-stone-900 px-4 py-3 text-center text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
          >
            {t.care.prescription.requestCta}
          </Link>
        </div>
      )}
    </AppShell>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-700 dark:bg-stone-800 dark:text-stone-200">
      <span className="truncate">{label}</span>
    </span>
  );
}

function RxLine({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold text-brand-700 dark:text-brand-300">{title}</p>
      <ul className="mt-0.5 space-y-0.5">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[12px] text-stone-700 dark:text-stone-200">
            <span aria-hidden className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-brand-500" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
