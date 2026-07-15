import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { adminMiddleware } from '../../middleware/admin-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { AdminFeatureFeedback } from '../../schemas/feature-requests.js';
import {
  adminSoftDeleteFeatureRequest,
  listAllFeatureRequests,
  readFeatureRequest,
  readFeatureRequestMedia,
  setAdminFeedback,
  type FeatureRequestKind,
  type FeatureRequestStatus,
} from '../../feature-requests/storage.js';
import {
  streamFeatureImage,
  streamFeatureFile,
  streamFeatureBodyImage,
  streamFeatureBodyFile,
} from './stream.js';
import { resolveNicknames } from '../../messaging/nickname.js';
import { appendAudit } from '../../admin/audit.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'feature-requests-v0.1.0';

// 관리자 — "기능 요청 및 버그 리포트". 전체 조회/검색 + 삭제 + 피드백 전송.
export const featureRequestsAdminRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

featureRequestsAdminRoute.get(
  '/',
  authMiddleware,
  adminMiddleware,
  rateLimit(120),
  async (c) => {
    const rawSearch = (c.req.query('q') ?? '').trim();
    // LIKE 와일드카드 무력화 — 순수 부분문자열 검색.
    const search = rawSearch === '' ? null : rawSearch.replace(/[%_]/g, '');
    const kindParam = c.req.query('kind');
    const kind: FeatureRequestKind | null =
      kindParam === 'feature' || kindParam === 'bug' ? kindParam : null;

    const rows = await listAllFeatureRequests(c.env.DB, {
      search,
      kind,
      limit: 300,
    });
    // 작성자 표시는 비-PII 닉네임만(ADR 0015). 없으면 null.
    const nickMap = await resolveNicknames(
      c.env.IDENTITY_DB,
      rows.map((r) => r.userPseudonymId),
    );
    const items = rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      body: r.body,
      status: r.status,
      adminFeedback: r.adminFeedback,
      adminFeedbackAt: r.adminFeedbackAt,
      hasBodyImage: r.hasBodyImage,
      bodyImageType: r.bodyImageType,
      bodyFileName: r.bodyFileName,
      hasImage: r.hasImage,
      imageType: r.imageType,
      fileName: r.fileName,
      linkUrl: r.linkUrl,
      authorNickname: nickMap.get(r.userPseudonymId) ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    return c.json({ items, modelVersion: MODEL_VERSION });
  },
);

// 첨부 스트림 — 관리자 전용(비공개). 소유자 무관, adminMiddleware 로 인가.
featureRequestsAdminRoute.get(
  '/:id/image',
  authMiddleware,
  adminMiddleware,
  rateLimit(200),
  async (c) => {
    const media = await readFeatureRequestMedia(c.env.DB, c.req.param('id'));
    if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
    return streamFeatureImage(c.env, media);
  },
);

featureRequestsAdminRoute.get(
  '/:id/file',
  authMiddleware,
  adminMiddleware,
  rateLimit(200),
  async (c) => {
    const media = await readFeatureRequestMedia(c.env.DB, c.req.param('id'));
    if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
    return streamFeatureFile(c.env, media);
  },
);

// 본문 미디어 스트림 — 관리자 전용.
featureRequestsAdminRoute.get(
  '/:id/body-image',
  authMiddleware,
  adminMiddleware,
  rateLimit(200),
  async (c) => {
    const media = await readFeatureRequestMedia(c.env.DB, c.req.param('id'));
    if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
    return streamFeatureBodyImage(c.env, media);
  },
);

featureRequestsAdminRoute.get(
  '/:id/body-file',
  authMiddleware,
  adminMiddleware,
  rateLimit(200),
  async (c) => {
    const media = await readFeatureRequestMedia(c.env.DB, c.req.param('id'));
    if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
    return streamFeatureBodyFile(c.env, media);
  },
);

featureRequestsAdminRoute.patch(
  '/:id',
  authMiddleware,
  adminMiddleware,
  rateLimit(60),
  async (c) => {
    const id = c.req.param('id');
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: { code: 'INVALID_JSON' } }, 400);
    }
    const parsed = AdminFeatureFeedback.safeParse(raw);
    if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

    const me = c.get('userPseudonymId');
    const ok = await setAdminFeedback(c.env.DB, id, {
      ...(parsed.data.feedback !== undefined
        ? { feedback: parsed.data.feedback }
        : {}),
      ...(parsed.data.status !== undefined
        ? { status: parsed.data.status as FeatureRequestStatus }
        : {}),
      adminPseudonymId: me,
    });
    if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
    const item = await readFeatureRequest(c.env.DB, id);
    await appendAudit(c.env.DB, {
      actorPseudonymId: me,
      action: 'feature_request.feedback',
      target: id,
      detail: [
        parsed.data.status ? `status=${parsed.data.status}` : null,
        parsed.data.feedback !== undefined ? 'feedback' : null,
      ]
        .filter(Boolean)
        .join(', '),
    });
    return c.json({ item, modelVersion: MODEL_VERSION });
  },
);

featureRequestsAdminRoute.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  rateLimit(30),
  async (c) => {
    const id = c.req.param('id');
    const existing = await readFeatureRequest(c.env.DB, id);
    const media = await readFeatureRequestMedia(c.env.DB, id);
    const ok = await adminSoftDeleteFeatureRequest(c.env.DB, id);
    if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
    for (const key of [
      media?.bodyImageKey,
      media?.bodyFileKey,
      media?.imageKey,
      media?.fileKey,
    ]) {
      if (key) await c.env.ATTACHMENTS.delete(key).catch(() => {});
    }
    await appendAudit(c.env.DB, {
      actorPseudonymId: c.get('userPseudonymId'),
      action: 'feature_request.delete',
      target: id,
      detail: existing?.title ?? null,
    });
    return c.json({ deleted: true, modelVersion: MODEL_VERSION });
  },
);
