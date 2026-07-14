// 기능요청 첨부 스트림 — me(소유자)·admin(관리자) 양쪽에서 재사용.
// 비공개이므로 캐시는 private. R2 키는 응답 헤더로도 노출하지 않는다.

import type { Bindings } from '../../bindings.js';
import type { FeatureRequestMedia } from '../../feature-requests/storage.js';
import { safeFileName } from '../../messaging/files.js';

function notFound(): Response {
  return new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function streamFeatureImage(
  env: Bindings,
  media: FeatureRequestMedia,
): Promise<Response> {
  if (!media.imageKey) return notFound();
  const obj = await env.ATTACHMENTS.get(media.imageKey);
  if (!obj) return notFound();
  return new Response(obj.body, {
    headers: {
      'Content-Type': media.imageType ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
    },
  });
}

export async function streamFeatureFile(
  env: Bindings,
  media: FeatureRequestMedia,
): Promise<Response> {
  if (!media.fileKey) return notFound();
  const obj = await env.ATTACHMENTS.get(media.fileKey);
  if (!obj) return notFound();
  const name = safeFileName(media.fileName ?? 'attachment.pdf');
  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
