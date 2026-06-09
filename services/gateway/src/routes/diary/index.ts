// MY DIARY — 스토리보드 p32.
// 본인 전용 일기. PII 0 (user_pseudonym_id 만).
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { moderateText } from '../../community/moderation.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'diary-v0.1.0';

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
