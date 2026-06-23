'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  deleteConversation,
  deleteMessage,
  downloadMessageFile,
  fetchConversation,
  fetchMessages,
  markConversationRead,
  sendMessage,
  leaveConversation,
  uploadMessageFile,
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
  const [fileBusy, setFileBusy] = useState(false);
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
      UNSUPPORTED_FILE_TYPE: M.errorUnsupportedFile,
      FILE_TOO_LARGE: M.errorFileTooLarge,
      UPLOAD_FAILED: M.errorGeneric,
    };
    return map[code] ?? M.errorGeneric;
  }

  async function handleDeleteMessage(messageId: string) {
    if (typeof window !== 'undefined' && !window.confirm(M.deleteMessageConfirm)) return;
    try {
      await deleteMessage(id, messageId);
      await loadMessages();
    } catch (err) {
      setErrCode(err instanceof Error ? err.message : 'generic');
    }
  }

  async function handleDownload(messageId: string, fileName: string) {
    // 다운로드 전 사용자 의사 확인.
    if (typeof window !== 'undefined' && !window.confirm(`${M.downloadConfirm}\n${fileName}`)) return;
    try {
      await downloadMessageFile(messageId, fileName);
    } catch (err) {
      setErrCode(err instanceof Error ? err.message : 'generic');
    }
  }

  async function handleFile(file: File | null) {
    if (!file || fileBusy) return;
    setFileBusy(true);
    setErrCode(null);
    try {
      await uploadMessageFile(id, file);
      await loadMessages();
    } catch (err) {
      setErrCode(err instanceof Error ? err.message : 'generic');
    } finally {
      setFileBusy(false);
    }
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

  async function handleDeleteRoom() {
    if (typeof window !== 'undefined' && !window.confirm(M.deleteRoomConfirm)) return;
    try {
      await deleteConversation(id);
    } catch {
      /* noop */
    }
    router.replace('/messages');
  }

  const isRoomOwner = conv?.kind === 'room' && conv.isOwner;

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
              {isRoomOwner ? (
                <button
                  type="button"
                  onClick={handleDeleteRoom}
                  className="text-[11px] font-medium text-rose-500 underline-offset-2 hover:underline"
                >
                  {M.deleteRoom}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLeave}
                  className="text-[11px] font-medium text-stone-400 underline-offset-2 hover:underline"
                >
                  {M.leave}
                </button>
              )}
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
                  {m.body && (
                    <div
                      className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14px] ${
                        m.isMine
                          ? 'bg-brand-600 text-white'
                          : 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                      }`}
                    >
                      <MessageBody body={m.body} mine={m.isMine} />
                    </div>
                  )}
                  {m.attachment && (
                    <button
                      type="button"
                      onClick={() => void handleDownload(m.id, m.attachment?.name ?? 'file')}
                      className={`mt-0.5 flex max-w-[78%] items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.98] ${
                        m.isMine
                          ? 'border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/30'
                          : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900'
                      }`}
                    >
                      <FileIcon type={m.attachment.type} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-stone-800 dark:text-stone-100">
                          {m.attachment.name}
                        </span>
                        <span className="block text-[10px] text-stone-500 dark:text-stone-400">
                          {formatSize(m.attachment.size)} · {M.download}
                        </span>
                      </span>
                    </button>
                  )}
                  {m.isMine && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteMessage(m.id)}
                      className="mt-0.5 px-1 text-[10px] font-medium text-stone-400 underline-offset-2 hover:underline"
                    >
                      {M.deleteMessage}
                    </button>
                  )}
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
            <label
              aria-label={M.attach}
              title={M.attach}
              className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-stone-300 text-stone-600 transition active:scale-95 dark:border-stone-700 dark:text-stone-300 ${
                fileBusy ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              {fileBusy ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-brand-600" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              )}
              <input
                type="file"
                accept=".jpg,.jpeg,.pdf,.ppt,.pptx,image/jpeg,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                disabled={fileBusy}
                onChange={(e) => {
                  void handleFile(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
            </label>
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

// 메시지 본문 중 URL을 감지해 클릭 가능한 링크(새 탭)로 렌더링.
// http(s):// 절대 URL과 www. 로 시작하는 도메인을 모두 인식.
const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

function MessageBody({ body, mine }: { body: string; mine: boolean }) {
  const parts: Array<{ text: string; href: string | null }> = [];
  let last = 0;
  for (const match of body.matchAll(URL_RE)) {
    const raw = match[0];
    const start = match.index ?? 0;
    if (start > last) parts.push({ text: body.slice(last, start), href: null });
    // 문장 끝 구두점은 링크에서 제외.
    const trimmed = raw.replace(/[.,!?)\]}"'»]+$/, '');
    const trailing = raw.slice(trimmed.length);
    const href = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    parts.push({ text: trimmed, href });
    if (trailing) parts.push({ text: trailing, href: null });
    last = start + raw.length;
  }
  if (last < body.length) parts.push({ text: body.slice(last), href: null });

  return (
    <>
      {parts.map((p, i) =>
        p.href ? (
          <a
            key={i}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline underline-offset-2 break-all ${
              mine ? 'text-white decoration-white/70' : 'text-brand-700 dark:text-brand-300'
            }`}
          >
            {p.text}
          </a>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  const isImg = type.startsWith('image/');
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
      {isImg ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      )}
    </span>
  );
}

export default function ThreadPage() {
  return (
    <Suspense fallback={null}>
      <ThreadInner />
    </Suspense>
  );
}
