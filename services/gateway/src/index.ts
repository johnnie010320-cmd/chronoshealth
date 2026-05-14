import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { riskEstimateRoute } from './routes/risk-estimate.js';

const app = new Hono();

// CORS — apps/web (chronoshealth.ever-day.com) 등 동일 계정 도메인에서만 호출 허용.
// 정식 도메인 확정 시 갱신.
app.use(
  '*',
  cors({
    origin: [
      'https://chronoshealth.ever-day.com',
      'https://chronoshealth.pages.dev',
      'http://localhost:3000',
    ],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }),
);

app.get('/health', (c) => c.json({ ok: true }));

app.route('/api/v1/risk-estimate', riskEstimateRoute);

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND' } }, 404));

app.onError((err, c) => {
  console.error('unhandled error', err);
  return c.json({ error: { code: 'INTERNAL_ERROR' } }, 500);
});

export default app;
