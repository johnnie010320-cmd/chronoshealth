// ADR 0014 — same-origin API 프록시 (회사 홍보 사이트 vitalabsinc.com).
// vitalabsinc.com/api/* → VITAcode 게이트웨이 Worker 로 전달.
// 회사 사이트는 배너(placement=vitalabs)·site-content 만 공개 조회하므로 쿠키 불필요하지만,
// 앱과 동일 프록시 방식으로 CORS 를 원천 회피한다.

const GATEWAY = 'https://chronoshealth-gateway.l2pamerica.workers.dev';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const target = GATEWAY + url.pathname + url.search;
  const proxied = new Request(target, request);
  const resp = await fetch(proxied);
  return new Response(resp.body, resp);
}
