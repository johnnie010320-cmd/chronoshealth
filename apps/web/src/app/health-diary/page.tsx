'use client';

// 나의 건강 일기 — 날짜별로 루틴(음식·운동·수면)·컨디션·AI 처방(식단·운동·휴식)을 모아 조회.
// 데이터: routineRange + diary(mood) + prescriptionHistory 를 날짜로 병합.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { DiaryAttachments } from '@/components/DiaryAttachments';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { fetchHolidays, type HolidayMap } from '@/lib/holidays';
import {
  fetchRoutineRange,
  fetchDiary,
  fetchPrescriptionHistory,
  submitRoutineDaily,
  deleteRoutineEntry,
  estimateCalories,
  type RoutineEntry,
  type AiPrescription,
  type DiaryMood,
  type ExerciseIntensity,
  type ExerciseType,
  type UpfTier,
  type FoodItem,
} from '@/lib/api-client';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
// 'YYYY-MM' 의 1일/말일 ISO.
function monthFirst(ym: string): string {
  return `${ym}-01`;
}
function monthLast(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y ?? 2026, m ?? 1, 0)).getUTCDate();
  return `${ym}-${pad2(last)}`;
}
function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}
function currentYm(): string {
  return todayIso().slice(0, 7);
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

type EditNutri = {
  proteinG: number | null;
  carbG: number | null;
  fatG: number | null;
  upfTier: UpfTier | null;
};

export default function HealthDiaryPage() {
  const { t, locale } = useI18n();
  const D = t.healthDiary;
  const S = t.home.selfCheck;
  const [status, setStatus] = useState<'loading' | 'unauth' | 'ok'>('loading');
  const [days, setDays] = useState<DayLog[]>([]);
  const [monthYm, setMonthYm] = useState<string>(() => currentYm());
  const [selectedDate, setSelectedDate] = useState<string>(() => todayIso());
  const [holidays, setHolidays] = useState<HolidayMap>({});
  const loadedYears = useRef<Set<number>>(new Set());

  // 공휴일(한국·미국) 연도별 로드 — 달력 연도 바뀔 때.
  useEffect(() => {
    const year = Number(monthYm.slice(0, 4));
    if (!Number.isFinite(year) || loadedYears.current.has(year)) return;
    loadedYears.current.add(year);
    void fetchHolidays(year).then((m) => setHolidays((prev) => ({ ...prev, ...m })));
  }, [monthYm]);

  // 편집/삭제 — 수정은 upsert(POST /daily) 재사용, 삭제는 DELETE. 모두 DB에 반영되어
  // 건강 그래프·점수 등은 각 화면 재조회 시 자동으로 수정된 데이터를 사용(단일 진실원천).
  const [editDate, setEditDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState<'empty' | 'save' | null>(null);
  const [form, setForm] = useState<{
    calories: string;
    exercise: string;
    intensity: '' | ExerciseIntensity;
    exType: '' | ExerciseType;
    stretch: '' | 'yes' | 'no';
    sleep: string;
    note: string;
  }>({ calories: '', exercise: '', intensity: '', exType: '', stretch: '', sleep: '', note: '' });
  // 음식 항목 편집 상태. editNutri=null 이면 기존 매크로 보존, 재계산 시 갱신값 사용.
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [editNutri, setEditNutri] = useState<EditNutri | null>(null);
  const [recalcBusy, setRecalcBusy] = useState(false);
  const [recalcErr, setRecalcErr] = useState(false);

  function startEdit(d: DayLog) {
    const r = d.routine;
    setRowError(null);
    setRecalcErr(false);
    setEditNutri(null);
    setFoods(r?.foodItems ? r.foodItems.map((it) => ({ ...it })) : []);
    setForm({
      calories: r?.caloriesKcal != null ? String(r.caloriesKcal) : '',
      exercise: r?.exerciseMinutes != null ? String(r.exerciseMinutes) : '',
      intensity: r?.exerciseIntensity ?? '',
      exType: r?.exerciseType ?? '',
      stretch: r?.didStretch == null ? '' : r.didStretch ? 'yes' : 'no',
      sleep: r?.sleepHours != null ? String(r.sleepHours) : '',
      note: r?.note ?? '',
    });
    setEditDate(d.date);
  }

  async function recalcCalories() {
    const clean = foods
      .map((f) => ({ name: f.name.trim(), amount: f.amount.trim() }))
      .filter((f) => f.name !== '' && f.amount !== '');
    if (clean.length === 0) return;
    setRecalcBusy(true);
    setRecalcErr(false);
    try {
      const res = await estimateCalories(clean, locale);
      setFoods(
        res.breakdown.map((l) => ({ name: l.name, amount: l.amount, calories: l.calories })),
      );
      setForm((s) => ({ ...s, calories: String(res.totalCalories) }));
      setEditNutri(aggregateNutri(res.breakdown));
    } catch {
      setRecalcErr(true);
    } finally {
      setRecalcBusy(false);
    }
  }

  function cancelEdit() {
    setEditDate(null);
    setRowError(null);
  }

  async function saveEdit(d: DayLog) {
    const numOrNull = (s: string): number | null => {
      const v = s.trim();
      if (v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const calories = numOrNull(form.calories);
    const exercise = numOrNull(form.exercise);
    const sleep = numOrNull(form.sleep);
    const note = form.note.trim() === '' ? null : form.note.trim();
    const cleanFoods = foods
      .map((f) => ({ name: f.name.trim(), amount: f.amount.trim(), calories: f.calories }))
      .filter((f) => f.name !== '');
    if (
      calories == null &&
      exercise == null &&
      sleep == null &&
      note == null &&
      cleanFoods.length === 0
    ) {
      setRowError('empty');
      return;
    }
    setBusy(true);
    setRowError(null);
    try {
      const prev = d.routine;
      const body: RoutineEntry = {
        entryDate: d.date,
        caloriesKcal: calories == null ? null : Math.round(calories),
        exerciseMinutes: exercise == null ? null : Math.round(exercise),
        exerciseIntensity: form.intensity === '' ? null : form.intensity,
        exerciseType: form.exType === '' ? null : form.exType,
        didStretch: form.stretch === '' ? null : form.stretch === 'yes',
        sleepHours: sleep,
        note,
        foodItems: cleanFoods.length > 0 ? cleanFoods : null,
        // 매크로·UPF: 재계산했으면 갱신값, 아니면 기존값 보존(유실 방지).
        proteinG: editNutri ? editNutri.proteinG : prev?.proteinG ?? null,
        carbG: editNutri ? editNutri.carbG : prev?.carbG ?? null,
        fatG: editNutri ? editNutri.fatG : prev?.fatG ?? null,
        upfTier: editNutri ? editNutri.upfTier : prev?.upfTier ?? null,
      };
      const { entry } = await submitRoutineDaily(body);
      setDays((ds) => {
        const next = ds.some((x) => x.date === d.date)
          ? ds.map((x) => (x.date === d.date ? { ...x, routine: entry ?? body } : x))
          : [...ds, { date: d.date, routine: entry ?? body, mood: null, prescription: null }];
        return next.sort((a, b) => (a.date < b.date ? 1 : -1));
      });
      setEditDate(null);
    } catch {
      setRowError('save');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(d: DayLog) {
    if (typeof window !== 'undefined' && !window.confirm(D.confirmDelete)) return;
    setBusy(true);
    try {
      await deleteRoutineEntry(d.date);
      setDays((ds) =>
        ds
          .map((x) => (x.date === d.date ? { ...x, routine: null } : x))
          .filter((x) => x.routine || x.mood || x.prescription),
      );
      if (editDate === d.date) setEditDate(null);
    } catch {
      if (typeof window !== 'undefined') window.alert(D.deleteError);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!readSession()) {
      setStatus('unauth');
      return;
    }
    const from = monthFirst(monthYm);
    const to = monthLast(monthYm);
    let active = true;
    (async () => {
      const entries = await fetchRoutineRange(from, to)
        .then((r) => r.entries)
        .catch(() => [] as RoutineEntry[]);
      const diary = await fetchDiary().catch(() => []);
      const rx = await fetchPrescriptionHistory(from, to).catch(() => []);
      if (!active) return;

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
      // 다이어리(mood)는 전체 반환이라 이 달 범위만 반영.
      for (const d of diary) if (d.entryDate >= from && d.entryDate <= to) ensure(d.entryDate).mood = d.mood;
      for (const p of rx) ensure(p.entryDate).prescription = p.prescription;

      setDays([...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1)));
      setStatus('ok');
    })();
    return () => {
      active = false;
    };
  }, [monthYm]);

  // 날짜 → DayLog 조회(내용 유무 판정·상세용).
  const dayMap = useMemo(() => {
    const m = new Map<string, DayLog>();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  function hasContent(d: DayLog | undefined): boolean {
    return !!d && (!!d.routine || !!d.mood || !!d.prescription);
  }

  // 선택일 상세(없으면 빈 DayLog — 첨부 추가 가능하도록).
  const selected: DayLog =
    dayMap.get(selectedDate) ?? { date: selectedDate, routine: null, mood: null, prescription: null };

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
          <Calendar
            monthYm={monthYm}
            selectedDate={selectedDate}
            today={todayIso()}
            weekdays={D.calWeekdays}
            hasContent={(date) => hasContent(dayMap.get(date))}
            holidayName={(date) => holidays[date]}
            onSelect={setSelectedDate}
            onPrev={() => setMonthYm((m) => shiftMonth(m, -1))}
            onNext={() => setMonthYm((m) => shiftMonth(m, 1))}
          />
          {[selected].map((d) => (
              <section
                key={d.date}
                className="card-shadow rounded-2xl card-amber p-4"
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
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                      {D.routineLabel}
                    </p>
                    {editDate !== d.date && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(d)}
                          disabled={busy}
                          className="rounded-lg px-2 py-0.5 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50 dark:text-brand-300 dark:hover:bg-brand-900/30"
                        >
                          {D.editCta}
                        </button>
                        {d.routine && (
                          <button
                            type="button"
                            onClick={() => void handleDelete(d)}
                            disabled={busy}
                            className="rounded-lg px-2 py-0.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                          >
                            {D.deleteCta}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {editDate === d.date ? (
                    <div className="mt-2 space-y-2">
                      <div>
                        <p className="mb-1 text-[10px] font-semibold text-stone-400">
                          {D.foodItemsLabel}
                        </p>
                        <div className="space-y-1.5">
                          {foods.map((it, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <DiaryInput
                                placeholder={D.foodNamePh}
                                value={it.name}
                                maxLength={120}
                                onChange={(v) =>
                                  setFoods((fs) =>
                                    fs.map((f, idx) => (idx === i ? { ...f, name: v } : f)),
                                  )
                                }
                              />
                              <input
                                type="text"
                                value={it.amount}
                                placeholder={D.foodAmountPh}
                                maxLength={60}
                                onChange={(e) =>
                                  setFoods((fs) =>
                                    fs.map((f, idx) =>
                                      idx === i ? { ...f, amount: e.target.value } : f,
                                    ),
                                  )
                                }
                                className="w-28 shrink-0 rounded-xl border border-stone-200 bg-white px-2 py-2 text-[13px] text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
                              />
                              <button
                                type="button"
                                onClick={() => setFoods((fs) => fs.filter((_, idx) => idx !== i))}
                                aria-label={D.removeFood}
                                className="shrink-0 px-1.5 text-stone-400 hover:text-rose-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFoods((fs) => [...fs, { name: '', amount: '', calories: null }])
                            }
                            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30"
                          >
                            {D.addFood}
                          </button>
                          <button
                            type="button"
                            onClick={() => void recalcCalories()}
                            disabled={recalcBusy || foods.every((f) => f.name.trim() === '' || f.amount.trim() === '')}
                            className="rounded-lg border border-stone-300 px-2 py-1 text-[11px] font-semibold text-stone-700 disabled:opacity-50 dark:border-stone-700 dark:text-stone-200"
                          >
                            {recalcBusy ? D.recalculating : D.recalc}
                          </button>
                        </div>
                        {recalcErr && (
                          <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">
                            {D.recalcError}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <DiaryInput
                          placeholder={D.caloriesLabel}
                          inputMode="numeric"
                          value={form.calories}
                          onChange={(v) => setForm((s) => ({ ...s, calories: v }))}
                        />
                        <DiaryInput
                          placeholder={S.exerciseLabel}
                          inputMode="numeric"
                          value={form.exercise}
                          onChange={(v) => setForm((s) => ({ ...s, exercise: v }))}
                        />
                        <DiaryInput
                          placeholder={S.sleepLabel}
                          inputMode="decimal"
                          value={form.sleep}
                          onChange={(v) => setForm((s) => ({ ...s, sleep: v }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={form.intensity}
                          onChange={(e) =>
                            setForm((s) => ({
                              ...s,
                              intensity: e.target.value as '' | ExerciseIntensity,
                            }))
                          }
                          className="rounded-xl border border-stone-200 bg-white px-2 py-2 text-[13px] text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
                        >
                          <option value="">
                            {D.intensityLabel}: {D.intensityNone}
                          </option>
                          <option value="low">{S.intensity.low}</option>
                          <option value="medium">{S.intensity.medium}</option>
                          <option value="high">{S.intensity.high}</option>
                        </select>
                        <select
                          value={form.exType}
                          onChange={(e) =>
                            setForm((s) => ({
                              ...s,
                              exType: e.target.value as '' | ExerciseType,
                            }))
                          }
                          className="rounded-xl border border-stone-200 bg-white px-2 py-2 text-[13px] text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
                        >
                          <option value="">
                            {S.exercise.typeLabel}: {D.typeNone}
                          </option>
                          <option value="cardio">{S.exercise.type.cardio}</option>
                          <option value="strength">{S.exercise.type.strength}</option>
                          <option value="both">{S.exercise.type.both}</option>
                        </select>
                        <select
                          value={form.stretch}
                          onChange={(e) =>
                            setForm((s) => ({
                              ...s,
                              stretch: e.target.value as '' | 'yes' | 'no',
                            }))
                          }
                          className="rounded-xl border border-stone-200 bg-white px-2 py-2 text-[13px] text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
                        >
                          <option value="">
                            {D.stretchChip}: {D.typeNone}
                          </option>
                          <option value="yes">{S.exercise.stretch.yes}</option>
                          <option value="no">{S.exercise.stretch.no}</option>
                        </select>
                      </div>
                      <DiaryInput
                        placeholder={D.notePh}
                        value={form.note}
                        maxLength={280}
                        onChange={(v) => setForm((s) => ({ ...s, note: v }))}
                      />
                      {rowError && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-300">
                          {rowError === 'empty' ? D.emptyFieldsHint : D.saveError}
                        </p>
                      )}
                      <p className="text-[10px] leading-relaxed text-stone-400">{D.editHint}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={busy}
                          className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[12px] font-semibold text-stone-700 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                        >
                          {D.cancel}
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveEdit(d)}
                          disabled={busy}
                          className="flex-1 rounded-xl bg-stone-900 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-stone-900"
                        >
                          {busy ? D.saving : D.save}
                        </button>
                      </div>
                    </div>
                  ) : d.routine && hasRoutineContent(d.routine) ? (
                    <>
                    {d.routine.foodItems && d.routine.foodItems.length > 0 && (
                      <div className="mt-1">
                        <p className="text-[10px] font-semibold text-stone-400">{D.foodItemsLabel}</p>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {d.routine.foodItems.map((it, i) => (
                            <Chip
                              key={i}
                              label={`${it.name}${it.amount ? ` ${it.amount}` : ''}${
                                it.calories != null ? ` · ${it.calories}kcal` : ''
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {d.routine.caloriesKcal != null && (
                        <Chip label={`${D.caloriesLabel} ${d.routine.caloriesKcal}kcal`} />
                      )}
                      {macroLabel(d.routine, S.diet.nutrition, D) && (
                        <Chip label={macroLabel(d.routine, S.diet.nutrition, D) as string} />
                      )}
                      {d.routine.upfTier && (
                        <Chip label={`${S.diet.upf} · ${upfLabel(d.routine.upfTier, D)}`} />
                      )}
                      {d.routine.exerciseMinutes != null && (
                        <Chip
                          label={`${S.exerciseLabel} ${d.routine.exerciseMinutes}${S.exerciseUnit}${
                            d.routine.exerciseIntensity ? ` · ${S.intensity[d.routine.exerciseIntensity]}` : ''
                          }`}
                        />
                      )}
                      {d.routine.exerciseType && (
                        <Chip label={`${S.exercise.typeLabel} · ${S.exercise.type[d.routine.exerciseType]}`} />
                      )}
                      {d.routine.didStretch != null && (
                        <Chip
                          label={`${D.stretchChip} · ${
                            d.routine.didStretch ? S.exercise.stretch.yes : S.exercise.stretch.no
                          }`}
                        />
                      )}
                      {d.routine.sleepHours != null && (
                        <Chip label={`${S.sleepLabel} ${d.routine.sleepHours}${S.sleepUnit}`} />
                      )}
                      {d.routine.note && <Chip label={d.routine.note} />}
                    </div>
                    </>
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

                {/* 개인 첨부(사진·PDF) — 본인만 열람 */}
                <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
                  <DiaryAttachments entryDate={d.date} editable />
                </div>
              </section>
          ))}

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

function hasRoutineContent(r: RoutineEntry): boolean {
  return (
    r.caloriesKcal != null ||
    r.exerciseMinutes != null ||
    r.sleepHours != null ||
    r.exerciseType != null ||
    r.didStretch != null ||
    r.proteinG != null ||
    r.carbG != null ||
    r.fatG != null ||
    r.upfTier != null ||
    (r.foodItems?.length ?? 0) > 0 ||
    (r.note ?? '') !== ''
  );
}

function worstUpf(tiers: (UpfTier | undefined)[]): UpfTier | null {
  const rank: Record<UpfTier, number> = { clean: 0, processed: 1, ultra: 2 };
  let worst: UpfTier | null = null;
  for (const tr of tiers) {
    if (!tr) continue;
    if (worst == null || rank[tr] > rank[worst]) worst = tr;
  }
  return worst;
}

function aggregateNutri(
  lines: { proteinG?: number; carbG?: number; fatG?: number; upf?: UpfTier }[],
): EditNutri {
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
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    proteinG: any ? r1(p) : null,
    carbG: any ? r1(c) : null,
    fatG: any ? r1(f) : null,
    upfTier,
  };
}

function macroLabel(
  r: RoutineEntry,
  nutritionLabel: string,
  L: { macroP: string; macroC: string; macroF: string },
): string | null {
  const parts: string[] = [];
  if (r.proteinG != null) parts.push(`${L.macroP} ${r.proteinG}g`);
  if (r.carbG != null) parts.push(`${L.macroC} ${r.carbG}g`);
  if (r.fatG != null) parts.push(`${L.macroF} ${r.fatG}g`);
  if (parts.length === 0) return null;
  return `${nutritionLabel} ${parts.join(' · ')}`;
}

function upfLabel(
  tier: UpfTier,
  L: { upfClean: string; upfProcessed: string; upfUltra: string },
): string {
  return tier === 'clean' ? L.upfClean : tier === 'processed' ? L.upfProcessed : L.upfUltra;
}

function DiaryInput({
  value,
  onChange,
  placeholder,
  inputMode,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  inputMode?: 'numeric' | 'decimal';
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      maxLength={maxLength}
      className="w-full rounded-xl border border-stone-200 bg-white px-2 py-2 text-[13px] text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
    />
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

function Calendar({
  monthYm,
  selectedDate,
  today,
  weekdays,
  hasContent,
  holidayName,
  onSelect,
  onPrev,
  onNext,
}: {
  monthYm: string;
  selectedDate: string;
  today: string;
  weekdays: readonly string[];
  hasContent: (date: string) => boolean;
  holidayName: (date: string) => string | undefined;
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [y, m] = monthYm.split('-').map(Number);
  const year = y ?? 2026;
  const month = m ?? 1;
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(`${monthYm}-${d < 10 ? `0${d}` : d}`);

  return (
    <div className="card-shadow rounded-2xl card-rose p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="prev"
          className="h-7 w-7 rounded-lg text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          ‹
        </button>
        <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
          {year}.{month < 10 ? `0${month}` : month}
        </span>
        <button
          type="button"
          onClick={onNext}
          aria-label="next"
          className="h-7 w-7 rounded-lg text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {weekdays.map((w, i) => (
          <div
            key={i}
            className={`py-1 text-center text-[10px] font-semibold ${
              i === 0 ? 'text-rose-400' : i === 6 ? 'text-brand-400' : 'text-stone-400'
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`b${i}`} />;
          const day = Number(date.slice(-2));
          const isSel = date === selectedDate;
          const isToday = date === today;
          const dot = hasContent(date);
          const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
          const holiday = holidayName(date);
          // 일요일 또는 공휴일(한국/미국)은 빨간색.
          const isRed = weekday === 0 || !!holiday;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              title={holiday}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-[12px] transition ${
                isSel
                  ? 'bg-stone-900 font-bold text-white dark:bg-white dark:text-stone-900'
                  : isToday
                    ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                    : isRed
                      ? 'font-semibold text-rose-500 hover:bg-stone-100 dark:text-rose-400 dark:hover:bg-stone-800'
                      : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              {day}
              {holiday && !isSel && (
                <span className="absolute right-1 top-0.5 h-1 w-1 rounded-full bg-rose-500" />
              )}
              {dot && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${
                    isSel ? 'bg-white/80' : 'bg-brand-500'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
