'use client';

// 오늘의 루틴/건강 일기 개인 첨부(사진·PDF). 본인만 열람.
// 비공개 파일이라 인증 fetch → objectURL 로 표시(이미지 인라인, PDF는 열기).

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  deleteDiaryAttachment,
  fetchDiaryAttachmentObjectUrl,
  fetchDiaryAttachments,
  uploadDiaryAttachment,
  type DiaryAttachment,
} from '@/lib/api-client';

export function DiaryAttachments({
  entryDate,
  editable,
}: {
  entryDate: string;
  editable: boolean;
}) {
  const { t } = useI18n();
  const D = t.healthDiary;
  const [items, setItems] = useState<DiaryAttachment[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const urlsRef = useRef<Record<string, string>>({});
  urlsRef.current = urls;

  useEffect(() => {
    let active = true;
    fetchDiaryAttachments(entryDate, entryDate)
      .then((list) => {
        if (active) setItems(list);
      })
      .catch(() => {
        /* noop */
      });
    return () => {
      active = false;
    };
  }, [entryDate]);

  // 이미지·동영상 첨부는 objectURL 미리 로드(썸네일·재생).
  useEffect(() => {
    let active = true;
    for (const it of items) {
      const previewable = it.kind === 'image' || it.mime.startsWith('video/');
      if (previewable && !urlsRef.current[it.id]) {
        void fetchDiaryAttachmentObjectUrl(it.id).then((u) => {
          if (active && u) setUrls((prev) => ({ ...prev, [it.id]: u }));
        });
      }
    }
    return () => {
      active = false;
    };
  }, [items]);

  // 언마운트 시 objectURL 정리.
  useEffect(() => {
    return () => {
      for (const u of Object.values(urlsRef.current)) URL.revokeObjectURL(u);
    };
  }, []);

  async function handleUpload(file: File) {
    setBusy(true);
    setErr(false);
    try {
      const att = await uploadDiaryAttachment(entryDate, file);
      setItems((prev) => [...prev, att]);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDiaryAttachment(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      const u = urlsRef.current[id];
      if (u) URL.revokeObjectURL(u);
      setUrls((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      setErr(true);
    }
  }

  async function openFile(id: string) {
    const u = urls[id] ?? (await fetchDiaryAttachmentObjectUrl(id));
    if (u && typeof window !== 'undefined') window.open(u, '_blank');
  }

  if (!editable && items.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
        {D.attachLabel}
      </p>

      {items.length === 0 ? (
        <p className="mt-1 text-[12px] text-stone-400">{D.attachEmpty}</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {items.map((it) => (
            <div key={it.id} className="relative">
              {it.kind === 'image' ? (
                <button
                  type="button"
                  onClick={() => void openFile(it.id)}
                  className="block h-20 w-20 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
                >
                  {urls[it.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls[it.id]} alt={it.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] text-stone-400">
                      …
                    </span>
                  )}
                </button>
              ) : it.mime.startsWith('video/') ? (
                <button
                  type="button"
                  onClick={() => void openFile(it.id)}
                  className="relative block h-20 w-20 overflow-hidden rounded-xl border border-stone-200 bg-black dark:border-stone-700"
                >
                  {urls[it.id] ? (
                    <video
                      src={urls[it.id]}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] text-stone-400">
                      …
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
                      ▶
                    </span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void openFile(it.id)}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white px-1 text-center dark:border-stone-700 dark:bg-stone-900"
                >
                  <span className="text-lg">📄</span>
                  <span className="line-clamp-2 text-[9px] leading-tight text-stone-600 dark:text-stone-300">
                    {it.name}
                  </span>
                </button>
              )}
              {editable && (
                <button
                  type="button"
                  onClick={() => void handleDelete(it.id)}
                  aria-label={D.attachDelete}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-stone-700 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          >
            {busy ? '…' : `+ ${D.attachAdd}`}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void handleUpload(f);
            }}
          />
          <p className="mt-1 text-[10px] leading-relaxed text-stone-400">{D.attachHint}</p>
          {err && <p className="mt-0.5 text-[11px] text-rose-600">{D.attachError}</p>}
        </div>
      )}
    </div>
  );
}
