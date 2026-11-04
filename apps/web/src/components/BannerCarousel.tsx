'use client';

// 홈 히어로 배너 캐러셀 — 관리자 업로드 배너(이미지/동영상)를 표시.
// 배너가 없으면 기존 히어로 이미지로 폴백. 2개 이상이면 좌우 화살표 + 점으로 이동.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchBanners, bannerFileUrl, type BannerItem } from '@/lib/api-client';

// 배너 클릭 시 "Digital Twin & VITA code" 설명 페이지로 이동.
const BANNER_LINK = '/intro';

export function BannerCarousel() {
  const [banners, setBanners] = useState<BannerItem[] | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    fetchBanners()
      .then((list) => setBanners(list))
      .catch(() => setBanners([]));
  }, []);

  // 로딩 중·실패·배너 없음 → 기존 히어로 이미지 폴백.
  if (banners === null || banners.length === 0) {
    return (
      <section className="card-shadow mt-3 overflow-hidden rounded-2xl">
        <Link href={BANNER_LINK} className="block" aria-label="Digital Twin & VITA code 안내">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/caremybody-hero.png" alt="" className="block w-full" />
        </Link>
      </section>
    );
  }

  const safeIdx = ((idx % banners.length) + banners.length) % banners.length;
  const cur = banners[safeIdx];
  if (!cur) return null;
  const go = (d: number) => setIdx((i) => i + d);

  return (
    <section className="card-shadow relative mt-3 overflow-hidden rounded-2xl bg-black">
      <Link href={BANNER_LINK} className="block" aria-label="Digital Twin & VITA code 안내">
        {cur.kind === 'video' ? (
          <video
            key={cur.id}
            src={bannerFileUrl(cur.id)}
            className="block w-full"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={cur.id} src={bannerFileUrl(cur.id)} alt={cur.name ?? ''} className="block w-full" />
        )}
      </Link>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="이전 배너"
            className="absolute left-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="다음 배너"
            className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55 active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`${i + 1}번 배너`}
                className={`h-1.5 rounded-full transition-all ${
                  i === safeIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
