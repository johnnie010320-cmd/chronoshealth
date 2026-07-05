'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { IconBadge } from '@/components/IconBadge';
import {
  ChevronRightIcon,
  CoinIcon,
  GiftIcon,
  TargetIcon,
  ClockIcon,
} from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  fetchRewardsMe,
  submitRewardsSpend,
  type LedgerEntry,
  type LedgerKind,
  type RewardsMeResponse,
  type SpendItem,
} from '@/lib/api-client';

export default function RewardsPage() {
  const { t, locale } = useI18n();
  const R = t.rewards;
  const [signedIn, setSignedIn] = useState(false);
  const [data, setData] = useState<RewardsMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  useEffect(() => {
    if (!readSession()) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetchRewardsMe(locale);
      setData(res);
    } catch (e) {
      const code = e instanceof Error ? e.message : 'generic';
      setErrCode(code);
    } finally {
      setLoading(false);
    }
  }

  async function handleSpend(slug: string) {
    setBusySlug(slug);
    setErrCode(null);
    try {
      await submitRewardsSpend(slug);
      await refresh();
    } catch (e) {
      const code = e instanceof Error ? e.message : 'generic';
      setErrCode(code);
    } finally {
      setBusySlug(null);
    }
  }

  if (!signedIn && !loading) {
    return (
      <AppShell title={R.pageTitle} decoration="dots">
        <LoginRequired />
      </AppShell>
    );
  }

  return (
    <AppShell title={R.pageTitle} decoration="dots">
      <section className="card-shadow mt-4 rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-rose-500 px-6 py-6 text-white">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white">
            <CoinIcon className="h-4 w-4" />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-90">
            {R.balanceLabel}
          </p>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-bold tracking-tight tabular-nums">
            {data ? data.balance : '—'}
          </span>
          <span className="text-base font-semibold text-white/80">{R.pointUnit}</span>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-white/80">{R.body}</p>
      </section>

      {loading && (
        <div className="mt-6 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {data && (
        <>
          <section className="card-shadow mt-3 rounded-2xl card-emerald p-5">
            <div className="flex items-center gap-2">
              <IconBadge Icon={TargetIcon} tone="emerald" size="sm" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                {R.earnLabel}
              </p>
            </div>
            <ul className="mt-3 space-y-2">
              {Object.entries(data.earnRules).map(([kind, amount]) => (
                <li
                  key={kind}
                  className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2 text-[12px] text-stone-700 dark:bg-stone-800/60 dark:text-stone-200"
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                      <CoinIcon className="h-3 w-3" />
                    </span>
                    {R.earnKindLabel[kind as LedgerKind] ?? kind}
                  </span>
                  <span className="font-bold tabular-nums">
                    +{amount} {R.pointUnit}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-3">
            <div className="mb-2 flex items-center gap-2 px-1">
              <IconBadge Icon={GiftIcon} tone="rose" size="sm" />
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                {R.spendCatalogTitle}
              </h2>
            </div>
            <ul className="space-y-2">
              {data.spendCatalog.map((item) => (
                <SpendCard
                  key={item.slug}
                  item={item}
                  busy={busySlug === item.slug}
                  disabled={data.balance < item.cost || busySlug !== null}
                  onClick={() => handleSpend(item.slug)}
                  ctaLabel={busySlug === item.slug ? R.spendSubmitting : R.spendCta}
                  pointUnit={R.pointUnit}
                />
              ))}
            </ul>
          </section>

          <section className="mt-3">
            <div className="mb-2 flex items-center gap-2 px-1">
              <IconBadge Icon={ClockIcon} tone="violet" size="sm" />
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                {R.historyTitle}
              </h2>
            </div>
            {data.history.length === 0 ? (
              <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[12px] text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
                {R.historyEmpty}
              </div>
            ) : (
              <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl card-violet dark:divide-stone-800">
                {data.history.map((entry) => (
                  <HistoryItem key={entry.txnId} entry={entry} />
                ))}
              </ul>
            )}
          </section>

          {errCode && (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
              {R.error[errCode as keyof typeof R.error] ?? R.error.generic}
            </div>
          )}
        </>
      )}

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {R.note}
      </div>

      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        {R.disclaimer}
      </div>
    </AppShell>
  );
}

function SpendCard({
  item,
  busy,
  disabled,
  onClick,
  ctaLabel,
  pointUnit,
}: {
  item: SpendItem;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  ctaLabel: string;
  pointUnit: string;
}) {
  return (
    <li className="card-shadow rounded-2xl card-sky p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
        {item.partner}
      </p>
      <p className="mt-1 text-sm font-bold text-stone-900 dark:text-stone-100">{item.title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
        {item.body}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[14px] font-bold tabular-nums text-stone-900 dark:text-stone-100">
          {item.cost} {pointUnit}
        </span>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled || busy}
          className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-2 text-[12px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-stone-900"
        >
          {ctaLabel}
          <ChevronRightIcon className="h-3 w-3" />
        </button>
      </div>
    </li>
  );
}

function HistoryItem({ entry }: { entry: LedgerEntry }) {
  const { t } = useI18n();
  const R = t.rewards;
  const isGain = entry.amount > 0;
  const label = R.earnKindLabel[entry.kind] ?? entry.kind;
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-stone-800 dark:text-stone-200">
          {label}
        </p>
        <p className="text-[10px] text-stone-500 dark:text-stone-400">
          {new Date(entry.createdAt).toLocaleString()}
        </p>
      </div>
      <span
        className={`shrink-0 text-sm font-bold tabular-nums ${
          isGain ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
        }`}
      >
        {isGain ? '+' : ''}
        {entry.amount} {R.pointUnit}
      </span>
    </li>
  );
}
