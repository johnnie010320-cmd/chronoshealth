// 앱 받기 링크 vitacodeapp.com/get?from=<곳> → 게이트웨이 /api/v1/app/get (2026-11-04, FormCoach /get 과 같은 방식).
// 게이트웨이가 기기를 보고 Play 스토어 / App Store / 웹으로 302 한다. User-Agent 를 그대로 넘겨야 기기 판정이 된다.

const GATEWAY = 'https://chronoshealth-gateway.l2pamerica.workers.dev';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const headers = new Headers();
  headers.set('User-Agent', context.request.headers.get('User-Agent') ?? '');
  const resp = await fetch(GATEWAY + '/api/v1/app/get' + url.search, { headers, redirect: 'manual' });
  return new Response(resp.body, resp);
}
