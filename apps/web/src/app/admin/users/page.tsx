'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useI18n } from '@/lib/i18n';
import { useIsSuperAdmin } from '@/lib/admin-state';
import {
  fetchAdminUsers,
  fetchUserLedger,
  setUserRole,
  type AdminLedgerEntry,
  type AdminUserRow,
} from '@/lib/api-client';

export default function AdminUsersPage() {
  const { t } = useI18n();
  const A = t.admin;
  const U = A.users;
  const isSuper = useIsSuperAdmin();

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<AdminLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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
      setErrCode(e instanceof Error ? e.message : 'generic');
    } finally {
      setLoading(false);
    }
  }

  async function toggleCoins(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setLedgerLoading(true);
    try {
      setLedger(await fetchUserLedger(id));
    } catch {
      setLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  }

  async function toggleRole(u: AdminUserRow) {
    setBusyId(u.userPseudonymId);
    try {
      await setUserRole(u.userPseudonymId, u.role === 'admin' ? 'user' : 'admin');
      await loadUsers(search.trim());
    } catch (e) {
      setErrCode(e instanceof Error ? e.message : 'generic');
    } finally {
      setBusyId(null);
    }
  }

  function roleTag(u: AdminUserRow): string {
    if (u.isSuperAdmin) return U.roleSuperTag;
    if (u.role === 'admin') return U.roleAdminTag;
    return U.roleUserTag;
  }

  return (
    <AdminShell title={U.title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void loadUsers(search.trim());
        }}
        className="mt-3"
      >
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
            <li key={user.userPseudonymId} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-900 dark:text-stone-100">
                    <span className="truncate">{user.name ?? user.nickname ?? '—'}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        user.isSuperAdmin
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                          : user.role === 'admin'
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                            : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                      }`}
                    >
                      {roleTag(user)}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-stone-600 dark:text-stone-300">
                    {U.columns.email}: {user.email}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-stone-600 dark:text-stone-300">
                    {U.columns.phone}: {user.phone ?? '—'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-stone-400 dark:text-stone-500">
                    {U.columns.createdAt}: {new Date(user.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    {user.ledgerBalance.toLocaleString()} CHRO
                  </p>
                  <p className="mt-1 text-[10px] text-stone-400 dark:text-stone-500">
                    {U.columns.reports} {user.reportCount}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void toggleCoins(user.userPseudonymId)}
                  className="rounded-xl border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-200"
                >
                  {openId === user.userPseudonymId ? U.hideCoins : U.viewCoins}
                </button>
                {isSuper && !user.isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => void toggleRole(user)}
                    disabled={busyId === user.userPseudonymId}
                    className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60 ${
                      user.role === 'admin'
                        ? 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
                        : 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                    }`}
                  >
                    {user.role === 'admin' ? U.revokeAdmin : U.grantAdmin}
                  </button>
                )}
              </div>

              {openId === user.userPseudonymId && (
                <div className="mt-2 rounded-2xl bg-stone-50 px-3 py-2 dark:bg-stone-800/50">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {U.coinHistoryTitle}
                  </p>
                  {ledgerLoading ? (
                    <p className="py-2 text-center text-[11px] text-stone-400">…</p>
                  ) : ledger.length === 0 ? (
                    <p className="py-1 text-[11px] text-stone-400 dark:text-stone-500">{U.noCoins}</p>
                  ) : (
                    <ul className="divide-y divide-stone-200/60 dark:divide-stone-700/60">
                      {ledger.map((e) => (
                        <li key={e.txnId} className="flex items-center justify-between gap-2 py-1.5">
                          <span className="truncate text-[11px] text-stone-600 dark:text-stone-300">
                            {e.kind}
                            <span className="ml-1 text-stone-400">
                              {new Date(e.createdAt).toLocaleDateString()}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 text-[12px] font-bold tabular-nums ${
                              e.amount >= 0
                                ? 'text-emerald-600 dark:text-emerald-300'
                                : 'text-rose-600 dark:text-rose-300'
                            }`}
                          >
                            {e.amount >= 0 ? '+' : ''}
                            {e.amount.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        {U.piiHint}
      </div>
    </AdminShell>
  );
}
