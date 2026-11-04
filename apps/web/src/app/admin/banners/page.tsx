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
  fetchSiteContent,
  upsertSiteContentApi,
  type AdminBanner,
  type BannerPlacement,
} from '@/lib/api-client';

// vitalabs 배너 자동 넘김 간격을 담는 site_content 키(마이그레이션 불필요).
const VITALABS_INTERVAL_KEY = 'vitalabs_banner_interval_ms';

const ACCEPT = 'image/png,image/jpeg,image/webp,video/mp4,video/webm,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov';

const PLACEMENTS: { id: BannerPlacement; label: string }[] = [
  { id: 'app', label: 'VITAcode 앱 홈' },
  { id: 'vitalabs', label: '회사 사이트(vitalabsinc.com)' },
];

export default function AdminBannersPage() {
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading');
  const [placement, setPlacement] = useState<BannerPlacement>('app');
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // vitalabs 배너 자동 넘김 간격(초).
  const [intervalSec, setIntervalSec] = useState('6');
  const [intervalSaving, setIntervalSaving] = useState(false);
  const [intervalMsg, setIntervalMsg] = useState<string | null>(null);

  useEffect(() => {
    setState('loading');
    setMsg(null);
    fetchAdminBanners(placement)
      .then((list) => {
        setBanners(list);
        setState('ok');
      })
      .catch((e) => {
        const code = e instanceof Error ? e.message : '';
        setState(code === 'FORBIDDEN' || code === 'UNAUTHORIZED' ? 'forbidden' : 'error');
      });
  }, [placement]);

  // vitalabs 탭일 때 현재 저장된 간격을 불러온다(공개 site-content로 충분).
  useEffect(() => {
    if (placement !== 'vitalabs') return;
    setIntervalMsg(null);
    fetchSiteContent()
      .then((c) => {
        const ms = parseInt(c[VITALABS_INTERVAL_KEY] ?? '', 10);
        if (!Number.isNaN(ms)) setIntervalSec(String(Math.round(ms / 1000)));
      })
      .catch(() => {
        /* 실패 시 기본값(6초) 유지 */
      });
  }, [placement]);

  async function saveInterval() {
    const sec = Number(intervalSec);
    if (!Number.isFinite(sec) || sec < 2 || sec > 60) {
      setIntervalMsg('2~60초 사이로 입력하세요.');
      return;
    }
    setIntervalSaving(true);
    setIntervalMsg(null);
    try {
      await upsertSiteContentApi(VITALABS_INTERVAL_KEY, String(Math.round(sec * 1000)));
      setIntervalMsg('저장되었습니다. (회사 사이트에 즉시 반영)');
    } catch {
      setIntervalMsg('저장에 실패했습니다.');
    } finally {
      setIntervalSaving(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setMsg(null);
    let last: AdminBanner[] = banners;
    let failed = 0;
    for (const file of Array.from(files)) {
      try {
        last = await uploadBanner(file, placement);
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
      {state !== 'forbidden' && (
        <div className="mt-3 flex gap-1.5 rounded-2xl bg-stone-100 p-1 dark:bg-stone-800">
          {PLACEMENTS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => setPlacement(p.id)}
              className={`flex-1 rounded-xl px-3 py-2 text-[12px] font-semibold transition disabled:opacity-50 ${
                placement === p.id
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-stone-900 dark:text-brand-300'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
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
          {/* vitalabs 전용 — 자동 넘김 간격(시퀀싱 타임) */}
          {placement === 'vitalabs' && (
            <div className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
              <p className="text-[14px] font-bold text-stone-900 dark:text-stone-100">자동 넘김 간격</p>
              <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                회사 사이트(vitalabsinc.com) 배너가 다음 배너로 자동 전환되는 시간. 2~60초.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={2}
                  max={60}
                  step={1}
                  value={intervalSec}
                  disabled={intervalSaving}
                  onChange={(e) => setIntervalSec(e.target.value)}
                  className="w-24 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[14px] text-stone-900 focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
                />
                <span className="text-[13px] text-stone-500 dark:text-stone-400">초</span>
                <button
                  type="button"
                  disabled={intervalSaving}
                  onClick={() => void saveInterval()}
                  className="ml-auto rounded-xl bg-stone-900 px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-stone-900"
                >
                  {intervalSaving ? '저장 중…' : '저장'}
                </button>
              </div>
              {intervalMsg && (
                <p className="mt-2 text-[12px] font-medium text-stone-600 dark:text-stone-300">{intervalMsg}</p>
              )}
            </div>
          )}

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
                      onClick={() => void act(() => moveBannerApi(b.id, 'up', placement))}
                      className="rounded-lg border border-stone-200 px-2 py-1 text-[11px] font-semibold text-stone-600 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
                    >
                      ↑ 위로
                    </button>
                    <button
                      type="button"
                      disabled={busy || i === banners.length - 1}
                      onClick={() => void act(() => moveBannerApi(b.id, 'down', placement))}
                      className="rounded-lg border border-stone-200 px-2 py-1 text-[11px] font-semibold text-stone-600 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
                    >
                      ↓ 아래로
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act(() => setBannerActiveApi(b.id, !b.active, placement))}
                      className="rounded-lg border border-stone-200 px-2 py-1 text-[11px] font-semibold text-stone-600 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
                    >
                      {b.active ? '비활성화' : '활성화'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (typeof window !== 'undefined' && !window.confirm('이 배너를 삭제할까요?')) return;
                        void act(() => deleteBannerApi(b.id, placement));
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
