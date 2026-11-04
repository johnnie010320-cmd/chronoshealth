// ADR 0014 — same-origin API 프록시.
// vitacodeapp.com/api/* → 게이트웨이 Worker 로 전달.
// 브라우저는 웹 도메인하고만 통신 → 쿠키가 first-party(ITP 회피).
// 요청 Cookie/메서드/바디를 그대로 넘기고, 응답 Set-Cookie 를 그대로 반환.

const GATEWAY = 'https://chronoshealth-gateway.l2pamerica.workers.dev';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const target = GATEWAY + url.pathname + url.search;

  // 메서드·헤더(Cookie 포함)·바디를 보존해 그대로 프록시.
  // 게이트웨이는 workers.dev host 만 보므로, 브라우저 실제 오리진을 헤더로 전달.
  //   → SNS 로그인 redirect_uri 를 vitacodeapp.com 기준으로 생성하는 데 사용.
  const headers = new Headers(request.headers);
  headers.set('X-Forwarded-Host', url.host);
  headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

  const proxied = new Request(target, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual', // OAuth 302(→제공사 / →콜백)를 브라우저로 그대로 통과.
  });
  const resp = await fetch(proxied);

  // status·헤더(Set-Cookie·Location 포함) 그대로 브라우저에 반환.
  return new Response(resp.body, resp);
}
