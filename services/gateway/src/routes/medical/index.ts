import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  CHRONIC_CODES,
  CRITICAL_CODES,
  FAMILY_CODES,
  CUSTOM_PREFIX,
  NONE_CODE,
  insertSurgery,
  listConditions,
  listSurgeries,
  softDeleteSurgery,
  upsertConditions,
  type ConditionCategory,
} from '../../medical/storage.js';
import { appendLedger, EARN_AMOUNTS, hasEarnedFor } from '../../rewards/ledger.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'medical-history-v0.1.0';

const ALL_CODES_BY_CATEGORY: Record<ConditionCategory, readonly string[]> = {
  chronic: CHRONIC_CODES,
  critical: CRITICAL_CODES,
  family: FAMILY_CODES,
};

const ConditionsUpsert = z
  .object({
    category: z.enum(['chronic', 'critical', 'family']),
    codes: z.array(z.string().min(1).max(60)).max(50),
  })
  .strict();

const SurgeryCreate = z
  .object({
    surgeryName: z.string().trim().min(1).max(80),
    surgeryYear: z
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear())
      .nullable()
      .default(null),
    note: z.string().max(500).nullable().default(null),
  })
  .strict();

export const medicalRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

medicalRoute.get('/conditions', authMiddleware, rateLimit(120), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const list = await listConditions(c.env.DB, pseudonymId);
  return c.json({
    conditions: list,
    catalog: ALL_CODES_BY_CATEGORY,
    modelVersion: MODEL_VERSION,
  });
});

medicalRoute.put('/conditions', authMiddleware, rateLimit(60), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = ConditionsUpsert.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const codes = parsed.data.codes;

  // '해당 없음'은 단독으로만 유효 — 실제 질환 코드와 공존 불가.
  if (codes.includes(NONE_CODE) && codes.length !== 1) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }

  // 카탈로그 검증 — 카탈로그 코드 / '해당 없음' 센티넬 / 직접입력(custom:) 만 허용.
  const allowed = new Set(ALL_CODES_BY_CATEGORY[parsed.data.category]);
  const isValidCode = (code: string): boolean => {
    if (code === NONE_CODE) return true;
    if (allowed.has(code)) return true;
    if (code.startsWith(CUSTOM_PREFIX)) {
      return code.slice(CUSTOM_PREFIX.length).trim().length > 0;
    }
    return false;
  };
  if (codes.some((code) => !isValidCode(code))) {
    return c.json({ error: { code: 'UNKNOWN_CODE' } }, 400);
  }
  await upsertConditions(c.env.DB, pseudonymId, parsed.data.category, parsed.data.codes);

  // 2nd Data 보상 — chronic/critical/family/수술 중 하나라도 입력 시 1회 200 coin.
  await grantOnboardingData2(c.env.DB, pseudonymId);

  const list = await listConditions(c.env.DB, pseudonymId);
  return c.json({ conditions: list, modelVersion: MODEL_VERSION });
});

medicalRoute.get('/surgeries', authMiddleware, rateLimit(120), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const list = await listSurgeries(c.env.DB, pseudonymId);
  return c.json({ surgeries: list, modelVersion: MODEL_VERSION });
});

medicalRoute.post('/surgeries', authMiddleware, rateLimit(60), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = SurgeryCreate.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const id = crypto.randomUUID();
  await insertSurgery(c.env.DB, pseudonymId, {
    id,
    surgeryName: parsed.data.surgeryName,
    surgeryYear: parsed.data.surgeryYear,
    note: parsed.data.note,
  });
  await grantOnboardingData2(c.env.DB, pseudonymId);
  return c.json({ id, modelVersion: MODEL_VERSION });
});

medicalRoute.delete('/surgeries/:id', authMiddleware, rateLimit(60), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const id = c.req.param('id');
  const ok = await softDeleteSurgery(c.env.DB, pseudonymId, id);
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return c.json({ deleted: true });
});

async function grantOnboardingData2(db: D1Database, pseudonymId: string): Promise<void> {
  try {
    const already = await hasEarnedFor(db, pseudonymId, 'onboarding_data2', 'medical');
    if (!already) {
      await appendLedger(db, pseudonymId, {
        kind: 'onboarding_data2',
        amount: EARN_AMOUNTS.onboarding_data2,
        sourceRef: 'medical',
      });
    }
  } catch (e) {
    console.error('onboarding_data2 ledger failed', e);
  }
}
