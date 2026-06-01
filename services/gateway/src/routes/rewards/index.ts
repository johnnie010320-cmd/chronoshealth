import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  appendLedger,
  EARN_AMOUNTS,
  readBalance,
  readHistory,
} from '../../rewards/ledger.js';
import { findSpendItem, listSpendCatalog } from '../../rewards/catalog.js';
import type { Bindings } from '../../bindings.js';
import type { Locale } from '../../care/affiliates.js';

const MODEL_VERSION = 'rewards-v0.1.0';
const DISCLAIMER =
  '포인트는 현금화되지 않으며, 시범 운영 중입니다. P5 메인넷 진입 시점에 $CHRO 토큰 1:1 전환 예정.';

function parseLocale(value: string | null | undefined): Locale {
  if (value === 'ko' || value === 'en' || value === 'ja' || value === 'es') return value;
  return 'ko';
}

export const rewardsRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

rewardsRoute.get('/me', authMiddleware, rateLimit(200), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const locale = parseLocale(c.req.query('locale'));

  const [balance, history] = await Promise.all([
    readBalance(c.env.DB, pseudonymId),
    readHistory(c.env.DB, pseudonymId),
  ]);

  return c.json({
    balance,
    history,
    spendCatalog: listSpendCatalog(locale),
    earnRules: EARN_AMOUNTS,
    modelVersion: MODEL_VERSION,
    disclaimer: DISCLAIMER,
  });
});

rewardsRoute.post('/spend', authMiddleware, rateLimit(50), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  let raw: { slug?: unknown };
  try {
    raw = (await c.req.json()) as { slug?: unknown };
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const slug = typeof raw.slug === 'string' ? raw.slug : '';
  const item = findSpendItem(slug);
  if (!item) {
    return c.json({ error: { code: 'INVALID_ITEM' } }, 400);
  }
  const balance = await readBalance(c.env.DB, pseudonymId);
  if (balance < item.cost) {
    return c.json({ error: { code: 'INSUFFICIENT_BALANCE' } }, 400);
  }
  const result = await appendLedger(c.env.DB, pseudonymId, {
    kind: 'spend_coupon',
    amount: -item.cost,
    sourceRef: item.slug,
  });
  const newBalance = await readBalance(c.env.DB, pseudonymId);
  return c.json({
    txnId: result.txnId,
    spent: item.cost,
    item: { slug: item.slug, partner: item.partner },
    newBalance,
    modelVersion: MODEL_VERSION,
    disclaimer: DISCLAIMER,
  });
});
