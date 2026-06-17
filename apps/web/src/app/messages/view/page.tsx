'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  fetchConversation,
  fetchMessages,
  markConversationRead,
  sendMessage,
  leaveConversation,
  type ChatMessage,
  type ConversationDetail,
} from '@/lib/api-client';

const POLL_MS = 4000;

function ThreadInner() {
  const { t } = useI18n();
  const M = t.messaging;
  const router = useRouter();
  const params = useSearchParams();
  const id = params?.get('id') ?? '';

  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [errCode, setErrCode] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetchMessages(id);
      setMessages(res.messages);
      void markConversationRead(id);
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_A_MEMBER') setForbidden(true);
    }
  }, [id]);

  useEffect(() => {
    if (!readSession()) {
      router.replace('/signup');
      return;
    }
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const detail = await fetchConversation(id);
        if (active) setConv(detail.conversation);
      } catch (err) {
        if (err instanceof Error && err.message === 'NOT_A_MEMBER' && active) setForbidden(true);
      }
      await loadMessages();
      if (active) setLoading(false);
    })();
    const timer = setInterval(loadMessages, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id, router, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  function errText(code: string): string {
    const map: Record<string, string> = {
      FORBIDDEN_KEYWORD: M.errorForbiddenKeyword,
      NOT_A_MEMBER: M.errorNotMember,
    };
    return map[code] ?? M.errorGeneric;
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text.length === 0) return;
    setSending(true);
    setErrCode(null);
    try {
      await sendMessage(id, text);
      setBody('');
      await loadMessages();
    } catch (err) {
      setErrCode(err instanceof Error ? err.message : 'generic');
    } finally {
      setSending(false);
    }
  }

  async function handleLeave() {
    if (typeof window !== 'undefined' && !window.confirm(M.leaveConfirm)) return;
    try {
      await leaveConversation(id);
    } catch {
      /* noop */
    }
    router.replace('/messages');
  }

  const title = conv?.displayName ?? M.unknownUser;

  return (
    <AppShell title={title} showBack backHref="/messages" hideBottomNav>
      {forbidden ? (
        <div className="mt-10 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {M.errorNotMember}
        </div>
      ) : (
        <div className="flex h-[calc(100vh-8rem)] flex-col">
          {conv && (
            <div className="flex items-center justify-end pb-1">
              <button
                type="button"
                onClick={handleLeave}
                className="text-[11px] font-medium text-stone-400 underline-offset-2 hover:underline"
              >
                {M.leave}
              </button>
            </div>
          )}

          <div className="flex-1 space-y-2 overflow-y-auto py-2">
            {loading && (
              <div className="mt-10 flex justify-center">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
              </div>
            )}
            {!loading &&
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.isMine ? 'items-end' : 'items-start'}`}
                >
                  {!m.isMine && conv?.kind === 'room' && (
                    <span className="mb-0.5 px-1 text-[10px] font-medium text-stone-400">
                      {m.senderNickname ?? M.unknownUser}
                    </span>
                  )}
                  <div
                    className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14px] ${
                      m.isMine
                        ? 'bg-brand-600 text-white'
                        : 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              ))}
            <div ref={bottomRef} />
          </div>

          {errCode && (
            <p className="px-1 pb-1 text-[12px] text-rose-600 dark:text-rose-300">
              {errText(errCode)}
            </p>
          )}

          <form onSubmit={handleSend} className="flex items-end gap-2 pt-2">
            <textarea
              value={body}
              placeholder={M.inputPlaceholder}
              maxLength={2000}
              rows={1}
              onChange={(e) => setBody(e.target.value)}
              className="block max-h-28 w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            />
            <button
              type="submit"
              disabled={sending || body.trim().length === 0}
              aria-label={M.send}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-white transition active:scale-95 disabled:opacity-60 dark:bg-white dark:text-stone-900"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </form>
        </div>
      )}
    </AppShell>
  );
}

export default function ThreadPage() {
  return (
    <Suspense fallback={null}>
      <ThreadInner />
    </Suspense>
  );
}
