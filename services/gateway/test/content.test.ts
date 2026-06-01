import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
} from './helpers/mock-d1.js';

describe('Content API (public + admin)', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;
  let analysisMock: ReturnType<typeof makeMockAnalysisDb>;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    analysisMock = makeMockAnalysisDb();
    __clearRateLimit();
  });

  const env = (adminPseudonym?: string) => ({
    IDENTITY_DB: identityMock.db,
    DB: analysisMock.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
    ADMIN_PSEUDONYM_IDS: adminPseudonym,
  });

  function setupAdmin() {
    const tok = issueTestToken(identityMock.state);
    identityMock.state.users.push({
      user_pseudonym_id: tok.pseudonym,
      name: 'admin',
      email: 'admin@chronos.test',
      phone: '010-9999-0000',
      birth_year: 1985,
      sex: 'male',
      created_at: new Date().toISOString(),
    });
    return tok;
  }

  const getPublic = (slug: string, locale = 'ko') =>
    app.request(
      `/api/v1/content/${slug}?locale=${locale}`,
      { method: 'GET' },
      env(),
    );

  const adminList = (token: string, adminPseudonym: string) =>
    app.request(
      '/api/v1/admin/content',
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env(adminPseudonym),
    );

  const adminPut = (token: string, adminPseudonym: string, body: unknown) =>
    app.request(
      '/api/v1/admin/content',
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      env(adminPseudonym),
    );

  it('GET /content/:slug 404 — 미존재', async () => {
    const res = await getPublic('terms');
    expect(res.status).toBe(404);
  });

  it('GET /content/:slug 400 — 잘못된 slug', async () => {
    const res = await getPublic('invalid-slug');
    expect(res.status).toBe(400);
  });

  it('admin PUT 403 — 일반 사용자', async () => {
    const tok = issueTestToken(identityMock.state);
    const res = await adminPut(tok.token, 'other-pseudonym', {
      slug: 'terms',
      locale: 'ko',
      title: '이용약관',
      bodyMd: '본문',
      version: 'v1.0',
    });
    expect(res.status).toBe(403);
  });

  it('admin PUT 200 — 약관 신규 생성', async () => {
    const tok = setupAdmin();
    const res = await adminPut(tok.token, tok.pseudonym, {
      slug: 'terms',
      locale: 'ko',
      title: '이용약관',
      bodyMd: '## 제1조 (목적)\n본 약관은...',
      version: 'v1.0',
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { page: { slug: string; version: string } };
    expect(data.page.slug).toBe('terms');
    expect(data.page.version).toBe('v1.0');
  });

  it('admin PUT 200 + GET public 200 — upsert 후 공개 조회', async () => {
    const tok = setupAdmin();
    await adminPut(tok.token, tok.pseudonym, {
      slug: 'privacy',
      locale: 'ko',
      title: '개인정보 처리방침',
      bodyMd: '## 제1조 (총칙)\n...',
      version: 'v1.0',
    });
    const res = await getPublic('privacy');
    expect(res.status).toBe(200);
    const data = (await res.json()) as { page: { title: string; version: string } };
    expect(data.page.title).toBe('개인정보 처리방침');
  });

  it('admin PUT 200 — 동일 slug 재작성 (upsert)', async () => {
    const tok = setupAdmin();
    await adminPut(tok.token, tok.pseudonym, {
      slug: 'terms',
      locale: 'ko',
      title: '이용약관 v1',
      bodyMd: '본문 v1',
      version: 'v1.0',
    });
    const res = await adminPut(tok.token, tok.pseudonym, {
      slug: 'terms',
      locale: 'ko',
      title: '이용약관 v2',
      bodyMd: '본문 v2',
      version: 'v2.0',
    });
    const data = (await res.json()) as { page: { title: string; version: string } };
    expect(data.page.title).toBe('이용약관 v2');
    expect(data.page.version).toBe('v2.0');
  });

  it('admin GET list 200', async () => {
    const tok = setupAdmin();
    await adminPut(tok.token, tok.pseudonym, {
      slug: 'terms',
      locale: 'ko',
      title: 'T',
      bodyMd: 'T',
      version: 'v1.0',
    });
    await adminPut(tok.token, tok.pseudonym, {
      slug: 'privacy',
      locale: 'ko',
      title: 'P',
      bodyMd: 'P',
      version: 'v1.0',
    });
    const res = await adminList(tok.token, tok.pseudonym);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { pages: { slug: string }[] };
    expect(data.pages.length).toBe(2);
  });

  it('admin PUT 400 — 잘못된 slug', async () => {
    const tok = setupAdmin();
    const res = await adminPut(tok.token, tok.pseudonym, {
      slug: 'invalid',
      locale: 'ko',
      title: 'T',
      bodyMd: 'T',
      version: 'v1.0',
    });
    expect(res.status).toBe(400);
  });
});
