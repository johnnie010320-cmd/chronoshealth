'use client';

// 관리자 · 메인 배너 관리 — 이미지(png/jpg/webp)·동영상(mp4/webm) 다중 업로드 + 순서·활성·삭제.
// 홈 히어로는 활성 배너를 순서대로 캐러셀로 표시(2개 이상이면 좌우 화살표).

import { useEffect, useRef, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import {
  fetchAdminBanners,
  uploadBanner,
  deleteBannerApi,
  setBannerActiveApi,
  moveBannerApi,
  bannerFileUrl,
  type AdminBanner,
} from '@/lib/api-client';

const ACCEPT = 'image/png,image/jpeg,image/webp,video/mp4,video/webm,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov';

export default function AdminBannersPage() {
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading');
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchAdminBanners()
      .then((list) => {
        setBanners(list);
        setState('ok');
      })
      .catch((e) => {
        const code = e instanceof Error ? e.message : '';
        setState(code === 'FORBIDDEN' || code === 'UNAUTHORIZED' ? 'forbidden' : 'error');
      });
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setMsg(null);
    let last: AdminBanner[] = banners;
    let failed = 0;
    for (const file of Array.from(files)) {
      try {
        last = await uploadBanner(file);
      } catch {
        failed += 1;
      }
    }
    setBanners(last);
    setBusy(false);
    setMsg(failed > 0 ? `${failed}개 업로드 실패(형식/용량 확인)` : '업로드 완료');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function act(fn: () => Promise<AdminBanner[]>) {
    setBusy(true);
    try {
      setBanners(await fn());
    } catch {
      setMsg('처리에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="배너 관리">
      {state === 'loading' ? (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      ) : state === 'forbidden' ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          관리자만 접근할 수 있습니다.
        </div>
      ) : (
        <div className="space-y-4 pb-10 pt-3">
          {/* 업로드 */}
          <div className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
            <p className="text-[14px] font-bold text-stone-900 dark:text-stone-100">배너 업로드</p>
            <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
              이미지(PNG·JPG·WebP) 또는 동영상(MP4·WebM). 여러 개 선택 가능. 최대 50MB/개.
            </p>
            <label
              className={`mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 px-4 py-6 text-[13px] font-semibold text-stone-600 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 ${
                busy ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              {busy ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-brand-600" />
              ) : (
                <span>파일 선택 (다중)</span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="hidden"
                disabled={busy}
                onChange={(e) => void handleFiles(e.target.files)}
              />
            </label>
            {msg && (
              <p className="mt-2 text-[12px] font-medium text-stone-600 dark:text-stone-300">{msg}</p>
            )}
          </div>

          {/* 목록 */}
          <div className="space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              등록된 배너 ({banners.length}) · 위에서부터 캐러셀 순서
            </p>
            {banners.length === 0 && (
              <p className="rounded-2xl border border-stone-200 bg-white px-4 py-6 text-center text-[13px] text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
                등록된 배너가 없습니다. 배너가 없으면 홈에는 기본 히어로 이미지가 표시됩니다.
              </p>
            )}
            {banners.map((b, i) => (
              <div
                key={b.id}
                className="card-shadow flex items-center gap-3 rounded-2xl bg-white px-3 py-3 dark:bg-stone-900"
              >
                <div className="h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
                  {b.kind === 'video' ? (
                    <video src={bannerFileUrl(b.id)} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bannerFileUrl(b.id)} alt={b.name ?? ''} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-stone-800 dark:text-stone-100">
                    {b.name ?? b.id.slice(0, 8)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                    <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase dark:bg-stone-800">
                      {b.kind === 'video' ? '동영상' : '이미지'}
                    </span>
                    <span>#{i + 1}</span>
                    {!b.active && <span className="font-semibold text-amber-600 dark:text-amber-400">비활성</span>}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={busy || i === 0}
                      onClick={() => void act(() => moveBannerApi(b.id, 'up'))}
                      className="rounded-lg border border-stone-200 px-2 py-1 text-[11px] font-semibold text-stone-600 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
                    >
                      ↑ 위로
                    </button>
                    <button
                      type="button"
                      disabled={busy || i === banners.length - 1}
                      onClick={() => void act(() => moveBannerApi(b.id, 'down'))}
                      className="rounded-lg border border-stone-200 px-2 py-1 text-[11px] font-semibold text-stone-600 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
                    >
                      ↓ 아래로
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act(() => setBannerActiveApi(b.id, !b.active))}
                      className="rounded-lg border border-stone-200 px-2 py-1 text-[11px] font-semibold text-stone-600 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
                    >
                      {b.active ? '비활성화' : '활성화'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (typeof window !== 'undefined' && !window.confirm('이 배너를 삭제할까요?')) return;
                        void act(() => deleteBannerApi(b.id));
                      }}
                      className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 disabled:opacity-40 dark:border-rose-900 dark:text-rose-300"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {state === 'error' && (
            <p className="text-[12px] text-rose-600 dark:text-rose-300">목록을 불러오지 못했습니다.</p>
          )}
        </div>
      )}
    </AdminShell>
  );
}
