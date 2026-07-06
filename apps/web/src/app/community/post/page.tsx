'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ChevronRightIcon, HeartPulseIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { RichBodyView } from '@/components/RichBodyEditor';
import {
  addCommunityComment,
  deleteCommunityComment,
  deleteCommunityPost,
  fetchCommunityPost,
  openDm,
  toggleCommunityLike,
  updateCommunityComment,
  type CommunityPost,
  type CommunityComment,
  type RichSegment,
} from '@/lib/api-client';

export default function CommunityDetailPageRoot() {
  return (
    <Suspense
      fallback={
        <AppShell decoration="dots">
          <div className="mt-10 flex justify-center">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
          </div>
        </AppShell>
      }
    >
      <CommunityDetailPage />
    </Suspense>
  );
}

function CommunityDetailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const Co = t.community;

  const id = params?.get('id') ?? '';
  const [post, setPost] = useState<CommunityPost | null>(null);
  // 작성자 본인 또는 사이트 관리자면 수정/삭제 가능.
  const [canManage, setCanManage] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [acceptsDm, setAcceptsDm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [dmBusyId, setDmBusyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  useEffect(() => {
    if (id === '') {
      router.replace('/community');
      return;
    }
    if (!readSession()) {
      router.replace('/signup');
      return;
    }
    void fetchCommunityPost(id)
      .then((data) => {
        setPost(data.post);
        setCanManage(data.canManage ?? data.isAuthor);
        setComments(data.comments);
      })
      .catch((e) => {
        const code = e instanceof Error ? e.message : 'generic';
        setErrCode(code);
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <AppShell title={Co.pageTitle} showBack backHref="/community" decoration="dots">
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      </AppShell>
    );
  }

  if (!post) {
    return (
      <AppShell title={Co.pageTitle} showBack backHref="/community" decoration="dots">
        <div className="mt-10 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {Co.error[(errCode ?? 'NOT_FOUND') as keyof typeof Co.error] ?? Co.error.generic}
        </div>
      </AppShell>
    );
  }

  const author = `${Co.pseudonymPrefix}·${post.userPseudonymId.slice(0, 6)}`;

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrCode(null);
    try {
      await addCommunityComment(id, draft.trim(), acceptsDm);
      const refreshed = await fetchCommunityPost(id);
      setPost(refreshed.post);
      setComments(refreshed.comments);
      setDraft('');
      setAcceptsDm(false);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'generic';
      setErrCode(code);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePost() {
    if (typeof window !== 'undefined' && !window.confirm(Co.detail.deletePostConfirm)) return;
    setBusy(true);
    try {
      await deleteCommunityPost(id);
      router.replace(post && post.communityId !== '_lounge' ? `/community/view?id=${post.communityId}` : '/community');
    } catch (err) {
      setErrCode(err instanceof Error ? err.message : 'generic');
      setBusy(false);
    }
  }

  function startEditComment(c: CommunityComment) {
    setEditingId(c.id);
    setEditDraft(c.body);
  }

  async function saveEditComment(commentId: string) {
    if (editDraft.trim() === '') return;
    setBusy(true);
    setErrCode(null);
    try {
      await updateCommunityComment(id, commentId, editDraft.trim());
      const refreshed = await fetchCommunityPost(id);
      setComments(refreshed.comments);
      setEditingId(null);
      setEditDraft('');
    } catch (err) {
      setErrCode(err instanceof Error ? err.message : 'generic');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (typeof window !== 'undefined' && !window.confirm(Co.detail.deleteCommentConfirm)) return;
    setBusy(true);
    try {
      await deleteCommunityComment(id, commentId);
      const refreshed = await fetchCommunityPost(id);
      setComments(refreshed.comments);
    } catch (err) {
      setErrCode(err instanceof Error ? err.message : 'generic');
    } finally {
      setBusy(false);
    }
  }

  async function handleStartDm(comment: CommunityComment) {
    if (!comment.authorNickname || dmBusyId) return;
    setDmBusyId(comment.id);
    setErrCode(null);
    try {
      const { conversation } = await openDm(comment.authorNickname);
      router.push(`/messages/view?id=${conversation.id}`);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'generic';
      setErrCode(code);
      setDmBusyId(null);
    }
  }

  async function handleLike() {
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      await toggleCommunityLike(id);
      const refreshed = await fetchCommunityPost(id);
      setPost(refreshed.post);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'generic';
      setErrCode(code);
    } finally {
      setLikeBusy(false);
    }
  }

  return (
    <AppShell title={Co.pageTitle} showBack backHref="/community" decoration="dots">
      <article className="mt-4 space-y-3">
        <header>
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {Co.detail.authorLabel} · {author}
            </p>
            {canManage && (
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/community/new?edit=${post.id}&cid=${post.communityId}`}
                  className="text-[11px] font-semibold text-brand-700 dark:text-brand-300"
                >
                  {Co.detail.editCta}
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDeletePost()}
                  disabled={busy}
                  className="text-[11px] font-semibold text-rose-600 disabled:opacity-60 dark:text-rose-300"
                >
                  {Co.detail.deleteCta}
                </button>
              </div>
            )}
          </div>
          <h1 className="mt-1 text-xl font-bold leading-tight tracking-tight text-stone-900 dark:text-stone-100">
            {post.title}
          </h1>
        </header>

        {post.videoUrls.map((v, i) => {
          const emb = parseYouTubeEmbed(v);
          return emb ? (
            <div key={`v${i}`} className="card-shadow overflow-hidden rounded-2xl">
              <iframe
                src={emb}
                title={post.title}
                className="aspect-video w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a
              key={`v${i}`}
              href={v}
              target="_blank"
              rel="noreferrer"
              className="card-shadow flex items-center justify-between rounded-2xl bg-white px-4 py-3 dark:bg-stone-900"
            >
              <span className="truncate text-[12px] text-brand-700 dark:text-brand-300">{v}</span>
              <ChevronRightIcon className="h-4 w-4 text-stone-400" />
            </a>
          );
        })}

        <PostBody post={post} />

        {post.snsUrls.map((s, i) => (
          <a
            key={`s${i}`}
            href={s}
            target="_blank"
            rel="noreferrer"
            className="card-shadow flex items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 dark:bg-stone-900"
          >
            <span className="inline-flex items-center gap-2 truncate text-[12px] font-semibold text-brand-700 dark:text-brand-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span className="truncate">{s}</span>
            </span>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400" />
          </a>
        ))}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLike}
            disabled={likeBusy}
            className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700 transition active:scale-[0.98] disabled:opacity-60 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <HeartPulseIcon className="h-4 w-4" />
            {Co.likeLabel} {post.likeCount}
          </button>
          <span className="text-[12px] font-medium text-stone-600 dark:text-stone-400">
            {Co.commentLabel} {post.commentCount}
          </span>
        </div>
      </article>

      <section className="mt-6">
        <h2 className="px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {Co.detail.commentSectionTitle}
        </h2>

        <ul className="mt-2 space-y-2">
          {comments.length === 0 && (
            <li className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[12px] text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
              {Co.detail.noComments}
            </li>
          )}
          {comments.map((c) => {
            const canDm = c.acceptsDm && !c.isSelf && !!c.authorNickname;
            return (
              <li
                key={c.id}
                className="card-shadow rounded-2xl bg-white px-4 py-3 dark:bg-stone-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                    {c.authorNickname ?? `${Co.pseudonymPrefix}·${c.userPseudonymId.slice(0, 6)}`}
                  </p>
                  {canDm && (
                    <button
                      type="button"
                      onClick={() => void handleStartDm(c)}
                      disabled={dmBusyId !== null}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700 transition active:scale-[0.97] disabled:opacity-60 dark:bg-brand-900/40 dark:text-brand-200"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      {dmBusyId === c.id ? Co.detail.dmStarting : Co.detail.dmCta}
                    </button>
                  )}
                </div>
                {editingId === c.id ? (
                  <div className="mt-1 space-y-2">
                    <textarea
                      value={editDraft}
                      maxLength={500}
                      rows={3}
                      onChange={(e) => setEditDraft(e.target.value)}
                      className="block w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void saveEditComment(c.id)}
                        disabled={busy || editDraft.trim() === ''}
                        className="rounded-xl bg-brand-600 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
                      >
                        {Co.detail.saveCta}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-xl border border-stone-300 px-3 py-1.5 text-[12px] font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-200"
                      >
                        {Co.detail.cancelCta}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-stone-700 dark:text-stone-200">
                      {c.body}
                    </p>
                    {c.isSelf && (
                      <div className="mt-1.5 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => startEditComment(c)}
                          className="text-[11px] font-semibold text-brand-700 dark:text-brand-300"
                        >
                          {Co.detail.editCta}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteComment(c.id)}
                          disabled={busy}
                          className="text-[11px] font-semibold text-rose-600 disabled:opacity-60 dark:text-rose-300"
                        >
                          {Co.detail.deleteCta}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>

        <form onSubmit={handleAddComment} className="mt-3 space-y-2">
          <label className="block">
            <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
              {Co.detail.commentField.label}
            </span>
            <textarea
              value={draft}
              placeholder={Co.detail.commentField.placeholder}
              maxLength={500}
              rows={3}
              onChange={(e) => setDraft(e.target.value)}
              className="mt-1 block w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={acceptsDm}
              onChange={(e) => setAcceptsDm(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500 dark:border-stone-700"
            />
            <span className="text-[12px] text-stone-600 dark:text-stone-300">
              {Co.detail.dmAcceptLabel}
            </span>
          </label>
          {errCode && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
              {Co.error[errCode as keyof typeof Co.error] ?? Co.error.generic}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || draft.trim() === ''}
            className="inline-flex w-full items-center justify-between rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
          >
            <span>
              {submitting ? Co.detail.commentSubmitting : Co.detail.commentSubmit}
            </span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </form>
      </section>

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {Co.disclaimer}
      </div>

      <div className="mt-3 flex justify-center">
        <Link
          href="/community"
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 dark:text-brand-300"
        >
          <span>{Co.detail.backToFeed}</span>
          <ChevronRightIcon className="h-3 w-3" />
        </Link>
      </div>
    </AppShell>
  );
}

const BODY_CLASS =
  'whitespace-pre-wrap text-[14px] leading-relaxed text-stone-800 dark:text-stone-200';

// 본문 + 첨부 이미지를 위치(top/middle/bottom)에 맞게 배치. 서식 세그먼트가 있으면 RichBodyView 로 렌더.
function PostBody({ post }: { post: CommunityPost }) {
  const imageEl = post.imageData ? (
    <div className="card-shadow overflow-hidden rounded-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:${post.imageMime ?? 'image/jpeg'};base64,${post.imageData}`}
        alt=""
        className="w-full"
      />
    </div>
  ) : null;

  const segs = post.bodyRich ?? null;

  if (imageEl && post.imagePosition === 'middle') {
    if (segs && segs.length > 0) {
      const [a, b] = splitSegments(segs);
      return (
        <>
          <RichBodyView segments={a} fallback={post.body} className={BODY_CLASS} />
          {imageEl}
          {b.length > 0 && <RichBodyView segments={b} fallback="" className={BODY_CLASS} />}
        </>
      );
    }
    const [a, b] = splitPlain(post.body);
    return (
      <>
        <p className={BODY_CLASS}>{a}</p>
        {imageEl}
        {b.trim() !== '' && <p className={BODY_CLASS}>{b}</p>}
      </>
    );
  }

  const bodyEl = <RichBodyView segments={segs} fallback={post.body} className={BODY_CLASS} />;
  return (
    <>
      {imageEl && post.imagePosition === 'top' && imageEl}
      {bodyEl}
      {imageEl && post.imagePosition === 'bottom' && imageEl}
    </>
  );
}

function splitSegments(segs: RichSegment[]): [RichSegment[], RichSegment[]] {
  const total = segs.reduce((n, s) => n + s.t.length, 0);
  let acc = 0;
  let idx = segs.length;
  for (let i = 0; i < segs.length; i += 1) {
    acc += segs[i]?.t.length ?? 0;
    if (acc >= total / 2) {
      idx = i + 1;
      break;
    }
  }
  return [segs.slice(0, idx), segs.slice(idx)];
}

function splitPlain(text: string): [string, string] {
  if (text.length < 2) return [text, ''];
  const mid = Math.floor(text.length / 2);
  const nl = text.indexOf('\n', mid);
  const cut = nl >= 0 ? nl : mid;
  return [text.slice(0, cut), text.slice(cut)];
}

function parseYouTubeEmbed(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host.endsWith('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith('/embed/')) return rawUrl;
    }
    if (host.endsWith('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}
