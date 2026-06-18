'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useI18n } from '@/lib/i18n';
import {
  createRelease,
  deleteRelease,
  fetchReleases,
  type ReleaseEntry,
} from '@/lib/api-client';

export default function AdminDevlogPage() {
  const { t } = useI18n();
  const A = t.admin;
  const D = A.devlog;

  const [releases, setReleases] = useState<ReleaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [component, setComponent] = useState('');
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  function reload() {
    setLoading(true);
    fetchReleases()
      .then(setReleases)
      .catch((e) => setErrCode(e instanceof Error ? e.message : 'generic'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrCode(null);
    try {
      await createRelease({ component: component.trim(), version: version.trim(), notes: notes.trim() });
      setComponent('');
      setVersion('');
      setNotes('');
      reload();
    } catch (e) {
      setErrCode(e instanceof Error ? e.message : 'generic');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (typeof window !== 'undefined' && !window.confirm(D.confirmDelete)) return;
    await deleteRelease(id);
    reload();
  }

  return (
    <AdminShell title={D.title}>
      <form
        onSubmit={handleCreate}
        className="card-shadow mt-3 space-y-3 rounded-2xl bg-white px-4 py-4 dark:bg-stone-900"
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {D.createTitle}
        </p>
        <input
          type="text"
          value={component}
          placeholder={D.componentPlaceholder}
          maxLength={40}
          onChange={(e) => setComponent(e.target.value)}
          className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
        />
        <input
          type="text"
          value={version}
          placeholder={D.versionPlaceholder}
          maxLength={60}
          onChange={(e) => setVersion(e.target.value)}
          className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
        />
        <textarea
          value={notes}
          placeholder={D.notesPlaceholder}
          maxLength={4000}
          rows={3}
          onChange={(e) => setNotes(e.target.value)}
          className="block w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
        />
        <button
          type="submit"
          disabled={busy || component.trim() === '' || version.trim() === '' || notes.trim() === ''}
          className="w-full rounded-2xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
        >
          {busy ? D.submitting : D.submit}
        </button>
      </form>

      {errCode && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {A.error[errCode as keyof typeof A.error] ?? A.error.generic}
        </div>
      )}

      {loading && (
        <div className="mt-6 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {!loading && releases.length === 0 && (
        <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-6 text-center text-[12px] text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          {D.empty}
        </div>
      )}

      {!loading && releases.length > 0 && (
        <ul className="card-shadow mt-4 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
          {releases.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    <span className="mr-1.5 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                      {r.component}
                    </span>
                    {r.version}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
                    {r.notes}
                  </p>
                  <p className="mt-1 text-[10px] text-stone-400 dark:text-stone-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(r.id)}
                  className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
                >
                  {D.deleteCta}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
