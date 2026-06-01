'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useI18n } from '@/lib/i18n';
import {
  fetchAdminBetaSignups,
  type AdminBetaSignupRow,
} from '@/lib/api-client';

export default function AdminBetaSignupsPage() {
  const { t } = useI18n();
  const A = t.admin;
  const B = A.betaSignups;

  const [signups, setSignups] = useState<AdminBetaSignupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errCode, setErrCode] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminBetaSignups()
      .then((data) => setSignups(data.signups))
      .catch((e) => {
        const code = e instanceof Error ? e.message : 'generic';
        setErrCode(code);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title={B.title}>
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

      {!loading && signups.length === 0 && (
        <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-6 text-center text-[12px] text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          {B.empty}
        </div>
      )}

      {!loading && signups.length > 0 && (
        <ul className="card-shadow mt-3 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
          {signups.map((row) => (
            <li key={row.id} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-mono text-[12px] text-stone-700 dark:text-stone-200">
                  {row.emailPseudonym.slice(0, 18)}…
                </p>
                <p className="shrink-0 text-[10px] text-stone-500 dark:text-stone-400">
                  {new Date(row.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                <Badge label={row.country} />
                <Badge label={row.ageGroup} />
                <Badge label={row.locale} />
              </div>
              {row.interestedModules && (
                <p className="text-[10px] text-stone-500 dark:text-stone-400">
                  {B.modulesLabel}: {row.interestedModules}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        {A.disclaimer}
      </div>
    </AdminShell>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-200">
      {label}
    </span>
  );
}
