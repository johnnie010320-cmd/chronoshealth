import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cleanupExpiredAttachments } from './messaging/cleanup.js';
import type { Bindings } from './bindings.js';
import { riskEstimateRoute } from './routes/risk-estimate.js';
import { signupRoute } from './routes/auth/signup.js';
import { betaSignupRoute } from './routes/beta/signup.js';
import { simulateRoute } from './routes/simulate.js';
import { avatarMeRoute } from './routes/avatar/me.js';
import { leaderboardMeRoute } from './routes/leaderboard/me.js';
import { careMeRoute } from './routes/care/me.js';
import { routineRoute } from './routes/routine/index.js';
import { communityRoute } from './routes/community/index.js';
import { rewardsRoute } from './routes/rewards/index.js';
import { adminRoute } from './routes/admin/index.js';
import { loginRoute, setPasswordRoute } from './routes/auth/login.js';
import { logoutRoute } from './routes/auth/logout.js';
import { contentPublicRoute, contentAdminRoute } from './routes/content/index.js';
import { meRoute } from './routes/me/index.js';
import { checkEmailRoute } from './routes/auth/check-email.js';
import { aiCalorieRoute } from './routes/ai/calorie.js';
import { aiPrescriptionRoute } from './routes/ai/prescription.js';
import { aiFoodshotRoute } from './routes/ai/foodshot.js';
import { medicalRoute } from './routes/medical/index.js';
import { diaryRoute } from './routes/diary/index.js';
import { messagingRoute } from './routes/messaging/index.js';
import { noticesPublicRoute, noticesAdminRoute } from './routes/notices/index.js';
import { membersRoute } from './routes/members/index.js';
import { formcoachRoute } from './routes/formcoach/index.js';
import type { Bindings } from './bindings.js';

const app = new Hono<{ Bindings: Bindings }>();

// CORS — apps/web (chronoshealth.ever-day.com) 등 동일 계정 도메인에서만 호출 허용.
// ADR 0014 — 정상 경로는 same-origin Pages Function 프록시(브라우저→웹 도메인, CORS 미발생).
// 본 설정은 과도기/직접 호출 대비. credentials:true 로 쿠키 동반 허용(origin '*' 불가, 명시 목록).
app.use(
  '*',
  cors({
    origin: [
      'https://chronoshealth.ever-day.com',
      'https://chronoshealth.pages.dev',
      'http://localhost:3000',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
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
app.route('/api/v1/rewards', rewardsRoute);
app.route('/api/v1/admin', adminRoute);
app.route('/api/v1/auth/login', loginRoute);
app.route('/api/v1/auth/set-password', setPasswordRoute);
app.route('/api/v1/auth/logout', logoutRoute);
app.route('/api/v1/content', contentPublicRoute);
app.route('/api/v1/admin/content', contentAdminRoute);
app.route('/api/v1/me', meRoute);
app.route('/api/v1/auth/check-email', checkEmailRoute);
app.route('/api/v1/ai', aiCalorieRoute);
app.route('/api/v1/ai', aiPrescriptionRoute);
app.route('/api/v1/ai', aiFoodshotRoute);
app.route('/api/v1/formcoach', formcoachRoute);
app.route('/api/v1/me/medical', medicalRoute);
app.route('/api/v1/me/diary', diaryRoute);
app.route('/api/v1/messages', messagingRoute);
app.route('/api/v1/notices', noticesPublicRoute);
app.route('/api/v1/admin/notices', noticesAdminRoute);
app.route('/api/v1/members', membersRoute);

app.notFound((c) => c.json({ error: { code: 'NOT_FOUND' } }, 404));

app.onError((err, c) => {
  console.error('unhandled error', err);
  return c.json({ error: { code: 'INTERNAL_ERROR' } }, 500);
});

// fetch + scheduled(cron) 핸들러. cron 은 wrangler.toml [triggers] 에 정의(매일 03:00 UTC).
// request 는 테스트(app.request) 호환용 위임.
const worker = {
  fetch: (req: Request, env: Bindings, ctx: ExecutionContext) => app.fetch(req, env, ctx),
  request: (...args: Parameters<typeof app.request>) => app.request(...args),
  async scheduled(_event: ScheduledController, env: Bindings, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(cleanupExpiredAttachments(env));
  },
};

export default worker;
