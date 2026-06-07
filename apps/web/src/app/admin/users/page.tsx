'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useI18n } from '@/lib/i18n';
import {
  fetchAdminUsers,
  fetchAdminUserDetail,
  type AdminUserDetail,
  type AdminUserRow,
} from '@/lib/api-client';

export default function AdminUsersPage() {
  const { t } = useI18n();
  const A = t.admin;
  const U = A.users;

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUserDetail | null>(null);
  const [unmaskedId, setUnmaskedId] = useState<string | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  useEffect(() => {
    void loadUsers('');
  }, []);

  async function loadUsers(q: string) {
    setLoading(true);
    setErrCode(null);
    try {
      const data = await fetchAdminUsers(q || undefined);
      setUsers(data.users);
    } catch (e) {
      const code = e instanceof Error ? e.message : 'generic';
      setErrCode(code);
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(id: string, unmask: boolean) {
    setDetailBusy(true);
    try {
      const data = await fetchAdminUserDetail(id, unmask);
      setSelected(data.detail);
      setUnmaskedId(unmask ? id : null);
    } catch (e) {
      const code = e instanceof Error ? e.message : 'generic';
      setErrCode(code);
    } finally {
      setDetailBusy(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void loadUsers(search.trim());
  }

  return (
    <AdminShell title={U.title}>
      <form onSubmit={handleSearchSubmit} className="mt-3">
        <input
          type="search"
          value={search}
          placeholder={U.searchPlaceholder}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
        />
      </form>

      {loading && (
        <div className="mt-6 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {errCode && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {A.error[errCode as keyof typeof A.error] ?? A.error.generic}
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-6 text-center text-[12px] text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          {U.empty}
        </div>
      )}

      {!loading && users.length > 0 && (
        <ul className="card-shadow mt-3 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
          {users.map((user) => (
            <li key={user.userPseudonymId}>
              <button
                type="button"
                onClick={() => void openDetail(user.userPseudonymId, false)}
                disabled={detailBusy}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition active:bg-stone-50 disabled:opacity-50 dark:active:bg-stone-800/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-stone-800 dark:text-stone-100">
                    {user.emailMasked}
                  </p>
                  <p className="mt-0.5 text-[10px] text-stone-500 dark:text-stone-400">
                    {U.columns.createdAt}: {new Date(user.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] text-stone-500 dark:text-stone-400">
                    {U.columns.reports} {user.reportCount} · {U.columns.balance} {user.ledgerBalance}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        {U.maskedHint}
      </div>

      {selected && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-stone-900/40 backdrop-blur-sm">
          <div className="card-shadow w-full max-w-md rounded-t-3xl bg-white p-5 dark:bg-stone-900">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {U.detailTitle}
            </p>

            <dl className="mt-3 space-y-2 text-[13px]">
              <DetailRow label={U.nameLabel} value={selected.name ?? '—'} />
              <DetailRow label={U.emailLabel} value={selected.emailMasked ?? '—'} />
              <DetailRow label={U.phoneLabel} value={selected.phoneMasked ?? '—'} />
            </dl>

            <div className="mt-4 flex gap-2">
              {unmaskedId === selected.userPseudonymId ? (
                <span className="inline-flex items-center rounded-xl bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                  {U.unmaskOn}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void openDetail(selected.userPseudonymId, true)}
                  disabled={detailBusy}
                  className="inline-flex items-center rounded-xl bg-stone-900 px-3 py-2 text-[12px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-stone-900"
                >
                  {U.unmaskCta}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setUnmaskedId(null);
                }}
                className="ml-auto inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-semibold text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
              >
                {U.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {label}
      </dt>
      <dd className="break-all text-right text-stone-800 dark:text-stone-100">
        {value}
      </dd>
    </div>
  );
}
