'use client';

// 디지털 트윈 시뮬레이션 히어로 — 첨부 PDF 4페이지(우측 목업) 디자인에 최대한 맞춤.
// 바디 이미지(남/여)는 PDF 4페이지 이미지(우측=남성, 좌측=여성)를 추출해 사용.
// 상단 우측 프로필 아이콘 = 아바타(불러오기/셀피/이모티콘). VITA code가 있으면 함께 노출.
// 의료·윤리: 상태 값은 보유 데이터에서 정직하게 도출(미연동 항목은 "연동 전"), 수치 날조 없음.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  fetchMyAvatar,
  uploadMyAvatar,
  fetchLatestVita,
  type AvatarMime,
  type VitaSavedResult,
} from '@/lib/api-client';
import { buildVitaReport } from '@/lib/vita/reports';
import { vitaAnimal, vitaAnimalImage } from '@/lib/vita/animals';
import { loadHealthProfile, type StableHealthProfile } from '@/lib/health-profile';
import { readSession } from '@/lib/session';
import { useTwinNickname } from '@/lib/profile-state';
import { useVitaResultT } from '@/locales/vita-result';

type Sex = 'male' | 'female';
type FaceMode = 'photo' | 'emoji';
const EMOJI_CHOICES = ['😀', '😎', '🧑', '👩', '👨', '🧑‍⚕️', '🦊', '🐻', '🐱', '🐬'];
const FACE_KEY = 'chronos.twinFace.v1';

function loadFacePref(): { mode: FaceMode; emoji: string } {
  if (typeof window === 'undefined') return { mode: 'photo', emoji: '🧑' };
  try {
    const raw = window.localStorage.getItem(FACE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { mode?: FaceMode; emoji?: string };
      return { mode: p.mode === 'emoji' ? 'emoji' : 'photo', emoji: p.emoji ?? '🧑' };
    }
  } catch {
    /* noop */
  }
  return { mode: 'photo', emoji: '🧑' };
}
function saveFacePref(mode: FaceMode, emoji: string) {
  try {
    window.localStorage.setItem(FACE_KEY, JSON.stringify({ mode, emoji }));
  } catch {
    /* noop */
  }
}

// 파일 → 512px 이내 JPEG 압축 base64(아바타 업로드용).
async function fileToAvatar(file: File): Promise<{ mime: AvatarMime; b64: string; dataUrl: string }> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error('read'));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('decode'));
    i.src = dataUrl;
  });
  const max = 512;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL('image/jpeg', 0.85);
  return { mime: 'image/jpeg', b64: out.split(',')[1] ?? '', dataUrl: out };
}

