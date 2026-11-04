// SNS·메신저로 공유할 때 붙이는 VITAcode 앱 받기 링크 (2026-11-04 죠니 — FormCoach 공유와 같은 방식).
//
// 앱을 안 깐 사람이 링크를 누르면 vitacodeapp.com/get → 게이트웨이 /api/v1/app/get 이
// 안드로이드 = Play 스토어, 아이폰 = App Store(관리 'app_store_ios_url', 비면 웹), 그 밖 = 웹으로 보낸다.
// from = 어디서 공유했는지(관리 '앱 받기 링크' 화면의 들어온 수에 곳별로 잡힌다).
// 관리 설정 site_content `sns_app_link` = 'off' 면 붙이지 않는다(기본 켬).

import { fetchSiteContent } from '@/lib/api-client';

export const APP_LINK_BASE = 'https://vitacodeapp.com/get';

/** 그림 속에 적는 짧은 주소 (그림 속 글자는 누를 수 없으니 QR 과 함께) */
export const APP_LINK_SHORT = 'vitacodeapp.com/get';

/** 설정값 판정 — 'off' 만 끔 */
export function isAppLinkOn(value: string | null | undefined): boolean {
  return (value ?? '').trim().toLowerCase() !== 'off';
}

/** 관리 설정을 읽는다. 읽지 못하면 켬으로 본다(공유를 막지 않는다). */
export async function appLinkEnabled(): Promise<boolean> {
  try {
    const c = await fetchSiteContent();
    return isAppLinkOn(c['sns_app_link']);
  } catch {
    return true;
  }
}

/** 공유한 곳을 붙인 링크 */
export function appLinkFor(from: string): string {
  const u = new URL(APP_LINK_BASE);
  u.searchParams.set('from', from);
  return u.toString();
}

/** 공유 글: 원래 글 + 앱 링크 줄 + 해시태그. 링크가 꺼져 있으면 원래 글 그대로 */
export function shareCaption(text: string, linkLine: string | null, hashtag: string): string {
  if (!linkLine) return text;
  return [text.trim(), linkLine, hashtag].filter(Boolean).join('\n\n');
}
