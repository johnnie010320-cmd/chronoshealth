'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ChevronRightIcon, HeartPulseIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  addCommunityComment,
  fetchCommunityPost,
  openDm,
  toggleCommunityLike,
  type CommunityPost,
  type CommunityComment,
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
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [acceptsDm, setAcceptsDm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [dmBusyId, setDmBusyId] = useState<string | null>(null);

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
  const youtubeEmbed = parseYouTubeEmbed(post.videoUrl);

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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {Co.detail.authorLabel} · {author}
          </p>
          <h1 className="mt-1 text-xl font-bold leading-tight tracking-tight text-stone-900 dark:text-stone-100">
            {post.title}
          </h1>
        </header>

        {youtubeEmbed && (
          <div className="card-shadow overflow-hidden rounded-2xl">
            <iframe
              src={youtubeEmbed}
              title={post.title}
              className="aspect-video w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {!youtubeEmbed && post.videoUrl && (
          <a
            href={post.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="card-shadow flex items-center justify-between rounded-2xl bg-white px-4 py-3 dark:bg-stone-900"
          >
            <span className="truncate text-[12px] text-brand-700 dark:text-brand-300">
              {post.videoUrl}
            </span>
            <ChevronRightIcon className="h-4 w-4 text-stone-400" />
          </a>
        )}

        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-stone-800 dark:text-stone-200">
          {post.body}
        </p>

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
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-stone-700 dark:text-stone-200">
                  {c.body}
                </p>
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
