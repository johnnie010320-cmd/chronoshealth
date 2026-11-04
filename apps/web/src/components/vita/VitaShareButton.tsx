'use client';

// 내 VITAcode 를 SNS·메신저로 공유 (2026-11-04 죠니 — FormCoach SNS 공유와 같은 방식).
// 결과 그림(QR·앱 받기 줄 포함) + 글(앱 받기 링크 + 해시태그)을 넘겨, 받은 사람이 앱을 설치하게 한다.
//  - VITAcode 앱 안(WebView): 앱의 공유 창으로 넘긴다(window.VitaShare 채널 — 앱이 클립보드 복사·메신저 글 다시 보내기까지 처리)
//  - 휴대폰 브라우저: navigator.share(그림+글), 그림 공유가 안 되면 글만
//  - 그 밖(데스크톱 등): 글 복사 + 그림 내려받기

import { useState } from 'react';
import { renderVitaShareCard } from '@/lib/vita/share-card';
import { APP_LINK_SHORT, appLinkEnabled, appLinkFor, shareCaption } from '@/lib/app-share-link';
import { vitaAnimalImage } from '@/lib/vita/animals';
import { useVitaResultT } from '@/locales/vita-result';

type AppBridge = { postMessage: (message: string) => void };

function appBridge(): AppBridge | null {
  const w = window as unknown as { VitaShare?: AppBridge };
  return w.VitaShare && typeof w.VitaShare.postMessage === 'function' ? w.VitaShare : null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function VitaShareButton({ code, nickname, codeIsLine }: { code: string; nickname: string; codeIsLine: string }) {
  const t = useVitaResultT().t.share;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onShare() {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const link = (await appLinkEnabled()) ? appLinkFor('vita_code') : null;
      const caption = shareCaption(t.caption(code, nickname), link ? t.linkLine(link) : null, t.hashtag);
      const png = await renderVitaShareCard({
        code,
        nickname,
        codeIsLine,
        animalSrc: vitaAnimalImage(code),
        footer: link ? { link, title: t.cardTitle, short: APP_LINK_SHORT, hashtag: t.hashtag } : null,
      });
      const name = `VITAcode-${code}.png`;

      const bridge = appBridge();
      if (bridge) {
        bridge.postMessage(
          JSON.stringify({ text: caption, image: png ? await blobToBase64(png) : null, name, hasLink: !!link }),
        );
        return;
      }

      // 인스타그램·페이스북은 넘긴 글을 채워 주지 않는다 → 글을 미리 복사해 둔다
      const copied = link ? await copyText(caption) : false;
      const file = png ? new File([png], name, { type: 'image/png' }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: caption, title: 'VITAcode' });
          if (copied) setNotice(t.copied);
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
        }
      }
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ text: caption, title: 'VITAcode' });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
        }
      }
      const ok = copied || (await copyText(caption));
      // 공유 연결이 없는 옛 앱(안드로이드 WebView, UA '; wv)')은 그림 내려받기가 안 된다 → 글 복사만
      if (/; wv\)/.test(navigator.userAgent)) {
        setNotice(ok ? t.copied : t.failed);
        return;
      }
      if (png) download(png, name);
      setNotice(ok ? t.copiedAndSaved : t.saved);
    } catch {
      setNotice(t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void onShare()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-[14px] font-extrabold text-white transition active:scale-[0.99] disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        {busy ? t.preparing : t.button}
      </button>
      {notice && (
        <p className="mt-1.5 text-center text-[11.5px] font-semibold text-stone-600 dark:text-stone-300">{notice}</p>
      )}
    </div>
  );
}
