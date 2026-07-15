'use client';

import { useEffect, useState } from 'react';
import {
  fetchAdminFeatureBodyFileObjectUrl,
  fetchAdminFeatureBodyImageObjectUrl,
  fetchFeatureBodyFileObjectUrl,
  fetchFeatureBodyImageObjectUrl,
  type FeatureRequest,
} from '@/lib/api-client';

// 본문 표시 — 본문 자체가 텍스트/이미지/PDF 중 무엇으로 채워졌는지에 따라 렌더.
// hasBodyImage → 이미지, bodyFileName → PDF 다운로드, 아니면 텍스트(body).
// 이미지/PDF는 비공개라 인증 요청으로 objectURL 을 받아 렌더한다.
export function FeatureBody({
  item,
  scope,
  imageAlt,
  download,
  textClassName,
}: {
  item: FeatureRequest;
  scope: 'me' | 'admin';
  imageAlt: string;
  download: string;
  textClassName: string;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    if (item.hasBodyImage) {
      const fetcher =
        scope === 'admin'
          ? fetchAdminFeatureBodyImageObjectUrl(item.id)
          : fetchFeatureBodyImageObjectUrl(item.id);
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
  }, [item.id, item.hasBodyImage, item.bodyImageType, scope]);

  async function downloadBody() {
    const url =
      scope === 'admin'
        ? await fetchAdminFeatureBodyFileObjectUrl(item.id)
        : await fetchFeatureBodyFileObjectUrl(item.id);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = item.bodyFileName ?? 'body.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  if (item.hasBodyImage) {
    return imgUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imgUrl}
        alt={imageAlt}
        className="mt-1 max-h-96 w-auto rounded-xl border border-stone-200 dark:border-stone-700"
      />
    ) : null;
  }

  if (item.bodyFileName) {
    return (
      <button
        type="button"
        onClick={() => void downloadBody()}
        className="mt-1 inline-flex items-center gap-1 rounded-lg bg-stone-100 px-3 py-1.5 text-[12px] font-semibold text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200"
      >
        📄 {item.bodyFileName} · {download}
      </button>
    );
  }

  if (item.body) return <p className={textClassName}>{item.body}</p>;
  return null;
}
