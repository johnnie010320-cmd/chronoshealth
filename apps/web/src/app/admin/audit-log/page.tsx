'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useI18n } from '@/lib/i18n';
import { fetchAdminAuditLog, type AdminAuditEntry } from '@/lib/api-client';

export default function AdminAuditLogPage() {
  const { t, locale } = useI18n();
  const A = t.admin;
  const U = A.audit;
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errCode, setErrCode] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminAuditLog()
      .then(setEntries)
      .catch((e) => setErrCode(e instanceof Error ? e.message : 'generic'))
      .finally(() => setLoading(false));
  }, []);

  const actionLabel = (a: string) =>
    (U.actions as Record<string, string>)[a] ?? a;
  // SQLite datetime('now') = "YYYY-MM-DD HH:MM:SS" (UTC) → 로컬 시각 표시.
  const fmt = (s: string) => new Date(`${s.replace(' ', 'T')}Z`).toLocaleString(locale);

  return (
    <AdminShell title={U.title}>
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

      {!loading && entries.length === 0 && (
        <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-6 text-center text-[12px] text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          {U.empty}
        </div>
      )}

      {!loading && entries.length > 0 && (
        <ul className="card-shadow mt-3 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
          {entries.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  {actionLabel(e.action)}
                </span>
                <span className="shrink-0 text-[10px] tabular-nums text-stone-400 dark:text-stone-500">
                  {fmt(e.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-stone-600 dark:text-stone-300">
                {U.colActor}: <span className="font-semibold">{e.actorNickname ?? U.unknownActor}</span>
                {e.target ? (
                  <>
                    {' · '}
                    {U.colTarget}: <span className="break-all font-mono text-[11px]">{e.target}</span>
                  </>
                ) : null}
              </p>
              {e.detail && (
                <p className="mt-0.5 break-all text-[12px] text-stone-500 dark:text-stone-400">
                  {U.colDetail}: {e.detail}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
