'use client';

// iOS 앱 안에서는 웹 하단 탭을 숨기고 탭 목록을 앱으로 올려 네이티브 탭바로 그린다 (2026-11-10 죠니 B안).
// 규약 정본 = apps/mobile/lib/web_tabs.dart 맨 위 주석. 채널 `VitaNav` 로 { ready, tabs } · { active } 를 보내고,
// 앱이 탭을 누르면 window.VitaApp.navigate(key) 를 부른다.
// 앱은 VitaNav 를 Android 에도 열어 두지만 네이티브 탭바는 iOS 에서만 그린다 → iOS 일 때만 웹 탭을 숨긴다.
// 마이페이지는 탭에서 빠지고 헤더 사용자 메뉴로 간다(네이티브 '활동' 포함 5개가 한도).

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

type NavChannel = { postMessage: (msg: string) => void };
type VitaWindow = Window & { VitaNav?: NavChannel; VitaApp?: { navigate: (key: string) => boolean } };

const TABS = [
  { key: 'home', labelKey: 'home', route: '/', icon: 'home' },
  { key: 'twin', labelKey: 'digitalTwin', route: '/reports', icon: 'twin' },
  { key: 'code', labelKey: 'vitaCode', route: '/ai-diagnosis', icon: 'code' },
  { key: 'community', labelKey: 'community', route: '/community', icon: 'community' },
] as const;

function navChannel(): NavChannel | null {
  if (typeof window === 'undefined') return null;
  const ch = (window as VitaWindow).VitaNav;
  if (!ch || typeof ch.postMessage !== 'function') return null;
  // 아이패드 WKWebView 는 데스크톱 UA(Macintosh)를 쓴다 — 터치 지점 수로 구분.
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios ? ch : null;
}

function activeKey(pathname: string): string {
  if (pathname === '/') return 'home';
  const hit = TABS.find((t) => t.route !== '/' && (pathname === t.route || pathname.startsWith(`${t.route}/`)));
  return hit?.key ?? '';
}

/** iOS 앱 안이라 하단 탭을 네이티브가 그리는지. 첫 렌더는 false(정적 export 수화 일치). */
export function useNativeTabs(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(navChannel() !== null);
  }, []);
  return native;
}

/** 루트 레이아웃에 한 번 둔다 — 탭 목록·현재 탭을 앱에 알리고 앱의 탭 누름을 SPA 이동으로 받는다. */
export function NativeTabsBridge() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? '/';

  useEffect(() => {
    const ch = navChannel();
    if (!ch) return;
    (window as VitaWindow).VitaApp = {
      navigate(key: string) {
        const tab = TABS.find((x) => x.key === key);
        if (!tab) return false;
        router.push(tab.route);
        return true;
      },
    };
    // 언어가 바뀌면 다시 보낸다(label = 지금 화면 언어).
    ch.postMessage(
      JSON.stringify({
        ready: true,
        tabs: TABS.map(({ key, labelKey, route, icon }) => ({ key, label: t.nav[labelKey], route, icon })),
      }),
    );
  }, [t, router]);

  useEffect(() => {
    navChannel()?.postMessage(JSON.stringify({ active: activeKey(pathname) }));
  }, [pathname, t]);

  return null;
}
