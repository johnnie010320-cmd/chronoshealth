'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useI18n } from '@/lib/i18n';
import {
  deleteAdminFeatureRequest,
  fetchAdminFeatureRequests,
  sendFeatureRequestFeedback,
  type AdminFeatureRequest,
  type FeatureRequestKind,
  type FeatureRequestStatus,
} from '@/lib/api-client';

// 관리자 — 기능 요청 및 버그 리포트. 조회/검색 + 상태·피드백 + 삭제.

const STATUSES: FeatureRequestStatus[] = [
  'open',
  'planned',
  'in_progress',
  'done',
  'declined',
];

const inputCls =
  'block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100';

export default function AdminFeatureRequestsPage() {
  const { t } = useI18n();
  const F = t.featureRequests;
  const FA = F.admin;

  const [rows, setRows] = useState<AdminFeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<FeatureRequestKind | null>(null);

  // 항목별 편집 상태.
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});
  const [statusDraft, setStatusDraft] = useState<Record<string, FeatureRequestStatus>>({});

  const reload = useCallback(() => {
    setLoading(true);
    const q = query.trim();
    fetchAdminFeatureRequests({ ...(q ? { q } : {}), kind })
      .then((r) => {
        setRows(r);
        setFeedbackDraft(Object.fromEntries(r.map((x) => [x.id, x.adminFeedback ?? ''])));
        setStatusDraft(Object.fromEntries(r.map((x) => [x.id, x.status])));
      })
      .catch((e) => setErrCode(e instanceof Error ? e.message : 'generic'))
      .finally(() => setLoading(false));
  }, [query, kind]);

  // 종류 필터 변경 시 즉시 반영. 검색어는 버튼/Enter 로 실행.
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

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

  async function sendFeedback(row: AdminFeatureRequest) {
    setBusyId(row.id);
    setErrCode(null);
    try {
      await sendFeatureRequestFeedback(row.id, {
        feedback: feedbackDraft[row.id] ?? '',
        status: statusDraft[row.id] ?? row.status,
      });
      reload();
    } catch (e) {
      setErrCode(e instanceof Error ? e.message : 'generic');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: AdminFeatureRequest) {
    if (typeof window !== 'undefined' && !window.confirm(FA.deleteConfirm)) return;
    setBusyId(row.id);
    setErrCode(null);
    try {
      await deleteAdminFeatureRequest(row.id);
      setRows((prev) => prev.filter((x) => x.id !== row.id));
    } catch (e) {
      setErrCode(e instanceof Error ? e.message : 'generic');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell title={FA.title}>
      {/* 검색 + 종류 필터 */}
      <section className="mt-4 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            reload();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={FA.searchPlaceholder}
            className={inputCls}
          />
          <button
            type="submit"
            className="shrink-0 rounded-2xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
          >
            {FA.searchCta}
          </button>
        </form>
        <div className="flex gap-2">
          {(
            [
              [null, FA.filterAll],
              ['feature', FA.filterFeature],
              ['bug', FA.filterBug],
            ] as const
          ).map(([k, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${
                kind === k
                  ? 'bg-brand-700 text-white'
                  : 'border border-stone-200 text-stone-600 dark:border-stone-700 dark:text-stone-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {errCode && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {errCode}
        </div>
      )}

      {!loading && rows.length === 0 ? (
        <p className="mt-8 text-center text-[13px] text-stone-500 dark:text-stone-400">
          {FA.empty}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="card-shadow rounded-2xl bg-white p-4 dark:bg-stone-900"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    row.kind === 'bug'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                      : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200'
                  }`}
                >
                  {row.kind === 'bug' ? F.kindBug : F.kindFeature}
                </span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  {statusLabel(row.status)}
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  {FA.author}: {row.authorNickname ?? FA.anonymous}
                </span>
                <span className="ml-auto text-[10px] tabular-nums text-stone-400 dark:text-stone-500">
                  {FA.createdAt} {row.createdAt.slice(0, 10)}
                </span>
              </div>

              <p className="mt-2 text-sm font-bold text-stone-900 dark:text-stone-100">
                {row.title}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
                {row.body}
              </p>

              {/* 상태 + 피드백 */}
              <div className="mt-3 space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                    {FA.statusLabel}
                  </label>
                  <select
                    value={statusDraft[row.id] ?? row.status}
                    onChange={(e) =>
                      setStatusDraft((d) => ({
                        ...d,
                        [row.id]: e.target.value as FeatureRequestStatus,
                      }))
                    }
                    className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[12px] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={feedbackDraft[row.id] ?? ''}
                  onChange={(e) =>
                    setFeedbackDraft((d) => ({ ...d, [row.id]: e.target.value }))
                  }
                  placeholder={FA.feedbackPlaceholder}
                  maxLength={4000}
                  rows={2}
                  className={`resize-y ${inputCls}`}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void remove(row)}
                    disabled={busyId === row.id}
                    className="rounded-xl border border-stone-300 px-3 py-1.5 text-[12px] font-semibold text-stone-500 hover:text-rose-600 disabled:opacity-60 dark:border-stone-700"
                  >
                    {FA.deleteCta}
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendFeedback(row)}
                    disabled={busyId === row.id}
                    className="rounded-xl bg-brand-700 px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
                  >
                    {FA.sendFeedbackCta}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
