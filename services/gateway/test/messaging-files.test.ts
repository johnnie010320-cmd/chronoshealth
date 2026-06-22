import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { cleanupExpiredAttachments } from '../src/messaging/cleanup.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
  type MockD1State,
} from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';

// R9 — 대화 파일 첨부(jpg/pdf/ppt) + 다운로드 + 7일 자동삭제 + 미읽음 합계.
describe('R9 대화 파일 공유', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let r2: ReturnType<typeof makeMockR2>;
  let aliceToken: string;
  let bobToken: string;
  let carolToken: string;

  function seedUser(state: MockD1State, pseudo: string, nickname: string): void {
    state.users.push({
      user_pseudonym_id: pseudo,
      name: null,
      email: `${nickname}@example.com`,
      phone: null,
      birth_year: null,
      sex: null,
      nickname,
      role: 'user',
    });
  }

  beforeEach(() => {
    identity = makeMockIdentityDb();
    analysis = makeMockAnalysisDb();
    r2 = makeMockR2();
    __clearIpRateLimit();
    seedUser(identity.state, 'p-alice', 'alice');
    seedUser(identity.state, 'p-bob', 'bob');
    seedUser(identity.state, 'p-carol', 'carol');
    aliceToken = issueTestToken(identity.state, { pseudonym: 'p-alice' }).token;
    bobToken = issueTestToken(identity.state, { pseudonym: 'p-bob' }).token;
    carolToken = issueTestToken(identity.state, { pseudonym: 'p-carol' }).token;
  });

  const env = () => ({
    IDENTITY_DB: identity.db,
    DB: analysis.db,
    ATTACHMENTS: r2.bucket,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });

  async function openDm(token: string, nickname: string): Promise<string> {
    const res = await app.request(
      '/api/v1/messages/dm',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      },
      env(),
    );
    return ((await res.json()) as { conversation: { id: string } }).conversation.id;
  }

  function uploadForm(name: string, type: string, bytes = 1000): FormData {
    const data = new Uint8Array(bytes).fill(65);
    const form = new FormData();
    form.append('file', new File([data], name, { type }));
    return form;
  }

  const upload = (token: string, convId: string, form: FormData) =>
    app.request(
      `/api/v1/messages/conversations/${convId}/files`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
      env(),
    );

  it('pdf 업로드 → 메시지에 첨부 메타 포함 + R2 저장', async () => {
    const conv = await openDm(aliceToken, 'bob');
    const res = await upload(aliceToken, conv, uploadForm('report.pdf', 'application/pdf'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { message: { attachment: { name: string; type: string; size: number } } };
    expect(data.message.attachment.type).toBe('application/pdf');
    expect(data.message.attachment.name).toBe('report.pdf');
    expect(r2.store.size).toBe(1);
  });

  it('상대가 메시지 목록 조회 시 첨부 노출', async () => {
    const conv = await openDm(aliceToken, 'bob');
    await upload(aliceToken, conv, uploadForm('a.jpg', 'image/jpeg'));
    const res = await app.request(
      `/api/v1/messages/conversations/${conv}/messages`,
      { headers: { Authorization: `Bearer ${bobToken}` } },
      env(),
    );
    const data = (await res.json()) as { messages: Array<{ attachment: { name: string } | null; isMine: boolean }> };
    const withFile = data.messages.find((m) => m.attachment);
    expect(withFile?.attachment?.name).toBe('a.jpg');
    expect(withFile?.isMine).toBe(false);
  });

  it('참여자 다운로드 → 200, 비참여자 → 403', async () => {
    const conv = await openDm(aliceToken, 'bob');
    const up = await upload(aliceToken, conv, uploadForm('deck.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'));
    const msgId = ((await up.json()) as { message: { id: string } }).message.id;
    const ok = await app.request(`/api/v1/messages/files/${msgId}`, { headers: { Authorization: `Bearer ${bobToken}` } }, env());
    expect(ok.status).toBe(200);
    const outsider = await app.request(`/api/v1/messages/files/${msgId}`, { headers: { Authorization: `Bearer ${carolToken}` } }, env());
    expect(outsider.status).toBe(403);
  });

  it('지원하지 않는 형식 → 400', async () => {
    const conv = await openDm(aliceToken, 'bob');
    const res = await upload(aliceToken, conv, uploadForm('virus.exe', 'application/octet-stream'));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('미읽음 합계(알림) — 상대가 받은 첨부 메시지 카운트', async () => {
    const conv = await openDm(aliceToken, 'bob');
    await upload(aliceToken, conv, uploadForm('a.jpg', 'image/jpeg'));
    const res = await app.request('/api/v1/messages/unread-total', { headers: { Authorization: `Bearer ${bobToken}` } }, env());
    const data = (await res.json()) as { total: number };
    expect(data.total).toBeGreaterThanOrEqual(1);
  });

  it('7일 경과 첨부 → cron 정리로 삭제(다운로드 404 + R2 제거)', async () => {
    const conv = await openDm(aliceToken, 'bob');
    const up = await upload(aliceToken, conv, uploadForm('old.pdf', 'application/pdf'));
    const msgId = ((await up.json()) as { message: { id: string } }).message.id;
    // 만료 시점을 과거로 강제.
    const msg = analysis.state.messages.find((m) => m.id === msgId);
    if (msg) msg.attachment_expires_at = '2000-01-01T00:00:00.000Z';
    const removed = await cleanupExpiredAttachments(env() as unknown as Parameters<typeof cleanupExpiredAttachments>[0]);
    expect(removed).toBe(1);
    expect(r2.store.size).toBe(0);
    const dl = await app.request(`/api/v1/messages/files/${msgId}`, { headers: { Authorization: `Bearer ${bobToken}` } }, env());
    expect(dl.status).toBe(404);
  });
});

// 인메모리 R2 목 — put/get/delete 최소 구현.
function makeMockR2() {
  const store = new Map<string, { bytes: Uint8Array; ct?: string }>();
  const bucket = {
    async put(key: string, value: unknown, opts?: { httpMetadata?: { contentType?: string } }) {
      const bytes = new Uint8Array(await new Response(value as BodyInit).arrayBuffer());
      store.set(key, { bytes, ct: opts?.httpMetadata?.contentType });
      return { key };
    },
    async get(key: string) {
      const v = store.get(key);
      return v ? { body: v.bytes } : null;
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
  return { bucket, store };
}
