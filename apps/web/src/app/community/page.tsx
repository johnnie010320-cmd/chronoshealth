'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { ChevronRightIcon, UsersIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  fetchCommunities,
  type CommunitySummary,
} from '@/lib/api-client';

export default function CommunityPage() {
  const { t } = useI18n();
  const Co = t.community;
  const G = Co.groups;
  const [signedIn, setSignedIn] = useState(false);
  const [mine, setMine] = useState<CommunitySummary[]>([]);
  const [discover, setDiscover] = useState<CommunitySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!readSession()) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    fetchCommunities()
      .then((data) => {
        setMine(data.mine);
        setDiscover(data.discover);
      })
      .catch(() => {
        /* noop */
      })
      .finally(() => setLoading(false));
  }, []);

  if (!signedIn && !loading) {
    return (
      <AppShell title={Co.pageTitle} decoration="dots">
        <LoginRequired />
      </AppShell>
    );
  }

  return (
    <AppShell title={Co.pageTitle} decoration="dots">
      <section className="mt-3 flex items-center justify-between">
        <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">
          {Co.title}
        </h1>
        <Link
          href="/community/create"
          className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-2 text-[12px] font-semibold text-white dark:bg-white dark:text-stone-900"
        >
          <span>{G.createCta}</span>
          <ChevronRightIcon className="h-3 w-3" />
        </Link>
      </section>

      <Link
        href="/community/view?id=_lounge"
        className="card-shadow mt-3 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-brand-50 to-amber-50 px-4 py-3 transition active:scale-[0.99] dark:from-brand-900/30 dark:to-amber-900/20"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-200">
            {G.sectionLoungeTitle}
          </p>
          <p className="mt-0.5 text-sm font-bold text-stone-900 dark:text-stone-100">
            {G.loungeBody}
          </p>
        </div>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-500 dark:text-stone-400" />
      </Link>

      {loading && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {!loading && (
        <>
          <section className="mt-5">
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {G.sectionMyTitle}
            </h2>
            {mine.length === 0 ? (
              <EmptyCard text={G.emptyMine} />
            ) : (
              <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
                {mine.map((c) => (
                  <CommunityListItem key={c.id} community={c} />
                ))}
              </ul>
            )}
          </section>

          <section className="mt-5">
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {G.sectionDiscoverTitle}
            </h2>
            {discover.length === 0 ? (
              <EmptyCard text={G.emptyDiscover} />
            ) : (
              <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
                {discover.map((c) => (
                  <CommunityListItem key={c.id} community={c} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {Co.disclaimer}
      </div>
    </AppShell>
  );
}

function CommunityListItem({ community }: { community: CommunitySummary }) {
  const { t } = useI18n();
  const G = t.community.groups;
  return (
    <li>
      <Link
        href={`/community/view?id=${community.id}`}
        className="flex items-start gap-3 px-4 py-3 transition active:bg-stone-50 dark:active:bg-stone-800/50"
      >
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
          <UsersIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
            {community.name}
            <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
              {community.visibility === 'public' ? G.visibilityPublic : G.visibilityPrivate}
            </span>
          </p>
          {community.description && (
            <p className="mt-0.5 line-clamp-1 text-[12px] text-stone-600 dark:text-stone-400">
              {community.description}
            </p>
          )}
          <div className="mt-1 flex items-center gap-3 text-[10px] font-medium text-stone-500 dark:text-stone-400">
            <span>
              {G.memberCountLabel} {community.followerCount.toLocaleString()}
            </span>
            <span>
              {G.postCountLabel} {community.postCount.toLocaleString()}
            </span>
          </div>
        </div>
        <ChevronRightIcon className="h-4 w-4 shrink-0 self-center text-stone-400 dark:text-stone-500" />
      </Link>
    </li>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="card-shadow rounded-2xl bg-white px-4 py-6 text-center text-[12px] text-stone-500 dark:bg-stone-900 dark:text-stone-400">
      {text}
    </div>
  );
}
