'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { createRoom } from '@/lib/api-client';

export default function NewRoomPage() {
  const { t } = useI18n();
  const M = t.messaging;
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [invites, setInvites] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errCode, setErrCode] = useState<string | null>(null);

  useEffect(() => {
    if (!readSession()) router.replace('/signup');
  }, [router]);

  function errText(code: string): string {
    const map: Record<string, string> = {
      USER_NOT_FOUND: M.errorUserNotFound,
      FORBIDDEN_KEYWORD: M.errorForbiddenKeyword,
    };
    return map[code] ?? M.errorGeneric;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrCode(null);
    try {
      const nicks = invites
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length >= 2 && s.length <= 8);
      const res = await createRoom(title.trim(), nicks);
      router.replace(`/messages/view?id=${res.conversation.id}`);
    } catch (err) {
      setErrCode(err instanceof Error ? err.message : 'generic');
      setSubmitting(false);
    }
  }

  return (
    <AppShell title={M.newRoom} showBack backHref="/messages" decoration="dots">
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block">
          <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
            {M.roomNameLabel}
          </span>
          <input
            type="text"
            value={title}
            placeholder={M.roomNamePlaceholder}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
            {M.roomInviteLabel}
          </span>
          <input
            type="text"
            value={invites}
            placeholder={M.roomInvitePlaceholder}
            onChange={(e) => setInvites(e.target.value)}
            className="mt-1 block w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>

        {errCode && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            {errText(errCode)}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || title.trim().length < 2}
          className="inline-flex w-full items-center justify-between rounded-2xl bg-stone-900 px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
        >
          <span>{submitting ? M.sending : M.roomSubmit}</span>
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </form>

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {M.notice}
      </div>
    </AppShell>
  );
}
