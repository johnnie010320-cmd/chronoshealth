'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  deleteFeatureFile,
  deleteFeatureImage,
  fetchAdminFeatureFileObjectUrl,
  fetchAdminFeatureImageObjectUrl,
  fetchFeatureFileObjectUrl,
  fetchFeatureImageObjectUrl,
  uploadFeatureFile,
  uploadFeatureImage,
  type FeatureRequest,
} from '@/lib/api-client';

// 첨부 표시/편집 (사용자·관리자 공용).
// scope='me' 는 본인 편집 가능(업로드/삭제), 'admin' 은 읽기 전용 조회.
// 이미지/파일은 비공개라 인증 요청으로 objectURL 을 받아 렌더한다.
export function FeatureAttachments({
  item,
  scope,
  labels,
  editable = false,
  onChange,
  onError,
}: {
  item: FeatureRequest;
  scope: 'me' | 'admin';
  labels: { link: string; imageAlt: string; download: string };
  editable?: boolean;
  onChange?: (updated: FeatureRequest) => void;
  onError?: () => void;
}) {
  const { t } = useI18n();
  const F = t.featureRequests;
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    if (item.hasImage) {
      const fetcher =
        scope === 'admin'
          ? fetchAdminFeatureImageObjectUrl(item.id)
          : fetchFeatureImageObjectUrl(item.id);
      void fetcher.then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setImgUrl(url);
      });
    } else {
      setImgUrl(null);
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, item.hasImage, item.imageType, scope]);

  async function download() {
    const url =
      scope === 'admin'
        ? await fetchAdminFeatureFileObjectUrl(item.id)
        : await fetchFeatureFileObjectUrl(item.id);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = item.fileName ?? 'attachment.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function run(fn: () => Promise<FeatureRequest>) {
    setBusy(true);
    try {
      onChange?.(await fn());
    } catch {
      onError?.();
    } finally {
      setBusy(false);
    }
  }

  const hasAny = item.hasImage || item.fileName || item.linkUrl;
  if (!editable && !hasAny) return null;

  return (
    <div className="mt-2 space-y-2">
      {item.linkUrl && (
        <a
          href={item.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1 truncate rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:underline dark:bg-sky-900/30 dark:text-sky-200"
        >
          🔗 {labels.link}: <span className="truncate">{item.linkUrl}</span>
        </a>
      )}

      {imgUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl}
          alt={labels.imageAlt}
          className="max-h-64 w-auto rounded-xl border border-stone-200 dark:border-stone-700"
        />
      )}

      {item.fileName && (
        <button
          type="button"
          onClick={() => void download()}
          className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200"
        >
          📄 {item.fileName} · {labels.download}
        </button>
      )}

      {editable && (
        <div className="flex flex-wrap gap-2 pt-1">
          <input
            ref={imageInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void run(() => uploadFeatureImage(item.id, f));
              e.target.value = '';
            }}
          />
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void run(() => uploadFeatureFile(item.id, f));
              e.target.value = '';
            }}
          />
          {item.hasImage ? (
            <button
              type="button"
              onClick={() => void run(() => deleteFeatureImage(item.id))}
              disabled={busy}
              className="rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-500 hover:text-rose-600 disabled:opacity-50 dark:border-stone-700"
            >
              {F.removeImageCta}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => imageInput.current?.click()}
              disabled={busy}
              className="rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-600 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
            >
              {F.attachImageCta}
            </button>
          )}
          {item.fileName ? (
            <button
              type="button"
              onClick={() => void run(() => deleteFeatureFile(item.id))}
              disabled={busy}
              className="rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-500 hover:text-rose-600 disabled:opacity-50 dark:border-stone-700"
            >
              {F.removeFileCta}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-600 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
            >
              {F.attachFileCta}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
