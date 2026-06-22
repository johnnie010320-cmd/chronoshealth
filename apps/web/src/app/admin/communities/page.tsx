'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useI18n } from '@/lib/i18n';
import {
  deleteAdminCommunity,
  fetchAdminCommunities,
  fetchCommunityPosts,
  moderatorDeletePost,
  type CommunityPost,
  type CommunitySummary,
} from '@/lib/api-client';

type Loaded =
  | { status: 'loading' }
  | { status: 'ok'; communities: CommunitySummary[] }
  | { status: 'err'; code: string };

export default function AdminCommunitiesPage() {
  const { t } = useI18n();
  const A = t.admin;
  const C = A.communities;
  const G = t.community.groups;
  const [state, setState] = useState<Loaded>({ status: 'loading' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // 게시물 관리 — 커뮤니티별 펼침/목록.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  async function togglePosts(communityId: string) {
    if (expandedId === communityId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(communityId);
    setPosts([]);
    setPostsLoading(true);
    try {
      const res = await fetchCommunityPosts(null, 30, communityId);
      setPosts(res.posts);
    } catch {
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }

  async function handleDeletePost(communityId: string, postId: string) {
    if (typeof window !== 'undefined' && !window.confirm(C.confirmDeletePost)) return;
    setDeletingPostId(postId);
    try {
      await moderatorDeletePost(communityId, postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      /* noop */
    } finally {
      setDeletingPostId(null);
    }
  }

  function reload() {
    setState({ status: 'loading' });
    fetchAdminCommunities()
      .then((data) => setState({ status: 'ok', communities: data.communities }))
      .catch((e) => setState({ status: 'err', code: e instanceof Error ? e.message : 'generic' }));
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleDelete(id: string) {
    if (typeof window !== 'undefined' && !window.confirm(C.confirmDelete)) return;
    setDeletingId(id);
    try {
      await deleteAdminCommunity(id);
      reload();
    } catch (err) {
      setState({
        status: 'err',
        code: err instanceof Error ? err.message : 'generic',
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminShell title={C.title}>
      {state.status === 'loading' && (
        <div className="mt-6 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {state.status === 'err' && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {A.error[state.code as keyof typeof A.error] ?? A.error.generic}
        </div>
      )}

      {state.status === 'ok' && (
        <section className="mt-3">
          {state.communities.length === 0 ? (
            <div className="card-shadow rounded-2xl bg-white px-4 py-6 text-center text-[12px] text-stone-500 dark:bg-stone-900 dark:text-stone-400">
              {C.empty}
            </div>
          ) : (
            <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
              {state.communities.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {c.name}
                        <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                          {c.visibility === 'public' ? G.visibilityPublic : G.visibilityPrivate}
                        </span>
                        {c.id === '_lounge' && (
                          <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                            lounge
                          </span>
                        )}
                      </p>
                      {c.description && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-stone-600 dark:text-stone-400">
                          {c.description}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-3 text-[10px] font-medium text-stone-500 dark:text-stone-400">
                        <span>
                          {C.columns.followers} {c.followerCount.toLocaleString()}
                        </span>
                        <span>
                          {C.columns.posts} {c.postCount.toLocaleString()}
                        </span>
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => void togglePosts(c.id)}
                        className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-stone-700 transition active:scale-[0.97] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                      >
                        {expandedId === c.id ? C.hidePosts : C.managePosts}
                      </button>
                      {c.id !== '_lounge' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 transition active:scale-[0.97] disabled:opacity-60 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
                        >
                          {C.deleteCta}
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedId === c.id && (
                    <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-800 dark:bg-stone-800/40">
                      {postsLoading ? (
                        <p className="py-2 text-center text-[11px] text-stone-500 dark:text-stone-400">…</p>
                      ) : posts.length === 0 ? (
                        <p className="py-2 text-center text-[11px] text-stone-500 dark:text-stone-400">
                          {C.noPosts}
                        </p>
                      ) : (
                        <ul className="divide-y divide-stone-200 dark:divide-stone-700">
                          {posts.map((p) => (
                            <li key={p.id} className="flex items-center gap-2 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[12px] font-semibold text-stone-800 dark:text-stone-100">
                                  {p.title}
                                </p>
                                <p className="line-clamp-1 text-[10px] text-stone-500 dark:text-stone-400">
                                  {p.body}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleDeletePost(c.id, p.id)}
                                disabled={deletingPostId === p.id}
                                className="inline-flex shrink-0 items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700 transition active:scale-[0.97] disabled:opacity-60 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
                              >
                                {C.deletePostCta}
                              </button>
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
        </section>
      )}
    </AdminShell>
  );
}
