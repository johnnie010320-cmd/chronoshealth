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
      <section className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDmOpen((v) => !v)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-stone-900 px-3 py-2.5 text-[12px] font-semibold text-white dark:bg-white dark:text-stone-900"
        >
          <ChatBubbleIcon className="h-4 w-4" />
          <span>{M.newDm}</span>
        </button>
        <Link
          href="/messages/room/new"
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-stone-300 px-3 py-2.5 text-[12px] font-semibold text-stone-800 dark:border-stone-700 dark:text-stone-100"
        >
          <UsersIcon className="h-4 w-4" />
          <span>{M.newRoom}</span>
        </Link>
      </section>

      {dmOpen && (
        <form
          onSubmit={handleOpenDm}
          className="card-shadow mt-3 rounded-2xl bg-white px-4 py-3 dark:bg-stone-900"
        >
          <label className="block text-[12px] font-semibold text-stone-700 dark:text-stone-300">
            {M.dmNicknameLabel}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={nickname}
              placeholder={M.dmNicknamePlaceholder}
              maxLength={8}
              onChange={(e) => setNickname(e.target.value)}
              className="block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            />
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
        <div className="card-shadow mt-5 rounded-2xl bg-white px-4 py-8 text-center dark:bg-stone-900">
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{M.emptyTitle}</p>
          <p className="mt-1 text-[12px] text-stone-500 dark:text-stone-400">{M.emptyBody}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <ul className="card-shadow mt-4 divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages/view?id=${c.id}`}
                className="flex items-start gap-3 px-4 py-3 transition active:bg-stone-50 dark:active:bg-stone-800/50"
              >
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
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

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {M.notice}
      </div>
    </AppShell>
  );
}
