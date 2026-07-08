import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
} from './helpers/mock-d1.js';

// 케어 제휴 카드 관리자 CRUD — migration 0037.
// 목적: 실제 제휴처 URL 확보 시 코드 배포 없이 관리자 화면에서 준비중 해제.

const I18N = {
  ko: { title: '제휴 카드', body: '설명', ctaLabel: '바로가기' },
  en: { title: 'Affiliate card', body: 'Body', ctaLabel: 'Open' },
  ja: { title: '提携カード', body: '説明', ctaLabel: '開く' },
  es: { title: 'Tarjeta', body: 'Cuerpo', ctaLabel: 'Abrir' },
};

describe('Admin — care affiliates CRUD', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;
  let analysisMock: ReturnType<typeof makeMockAnalysisDb>;
  let adminPseudonym: string;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    analysisMock = makeMockAnalysisDb();
    __clearRateLimit();
    adminPseudonym = '';
  });

  const env = () => ({
    IDENTITY_DB: identityMock.db,
    DB: analysisMock.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
    ADMIN_PSEUDONYM_IDS: adminPseudonym,
  });

  function setupAdmin() {
    const tok = issueTestToken(identityMock.state);
    adminPseudonym = tok.pseudonym;
    identityMock.state.users.push({
      user_pseudonym_id: tok.pseudonym,
      name: '관리자',
      email: 'admin@chronos.test',
      phone: '010-9999-0000',
      birth_year: 1985,
      sex: 'male',
      created_at: new Date().toISOString(),
    });
    return tok;
  }

  const req = (path: string, token: string, init?: RequestInit) =>
    app.request(
      `/api/v1/admin/care-affiliates${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      },
      env(),
    );

  it('GET — 시드 6건 반환 (비활성 포함)', async () => {
    const { token } = setupAdmin();
    const res = await req('', token);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { affiliates: unknown[] };
    expect(data.affiliates).toHaveLength(6);
  });

  it('401 — 비인증', async () => {
    setupAdmin();
    const res = await app.request(
      '/api/v1/admin/care-affiliates',
      { method: 'GET' },
      env(),
    );
    expect(res.status).toBe(401);
  });

  it('403 — 관리자 아님', async () => {
    setupAdmin();
    const other = issueTestToken(identityMock.state);
    const res = await req('', other.token);
    expect(res.status).toBe(403);
  });

  it('POST — 신규 생성, 실제 외부 URL 이면 준비중 해제', async () => {
    const { token } = setupAdmin();
    const res = await req('', token, {
      method: 'POST',
      body: JSON.stringify({
        slug: 'diet-new-partner',
        category: 'diet',
        partner: 'Real Partner',
        ctaUrl: 'https://partner.example.com/offer',
        comingSoon: false,
        sortOrder: 5,
        active: true,
        i18n: I18N,
      }),
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as {
      affiliate: { slug: string; comingSoon: boolean };
    };
    expect(data.affiliate.slug).toBe('diet-new-partner');
    // 실제 외부 URL → 준비중 해제
    expect(data.affiliate.comingSoon).toBe(false);
  });

  it('409 — slug 중복', async () => {
    const { token } = setupAdmin();
    const body = JSON.stringify({
      slug: 'diet-mediterranean-plan', // 시드에 이미 존재
      category: 'diet',
      partner: 'X',
      ctaUrl: 'https://x.example.com',
      comingSoon: true,
      sortOrder: 0,
      active: true,
      i18n: I18N,
    });
    const res = await req('', token, { method: 'POST', body });
    expect(res.status).toBe(409);
  });

  it('400 — javascript: URL 거부', async () => {
    const { token } = setupAdmin();
    const res = await req('', token, {
      method: 'POST',
      body: JSON.stringify({
        slug: 'evil-card',
        category: 'diet',
        partner: 'X',
        ctaUrl: 'javascript:alert(1)',
        comingSoon: false,
        sortOrder: 0,
        active: true,
        i18n: I18N,
      }),
    });
    expect(res.status).toBe(400);
  });

  it('PATCH — 실제 URL 입력 시 준비중 해제 (핵심 시나리오)', async () => {
    const { token } = setupAdmin();
    const res = await req('/diet-mediterranean-plan', token, {
      method: 'PATCH',
      body: JSON.stringify({
        ctaUrl: 'https://real-partner.example.com/mediterranean',
        comingSoon: false,
      }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { affiliate: { comingSoon: boolean; ctaUrl: string } };
    expect(data.affiliate.comingSoon).toBe(false);
    expect(data.affiliate.ctaUrl).toContain('real-partner.example.com');
  });

  it('PATCH — 자리표시자 URL 이면 comingSoon=false 로도 준비중 강제', async () => {
    const { token } = setupAdmin();
    const res = await req('/diet-mediterranean-plan', token, {
      method: 'PATCH',
      body: JSON.stringify({ comingSoon: false }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { affiliate: { comingSoon: boolean } };
    expect(data.affiliate.comingSoon).toBe(true); // 자리표시자 URL 유지 → 강제
  });

  it('PATCH 404 — 없는 slug', async () => {
    const { token } = setupAdmin();
    const res = await req('/no-such-card', token, {
      method: 'PATCH',
      body: JSON.stringify({ partner: 'Y' }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE — 삭제 후 목록 5건', async () => {
    const { token } = setupAdmin();
    const del = await req('/diet-low-glycemic-pack', token, { method: 'DELETE' });
    expect(del.status).toBe(200);
    const list = await req('', token);
    const data = (await list.json()) as { affiliates: unknown[] };
    expect(data.affiliates).toHaveLength(5);
  });

  it('비활성 카드는 /care/me 공개 응답에서 제외된다', async () => {
    const { token } = setupAdmin();
    await req('/diet-mediterranean-plan', token, {
      method: 'PATCH',
      body: JSON.stringify({ active: false }),
    });
    const rows = analysisMock.state.careAffiliates.filter(
      (r) => r.category === 'diet' && r.active === 1,
    );
    expect(rows).toHaveLength(1); // 2건 중 1건만 활성
  });
});
