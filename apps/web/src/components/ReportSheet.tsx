'use client';

// 신고·차단 (2026-11-08 죠니 — Google Play 사용자 제작 콘텐츠 정책: 앱 안 신고·사용자 차단 필수).
// 글·댓글·메시지 옆 '신고' 단추 → 아래에서 올라오는 창: 사유 고르기 + (선택) 자세히 + '이 사용자 차단하기'.
// '차단만 하기'도 같은 창에 있다. 차단하면 서로의 글·댓글·메시지가 보이지 않는다.
// 마이페이지의 '차단한 사용자'(BlockedUsers)에서 풀 수 있다.

import { useEffect, useState } from 'react';
import { useI18n, type Locale } from '@/lib/i18n';
import {
  blockAuthor,
  fetchMyBlocks,
  reportContent,
  unblockUser,
  type BlockedUser,
  type ReportReason,
  type ReportTarget,
} from '@/lib/api-client';

const REASONS: ReportReason[] = ['spam', 'abuse', 'sexual', 'violence', 'self_harm', 'misinfo', 'other'];

type Dict = {
  report: string;
  title: Record<ReportTarget, string>;
  reasons: Record<ReportReason, string>;
  detail: string;
  alsoBlock: string;
  submit: string;
  sending: string;
  blockOnly: string;
  blockConfirm: string;
  cancel: string;
  done: string;
  doneBlocked: string;
  failed: string;
  note: string;
  blockedTitle: string;
  blockedEmpty: string;
  unblock: string;
  unblockConfirm: string;
  unknownUser: string;
};

export const SAFETY_DICTS: Record<Locale, Dict> = {
  ko: {
    report: '신고',
    title: { post: '이 글 신고하기', comment: '이 댓글 신고하기', message: '이 메시지 신고하기' },
    reasons: {
      spam: '스팸·광고',
      abuse: '욕설·괴롭힘·혐오',
      sexual: '음란·성적인 내용',
      violence: '폭력·위협',
      self_harm: '자해·자살 관련',
      misinfo: '잘못된 건강 정보',
      other: '기타',
    },
    detail: '자세히 (선택)',
    alsoBlock: '이 사용자 차단하기 — 서로의 글·댓글·메시지가 보이지 않습니다',
    submit: '신고하기',
    sending: '보내는 중…',
    blockOnly: '신고 없이 차단만 하기',
    blockConfirm: '이 사용자를 차단할까요? 서로의 글·댓글·메시지가 보이지 않습니다.',
    cancel: '닫기',
    done: '신고가 접수되었습니다. 운영팀이 24시간 안에 확인합니다.',
    doneBlocked: '차단했습니다.',
    failed: '보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
    note: '신고한 사람은 상대에게 알려지지 않습니다.',
    blockedTitle: '차단한 사용자',
    blockedEmpty: '차단한 사용자가 없습니다.',
    unblock: '차단 풀기',
    unblockConfirm: '차단을 풀까요?',
    unknownUser: '알 수 없는 사용자',
  },
  en: {
    report: 'Report',
    title: { post: 'Report this post', comment: 'Report this comment', message: 'Report this message' },
    reasons: {
      spam: 'Spam or ads',
      abuse: 'Abuse, harassment or hate',
      sexual: 'Sexual content',
      violence: 'Violence or threats',
      self_harm: 'Self-harm or suicide',
      misinfo: 'False health information',
      other: 'Other',
    },
    detail: 'Details (optional)',
    alsoBlock: "Block this user — you won't see each other's posts, comments or messages",
    submit: 'Report',
    sending: 'Sending…',
    blockOnly: 'Block without reporting',
    blockConfirm: "Block this user? You won't see each other's posts, comments or messages.",
    cancel: 'Close',
    done: 'Report received. Our team will review it within 24 hours.',
    doneBlocked: 'User blocked.',
    failed: 'Could not send. Please try again later.',
    note: 'The other person will not know who reported them.',
    blockedTitle: 'Blocked users',
    blockedEmpty: "You haven't blocked anyone.",
    unblock: 'Unblock',
    unblockConfirm: 'Unblock this user?',
    unknownUser: 'Unknown user',
  },
  ja: {
    report: '通報',
    title: { post: 'この投稿を通報', comment: 'このコメントを通報', message: 'このメッセージを通報' },
    reasons: {
      spam: 'スパム・広告',
      abuse: '暴言・嫌がらせ・差別',
      sexual: 'わいせつ・性的な内容',
      violence: '暴力・脅迫',
      self_harm: '自傷・自殺に関する内容',
      misinfo: '誤った健康情報',
      other: 'その他',
    },
    detail: '詳細(任意)',
    alsoBlock: 'このユーザーをブロック — お互いの投稿・コメント・メッセージが表示されなくなります',
    submit: '通報する',
    sending: '送信中…',
    blockOnly: '通報せずにブロックだけする',
    blockConfirm: 'このユーザーをブロックしますか?お互いの投稿・コメント・メッセージが表示されなくなります。',
    cancel: '閉じる',
    done: '通報を受け付けました。運営チームが24時間以内に確認します。',
    doneBlocked: 'ブロックしました。',
    failed: '送信できませんでした。しばらくしてからもう一度お試しください。',
    note: '通報したことは相手に知らされません。',
    blockedTitle: 'ブロックしたユーザー',
    blockedEmpty: 'ブロックしたユーザーはいません。',
    unblock: 'ブロック解除',
    unblockConfirm: 'ブロックを解除しますか?',
    unknownUser: '不明なユーザー',
  },
  es: {
    report: 'Denunciar',
    title: { post: 'Denunciar esta publicación', comment: 'Denunciar este comentario', message: 'Denunciar este mensaje' },
    reasons: {
      spam: 'Spam o publicidad',
      abuse: 'Insultos, acoso u odio',
      sexual: 'Contenido sexual',
      violence: 'Violencia o amenazas',
      self_harm: 'Autolesión o suicidio',
      misinfo: 'Información de salud falsa',
      other: 'Otro',
    },
    detail: 'Detalles (opcional)',
    alsoBlock: 'Bloquear a este usuario — no veréis las publicaciones, comentarios ni mensajes del otro',
    submit: 'Denunciar',
    sending: 'Enviando…',
    blockOnly: 'Bloquear sin denunciar',
    blockConfirm: '¿Bloquear a este usuario? No veréis las publicaciones, comentarios ni mensajes del otro.',
    cancel: 'Cerrar',
    done: 'Denuncia recibida. Nuestro equipo la revisará en 24 horas.',
    doneBlocked: 'Usuario bloqueado.',
    failed: 'No se pudo enviar. Inténtalo de nuevo más tarde.',
    note: 'La otra persona no sabrá quién la denunció.',
    blockedTitle: 'Usuarios bloqueados',
    blockedEmpty: 'No has bloqueado a nadie.',
    unblock: 'Desbloquear',
    unblockConfirm: '¿Desbloquear a este usuario?',
    unknownUser: 'Usuario desconocido',
  },
};

