'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useI18n } from '@/lib/i18n';
import { fetchAdminUsers, type AdminUserRow } from '@/lib/api-client';

export default function AdminUsersPage() {
  const { t } = useI18n();
  const A = t.admin;
  const U = A.users;

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errCode, setErrCode] = useState<string | null>(null);

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
            <li key={user.userPseudonymId} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-stone-900 dark:text-stone-100">
                    {user.name ?? user.nickname ?? '—'}
                    {user.nickname && (
                      <span className="ml-1.5 text-[11px] font-normal text-stone-400">
                        @{user.nickname}
                      </span>
                    )}
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
