'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  addDiary,
  fetchDiary,
  removeDiary,
  type DiaryEntry,
  type DiaryMood,
} from '@/lib/api-client';

const MOODS: DiaryMood[] = ['great', 'good', 'soso', 'tired', 'bad'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DiaryPage() {
  const { t } = useI18n();
  const D = t.diary;
  const [signedIn, setSignedIn] = useState(false);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [date, setDate] = useState(todayIso());
  const [mood, setMood] = useState<DiaryMood | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!readSession()) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    void fetchDiary().then(setEntries);
  }, []);

  if (!signedIn) {
    return (
      <AppShell title={D.pageTitle} decoration="dots">
        <LoginRequired />
      </AppShell>
    );
  }

  async function handleAdd() {
    if (body.trim() === '') return;
    setBusy(true);
    setErr(null);
    try {
      const id = await addDiary({ entryDate: date, mood, body: body.trim() });
      setEntries((prev) => [
        { id, entryDate: date, mood, body: body.trim(), createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setBody('');
      setMood(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'generic');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    await removeDiary(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <AppShell title={D.pageTitle} decoration="dots">
      <section className="card-shadow mt-4 rounded-2xl bg-white p-4 dark:bg-stone-900">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          {D.composeTitle}
        </h2>
        <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">{D.composeHint}</p>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(mood === m ? null : m)}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${
                mood === m
                  ? 'bg-brand-700 text-white'
                  : 'border border-stone-200 bg-white text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300'
              }`}
            >
              {D.moods[m]}
            </button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={D.composePlaceholder}
          rows={4}
          maxLength={2000}
          className="mt-2 block w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
        />
        {err && (
          <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-300">
            {D.errCodes[err as keyof typeof D.errCodes] ?? D.errCodes.generic}
          </p>
        )}
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={busy || body.trim() === ''}
          className="mt-3 w-full rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-stone-900"
        >
          {busy ? D.saving : D.saveCta}
        </button>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {D.recentTitle}
        </h2>
        {entries.length === 0 ? (
          <div className="card-shadow rounded-2xl bg-white px-4 py-6 text-center text-[12px] text-stone-500 dark:bg-stone-900 dark:text-stone-400">
            {D.empty}
          </div>
        ) : (
          <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                    <span>{e.entryDate}</span>
                    {e.mood && <span>· {D.moods[e.mood]}</span>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-stone-800 dark:text-stone-100">
                    {e.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemove(e.id)}
                  aria-label={D.removeCta}
                  className="text-stone-400 hover:text-rose-600"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {D.disclaimer}
      </div>
    </AppShell>
  );
}