/** '신고' 단추 + 아래에서 올라오는 창. onBlocked = 차단까지 했을 때(부모가 목록을 새로 고치거나 화면을 떠남) */
export function ReportButton({
  targetType,
  targetId,
  onBlocked,
  className,
}: {
  targetType: ReportTarget;
  targetId: string;
  onBlocked?: () => void;
  className?: string;
}) {
  const { locale } = useI18n();
  const d = SAFETY_DICTS[locale];
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? 'text-[11px] font-semibold text-stone-500 dark:text-stone-400'}
      >
        {d.report}
      </button>
      {open && (
        <ReportSheet
          targetType={targetType}
          targetId={targetId}
          onClose={() => setOpen(false)}
          onBlocked={() => {
            setOpen(false);
            onBlocked?.();
          }}
        />
      )}
    </>
  );
}

export function ReportSheet({
  targetType,
  targetId,
  onClose,
  onBlocked,
}: {
  targetType: ReportTarget;
  targetId: string;
  onClose: () => void;
  onBlocked: () => void;
}) {
  const { locale } = useI18n();
  const d = SAFETY_DICTS[locale];
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sent, setSent] = useState<null | 'reported' | 'reportedBlocked' | 'blocked'>(null);

  async function submit() {
    if (!reason || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await reportContent({ targetType, targetId, reason, detail: detail.trim() || undefined, alsoBlock });
      setSent(r.blocked ? 'reportedBlocked' : 'reported');
    } catch {
      setMsg(d.failed);
    } finally {
      setBusy(false);
    }
  }

  async function blockOnly() {
    if (busy || !window.confirm(d.blockConfirm)) return;
    setBusy(true);
    setMsg(null);
    try {
      await blockAuthor(targetType, targetId);
      setSent('blocked');
    } catch {
      setMsg(d.failed);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (sent === 'blocked' || sent === 'reportedBlocked') onBlocked();
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={locale === 'ja' ? { wordBreak: 'normal' } : undefined}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-5 shadow-xl dark:bg-stone-900"
      >
        <h2 className="text-[16px] font-bold text-stone-900 dark:text-stone-100">{d.title[targetType]}</h2>
        {sent ? (
          <div className="mt-4 space-y-4">
            {sent !== 'blocked' && <p className="text-[14px] leading-relaxed text-stone-700 dark:text-stone-200">{d.done}</p>}
            {sent !== 'reported' && <p className="text-[14px] leading-relaxed text-stone-700 dark:text-stone-200">{d.doneBlocked}</p>}
            <button
              type="button"
              onClick={close}
              className="w-full rounded-2xl bg-stone-900 px-4 py-3 text-[15px] font-bold text-white dark:bg-white dark:text-stone-900"
            >
              {d.cancel}
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <ul className="space-y-1.5">
              {REASONS.map((r) => (
                <li key={r}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-stone-200 px-3 py-2.5 text-[14px] text-stone-800 has-[:checked]:border-rose-400 has-[:checked]:bg-rose-50 dark:border-stone-700 dark:text-stone-100 dark:has-[:checked]:bg-rose-950/40">
                    <input
                      type="radio"
                      name="report-reason"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="h-4 w-4 text-rose-600"
                    />
                    {d.reasons[r]}
                  </label>
                </li>
              ))}
            </ul>
            <label className="block text-[13px] text-stone-600 dark:text-stone-300">
              {d.detail}
              <textarea
                value={detail}
                maxLength={1000}
                rows={2}
                onChange={(e) => setDetail(e.target.value)}
                className="mt-1 block w-full resize-none rounded-xl border border-stone-300 bg-white px-3 py-2 text-[15px] dark:border-stone-700 dark:bg-stone-900"
              />
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-snug text-stone-700 dark:text-stone-200">
              <input
                type="checkbox"
                checked={alsoBlock}
                onChange={(e) => setAlsoBlock(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded"
              />
              {d.alsoBlock}
            </label>
            <p className="text-[12px] text-stone-500 dark:text-stone-400">{d.note}</p>
            {msg && <p className="text-[13px] text-rose-700 dark:text-rose-300">{msg}</p>}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!reason || busy}
              className="w-full rounded-2xl bg-rose-600 px-4 py-3 text-[15px] font-bold text-white disabled:opacity-40"
            >
              {busy ? d.sending : d.submit}
            </button>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => void blockOnly()}
                disabled={busy}
                className="text-[13px] font-semibold text-stone-600 underline disabled:opacity-40 dark:text-stone-300"
              >
                {d.blockOnly}
              </button>
              <button type="button" onClick={onClose} className="text-[13px] font-semibold text-stone-500 dark:text-stone-400">
                {d.cancel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 마이페이지 — 차단한 사용자 목록과 '차단 풀기' */
export function BlockedUsers() {
  const { locale } = useI18n();
  const d = SAFETY_DICTS[locale];
  const [rows, setRows] = useState<BlockedUser[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void fetchMyBlocks()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  async function unblock(pid: string) {
    if (busy || !window.confirm(d.unblockConfirm)) return;
    setBusy(pid);
    try {
      await unblockUser(pid);
      setRows((cur) => (cur ?? []).filter((r) => r.pseudonymId !== pid));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
      <h2 className="text-[14px] font-bold text-stone-900 dark:text-stone-100">{d.blockedTitle}</h2>
      {rows === null ? null : rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-stone-500 dark:text-stone-400">{d.blockedEmpty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
          {rows.map((r) => (
            <li key={r.pseudonymId} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate text-[14px] text-stone-800 dark:text-stone-200">{r.nickname ?? d.unknownUser}</span>
              <button
                type="button"
                onClick={() => void unblock(r.pseudonymId)}
                disabled={busy !== null}
                className="shrink-0 rounded-full border border-stone-300 px-3 py-1 text-[12px] font-semibold text-stone-700 disabled:opacity-40 dark:border-stone-700 dark:text-stone-200"
              >
                {d.unblock}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
