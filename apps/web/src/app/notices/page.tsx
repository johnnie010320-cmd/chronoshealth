'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { BellIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import {
  fetchNotices,
  noticeFileUrl,
  noticeImageUrl,
  type Notice,
} from '@/lib/api-client';
import { setNoticeLastSeen } from '@/lib/notice-state';

export default function NoticesPage() {
  const { t } = useI18n();
  const N = t.notices;
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotices()
      .then((list) => {
        setNotices(list);
        // 목록을 열었으므로 최신 공지까지 '확인'으로 표시 → 알림 뱃지 해제.
        const max = list.reduce<string | null>(
          (m, n) => (m == null || n.createdAt > m ? n.createdAt : m),
          null,
        );
        if (max) setNoticeLastSeen(max);
      })
      .catch(() => {
        /* noop */
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title={N.pageTitle} showBack backHref="/" decoration="dots">
      <section className="grad-violet card-shadow relative mt-3 overflow-hidden rounded-3xl px-5 py-5">
        <span
          className="blob"
          style={{
            width: 130,
            height: 130,
            right: -22,
            top: -30,
            background: 'radial-gradient(circle, #f0abfc, transparent 70%)',
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <BellIcon className="h-6 w-6 text-white" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
              {N.homeEyebrow}
            </p>
            <h1 className="text-lg font-extrabold tracking-tight text-white">{N.pageTitle}</h1>
          </div>
        </div>
      </section>

      {loading && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {!loading && notices.length === 0 && (
        <div className="card-shadow card-violet mt-5 rounded-2xl px-4 py-8 text-center text-[12px] text-stone-500 dark:text-stone-400">
          {N.empty}
        </div>
      )}

      {!loading && notices.length > 0 && (
        <ul className="mt-4 space-y-3">
          {notices.map((n) => (
            <li
              key={n.id}
              className="card-shadow card-violet rounded-2xl px-4 py-4"
            >
              <div className="flex items-center gap-2">
                {n.pinned && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    {N.pinnedTag}
                  </span>
                )}
                <h2 className="flex min-w-0 flex-1 items-center text-sm font-bold text-stone-900 dark:text-stone-100">
                  <span className="accent-bar shrink-0 bg-violet-500" />
                  <span className="truncate">{n.title}</span>
                </h2>
                <span className="shrink-0 text-[10px] text-stone-400 dark:text-stone-500">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">
                {n.body}
              </p>

              {n.hasImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={noticeImageUrl(n.id)}
                  alt={n.title}
                  className="mt-3 w-full rounded-xl border border-stone-100 object-contain dark:border-stone-800"
                />
              )}

              {(n.fileName || n.linkUrl) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {n.fileName && (
                    <a
                      href={noticeFileUrl(n.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                    >
                      📄 {N.fileDownload}
                    </a>
                  )}
                  {n.linkUrl && (
                    <a
                      href={n.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-200"
                    >
                      🔗 {N.openLink}
                    </a>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
