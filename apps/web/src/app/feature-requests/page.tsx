'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  createFeatureRequest,
  deleteFeatureRequest,
  fetchMyFeatureRequests,
  updateFeatureRequest,
  type FeatureRequest,
  type FeatureRequestKind,
  type FeatureRequestStatus,
} from '@/lib/api-client';
import { FeatureAttachments } from '@/components/FeatureAttachments';

type Draft = { kind: FeatureRequestKind; title: string; body: string; linkUrl: string };
const EMPTY: Draft = { kind: 'feature', title: '', body: '', linkUrl: '' };

export default function FeatureRequestsPage() {
  const { t } = useI18n();
  const F = t.featureRequests;
  const [signedIn, setSignedIn] = useState(false);
  const [items, setItems] = useState<FeatureRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!readSession()) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    void fetchMyFeatureRequests()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, []);

  if (!signedIn) {
    return (
      <AppShell title={F.pageTitle} decoration="dots">
        <LoginRequired />
      </AppShell>
    );
  }

  const statusLabel = (s: FeatureRequestStatus): string =>
    s === 'planned'
      ? F.statusPlanned
      : s === 'in_progress'
        ? F.statusInProgress
        : s === 'done'
          ? F.statusDone
          : s === 'declined'
            ? F.statusDeclined
            : F.statusOpen;

  function resetForm() {
    setDraft(EMPTY);
    setEditingId(null);
    setErr(null);
  }

  function startEdit(item: FeatureRequest) {
    setEditingId(item.id);
    setDraft({
      kind: item.kind,
      title: item.title,
      body: item.body,
      linkUrl: item.linkUrl ?? '',
    });
    setErr(null);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const patchItem = (updated: FeatureRequest) =>
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));

  async function handleSubmit() {
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (title.length < 2 || body.length < 1) {
      setErr(F.errInvalid);
      return;
    }
    const linkUrl = draft.linkUrl.trim() === '' ? null : draft.linkUrl.trim();
    setBusy(true);
    setErr(null);
    try {
      if (editingId) {
        const updated = await updateFeatureRequest(editingId, { kind: draft.kind, title, body, linkUrl });
        patchItem(updated);
      } else {
        const created = await createFeatureRequest({ kind: draft.kind, title, body, linkUrl });
        setItems((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (e) {
      setErr(e instanceof Error && e.message === 'INVALID_INPUT' ? F.errInvalid : F.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (typeof window !== 'undefined' && !window.confirm(F.deleteConfirm)) return;
    setBusy(true);
    try {
      await deleteFeatureRequest(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (editingId === id) resetForm();
    } catch {
      setErr(F.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100';

  return (
    <AppShell title={F.pageTitle} decoration="dots">
      <p className="mt-3 px-1 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
        {F.intro}
      </p>

      {/* 작성/수정 폼 */}
      <section className="card-shadow mt-3 rounded-2xl bg-white p-4 dark:bg-stone-900">
        <div className="flex gap-2">
          {(['feature', 'bug'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, kind: k }))}
              className={`flex-1 rounded-xl px-3 py-2 text-[12px] font-semibold transition ${
                draft.kind === k
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                  : 'border border-stone-200 text-stone-600 dark:border-stone-700 dark:text-stone-300'
              }`}
            >
              {k === 'feature' ? F.kindFeature : F.kindBug}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder={F.titlePlaceholder}
          maxLength={120}
          className={`mt-2 ${inputCls}`}
        />
        <textarea
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          placeholder={F.bodyPlaceholder}
          maxLength={4000}
          rows={4}
          className={`mt-2 resize-y ${inputCls}`}
        />
        <input
          type="url"
          value={draft.linkUrl}
          onChange={(e) => setDraft((d) => ({ ...d, linkUrl: e.target.value }))}
          placeholder={F.linkPlaceholder}
          maxLength={500}
          className={`mt-2 ${inputCls}`}
        />
        {err && (
          <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-300">{err}</p>
        )}
        <div className="mt-2 flex gap-2">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={busy}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
            >
              {F.cancelCta}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || draft.title.trim().length < 2 || draft.body.trim() === ''}
            className="flex-1 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {editingId ? F.saveCta : F.submitCta}
          </button>
        </div>
        {!editingId && (
          <p className="mt-2 text-[10px] text-stone-400 dark:text-stone-500">{F.attachHint}</p>
        )}
      </section>

      {/* 내 목록 */}
      {loaded && items.length === 0 ? (
        <p className="mt-6 px-1 text-center text-[12px] text-stone-500 dark:text-stone-400">
          {F.empty}
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="card-shadow rounded-2xl bg-white p-4 dark:bg-stone-900"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    item.kind === 'bug'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                      : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200'
                  }`}
                >
                  {item.kind === 'bug' ? F.kindBug : F.kindFeature}
                </span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  {statusLabel(item.status)}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-stone-900 dark:text-stone-100">
                {item.title}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
                {item.body}
              </p>

              <FeatureAttachments
                item={item}
                scope="me"
                labels={{
                  link: F.linkLabel,
                  imageAlt: F.imageAlt,
                  download: F.downloadCta,
                }}
                editable
                onChange={patchItem}
                onError={() => setErr(F.errFile)}
              />

              {item.adminFeedback && (
                <div className="mt-2 rounded-xl bg-brand-50 px-3 py-2 dark:bg-brand-900/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-200">
                    {F.adminReply}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-brand-900 dark:text-brand-100">
                    {item.adminFeedback}
                  </p>
                </div>
              )}

              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="text-[12px] font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
                >
                  {F.editCta}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  className="text-[12px] font-semibold text-stone-400 hover:text-rose-600"
                >
                  {F.deleteCta}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {F.disclaimer}
      </div>
    </AppShell>
  );
}
