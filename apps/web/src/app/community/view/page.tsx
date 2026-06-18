'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ChevronRightIcon, UsersIcon } from '@/components/HealthIcons';
import { NicknameAutocomplete } from '@/components/NicknameAutocomplete';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  addCommunityAdmin,
  fetchCommunity,
  fetchCommunityAdmins,
  fetchCommunityPosts,
  moderatorDeletePost,
  removeCommunityAdmin,
  setCommunityVisibility,
  toggleCommunityFollow,
  type CommunityAdminEntry,
  type CommunityDetailResponse,
  type CommunityPost,
} from '@/lib/api-client';

function CommunityViewPageInner() {
  const { t } = useI18n();
  const Co = t.community;
  const G = Co.groups;
  const router = useRouter();
  const params = useSearchParams();
  const id = params?.get('id') ?? '_lounge';

  const [detail, setDetail] = useState<CommunityDetailResponse | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [admins, setAdmins] = useState<CommunityAdminEntry[]>([]);
  const [adminNick, setAdminNick] = useState('');
  const [busy, setBusy] = useState(false);

  function loadPosts() {
    fetchCommunityPosts(null, 20, id)
      .then((p) => setPosts(p.posts))
      .catch(() => {
        /* noop */
      });
  }

  useEffect(() => {
    if (!readSession()) {
      router.replace('/login');
      return;
    }
    Promise.all([fetchCommunity(id), fetchCommunityPosts(null, 20, id)])
      .then(([d, p]) => {
        setDetail(d);
        setPosts(p.posts);
        if (d.isOwner) {
          fetchCommunityAdmins(id)
            .then(setAdmins)
            .catch(() => {
              /* noop */
            });
        }
      })
      .catch((err) => {
        setErrCode(err instanceof Error ? err.message : 'generic');
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleFollow() {
    if (!detail) return;
    setFollowing(true);
    try {
      await toggleCommunityFollow(detail.community.id);
      const refreshed = await fetchCommunity(detail.community.id);
      setDetail(refreshed);
    } finally {
      setFollowing(false);
    }
  }

  async function handleToggleVisibility() {
    if (!detail) return;
    setBusy(true);
    try {
      const next = detail.community.visibility === 'public' ? 'private' : 'public';
      await setCommunityVisibility(detail.community.id, next);
      setDetail(await fetchCommunity(detail.community.id));
    } finally {
      setBusy(false);
    }
  }

  async function addAdminByNick(nick: string) {
    if (!detail || nick.trim().length < 2) return;
    setBusy(true);
    try {
      await addCommunityAdmin(detail.community.id, nick.trim());
      setAdminNick('');
      setAdmins(await fetchCommunityAdmins(detail.community.id));
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  }

  function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    void addAdminByNick(adminNick);
  }

  async function handleRemoveAdmin(pseudonymId: string) {
    if (!detail) return;
    setBusy(true);
    try {
      await removeCommunityAdmin(detail.community.id, pseudonymId);
      setAdmins(await fetchCommunityAdmins(detail.community.id));
    } finally {
      setBusy(false);
    }
  }

  async function handleModerateDelete(postId: string) {
    if (!detail) return;
    if (typeof window !== 'undefined' && !window.confirm(G.moderateDeleteConfirm)) return;
    try {
      await moderatorDeletePost(detail.community.id, postId);
      loadPosts();
    } catch {
      /* noop */
    }
  }

  if (loading) {
    return (
      <AppShell title={Co.pageTitle} showBack backHref="/community" decoration="dots">
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      </AppShell>
    );
  }

  if (errCode || !detail) {
    return (
      <AppShell title={Co.pageTitle} showBack backHref="/community" decoration="dots">
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {Co.error[(errCode ?? 'generic') as keyof typeof Co.error] ?? Co.error.generic}
        </div>
      </AppShell>
    );
  }

  const c = detail.community;
  const canPost = detail.isOwner || detail.myStatus === 'active' || c.id === '_lounge';
  const isPending = detail.myStatus === 'pending';
  let followLabel = G.followCta;
  if (isPending) followLabel = G.pendingCta;
  else if (detail.myStatus === 'active') followLabel = G.unfollowCta;
  else if (c.visibility === 'private') followLabel = G.requestCta;

  return (
    <AppShell title={c.name} showBack backHref="/community" decoration="dots">
      <section className="card-shadow mt-3 rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            <UsersIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {c.name}
            </h1>
            <p className="mt-0.5 text-[12px] text-stone-600 dark:text-stone-400">
              {c.description || G.loungeBody}
            </p>
            <div className="mt-1 flex items-center gap-3 text-[11px] font-medium text-stone-500 dark:text-stone-400">
              <span>
                {c.followerCount.toLocaleString()} {G.detailFollowersLabel}
              </span>
              <span>
                {G.detailVisibilityLabel}:{' '}
                {c.visibility === 'public' ? G.visibilityPublic : G.visibilityPrivate}
              </span>
              {detail.isOwner && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  {G.ownerLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {!detail.isOwner && c.id !== '_lounge' && (
          <button
            type="button"
            onClick={handleFollow}
            disabled={following}
            className={`mt-3 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
              detail.myStatus === 'active'
                ? 'border border-stone-300 bg-white text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100'
                : 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
            }`}
          >
            {followLabel}
          </button>
        )}

        {isPending && (
          <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">
            {G.detailPrivateLocked}
          </p>
        )}
      </section>

      {detail.isOwner && (
        <section className="card-shadow mt-3 rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {G.ownerPanelTitle}
          </h2>
          <button
            type="button"
            onClick={handleToggleVisibility}
            disabled={busy}
            className="mt-2 inline-flex w-full items-center justify-center rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-stone-800 transition active:scale-[0.98] disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          >
            {c.visibility === 'public' ? G.makePrivate : G.makePublic}
          </button>

          <p className="mt-4 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
            {G.adminsLabel}
          </p>
          <form onSubmit={handleAddAdmin} className="mt-1 flex gap-2">
            <div className="min-w-0 flex-1">
              <NicknameAutocomplete
                value={adminNick}
                onChange={setAdminNick}
                onPick={(nick) => void addAdminByNick(nick)}
                placeholder={G.adminAddPlaceholder}
                exclude={admins.map((a) => a.nickname ?? '')}
              />
            </div>
            <button
              type="submit"
              disabled={busy || adminNick.trim().length < 2}
              className="shrink-0 rounded-2xl bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {G.adminAddCta}
            </button>
          </form>
          {admins.length === 0 ? (
            <p className="mt-2 text-[11px] text-stone-400 dark:text-stone-500">{G.noAdmins}</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {admins.map((a) => (
                <li
                  key={a.pseudonymId}
                  className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800/50"
                >
                  <span className="truncate text-[13px] text-stone-800 dark:text-stone-100">
                    {a.nickname ?? a.pseudonymId.slice(0, 8)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRemoveAdmin(a.pseudonymId)}
                    disabled={busy}
                    className="shrink-0 text-[11px] font-semibold text-rose-600 disabled:opacity-60 dark:text-rose-300"
                  >
                    {G.adminRemoveCta}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {G.detailPostsTitle}
          </h2>
          {canPost && (
            <Link
              href={`/community/new?cid=${c.id}`}
              className="text-[11px] font-semibold text-brand-700 dark:text-brand-300"
            >
              {G.detailComposeCta}
            </Link>
          )}
        </div>
        {!canPost && (
          <p className="mb-2 px-1 text-[11px] text-stone-500 dark:text-stone-400">
            {G.detailNotMember}
          </p>
        )}
        {posts.length === 0 ? (
          <div className="card-shadow rounded-2xl bg-white px-4 py-6 text-center text-[12px] text-stone-500 dark:bg-stone-900 dark:text-stone-400">
            {G.detailEmpty}
          </div>
        ) : (
          <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
            {posts.map((p) => (
              <li key={p.id} className="flex items-stretch">
                <Link
                  href={`/community/post?id=${p.id}`}
                  className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 transition active:bg-stone-50 dark:active:bg-stone-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {p.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
                      {p.body}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-[10px] font-medium text-stone-500 dark:text-stone-400">
                      <span>
                        {Co.likeLabel} {p.likeCount}
                      </span>
                      <span>
                        {Co.commentLabel} {p.commentCount}
                      </span>
                      {p.videoUrl && <span>▶</span>}
                    </div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 self-center text-stone-400 dark:text-stone-500" />
                </Link>
                {detail.isModerator && (
                  <button
                    type="button"
                    onClick={() => void handleModerateDelete(p.id)}
                    className="shrink-0 px-3 text-[11px] font-semibold text-rose-600 dark:text-rose-300"
                  >
                    {G.moderateDelete}
                  </button>
                )}
              </li>
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

export default function CommunityViewPage() {
  return (
    <Suspense fallback={null}>
      <CommunityViewPageInner />
    </Suspense>
  );
}
