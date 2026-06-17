// ADR 0014 — same-origin API 프록시.
// chronoshealth.ever-day.com/api/* → 게이트웨이 Worker 로 전달.
// 브라우저는 웹 도메인하고만 통신 → 쿠키가 first-party(ITP 회피).
// 요청 Cookie/메서드/바디를 그대로 넘기고, 응답 Set-Cookie 를 그대로 반환.

const GATEWAY = 'https://chronoshealth-gateway.l2pamerica.workers.dev';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const target = GATEWAY + url.pathname + url.search;

  // 메서드·헤더(Cookie 포함)·바디를 보존해 그대로 프록시.
  const proxied = new Request(target, request);
  const resp = await fetch(proxied);

  // status·헤더(Set-Cookie 포함) 그대로 브라우저에 반환.
  return new Response(resp.body, resp);
}
