// 메일 발송 — Resend HTTP API (자매 프로젝트 FormCoach·CloudBridge 와 동일 공급자).
// 비밀값: RESEND_API_KEY (wrangler secret), 발신자: MAIL_FROM (예: 'VITAcode <no-reply@vitacodeapp.com>').
// 키·발신자가 없으면 발송하지 않고 { ok:false, reason:'NOT_CONFIGURED' } 를 돌려준다(호출부가 로깅).
// 키 값·수신자 주소는 로그/응답에 절대 남기지 않는다.

export type MailEnv = {
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
};

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type MailResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: 'NOT_CONFIGURED' | 'HTTP_ERROR' | 'NETWORK_ERROR'; status?: number };

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export async function sendMail(env: MailEnv, msg: MailMessage): Promise<MailResult> {
  const key = (env.RESEND_API_KEY ?? '').trim();
  const from = (env.MAIL_FROM ?? '').trim();
  if (!key || !from) return { ok: false, reason: 'NOT_CONFIGURED' };

  let res: Response;
  try {
    res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
  } catch {
    return { ok: false, reason: 'NETWORK_ERROR' };
  }
  if (!res.ok) return { ok: false, reason: 'HTTP_ERROR', status: res.status };
  let id: string | null = null;
  try {
    const data = (await res.json()) as { id?: unknown };
    if (typeof data.id === 'string') id = data.id;
  } catch {
    /* 본문 없음 — 발송 자체는 성공 */
  }
  return { ok: true, id };
}
