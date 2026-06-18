'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useI18n } from '@/lib/i18n';
import {
  createNotice,
  deleteNotice,
  fetchAdminNotices,
  updateNotice,
  type Notice,
} from '@/lib/api-client';

export default function AdminNoticesPage() {
  const { t } = useI18n();
  const A = t.admin;
  const N = A.notices;

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);

  function reload() {
    setLoading(true);
    fetchAdminNotices()
      .then(setNotices)
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
      await createNotice({ title: title.trim(), body: body.trim(), pinned, published });
      setTitle('');
      setBody('');
      setPinned(false);
      setPublished(true);
      reload();
    } catch (e) {
      setErrCode(e instanceof Error ? e.message : 'generic');
    } finally {
      setBusy(false);
    }
  }

  async function togglePinned(n: Notice) {
    await updateNotice(n.id, { pinned: !n.pinned });
    reload();
  }
  async function togglePublished(n: Notice) {
    await updateNotice(n.id, { published: !n.published });
    reload();
  }
  async function handleDelete(n: Notice) {
    if (typeof window !== 'undefined' && !window.confirm(N.confirmDelete)) return;
    await deleteNotice(n.id);
    reload();
  }

  return (
    <AdminShell title={N.title}>
      <form
        onSubmit={handleCreate}
        className="card-shadow mt-3 space-y-3 rounded-2xl bg-white px-4 py-4 dark:bg-stone-900"
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {N.createTitle}
        </p>
        <input
          type="text"
          value={title}
          placeholder={N.titlePlaceholder}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
        />
        <textarea
          value={body}
          placeholder={N.bodyPlaceholder}
          maxLength={5000}
          rows={4}
          onChange={(e) => setBody(e.target.value)}
          className="block w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
        />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-[12px] text-stone-700 dark:text-stone-300">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            {N.pinned}
          </label>
          <label className="flex items-center gap-2 text-[12px] text-stone-700 dark:text-stone-300">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            {N.published}
          </label>
        </div>
        <button
          type="submit"
          disabled={busy || title.trim().length < 2 || body.trim().length === 0}
          className="w-full rounded-2xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
        >
          {busy ? N.submitting : N.submit}
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

      {!loading && notices.length === 0 && (
        <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-6 text-center text-[12px] text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          {N.empty}
        </div>
      )}

      {!loading && notices.length > 0 && (
        <ul className="card-shadow mt-4 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
          {notices.map((n) => (
            <li key={n.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {n.pinned && (
                    <span className="mr-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      {N.pinnedTag}
                    </span>
                  )}
                  {!n.published && (
                    <span className="mr-1.5 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                      {N.draftTag}
                    </span>
                  )}
                  {n.title}
                </p>
              </div>
              <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[12px] text-stone-600 dark:text-stone-400">
                {n.body}
              </p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => void togglePinned(n)} className="rounded-xl border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-200">
                  {N.pinCta}
                </button>
                <button type="button" onClick={() => void togglePublished(n)} className="rounded-xl border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-200">
                  {N.publishCta}
                </button>
                <button type="button" onClick={() => void handleDelete(n)} className="ml-auto rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                  {N.deleteCta}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
