'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useI18n } from '@/lib/i18n';
import {
  createCareAffiliate,
  deleteCareAffiliate,
  fetchCareAffiliates,
  updateCareAffiliate,
  type AffiliateI18n,
  type CareAffiliateRow,
} from '@/lib/api-client';

// 케어 제휴 카드 관리 — migration 0037.
// 실제 제휴처 URL 이 확보되면 여기서 입력 → /care 의 "준비중" 안내가 실제 링크로 바뀐다.

const CATEGORIES = ['diet', 'exercise', 'medical'] as const;
const LOCALES = ['ko', 'en', 'ja', 'es'] as const;

const EMPTY_I18N: AffiliateI18n = {
  ko: { title: '', body: '', ctaLabel: '' },
  en: { title: '', body: '', ctaLabel: '' },
  ja: { title: '', body: '', ctaLabel: '' },
  es: { title: '', body: '', ctaLabel: '' },
};

const inputCls =
  'block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100';

export default function AdminCareAffiliatesPage() {
  const { t } = useI18n();
  const A = t.admin;
  const C = A.careAffiliates;

  const [rows, setRows] = useState<CareAffiliateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  // 인라인 편집 상태 (slug → 편집 중인 URL)
  const [urlDraft, setUrlDraft] = useState<Record<string, string>>({});

  // 신규 생성 폼
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('diet');
  const [partner, setPartner] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [i18n, setI18n] = useState<AffiliateI18n>(EMPTY_I18N);

  function reload() {
    setLoading(true);
    fetchCareAffiliates()
      .then((r) => {
        setRows(r);
        setUrlDraft(Object.fromEntries(r.map((x) => [x.slug, x.ctaUrl])));
      })
      .catch((e) => setErrCode(e instanceof Error ? e.message : 'generic'))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function patch(row: CareAffiliateRow, p: Parameters<typeof updateCareAffiliate>[1]) {
    setBusySlug(row.slug);
    setErrCode(null);
    try {
      await updateCareAffiliate(row.slug, p);
      reload();
    } catch (e) {
      setErrCode(e instanceof Error ? e.message : 'generic');
    } finally {
      setBusySlug(null);
    }
  }

  async function handleDelete(row: CareAffiliateRow) {
    if (typeof window !== 'undefined' && !window.confirm(C.confirmDelete)) return;
    setBusySlug(row.slug);
    try {
      await deleteCareAffiliate(row.slug);
      reload();
    } catch (e) {
      setErrCode(e instanceof Error ? e.message : 'generic');
    } finally {
      setBusySlug(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrCode(null);
    setBusySlug('__new__');
    try {
      await createCareAffiliate({
        slug: slug.trim(),
        category,
        partner: partner.trim(),
        ctaUrl: ctaUrl.trim(),
        comingSoon: false,
        sortOrder: 0,
        active: true,
        i18n,
      });
      setSlug('');
      setPartner('');
      setCtaUrl('');
      setI18n(EMPTY_I18N);
      setCreating(false);
      reload();
    } catch (e) {
      setErrCode(e instanceof Error ? e.message : 'generic');
    } finally {
      setBusySlug(null);
    }
  }

  const createValid =
    slug.trim().length >= 3 &&
    partner.trim().length > 0 &&
    ctaUrl.trim().startsWith('http') &&
    LOCALES.every(
      (l) => i18n[l].title.trim() && i18n[l].body.trim() && i18n[l].ctaLabel.trim(),
    );

  return (
    <AdminShell title={C.title}>
      <p className="mt-3 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {C.intro}
      </p>

      {errCode && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {A.error[errCode as keyof typeof A.error] ?? A.error.generic}
        </div>
      )}

      <button
        type="button"
        onClick={() => setCreating((v) => !v)}
        className="mt-3 w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
      >
        {creating ? C.cancelCreate : C.startCreate}
      </button>

      {creating && (
        <form
          onSubmit={handleCreate}
          className="card-shadow mt-3 space-y-3 rounded-2xl bg-white px-4 py-4 dark:bg-stone-900"
        >
          <input
            className={inputCls}
            value={slug}
            placeholder={C.slugPlaceholder}
            maxLength={64}
            onChange={(e) => setSlug(e.target.value)}
          />
          <select
            className={inputCls}
            value={category}
            onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {C.categories[c]}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            value={partner}
            placeholder={C.partnerPlaceholder}
            maxLength={80}
            onChange={(e) => setPartner(e.target.value)}
          />
          <input
            className={inputCls}
            value={ctaUrl}
            placeholder={C.urlPlaceholder}
            maxLength={500}
            onChange={(e) => setCtaUrl(e.target.value)}
          />

          {LOCALES.map((l) => (
            <div key={l} className="space-y-2 rounded-2xl border border-stone-100 p-3 dark:border-stone-800">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                {l}
              </p>
              {(['title', 'body', 'ctaLabel'] as const).map((f) => (
                <input
                  key={f}
                  className={inputCls}
                  value={i18n[l][f]}
                  placeholder={C.fields[f]}
                  onChange={(e) =>
                    setI18n((prev) => ({
                      ...prev,
                      [l]: { ...prev[l], [f]: e.target.value },
                    }))
                  }
                />
              ))}
            </div>
          ))}

          <button
            type="submit"
            disabled={!createValid || busySlug === '__new__'}
            className="w-full rounded-2xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
          >
            {busySlug === '__new__' ? C.submitting : C.submit}
          </button>
        </form>
      )}

      {loading && (
        <div className="mt-6 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-6 text-center text-[12px] text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          {C.empty}
        </div>
      )}

      {!loading && rows.length > 0 && (
        <ul className="card-shadow mt-4 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
          {rows.map((r) => (
            <li key={r.slug} className="space-y-2 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    <span className="mr-1.5 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                      {C.categories[r.category]}
                    </span>
                    {r.i18n.ko.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                    {r.partner} · {r.slug}
                  </p>
                </div>
                {r.comingSoon ? (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    {C.badgeComingSoon}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                    {C.badgeLive}
                  </span>
                )}
              </div>

              <input
                className={inputCls}
                value={urlDraft[r.slug] ?? ''}
                onChange={(e) =>
                  setUrlDraft((prev) => ({ ...prev, [r.slug]: e.target.value }))
                }
              />

              <div className="flex flex-wrap items-center gap-3 text-[12px] text-stone-600 dark:text-stone-400">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={r.comingSoonStored}
                    onChange={(e) => patch(r, { comingSoon: e.target.checked })}
                  />
                  <span>{C.toggleComingSoon}</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={r.active}
                    onChange={(e) => patch(r, { active: e.target.checked })}
                  />
                  <span>{C.toggleActive}</span>
                </label>

                <button
                  type="button"
                  disabled={busySlug === r.slug || (urlDraft[r.slug] ?? '') === r.ctaUrl}
                  onClick={() => patch(r, { ctaUrl: (urlDraft[r.slug] ?? '').trim() })}
                  className="ml-auto rounded-xl bg-stone-900 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-stone-900"
                >
                  {C.saveUrl}
                </button>
                <button
                  type="button"
                  disabled={busySlug === r.slug}
                  onClick={() => handleDelete(r)}
                  className="rounded-xl border border-rose-200 px-3 py-1.5 text-[12px] font-semibold text-rose-700 disabled:opacity-40 dark:border-rose-900 dark:text-rose-300"
                >
                  {C.delete}
                </button>
              </div>

              {r.comingSoon && !r.comingSoonStored && (
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                  {C.placeholderForced}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
