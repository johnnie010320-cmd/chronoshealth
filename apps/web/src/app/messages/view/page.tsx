'use client';

import { Fragment, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ChevronRightIcon, GlobeIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { previewMode, renderOfficeHtml } from '@/lib/office-preview';
import {
  addMessageReaction,
  deleteConversation,
  deleteMessage,
  downloadMessageFile,
  fetchConversation,
  fetchMessages,
  markConversationRead,
  removeMessageReaction,
  sendMessage,
  leaveConversation,
  uploadMessageFile,
  fetchMessageFileObjectUrl,
  fetchMessageFileBytes,
  translateText,
  REACTION_EMOJIS,
  type ChatMessage,
  type ConversationDetail,
} from '@/lib/api-client';

const POLL_MS = 4000;

// id 기준 합치고 created_at 오름차순 정렬. 겹치면 새 값(b) 우선(읽음·반응 최신 반영).
function mergeAsc(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of a) map.set(m.id, m);
  for (const m of b) map.set(m.id, m);
  return [...map.values()].sort((x, y) =>
    x.createdAt < y.createdAt ? -1 : x.createdAt > y.createdAt ? 1 : 0,
  );
}

function ThreadInner() {
  const { t, locale } = useI18n();
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
  // 답장 대상 + 컨텍스트 메뉴(우클릭/롱프레스로 연 메시지 id).
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // 메시지별 번역 결과(휘발 — 화면 상태로만 보관). id → 번역문. 현재 번역 중인 메시지 id 별도 추적.
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  // 첨부 미리보기 모달.
  //  - image/pdf : url(objectURL)로 인라인 렌더
  //  - office(docx/xlsx/xls) : html(브라우저 내 변환 결과)를 sandbox iframe 으로 렌더
  //  - unsupported(ppt/pptx·레거시 doc·기타) : 안내 + 다운로드만
  //  - failed : office 변환 실패 → 안내 + 다운로드
  const [preview, setPreview] = useState<{
    messageId: string;
    name: string;
    type: string;
    mode: 'image' | 'pdf' | 'office' | 'unsupported';
    url: string | null;
    html: string | null;
    failed: boolean;
  } | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  // 과거 메시지 prepend 시 스크롤 위치 보존용(이전 높이·스크롤톱).
  const preserveScrollRef = useRef<{ height: number; top: number } | null>(null);
  const initedRef = useRef(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetchMessages(id);
      // 폴링/최초 로드: 최신 페이지를 기존 목록과 병합(이미 불러온 과거 메시지 유지).
      // 단, 이번에 받아온 최신 페이지 구간(oldestFetched 이후)은 서버 응답을 '정본'으로
      // 삼아 재조정한다 — 삭제된 메시지가 prev 에 남아 화면에서 사라지지 않는 버그 방지.
      // 그보다 과거(페이지네이션으로 불러온 옛 기록)는 이번 응답에 없으므로 그대로 보존.
      setMessages((prev) => {
        if (prev.length === 0) return res.messages;
        const oldestFetched = res.messages[0]?.createdAt;
        if (oldestFetched === undefined) return prev;
        const olderHistory = prev.filter((m) => m.createdAt < oldestFetched);
        return mergeAsc(olderHistory, res.messages);
      });
      // '더 보기' 여부는 최초 로드의 hasMore로만 초기화(이후엔 loadOlder가 갱신).
      if (!initedRef.current) {
        initedRef.current = true;
        setHasMoreOlder(res.hasMore);
      }
      void markConversationRead(id);
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_A_MEMBER') setForbidden(true);
    }
  }, [id]);

  const loadOlder = useCallback(async () => {
    if (!id || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    const cursor = messages[0]?.createdAt;
    const el = listRef.current;
    const snapshot = el ? { height: el.scrollHeight, top: el.scrollTop } : null;
    try {
      const res = await fetchMessages(id, cursor);
      if (res.messages.length > 0) {
        preserveScrollRef.current = snapshot;
        setMessages((prev) => mergeAsc(res.messages, prev));
      }
      setHasMoreOlder(res.hasMore);
    } catch {
      /* noop — 다음 시도에서 재요청 */
    } finally {
      setLoadingMore(false);
    }
  }, [id, loadingMore, messages]);

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

  useLayoutEffect(() => {
    // 과거 메시지를 prepend한 경우: 보던 위치 유지(맨 아래로 튀지 않게).
    const snap = preserveScrollRef.current;
    const el = listRef.current;
    if (snap && el) {
      el.scrollTop = el.scrollHeight - snap.height + snap.top;
      preserveScrollRef.current = null;
      return;
    }
    // 그 외(최초 로드·새 메시지 추가): 맨 아래로.
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  // 입력창 자동 높이 — 텍스트가 길어지면 늘어나고, 최대(약 6줄) 도달 시 스크롤.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [body]);

  // 미리보기 objectURL 은 모달이 닫히거나 다른 파일로 바뀔 때(또는 언마운트 시) 해제 — 메모리 누수 방지.
  useEffect(() => {
    const url = preview?.url;
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [preview]);

  function errText(code: string): string {
    const map: Record<string, string> = {
      FORBIDDEN_KEYWORD: M.errorForbiddenKeyword,
      NOT_A_MEMBER: M.errorNotMember,
      UNSUPPORTED_FILE_TYPE: M.errorUnsupportedFile,
      FILE_TOO_LARGE: M.errorFileTooLarge,
      UPLOAD_FAILED: M.errorGeneric,
      TRANSLATE_FAILED: M.translateFailed,
    };
    return map[code] ?? M.errorGeneric;
  }

  async function handleDeleteMessage(messageId: string) {
    if (typeof window !== 'undefined' && !window.confirm(M.deleteMessageConfirm)) return;
    try {
      await deleteMessage(id, messageId);
      // 낙관적 제거 — 재조정(loadMessages) 전에도 즉시 화면에서 사라지게.
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
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

  // 첨부 탭 → 미리보기.
  //  - 이미지·PDF : blob(objectURL)을 받아 인라인 렌더
  //  - Word(docx)·Excel(xlsx/xls) : 바이트를 받아 브라우저 안에서 HTML 로 변환 후 sandbox iframe 렌더
  //  - PPT/레거시(ppt/pptx/doc)·기타 : 변환 불가 → '미리보기 미지원' 안내 + 다운로드만
  // 어느 경우에도 파일 바이트는 외부로 전송되지 않는다(전부 인증된 게이트웨이 ↔ 브라우저 내 처리).
  async function openPreview(m: ChatMessage) {
    const att = m.attachment;
    if (!att) return;
    const mode = previewMode(att.name, att.type);
    if (mode === 'unsupported') {
      setPreview({
        messageId: m.id, name: att.name, type: att.type, mode, url: null, html: null, failed: false,
      });
      return;
    }
    if (previewLoadingId) return;
    setPreviewLoadingId(m.id);
    setErrCode(null);
    try {
      if (mode === 'office') {
        const bytes = await fetchMessageFileBytes(m.id);
        const html = await renderOfficeHtml(att.name, bytes);
        setPreview({
          messageId: m.id, name: att.name, type: att.type, mode, url: null, html, failed: false,
        });
      } else {
        const url = await fetchMessageFileObjectUrl(m.id);
        setPreview({
          messageId: m.id, name: att.name, type: att.type, mode, url, html: null, failed: false,
        });
      }
    } catch (err) {
      // office 변환 실패는 모달 안에서 안내(다운로드 유도), 그 외(이미지·PDF 다운로드 실패)는 하단 에러.
      if (mode === 'office') {
        setPreview({
          messageId: m.id, name: att.name, type: att.type, mode, url: null, html: null, failed: true,
        });
      } else {
        setErrCode(err instanceof Error ? err.message : 'generic');
      }
    } finally {
      setPreviewLoadingId(null);
    }
  }

  function closePreview() {
    setPreview(null);
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
      await sendMessage(id, text, replyTarget?.id ?? null);
      setBody('');
      setReplyTarget(null);
      await loadMessages();
    } catch (err) {
      setErrCode(err instanceof Error ? err.message : 'generic');
    } finally {
      setSending(false);
    }
  }

  // 메시지에 이모티콘 반응 토글(이미 내가 단 이모지면 제거, 아니면 추가).
  async function toggleReaction(m: ChatMessage, emoji: string) {
    setMenuFor(null);
    const mine = m.reactions.find((r) => r.emoji === emoji)?.mine ?? false;
    try {
      if (mine) await removeMessageReaction(id, m.id, emoji);
      else await addMessageReaction(id, m.id, emoji);
      await loadMessages();
    } catch (err) {
      setErrCode(err instanceof Error ? err.message : 'generic');
    }
  }

  // 메시지 번역 — 내 앱 언어(locale)로 번역해 원문 아래에 표시. 번역문은 저장하지 않음.
  async function handleTranslate(m: ChatMessage) {
    setMenuFor(null);
    if (!m.body || translatingId || translations[m.id]) return;
    setTranslatingId(m.id);
    setErrCode(null);
    try {
      const translated = await translateText(m.body, locale);
      setTranslations((prev) => ({ ...prev, [m.id]: translated }));
    } catch {
      setErrCode('TRANSLATE_FAILED');
    } finally {
      setTranslatingId(null);
    }
  }

  // 번역 숨기고 원문만 보기.
  function hideTranslation(messageId: string) {
    setTranslations((prev) => {
      const next = { ...prev };
      delete next[messageId];
      return next;
    });
  }

  // 답장 시작 — 입력창에 인용 배너 표시 + 포커스.
  function startReply(m: ChatMessage) {
    setMenuFor(null);
    setReplyTarget(m);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  // 우클릭/롱프레스로 메시지 컨텍스트 메뉴 열기.
  function openMenu(messageId: string) {
    setMenuFor((cur) => (cur === messageId ? null : messageId));
  }
  function onPressStart(messageId: string) {
    pressTimer.current = setTimeout(() => setMenuFor(messageId), 480);
  }
  function onPressEnd() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
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
        <>
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

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto py-2">
            {loading && (
              <div className="mt-10 flex justify-center">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
              </div>
            )}
            {!loading && hasMoreOlder && (
              <div className="flex justify-center pb-1">
                <button
                  type="button"
                  onClick={() => void loadOlder()}
                  disabled={loadingMore}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[12px] font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  {loadingMore ? M.loadingOlder : M.loadOlder}
                </button>
              </div>
            )}
            {!loading &&
              messages.map((m, i) => {
                const prev = messages[i - 1];
                const showDate =
                  !prev || localDayKey(prev.createdAt) !== localDayKey(m.createdAt);
                return (
                <Fragment key={m.id}>
                  {/* 날짜 구분선 — 하루가 바뀔 때(입력 디바이스 로컬 달력 기준)만 표시 */}
                  {showDate && (
                    <div className="flex justify-center py-1">
                      <span className="rounded-full bg-stone-100 px-3 py-0.5 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                        {formatMsgDate(m.createdAt, locale)}
                      </span>
                    </div>
                  )}
                <div
                  className={`relative flex flex-col ${m.isMine ? 'items-end' : 'items-start'}`}
                >
                  {!m.isMine && conv?.kind === 'room' && (
                    <span className="mb-0.5 px-1 text-[10px] font-medium text-stone-400">
                      {m.senderNickname ?? M.unknownUser}
                    </span>
                  )}

                  {/* 답장 인용 미리보기 */}
                  {m.replyTo && (
                    <div
                      className={`max-w-[78%] truncate border-l-2 px-2.5 py-1 text-[11px] ${
                        m.isMine
                          ? 'border-brand-300 bg-brand-50 text-stone-600 dark:border-brand-700 dark:bg-brand-900/30 dark:text-stone-300'
                          : 'border-stone-300 bg-stone-50 text-stone-500 dark:border-stone-600 dark:bg-stone-800/60 dark:text-stone-400'
                      }`}
                    >
                      <span className="font-semibold">
                        {m.replyTo.senderNickname ?? M.unknownUser}
                      </span>
                      {' · '}
                      {m.replyTo.bodyPreview ? m.replyTo.bodyPreview.slice(0, 40) : '📎'}
                    </div>
                  )}

                  {/* 본문 + 첨부 — 우클릭/롱프레스로 답장·반응·삭제 메뉴 */}
                  <div
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openMenu(m.id);
                    }}
                    onTouchStart={() => onPressStart(m.id)}
                    onTouchEnd={onPressEnd}
                    onTouchMove={onPressEnd}
                    className={`flex w-full flex-col ${m.isMine ? 'items-end' : 'items-start'}`}
                  >
                    {m.body && (
                      <div
                        className={`flex max-w-[82%] items-end gap-1 ${
                          m.isMine ? 'flex-row' : 'flex-row-reverse'
                        }`}
                      >
                        {m.unreadCount > 0 && (
                          <span
                            aria-label={M.unreadByCount.replace('{n}', String(m.unreadCount))}
                            className="mb-1 shrink-0 text-[10px] font-bold leading-none tabular-nums text-amber-500"
                          >
                            {m.unreadCount}
                          </span>
                        )}
                        <div
                          className={`min-w-0 whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14px] ${
                            m.isMine
                              ? 'bg-brand-600 text-white'
                              : 'bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                          }`}
                        >
                          <MessageBody body={m.body} mine={m.isMine} />
                        </div>
                      </div>
                    )}
                    {/* 번역 진행/결과 — 원문 아래에 별도 말풍선으로 표시(원문 보존). */}
                    {m.body && translatingId === m.id && (
                      <span className="mt-0.5 px-1 text-[10px] text-stone-400">
                        {M.translating}
                      </span>
                    )}
                    {m.body && translations[m.id] && (
                      <div
                        className={`mt-0.5 flex max-w-[82%] flex-col ${
                          m.isMine ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className="min-w-0 whitespace-pre-wrap break-words rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 px-3.5 py-2 text-[14px] text-stone-800 dark:border-brand-700 dark:bg-brand-900/20 dark:text-stone-100">
                          <span className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                            <GlobeIcon className="h-3 w-3" />
                            {M.translate}
                          </span>
                          {translations[m.id]}
                        </div>
                        <button
                          type="button"
                          onClick={() => hideTranslation(m.id)}
                          className="mt-0.5 px-1 text-[10px] font-medium text-stone-400 underline-offset-2 hover:underline"
                        >
                          {M.showOriginal}
                        </button>
                      </div>
                    )}
                    {m.attachment && (
                      <div
                        className={`mt-0.5 flex max-w-[82%] items-end gap-1 ${
                          m.isMine ? 'flex-row' : 'flex-row-reverse'
                        }`}
                      >
                        {!m.body && m.unreadCount > 0 && (
                          <span
                            aria-label={M.unreadByCount.replace('{n}', String(m.unreadCount))}
                            className="mb-1 shrink-0 text-[10px] font-bold leading-none tabular-nums text-amber-500"
                          >
                            {m.unreadCount}
                          </span>
                        )}
                      <button
                        type="button"
                        onClick={() => void openPreview(m)}
                        className={`flex min-w-0 items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.98] ${
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
                            {formatSize(m.attachment.size)} ·{' '}
                            {previewLoadingId === m.id ? M.previewLoading : M.previewOpen}
                          </span>
                        </span>
                      </button>
                      </div>
                    )}
                  </div>

                  {/* 생성 시각 — 입력 디바이스 로컬 타임존·로케일로 표기 */}
                  <span className="mt-0.5 px-1 text-[10px] tabular-nums text-stone-400">
                    {formatMsgTime(m.createdAt, locale)}
                  </span>

                  {/* 반응 칩 */}
                  {m.reactions.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {m.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          type="button"
                          onClick={() => void toggleReaction(m, r.emoji)}
                          className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] transition active:scale-95 ${
                            r.mine
                              ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200'
                              : 'border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span className="tabular-nums">{r.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 컨텍스트 메뉴(답장 / 반응 / 삭제) */}
                  {menuFor === m.id && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setMenuFor(null)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setMenuFor(null);
                        }}
                      />
                      <div
                        className={`absolute bottom-full z-30 mb-1 flex flex-col gap-1 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-lg dark:border-stone-700 dark:bg-stone-900 ${
                          m.isMine ? 'right-0' : 'left-0'
                        }`}
                      >
                        <div className="flex gap-0.5">
                          {REACTION_EMOJIS.map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => void toggleReaction(m, e)}
                              className="rounded-full px-1.5 py-1 text-lg leading-none transition hover:bg-stone-100 dark:hover:bg-stone-800"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1 border-t border-stone-100 pt-1 dark:border-stone-800">
                          {m.body && !translations[m.id] && (
                            <button
                              type="button"
                              onClick={() => void handleTranslate(m)}
                              className="flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30"
                            >
                              {M.translate}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startReply(m)}
                            className="flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                          >
                            {M.reply}
                          </button>
                          {m.isMine && (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuFor(null);
                                void handleDeleteMessage(m.id);
                              }}
                              className="flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                            >
                              {M.deleteMessage}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                </Fragment>
                );
              })}
            <div ref={bottomRef} />
          </div>

          {errCode && (
            <p className="px-1 pb-1 text-[12px] text-rose-600 dark:text-rose-300">
              {errText(errCode)}
            </p>
          )}

          {/* 답장 인용 배너 — 전송 시 해당 메시지에 대한 답장으로 발송 */}
          {replyTarget && (
            <div className="mb-1 flex items-center gap-2 rounded-xl border-l-2 border-brand-400 bg-stone-50 px-3 py-1.5 dark:bg-stone-800/60">
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold text-brand-700 dark:text-brand-300">
                  {M.reply} · {replyTarget.senderNickname ?? M.unknownUser}
                </span>
                <span className="block truncate text-[11px] text-stone-500 dark:text-stone-400">
                  {replyTarget.body ? replyTarget.body.slice(0, 50) : '📎'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                aria-label={M.cancelReply}
                className="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium text-stone-500 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-stone-700"
              >
                {M.cancelReply}
              </button>
            </div>
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
                accept=".png,.jpg,.jpeg,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,image/png,image/jpeg,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                disabled={fileBusy}
                onChange={(e) => {
                  void handleFile(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
            </label>
            <textarea
              ref={inputRef}
              value={body}
              placeholder={M.inputPlaceholder}
              maxLength={2000}
              rows={1}
              onChange={(e) => setBody(e.target.value)}
              className="block max-h-40 w-full resize-none overflow-y-auto rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
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

        {/* 첨부 미리보기 모달 — 이미지·PDF 렌더, PPT 등은 미지원 안내 + 다운로드 제공. */}
        {preview && (
          <div
            className="fixed inset-0 z-40 flex flex-col bg-black/85 backdrop-blur-sm"
            onClick={closePreview}
          >
            <div
              className="safe-top flex items-center justify-between gap-3 px-4 py-3"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="min-w-0 truncate text-[13px] font-semibold text-white">
                {preview.name}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownload(preview.messageId, preview.name)}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/25"
                >
                  {M.download}
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  aria-label={M.previewClose}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div
              className="flex flex-1 items-center justify-center overflow-auto p-3"
              onClick={(e) => e.stopPropagation()}
            >
              {preview.mode === 'unsupported' || preview.failed ? (
                <div className="max-w-xs rounded-2xl bg-white/95 px-5 py-6 text-center text-[13px] leading-relaxed text-stone-700 dark:bg-stone-900/95 dark:text-stone-200">
                  {preview.failed ? M.previewFailed : M.previewUnsupported}
                </div>
              ) : preview.mode === 'office' ? (
                // 브라우저 내 변환 결과 HTML 을 sandbox(스크립트 차단)로 격리 렌더.
                <iframe
                  sandbox=""
                  srcDoc={preview.html ?? ''}
                  title={preview.name}
                  className="h-full w-full rounded-lg bg-white"
                />
              ) : preview.mode === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url ?? ''}
                  alt={preview.name}
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
              ) : (
                <iframe
                  src={preview.url ?? ''}
                  title={preview.name}
                  className="h-full w-full rounded-lg bg-white"
                />
              )}
            </div>
          </div>
        )}
        </>
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

// SQLite datetime('now') 은 "YYYY-MM-DD HH:MM:SS" (UTC, 타임존 마커 없음).
// 브라우저가 이 공백 형식을 로컬시간으로 오인 파싱하지 않도록 'T'+'Z' 로 UTC 를 명시한 뒤,
// toLocale* 로 뷰어의 입력 디바이스 로컬 타임존·로케일에 맞춰 표기한다.
function utcToLocal(sqlUtc: string): Date {
  return new Date(`${sqlUtc.replace(' ', 'T')}Z`);
}

function formatMsgTime(sqlUtc: string, locale: string): string {
  return utcToLocal(sqlUtc).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function formatMsgDate(sqlUtc: string, locale: string): string {
  return utcToLocal(sqlUtc).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

// 로컬(입력 디바이스) 달력 기준 하루 키 — 날짜 구분선 표시 여부 판단.
function localDayKey(sqlUtc: string): string {
  const d = utcToLocal(sqlUtc);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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
