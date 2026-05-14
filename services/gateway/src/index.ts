import { Hono } from 'hono';
import { riskEstimateRoute } from './routes/risk-estimate.js';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true }));

app.route('/api/v1/risk-estimate', riskEstimateRoute);

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND' } }, 404));

app.onError((err, c) => {
  console.error('unhandled error', err);
  return c.json({ error: { code: 'INTERNAL_ERROR' } }, 500);
});

export default app;
