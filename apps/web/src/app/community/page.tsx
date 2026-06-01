'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ComingSoon } from '@/components/ComingSoon';
import { ChevronRightIcon, UsersIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  fetchCommunityPosts,
  fetchCommunityTrending,
  type CommunityPost,
} from '@/lib/api-client';

export default function CommunityPage() {
  const { t } = useI18n();
  const Co = t.community;
  const [signedIn, setSignedIn] = useState(false);
  const [feed, setFeed] = useState<CommunityPost[]>([]);
  const [trending, setTrending] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!readSession()) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    void Promise.all([fetchCommunityPosts(), fetchCommunityTrending()])
      .then(([list, trend]) => {
        setFeed(list.posts);
        setTrending(trend.posts);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!signedIn && !loading) {
    return (
      <AppShell title={Co.pageTitle} decoration="dots">
        <ComingSoon customBody={t.userMenu.loginUnavailable} />
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
          href="/community/new"
          className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-2 text-[12px] font-semibold text-white dark:bg-white dark:text-stone-900"
        >
          <span>{Co.composeCta}</span>
          <ChevronRightIcon className="h-3 w-3" />
        </Link>
      </section>

      {loading && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {!loading && trending.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {Co.trendingTitle}
          </h2>
          <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 dark:divide-stone-800 dark:from-amber-950/30 dark:to-rose-950/30">
            {trending.map((p, idx) => (
              <PostListItem key={p.id} post={p} rank={idx + 1} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {Co.feedTitle}
        </h2>
        {!loading && feed.length === 0 ? (
          <div className="card-shadow rounded-2xl bg-white p-6 text-center dark:bg-stone-900">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
              <UsersIcon className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-stone-900 dark:text-stone-100">
              {Co.emptyTitle}
            </p>
            <p className="mt-1 text-[12px] text-stone-600 dark:text-stone-400">
              {Co.emptyBody}
            </p>
          </div>
        ) : (
          <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
            {feed.map((p) => (
              <PostListItem key={p.id} post={p} />
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {Co.disclaimer}
      </div>
    </AppShell>
  );
}

function PostListItem({ post, rank }: { post: CommunityPost; rank?: number }) {
  const { t } = useI18n();
  const Co = t.community;
  const author = `${Co.pseudonymPrefix}·${post.userPseudonymId.slice(0, 6)}`;
  return (
    <li>
      <Link
        href={`/community/post?id=${post.id}`}
        className="flex items-start gap-3 px-4 py-3 transition active:bg-stone-50 dark:active:bg-stone-800/50"
      >
        {rank !== undefined && (
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[12px] font-bold text-rose-700 dark:bg-rose-900 dark:text-rose-200">
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
            {post.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
            {post.body}
          </p>
          <div className="mt-1 flex items-center gap-3 text-[10px] font-medium text-stone-500 dark:text-stone-400">
            <span>{author}</span>
            <span>
              {Co.likeLabel} {post.likeCount}
            </span>
            <span>
              {Co.commentLabel} {post.commentCount}
            </span>
            {post.videoUrl && <span>▶</span>}
          </div>
        </div>
        <ChevronRightIcon className="h-4 w-4 shrink-0 self-center text-stone-400 dark:text-stone-500" />
      </Link>
    </li>
  );
}
