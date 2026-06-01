import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { riskEstimateRoute } from './routes/risk-estimate.js';
import { signupRoute } from './routes/auth/signup.js';
import { betaSignupRoute } from './routes/beta/signup.js';
import { simulateRoute } from './routes/simulate.js';
import { avatarMeRoute } from './routes/avatar/me.js';
import { leaderboardMeRoute } from './routes/leaderboard/me.js';
import { careMeRoute } from './routes/care/me.js';
import { routineRoute } from './routes/routine/index.js';
import { communityRoute } from './routes/community/index.js';
import type { Bindings } from './bindings.js';

const app = new Hono<{ Bindings: Bindings }>();

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

app.route('/api/v1/auth/signup', signupRoute);
app.route('/api/v1/risk-estimate', riskEstimateRoute);
app.route('/api/v1/beta-signup', betaSignupRoute);
app.route('/api/v1/simulate', simulateRoute);
app.route('/api/v1/avatar/me', avatarMeRoute);
app.route('/api/v1/leaderboard/me', leaderboardMeRoute);
app.route('/api/v1/care/me', careMeRoute);
app.route('/api/v1/routine', routineRoute);
app.route('/api/v1/community', communityRoute);

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND' } }, 404));

app.onError((err, c) => {
  console.error('unhandled error', err);
  return c.json({ error: { code: 'INTERNAL_ERROR' } }, 500);
});

export default app;
