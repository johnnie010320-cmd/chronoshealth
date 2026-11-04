'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { ChatBubbleIcon, ChevronRightIcon, UsersIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { fetchConversations, openDm, type ConversationListItem } from '@/lib/api-client';
import { NicknameAutocomplete } from '@/components/NicknameAutocomplete';

export default function MessagesPage() {
  const { t } = useI18n();
  const M = t.messaging;
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [dmOpen, setDmOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errCode, setErrCode] = useState<string | null>(null);

  useEffect(() => {
    if (!readSession()) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    fetchConversations()
      .then(setItems)
      .catch(() => {
        /* noop */
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleOpenDm(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrCode(null);
    try {
      const res = await openDm(nickname.trim());
      router.push(`/messages/view?id=${res.conversation.id}`);
    } catch (err) {
      setErrCode(err instanceof Error ? err.message : 'generic');
      setSubmitting(false);
    }
  }

  function errText(code: string): string {
    const map: Record<string, string> = {
      USER_NOT_FOUND: M.errorUserNotFound,
      CANNOT_DM_SELF: M.errorCannotDmSelf,
      FORBIDDEN_KEYWORD: M.errorForbiddenKeyword,
    };
    return map[code] ?? M.errorGeneric;
  }

  if (!signedIn && !loading) {
    return (
      <AppShell title={M.pageTitle} decoration="dots">
        <LoginRequired />
      </AppShell>
    );
  }

  return (
    <AppShell title={M.pageTitle} decoration="dots">
      <section className="grad-cyan card-shadow relative mt-3 overflow-hidden rounded-3xl px-5 py-5">
        <span
          className="blob"
          style={{
            width: 130,
            height: 130,
            right: -22,
            top: -30,
            background: 'radial-gradient(circle, #a5f3fc, transparent 70%)',
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <ChatBubbleIcon className="h-6 w-6 text-white" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold tracking-tight text-white">{M.pageTitle}</h1>
            <p className="mt-0.5 text-[12px] leading-relaxed text-white/85">{M.emptyBody}</p>
          </div>
        </div>
      </section>

      <section className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDmOpen((v) => !v)}
          className="tile-sky card-shadow inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-[12px] font-semibold"
        >
          <ChatBubbleIcon className="h-4 w-4" />
          <span>{M.newDm}</span>
        </button>
        <Link
          href="/messages/room/new"
          className="card-sky card-shadow inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-sky-700 dark:text-sky-200"
        >
          <UsersIcon className="h-4 w-4" />
          <span>{M.newRoom}</span>
        </Link>
      </section>

      {dmOpen && (
        <form
          onSubmit={handleOpenDm}
          className="card-shadow card-sky mt-3 rounded-2xl px-4 py-3"
        >
          <label className="block text-[12px] font-semibold text-stone-700 dark:text-stone-300">
            {M.dmNicknameLabel}
          </label>
          <div className="mt-1 flex gap-2">
            <div className="min-w-0 flex-1">
              <NicknameAutocomplete
                value={nickname}
                onChange={setNickname}
                placeholder={M.dmNicknamePlaceholder}
              />
            </div>
            <button
              type="submit"
              disabled={submitting || nickname.trim().length < 2}
              className="shrink-0 rounded-2xl bg-brand-600 px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {M.dmSubmit}
            </button>
          </div>
          {errCode && (
            <p className="mt-2 text-[12px] text-rose-600 dark:text-rose-300">{errText(errCode)}</p>
          )}
        </form>
      )}

      {loading && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="card-shadow card-sky relative mt-5 overflow-hidden rounded-2xl px-4 py-8 text-center">
          <span
            className="blob"
            style={{
              width: 120,
              height: 120,
              right: -24,
              top: -30,
              background: 'radial-gradient(circle, #7dd3fc, transparent 70%)',
            }}
          />
          <span className="tile-sky relative mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl">
            <ChatBubbleIcon className="h-6 w-6 text-white" />
          </span>
          <p className="relative mt-3 text-sm font-semibold text-stone-900 dark:text-stone-100">{M.emptyTitle}</p>
          <p className="relative mt-1 text-[12px] text-stone-500 dark:text-stone-400">{M.emptyBody}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <ul className="card-shadow card-sky mt-4 divide-y divide-sky-100 overflow-hidden rounded-2xl dark:divide-sky-900/30">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages/view?id=${c.id}`}
                className="flex items-start gap-3 px-4 py-3 transition active:bg-sky-100/50 dark:active:bg-sky-900/20"
              >
                <span className="tile-sky mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white">
                  {c.kind === 'room' ? (
                    <UsersIcon className="h-5 w-5" />
                  ) : (
                    <ChatBubbleIcon className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {c.displayName ?? M.unknownUser}
                      {c.kind === 'room' && c.memberCount > 0 && (
                        <span className="ml-1.5 text-[11px] font-normal text-stone-400">
                          · {c.memberCount}
                        </span>
                      )}
                    </p>
                    {c.unreadCount > 0 && (
                      <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  {c.lastMessage && (
                    <p className="mt-0.5 line-clamp-1 text-[12px] text-stone-600 dark:text-stone-400">
                      {c.lastMessage.body}
                    </p>
                  )}
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 self-center text-stone-400 dark:text-stone-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="card-sky card-shadow mt-4 rounded-2xl px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
        {M.notice}
      </div>
    </AppShell>
  );
}
