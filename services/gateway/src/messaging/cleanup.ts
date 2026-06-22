// R9 — 만료(7일 경과) 대화 첨부 정리. cron(scheduled) 에서 호출.
// R2 객체 삭제 + 메시지 soft delete(attachment_key NULL → 다운로드 404).

import type { Bindings } from '../bindings.js';
import { expireAttachment, listExpiredAttachments } from './storage.js';

export async function cleanupExpiredAttachments(env: Bindings): Promise<number> {
  const now = new Date().toISOString();
  let total = 0;
  // 배치 반복(한 번에 최대 500, 최대 20배치 = 10k/실행).
  for (let i = 0; i < 20; i += 1) {
    const expired = await listExpiredAttachments(env.DB, now, 500);
    if (expired.length === 0) break;
    for (const m of expired) {
      try {
        await env.ATTACHMENTS.delete(m.key);
      } catch (err) {
        console.error('R2 attachment delete failed', err);
      }
      await expireAttachment(env.DB, m.id);
      total += 1;
    }
    if (expired.length < 500) break;
  }
  return total;
}
