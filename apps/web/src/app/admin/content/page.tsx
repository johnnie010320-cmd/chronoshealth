'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import {
  fetchAdminContentList,
  submitAdminContentUpsert,
  type AdminContentPage,
  type ContentSlug,
} from '@/lib/api-client';

const SLUGS: ContentSlug[] = ['terms', 'privacy', 'medical_disclaimer', 'operator_info'];

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; pages: AdminContentPage[] }
  | { status: 'err'; code: string };

export default function AdminContentPage() {
  const { t } = useI18n();
  const A = t.admin;
  const C = A.content;
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [selectedSlug, setSelectedSlug] = useState<ContentSlug>('terms');
  const [form, setForm] = useState({ title: '', bodyMd: '', version: 'v1.0' });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setState({ status: 'loading' });
    try {
      const data = await fetchAdminContentList();
      setState({ status: 'ok', pages: data.pages });
    } catch (e) {
      const code = e instanceof Error ? e.message : 'generic';
      setState({ status: 'err', code });
    }
  }

  const currentPage = useMemo(() => {
    if (state.status !== 'ok') return null;
    return state.pages.find((p) => p.slug === selectedSlug) ?? null;
  }, [state, selectedSlug]);

  useEffect(() => {
    if (currentPage) {
      setForm({
        title: currentPage.title,
        bodyMd: currentPage.bodyMd,
        version: currentPage.version,
      });
    } else {
      setForm({ title: '', bodyMd: '', version: 'v1.0' });
    }
  }, [currentPage]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      await submitAdminContentUpsert({
        slug: selectedSlug,
        locale: 'ko',
        title: form.title.trim(),
        bodyMd: form.bodyMd,
        version: form.version.trim() || 'v1.0',
      });
      setSavedMsg(C.savedMsg);
      await refresh();
    } catch (e) {
      const code = e instanceof Error ? e.message : 'generic';
      setSavedMsg(`${C.saveErrPrefix}: ${code}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title={C.pageTitle}>
      {state.status === 'loading' && (
        <div className="mt-6 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {state.status === 'err' && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {A.error[state.code as keyof typeof A.error] ?? A.error.generic}
        </div>
      )}

      {state.status === 'ok' && (
        <div className="mt-3 space-y-4">
          <div className="flex gap-1 overflow-x-auto px-1 pb-1">
            {SLUGS.map((slug) => {
              const isActive = selectedSlug === slug;
              const exists = state.pages.some((p) => p.slug === slug);
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setSelectedSlug(slug)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                    isActive
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                      : 'bg-white text-stone-600 hover:text-stone-900 dark:bg-stone-900 dark:text-stone-300'
                  }`}
                >
                  {slug}
                  {exists && (
                    <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <label className="block">
              <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
                {C.titleLabel}
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={200}
                className="mt-1 block w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
                {C.versionLabel}
              </span>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                maxLength={20}
                className="mt-1 block w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
              />
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
                {C.bodyLabel}
              </span>
              <textarea
                value={form.bodyMd}
                onChange={(e) => setForm((f) => ({ ...f, bodyMd: e.target.value }))}
                rows={20}
                maxLength={50_000}
                className="mt-1 block w-full resize-y rounded-2xl border border-stone-200 bg-white px-4 py-3 font-mono text-[12px] text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
              />
            </label>

            {savedMsg && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                {savedMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || form.title.trim() === '' || form.bodyMd.trim() === ''}
              className="inline-flex w-full items-center justify-between rounded-2xl bg-stone-900 px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
            >
              <span>{saving ? C.savingCta : C.saveCta}</span>
              <ChevronRightIcon className="h-5 w-5" />
            </button>

            {currentPage && (
              <p className="text-center text-[10px] text-stone-500 dark:text-stone-400">
                {C.lastUpdated}: {new Date(currentPage.updatedAt).toLocaleString()} ·
                {' '}{C.lastUpdatedBy}: {currentPage.updatedByPseudonymId.slice(0, 8)}…
              </p>
            )}
          </form>
        </div>
      )}
    </AdminShell>
  );
}
