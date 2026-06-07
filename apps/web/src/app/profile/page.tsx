'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/lib/i18n';
import { readSession, clearSession, type StoredSession } from '@/lib/session';
import { useIsAdmin } from '@/lib/admin-state';
import { fetchMeProfile, type MeProfile } from '@/lib/api-client';
import {
  UserCircleIcon,
  ShieldIcon,
  LogoutIcon,
  ChevronRightIcon,
} from '@/components/HealthIcons';

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; me: MeProfile }
  | { status: 'err'; code: string };

const NATIONALITY_LABEL: Record<string, string> = {
  KR: '대한민국',
  US: '미국',
  JP: '일본',
  ES: '스페인',
  OTHER: '기타',
};

export default function ProfilePage() {
  const { t, locale } = useI18n();
  const P = t.profile;
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const isAdmin = useIsAdmin();

  useEffect(() => {
    const s = readSession();
    if (s) {
      setSession(s);
      setReady(true);
    } else {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    void loadMe(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function loadMe(reveal: boolean) {
    setBusy(true);
    try {
      const { profile } = await fetchMeProfile(reveal);
      setState({ status: 'ok', me: profile });
      setRevealed(reveal);
    } catch (e) {
      const code = e instanceof Error ? e.message : 'generic';
      setState({ status: 'err', code });
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !session) return null;

  const handleLogout = () => {
    if (typeof window !== 'undefined' && !window.confirm(P.logoutConfirm)) {
      return;
    }
    clearSession();
    router.push('/');
  };

  return (
    <AppShell title={P.pageTitle} decoration="dots">
      {isAdmin === true && (
        <Link
          href="/admin"
          className="card-shadow mt-4 flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 px-5 py-4 text-white transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-bold tracking-tight">
                {t.admin.accessTitle}
                <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-[0.15em]">
                  {t.admin.modeBadge}
                </span>
              </p>
              <p className="mt-0.5 truncate text-[12px] leading-relaxed text-white/85">
                {t.admin.accessBody}
              </p>
            </div>
          </div>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-white/90" />
        </Link>
      )}

      <section className="card-shadow mt-4 rounded-3xl bg-white p-5 dark:bg-stone-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
              <UserCircleIcon className="h-5 w-5" />
            </span>
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {P.sectionAccount}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void loadMe(!revealed)}
            disabled={busy}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition active:scale-[0.97] disabled:opacity-60 ${
              revealed
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200'
                : 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
            }`}
          >
            {revealed ? P.hideCta : P.revealCta}
          </button>
        </div>

        {state.status === 'loading' && (
          <div className="flex justify-center py-6">
            <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
          </div>
        )}

        {state.status === 'err' && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            {P.errorGeneric}
          </div>
        )}

        {state.status === 'ok' && (
          <>
            <dl className="space-y-3 text-sm">
              <Row label={P.nameLabel} value={state.me.name} />
              <Row label={P.emailLabel} value={state.me.email} mono />
              <Row label={P.phoneLabel} value={state.me.phone} mono />
              <Row label={P.birthYearLabel} value={`${state.me.birthYear}`} />
              <Row
                label={P.sexLabel}
                value={P.sexValues[state.me.sex] ?? state.me.sex}
              />
              {state.me.nationality && (
                <Row
                  label={P.nationalityLabel}
                  value={NATIONALITY_LABEL[state.me.nationality] ?? state.me.nationality}
                />
              )}
              <Row
                label={P.joinedAtLabel}
                value={new Date(state.me.createdAt).toLocaleDateString(locale)}
              />
            </dl>
            {revealed && (
              <p className="mt-3 rounded-xl bg-amber-50/60 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                {P.revealNote}
              </p>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              {P.note}
            </p>
          </>
        )}
      </section>

      <section className="card-shadow mt-4 rounded-3xl bg-white p-5 dark:bg-stone-900">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            <ShieldIcon className="h-5 w-5" />
          </span>
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            {P.sectionPrivacy}
          </h2>
        </div>
        <ul className="space-y-2 text-[13px] text-stone-800 dark:text-stone-200">
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{P.consentMedical}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{P.consentTerms}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{P.consentPrivacy}</span>
          </li>
        </ul>
        {state.status === 'ok' && state.me.consentRecordedAt && (
          <p className="mt-3 text-[10px] text-stone-500 dark:text-stone-400">
            {P.consentGrantedAt}: {new Date(state.me.consentRecordedAt).toLocaleDateString(locale)}
          </p>
        )}
      </section>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-6 py-4 text-base font-semibold text-rose-700 transition active:scale-[0.98] hover:bg-rose-50 dark:border-rose-900 dark:bg-stone-900 dark:text-rose-300 dark:hover:bg-rose-950"
        >
          <LogoutIcon className="h-5 w-5" />
          {P.logout}
        </button>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-stone-100 pb-2 last:border-0 dark:border-stone-800">
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {label}
      </dt>
      <dd
        className={`break-all text-right text-stone-800 dark:text-stone-100 ${mono ? 'font-mono text-[13px]' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