export function DigitalTwinSim() {
  const nickname = useTwinNickname();
  const { t: vr, locale } = useVitaResultT();
  const t = vr.twinSim;
  const [sex, setSex] = useState<Sex>('male');
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [mode, setMode] = useState<FaceMode>('photo');
  const [emoji, setEmoji] = useState<string>('🧑');
  const [vita, setVita] = useState<VitaSavedResult | null>(null);
  const [profile, setProfile] = useState<StableHealthProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pref = loadFacePref();
    setMode(pref.mode);
    setEmoji(pref.emoji);
    const prof = loadHealthProfile();
    setProfile(prof);
    if (prof?.sex === 'female') setSex('female');
    else if (prof?.sex === 'male') setSex('male');
    if (!readSession()) return;
    fetchMyAvatar()
      .then((a) => {
        if (a) setPhotoSrc(`data:${a.mimeType};base64,${a.dataB64}`);
      })
      .catch(() => {});
    fetchLatestVita()
      .then((r) => setVita(r))
      .catch(() => {});
  }, []);

  const report = vita ? buildVitaReport(vita.sectionScores, locale) : null;
  const typeName = report?.text?.nickname ?? '';
  const animalImg = vita ? vitaAnimalImage(vita.code) : '';
  const animalName = vita ? vitaAnimal(vita.code)?.name[locale] ?? vita.code : '';

  // 아바타(프로필) 표시: 사진 > 이모티콘 > 기본 아이콘
  const showPhoto = mode === 'photo' && !!photoSrc;

  // 상태 칩(정직한 도출)
  const stateVal = report ? t.state[report.totalBand] : t.beforeVita;
  const ex = profile?.exerciseHoursPerWeek ?? null;
  const lifeVal = ex == null ? t.notRecorded : ex >= 3 ? t.active : ex >= 1 ? t.moderate : t.inactive;

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setBusy(true);
    try {
      const { mime, b64, dataUrl } = await fileToAvatar(file);
      if (readSession()) await uploadMyAvatar(mime, b64).catch(() => {});
      setPhotoSrc(dataUrl);
      setMode('photo');
      saveFacePref('photo', emoji);
      setMenuOpen(false);
      setShowEmoji(false);
    } finally {
      setBusy(false);
    }
  }

  function pickEmoji(e: string) {
    setEmoji(e);
    setMode('emoji');
    saveFacePref('emoji', e);
  }

  return (
    <section className="card-shadow overflow-hidden rounded-3xl border border-cyan-900/40 bg-gradient-to-b from-[#0b1733] via-[#0a1230] to-[#070b1c] text-white">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[13px] font-black tracking-tight">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-cyan-400 text-[11px] font-black text-slate-900">
              V
            </span>
            VITAcode
          </p>
          <p className="mt-0.5 text-[11px] font-bold tracking-tight text-cyan-200/90">
            Digital Twin Simulation
          </p>
        </div>
        {/* 프로필 아이콘 */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 py-1 pl-1 pr-2.5 text-left transition active:scale-[0.97]"
          aria-label={t.profileAria}
        >
          <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-[#0a1024] ring-1 ring-cyan-300/60">
            {showPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoSrc!} alt="" className="h-full w-full object-cover" />
            ) : mode === 'emoji' ? (
              <span className="text-base leading-none">{emoji}</span>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-cyan-200">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20a8 8 0 0 1 16 0" strokeLinecap="round" />
              </svg>
            )}
          </span>
          <span className="min-w-0">
            <span className="block max-w-[96px] truncate text-[11px] font-bold leading-tight">
              {nickname || t.myVita}
            </span>
            {profile?.birthYear && (
              <span className="block text-[9px] leading-tight text-cyan-200/70">
                {t.age(new Date().getFullYear() - profile.birthYear)}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* 프로필 설정 메뉴 */}
      {menuOpen && (
        <div className="mx-4 mt-2 flex flex-wrap gap-1.5 rounded-2xl bg-black/30 p-2">
          <MenuBtn onClick={() => fileRef.current?.click()} disabled={busy}>
            {t.load}
          </MenuBtn>
          <MenuBtn onClick={() => selfieRef.current?.click()} disabled={busy}>
            {t.selfie}
          </MenuBtn>
          <MenuBtn
            onClick={() => {
              setShowEmoji((v) => !v);
              setMode('emoji');
              saveFacePref('emoji', emoji);
            }}
          >
            {t.emoji}
          </MenuBtn>
          {showPhoto && (
            <MenuBtn
              onClick={() => {
                setMode('emoji');
                saveFacePref('emoji', emoji);
              }}
            >
              {t.hidePhoto}
            </MenuBtn>
          )}
          {busy && <span className="self-center px-1 text-[11px] text-cyan-200/80">{t.uploading}</span>}
        </div>
      )}
      {menuOpen && showEmoji && (
        <div className="mx-4 mt-1.5 flex flex-wrap gap-1.5 rounded-2xl bg-black/20 p-2">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => pickEmoji(e)}
              className={`flex h-9 w-9 items-center justify-center rounded-xl text-xl transition ${
                emoji === e && mode === 'emoji' ? 'bg-cyan-400/30 ring-1 ring-cyan-300' : 'bg-white/5 hover:bg-white/10'
              }`}
              aria-label={e}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <input
        ref={selfieRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {/* 바디 히어로 */}
      <div className="relative mt-2 flex items-end justify-center px-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-2 top-2"
          style={{ background: 'radial-gradient(ellipse at 50% 55%, rgba(34,211,238,0.22), transparent 62%)' }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/vita/body/${sex === 'female' ? 'female' : 'male'}.png`}
          alt={t.bodyAlt}
          className="relative z-10 h-64 w-auto object-contain drop-shadow-[0_8px_24px_rgba(34,211,238,0.25)]"
        />
      </div>

      {/* VITA code 노출 */}
      {vita && (
        <div className="mx-4 mt-1 flex items-center gap-2.5 rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-cyan-300/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={animalImg} alt={animalName} className="h-9 w-11 shrink-0 rounded-md bg-white/10 object-contain" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70">
              My VITAcode
            </p>
            <p className="truncate text-[13px] font-extrabold">
              <span className="tracking-[0.08em]">{vita.code}</span>
              {typeName && <span className="ml-1.5 font-bold text-cyan-200">{typeName}</span>}
            </p>
          </div>
        </div>
      )}

      {/* ID */}
      <p className="mt-2 text-center text-[11px] font-semibold text-cyan-100/80">
        Digital Twin{vita ? `: ${vita.code}` : ''} · {nickname || t.myVita}
      </p>

      {/* 상태 칩 3종 */}
      <div className="mt-2.5 grid grid-cols-3 gap-px bg-cyan-900/30 pb-1 text-center">
        <StatPill label={t.current} value={stateVal} />
        <StatPill label={t.life} value={lifeVal} />
        <StatPill label={t.weekly} value={t.notLinked} />
      </div>
    </section>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0a1230] px-1 py-2.5">
      <p className="text-[9px] font-semibold text-cyan-200/60">{label}</p>
      <p className="mt-0.5 text-[12px] font-extrabold text-cyan-100">{value}</p>
    </div>
  );
}

function MenuBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-50 transition active:scale-[0.97] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
