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

async function streamImage(
  env: Bindings,
  key: string | null,
  type: string | null,
): Promise<Response> {
  if (!key) return notFound();
  const obj = await env.ATTACHMENTS.get(key);
  if (!obj) return notFound();
  return new Response(obj.body, {
    headers: {
      'Content-Type': type ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
    },
  });
}

async function streamPdf(
  env: Bindings,
  key: string | null,
  fileName: string | null,
): Promise<Response> {
  if (!key) return notFound();
  const obj = await env.ATTACHMENTS.get(key);
  if (!obj) return notFound();
  const name = safeFileName(fileName ?? 'attachment.pdf');
  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}

// 추가 첨부(0039).
export const streamFeatureImage = (env: Bindings, media: FeatureRequestMedia) =>
  streamImage(env, media.imageKey, media.imageType);
export const streamFeatureFile = (env: Bindings, media: FeatureRequestMedia) =>
  streamPdf(env, media.fileKey, media.fileName);

// 본문 미디어(0040).
export const streamFeatureBodyImage = (env: Bindings, media: FeatureRequestMedia) =>
  streamImage(env, media.bodyImageKey, media.bodyImageType);
export const streamFeatureBodyFile = (env: Bindings, media: FeatureRequestMedia) =>
  streamPdf(env, media.bodyFileKey, media.bodyFileName);
