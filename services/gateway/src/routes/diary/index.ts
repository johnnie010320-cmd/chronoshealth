// MY DIARY — 스토리보드 p32.
// 본인 전용 일기. PII 0 (user_pseudonym_id 만).
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { moderateText } from '../../community/moderation.js';
import { MAX_NOTICE_BYTES, isPdf, resolveNoticeImageType } from '../../notices/files.js';
import { safeFileName } from '../../messaging/files.js';
import {
  deleteDiaryAttachmentRow,
  insertDiaryAttachment,
  listDiaryAttachments,
  readDiaryAttachment,
} from '../../diary/attachments.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'diary-v0.1.0';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 동영상 첨부 — Workers 메모리·요청 한도 고려한 보수적 상한(30MB). 이미지/PDF 는 MAX_NOTICE_BYTES(10MB).
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

// 지원 동영상 MIME(확장자·타입 관대 매칭). 미지원이면 null.
function resolveVideoType(name: string, type: string): string | null {
  const t = (type || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (t === 'video/mp4' || n.endsWith('.mp4') || n.endsWith('.m4v')) return 'video/mp4';
  if (t === 'video/webm' || n.endsWith('.webm')) return 'video/webm';
  if (t === 'video/quicktime' || n.endsWith('.mov')) return 'video/quicktime';
  return null;
}

function attExt(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'video/mp4') return 'mp4';
  if (mime === 'video/webm') return 'webm';
  if (mime === 'video/quicktime') return 'mov';
  return 'jpg';
}

const Mood = z.enum(['great', 'good', 'soso', 'tired', 'bad']);

const CreateRequest = z
  .object({
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mood: Mood.nullable().default(null),
    body: z.string().trim().min(1).max(2000),
  })
  .strict();

type DiaryRow = {
  id: string;
  entryDate: string;
  mood: string | null;
  body: string;
  createdAt: string;
};

export const diaryRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

diaryRoute.get('/', authMiddleware, rateLimit(120), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const result = await c.env.DB.prepare(
    `SELECT id, entry_date, mood, body, created_at
       FROM my_diary
      WHERE user_pseudonym_id = ? AND deleted_at IS NULL
      ORDER BY entry_date DESC, created_at DESC
      LIMIT 100`,
  )
    .bind(pseudonymId)
    .all<{
      id: string;
      entry_date: string;
      mood: string | null;
      body: string;
      created_at: string;
    }>();
  const entries: DiaryRow[] = (result.results ?? []).map((r) => ({
    id: r.id,
    entryDate: r.entry_date,
    mood: r.mood,
    body: r.body,
    createdAt: r.created_at,
  }));
  return c.json({ entries, modelVersion: MODEL_VERSION });
});

diaryRoute.post('/', authMiddleware, rateLimit(60), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = CreateRequest.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const check = moderateText(parsed.data.body);
  if (!check.allowed) {
    return c.json({ error: { code: check.reason } }, 400);
  }
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO my_diary (id, user_pseudonym_id, entry_date, mood, body)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, pseudonymId, parsed.data.entryDate, parsed.data.mood, parsed.data.body)
    .run();
  return c.json({ id, modelVersion: MODEL_VERSION });
});

diaryRoute.delete('/:id', authMiddleware, rateLimit(60), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const id = c.req.param('id');
  const res = await c.env.DB.prepare(
    `UPDATE my_diary SET deleted_at = datetime('now')
      WHERE id = ? AND user_pseudonym_id = ? AND deleted_at IS NULL`,
  )
    .bind(id, pseudonymId)
    .run();
  if ((res.meta?.changes ?? 0) === 0) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  return c.json({ deleted: true });
});

// ── 개인 첨부(사진/PDF) — 오늘의 루틴 다이어리. 본인만 열람, 관리자 미연동 ──
diaryRoute.post('/attachments', authMiddleware, rateLimit(60), async (c) => {
  const me = c.get('userPseudonymId');
  const form = await c.req.formData().catch(() => null);
  const entryDate = String(form?.get('entryDate') ?? '');
  const file = form?.get('file');
  if (!DATE_RE.test(entryDate)) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  if (!(file instanceof File)) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

  const imageType = resolveNoticeImageType(file.name, file.type);
  const videoType = resolveVideoType(file.name, file.type);
  const pdf = isPdf(file.name, file.type);
  if (!imageType && !videoType && !pdf) {
    return c.json({ error: { code: 'UNSUPPORTED_FILE_TYPE' } }, 400);
  }
  // 동영상은 30MB, 그 외(이미지·PDF)는 10MB 상한.
  const limit = videoType ? MAX_VIDEO_BYTES : MAX_NOTICE_BYTES;
  if (file.size <= 0 || file.size > limit) {
    return c.json({ error: { code: 'FILE_TOO_LARGE' } }, 400);
  }
  // 동영상·PDF 는 kind='file'(재생/열기는 UI 가 mime 로 구분), 이미지는 'image'.
  const kind: 'image' | 'file' = imageType ? 'image' : 'file';
  const mime = imageType ?? videoType ?? 'application/pdf';
  const id = crypto.randomUUID();
  const key = `diary/${me}/${id}.${attExt(mime)}`;
  try {
    await c.env.ATTACHMENTS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: mime },
    });
  } catch (err) {
    console.error('R2 put diary attachment failed', err);
    return c.json({ error: { code: 'UPLOAD_FAILED' } }, 502);
  }
  const name = safeFileName(file.name);
  await insertDiaryAttachment(c.env.DB, {
    id,
    userPseudonymId: me,
    entryDate,
    kind,
    r2Key: key,
    name,
    mime,
    byteSize: file.size,
  });
  return c.json({
    attachment: { id, entryDate, kind, name, mime, byteSize: file.size },
    modelVersion: MODEL_VERSION,
  });
});

diaryRoute.get('/attachments', authMiddleware, rateLimit(200), async (c) => {
  const me = c.get('userPseudonymId');
  const from = c.req.query('from') ?? '';
  const to = c.req.query('to') ?? '';
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const attachments = await listDiaryAttachments(c.env.DB, me, from, to);
  return c.json({ attachments, modelVersion: MODEL_VERSION });
});

diaryRoute.get('/attachments/:id/file', authMiddleware, rateLimit(200), async (c) => {
  const me = c.get('userPseudonymId');
  const att = await readDiaryAttachment(c.env.DB, c.req.param('id'));
  if (!att) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (att.ownerPseudonymId !== me) return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  const obj = await c.env.ATTACHMENTS.get(att.r2Key);
  if (!obj) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const inline = att.kind === 'image' || att.mime.startsWith('video/');
  return new Response(obj.body, {
    headers: {
      'Content-Type': att.mime,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${att.name}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

diaryRoute.delete('/attachments/:id', authMiddleware, rateLimit(60), async (c) => {
  const me = c.get('userPseudonymId');
  const att = await readDiaryAttachment(c.env.DB, c.req.param('id'));
  if (!att) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (att.ownerPseudonymId !== me) return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  await c.env.ATTACHMENTS.delete(att.r2Key).catch(() => {});
  await deleteDiaryAttachmentRow(c.env.DB, att.id);
  return c.json({ deleted: true, modelVersion: MODEL_VERSION });
});
