'use client';

// 홈 "오늘의 셀프 체크" 멀티탭 카드.
// ① 오늘 체크: 컨디션·운동·수면·메모 입력 → 루틴(+다이어리) 반영
// ② 건강 그래프: 최근 14일 생활패턴(음식·운동·수면) → 종합 생활 점수 + 세부 3지표
// ③ 가이드: 오늘의 셀프 체크 팁 + 케어/설문 진입
// 의료·윤리: "진단" 아님. "생활 점수/추이" + 면책. (apps/web CLAUDE.md 규칙)

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  fetchRoutineToday,
  fetchRoutineRange,
  submitRoutineDaily,
  addDiary,
  symptomCheck,
  type RoutineEntry,
  type RoutineSummary,
  type DiaryMood,
  type ExerciseIntensity,
  type SymptomAssessment,
} from '@/lib/api-client';

type TabKey = 'today' | 'graph' | 'guide';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// 운동 강도 가중치(강=호흡 가쁨, 약=걷기). 짧고 강한 운동도 적절히 반영.
const INTENSITY_MULT: Record<ExerciseIntensity, number> = { low: 0.7, medium: 1, high: 1.4 };
const INTENSITIES: ExerciseIntensity[] = ['low', 'medium', 'high'];

// 비의료 "생활 점수"(0~100): 운동 40(강도 가중) + 수면 40 + 기록(칼로리) 20.
function dayScore(e: RoutineEntry): number {
  let s = 0;
  const mult = e.exerciseIntensity ? INTENSITY_MULT[e.exerciseIntensity] : 1;
  const effMin = (e.exerciseMinutes ?? 0) * mult;
  s += Math.min(effMin / 30, 1) * 40;
  if (e.sleepHours != null) s += 40 * (1 - Math.min(Math.abs(e.sleepHours - 7.5) / 4, 1));
  if ((e.caloriesKcal ?? 0) > 0) s += 20;
  return Math.round(Math.max(0, Math.min(100, s)));
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
        {tab === 'today' && <TodayTab signedIn={signedIn} S={S} />}
        {tab === 'graph' && <GraphTab signedIn={signedIn} S={S} />}
        {tab === 'guide' && <SymptomTab signedIn={signedIn} S={S} />}
      </div>
    </section>
  );
}

type SelfCheckLabels = ReturnType<typeof useI18n>['t']['home']['selfCheck'];

// ── 탭1: 오늘 체크 ──────────────────────────────────────────────────────────
function TodayTab({ signedIn, S }: { signedIn: boolean; S: SelfCheckLabels }) {
  const [mood, setMood] = useState<DiaryMood | null>(null);
  const [exercise, setExercise] = useState('');
  const [intensity, setIntensity] = useState<ExerciseIntensity | null>(null);
  const [sleep, setSleep] = useState('');
  const [note, setNote] = useState('');
  const [existingCalories, setExistingCalories] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    fetchRoutineToday()
      .then((r) => {
        if (r.entry) {
          if (r.entry.exerciseMinutes != null) setExercise(String(r.entry.exerciseMinutes));
          if (r.entry.exerciseIntensity) setIntensity(r.entry.exerciseIntensity);
          if (r.entry.sleepHours != null) setSleep(String(r.entry.sleepHours));
          if (r.entry.note) setNote(r.entry.note);
          setExistingCalories(r.entry.caloriesKcal ?? null);
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

  async function save() {
    setBusy(true);
    setDone(false);
    try {
      await submitRoutineDaily({
        entryDate: todayIso(),
        caloriesKcal: existingCalories, // 기존 음식 기록 보존
        exerciseMinutes: num(exercise),
        exerciseIntensity: intensity,
        sleepHours: num(sleep),
        note: note.trim() || null,
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
        <p className="text-[11px] text-brand-700 dark:text-brand-300">{S.savedHint}</p>
      )}
    </div>
  );
}

// ── 탭2: 건강 그래프 ────────────────────────────────────────────────────────
function GraphTab({ signedIn, S }: { signedIn: boolean; S: SelfCheckLabels }) {
  const [entries, setEntries] = useState<RoutineEntry[] | null>(null);
  const [summary, setSummary] = useState<RoutineSummary | null>(null);

  const load = useCallback(async () => {
    const r = await fetchRoutineRange(daysAgoIso(13), todayIso());
    setEntries(r.entries);
    setSummary(r.summary);
  }, []);

  useEffect(() => {
    if (signedIn) load().catch(() => setEntries([]));
  }, [signedIn, load]);

  // 최근 14일 일자별 점수(기록 없으면 0).
  const scores = useMemo(() => {
    const byDate = new Map((entries ?? []).map((e) => [e.entryDate, e]));
    const out: { date: string; score: number; has: boolean }[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = daysAgoIso(i);
      const e = byDate.get(date);
      out.push({ date, score: e ? dayScore(e) : 0, has: !!e });
    }
    return out;
  }, [entries]);

  if (!signedIn) return <LoginPrompt S={S} />;
  if (entries === null) {
    return (
      <div className="flex justify-center py-8">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-brand-600" />
      </div>
    );
  }

  const todayScore = scores[scores.length - 1]?.score ?? 0;
  const tier =
    todayScore >= 80 ? S.tierExcellent : todayScore >= 60 ? S.tierGood : todayScore >= 40 ? S.tierFair : S.tierLow;
  const avg = summary?.averages;
  const recordDays = (entries ?? []).filter((e) =>
    (e.exerciseMinutes ?? 0) > 0 || (e.sleepHours ?? 0) > 0 || (e.caloriesKcal ?? 0) > 0,
  ).length;

  // SVG 스파크라인 좌표(280x60, 상하 여백 6).
  const W = 280;
  const H = 60;
  const n = scores.length;
  const pts = scores.map((s, i) => {
    const x = n === 1 ? 0 : (i / (n - 1)) * W;
    const y = H - 6 - (s.score / 100) * (H - 12);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `0,${H} ${line} ${W},${H}`;

  return (
    <div className="space-y-3">
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
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
          {tier}
        </span>
      </div>

      {/* 14일 추이 스파크라인 */}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" preserveAspectRatio="none">
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
          scores[i]?.has ? <circle key={i} cx={x} cy={y} r="2" fill="rgb(13 148 136)" /> : null,
        )}
      </svg>
      <p className="text-center text-[10px] text-stone-400">{S.graphRangeNote}</p>

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
