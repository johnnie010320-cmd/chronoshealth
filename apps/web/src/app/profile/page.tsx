'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/lib/i18n';
import { countryName, countryOptions } from '@/lib/countries';
import { readSession, clearSession, type StoredSession } from '@/lib/session';
import { useIsAdmin } from '@/lib/admin-state';
import {
  deleteMyAvatar,
  fetchMeProfile,
  fetchMyAvatar,
  submitLogout,
  submitProfileUpdate,
  uploadMyAvatar,
  type MeProfile,
  type ProfileUpdateBody,
} from '@/lib/api-client';
import { ProfileUpdateRequest } from '@/lib/signup-schema';
import {
  UserCircleIcon,
  ShieldIcon,
  LogoutIcon,
  ChevronRightIcon,
  BellIcon,
  BookIcon,
  UsersIcon,
  ChatBubbleIcon,
  MenuIcon,
  type IconProps,
} from '@/components/HealthIcons';
import { resizeImageToDataUrl } from '@/lib/image';
import { BlockedUsers } from '@/components/ReportSheet';

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; me: MeProfile }
  | { status: 'err'; code: string };


export default function ProfilePage() {
  const { t, locale } = useI18n();
  const P = t.profile;
  const A = P.avatar;
  const E = P.edit;
  const F = t.signup.fields;
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isAdmin = useIsAdmin();

  // 내 정보 수정
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    birthYear: '',
    sex: '',
    nationality: '',
  });

  useEffect(() => {
    const s = readSession();
    if (s) {
      setSession(s);
      setReady(true);
    } else {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    void loadMe(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function loadMe(reveal: boolean) {
    setBusy(true);
    try {
      const { profile } = await fetchMeProfile(reveal);
      setState({ status: 'ok', me: profile });
      setRevealed(reveal);
      if (profile.hasAvatar) {
        void loadAvatar();
      } else {
        setAvatarDataUrl(null);
      }
    } catch (e) {
      const code = e instanceof Error ? e.message : 'generic';
      setState({ status: 'err', code });
    } finally {
      setBusy(false);
    }
  }

  async function loadAvatar() {
    try {
      const a = await fetchMyAvatar();
      setAvatarDataUrl(a ? `data:${a.mimeType};base64,${a.dataB64}` : null);
    } catch {
      setAvatarDataUrl(null);
    }
  }

  async function handleAvatarFile(file: File) {
    setAvatarBusy(true);
    setAvatarErr(null);
    try {
      const { mimeType, dataB64 } = await resizeImageToDataUrl(file, 256, 0.85);
      await uploadMyAvatar(mimeType, dataB64);
      setAvatarDataUrl(`data:${mimeType};base64,${dataB64}`);
    } catch (e) {
      setAvatarErr(e instanceof Error ? e.message : 'generic');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleAvatarDelete() {
    if (typeof window !== 'undefined' && !window.confirm(A.confirmDelete)) return;
    setAvatarBusy(true);
    setAvatarErr(null);
    try {
      await deleteMyAvatar();
      setAvatarDataUrl(null);
    } catch (e) {
      setAvatarErr(e instanceof Error ? e.message : 'generic');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleEditStart() {
    setFormError(null);
    setSavedFlash(false);
    let me = state.status === 'ok' ? state.me : null;
    // 편집에는 마스킹되지 않은 실제 값이 필요 — reveal=1로 다시 로드.
    if (!revealed || !me) {
      try {
        const { profile } = await fetchMeProfile(true);
        me = profile;
        setState({ status: 'ok', me: profile });
        setRevealed(true);
        if (profile.hasAvatar) void loadAvatar();
      } catch {
        setFormError('generic');
        return;
      }
    }
    if (!me) return;
    setForm({
      name: me.name ?? '',
      phone: me.phone ?? '',
      birthYear: me.birthYear == null ? '' : String(me.birthYear),
      sex: me.sex ?? '',
      nationality: me.nationality ?? '',
    });
    setEditing(true);
  }

  function handleEditCancel() {
    setEditing(false);
    setFormError(null);
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const raw = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      birthYear: form.birthYear.trim() === '' ? NaN : Number(form.birthYear),
      sex: form.sex,
      nationality: form.nationality,
    };
    const parsed = ProfileUpdateRequest.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setFormError(first?.message === 'AGE_RESTRICTED' ? 'AGE_RESTRICTED' : 'INVALID_INPUT');
      return;
    }
    setSaving(true);
    try {
      // nickname 미포함 → 백엔드가 기존 Twin 닉네임을 그대로 보존 (변경 불가 정책 유지).
      await submitProfileUpdate(parsed.data as ProfileUpdateBody);
      setEditing(false);
      setSavedFlash(true);
      await loadMe(true); // GET 응답 형태로 일관되게 재로딩 (hasAvatar 등 포함).
    } catch (err) {
      const code = err instanceof Error ? err.message : 'generic';
      setFormError(code);
    } finally {
      setSaving(false);
    }
  }

  if (!ready || !session) return null;

  const handleLogout = async () => {
    if (typeof window !== 'undefined' && !window.confirm(P.logoutConfirm)) {
      return;
    }
    await submitLogout(); // ADR 0014 — 서버에서 httpOnly 쿠키 삭제 + 토큰 revoke.
    clearSession();
    // 소개 페이지로 전체 이동 — 세션/쿠키 상태를 새로 읽도록 강제. trailingSlash: true.
    window.location.assign('/welcome/?loggedout=1');
  };

  return (
    <AppShell title={P.pageTitle} decoration="dots">
      {isAdmin === true && (
        <Link
          href="/admin"
          className="card-shadow mt-4 flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 px-5 py-4 text-white transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-bold tracking-tight">
                {t.admin.accessTitle}
                <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-[0.15em]">
                  {t.admin.modeBadge}
                </span>
              </p>
              <p className="mt-0.5 truncate text-[12px] leading-relaxed text-white/85">
                {t.admin.accessBody}
              </p>
            </div>
          </div>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-white/90" />
        </Link>
      )}

      <section className="card-shadow grad-pink relative mt-4 flex items-center gap-4 overflow-hidden rounded-3xl p-6">
        <span
          className="blob"
          style={{ width: 150, height: 150, right: -24, top: -34, background: 'radial-gradient(circle, #fbcfe8, transparent 70%)' }}
        />
        <span
          className="blob"
          style={{ width: 110, height: 110, left: -28, bottom: -40, background: 'radial-gradient(circle, #f0abfc, transparent 70%)' }}
        />
        <div className="relative z-10 h-24 w-24 shrink-0 overflow-hidden rounded-full border-[3px] border-white/90 bg-white/20 shadow-lg backdrop-blur">
          {avatarDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarDataUrl}
              alt={A.altMine}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-white/90">
              <UserCircleIcon className="h-14 w-14" />
            </span>
          )}
        </div>
        <div className="relative z-10 min-w-0 flex-1">
          <p className="text-base font-bold tracking-tight text-white">
            {A.sectionTitle}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/85">
            {A.hint}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
              className="rounded-xl bg-white px-3.5 py-1.5 text-[12px] font-bold text-rose-600 shadow-sm transition active:scale-[0.97] disabled:opacity-60"
            >
              {avatarBusy ? A.uploading : avatarDataUrl ? A.changeCta : A.uploadCta}
            </button>
            {avatarDataUrl && (
              <button
                type="button"
                onClick={() => void handleAvatarDelete()}
                disabled={avatarBusy}
                className="rounded-xl border border-white/60 bg-white/10 px-3.5 py-1.5 text-[12px] font-semibold text-white backdrop-blur transition active:scale-[0.97] disabled:opacity-60"
              >
                {A.removeCta}
              </button>
            )}
          </div>
          {avatarErr && (
            <p className="mt-2 text-[11px] font-medium text-white">
              {A.errCodes[avatarErr as keyof typeof A.errCodes] ?? A.errCodes.generic}
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleAvatarFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      <section className="card-shadow mt-4 rounded-3xl card-rose p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-200">
              <UserCircleIcon className="h-5 w-5" />
            </span>
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              <span className="accent-bar bg-rose-500" />
              {P.sectionAccount}
            </h2>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={() => void loadMe(!revealed)}
              disabled={busy}
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition active:scale-[0.97] disabled:opacity-60 ${
                revealed
                  ? 'bg-white text-rose-700 shadow-sm dark:bg-stone-900 dark:text-rose-200'
                  : 'bg-rose-500 text-white shadow-sm'
              }`}
            >
              {revealed ? P.hideCta : P.revealCta}
            </button>
          )}
        </div>

        {savedFlash && !editing && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            {E.updated}
          </div>
        )}

        {state.status === 'loading' && (
          <div className="flex justify-center py-6">
            <span className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-stone-300 border-t-rose-500 dark:border-stone-700 dark:border-t-rose-400" />
          </div>
        )}

        {state.status === 'err' && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            {P.errorGeneric}
          </div>
        )}

        {state.status === 'ok' && !editing && (
          <>
            <dl className="space-y-3 text-sm">
              <Row label={P.nicknameLabel} value={state.me.nickname ?? P.nicknameUnset} />
              <Row label={P.nameLabel} value={state.me.name ?? '—'} />
              <Row label={P.emailLabel} value={state.me.email} mono />
              <Row label={P.phoneLabel} value={state.me.phone ?? '—'} mono />
              <Row
                label={P.birthYearLabel}
                value={state.me.birthYear == null ? '—' : `${state.me.birthYear}`}
              />
              <Row
                label={P.sexLabel}
                value={
                  state.me.sex == null
                    ? '—'
                    : (P.sexValues[state.me.sex] ?? state.me.sex)
                }
              />
              {state.me.nationality && (
                <Row
                  label={P.nationalityLabel}
                  value={countryName(state.me.nationality, locale, F.nationality.options.OTHER)}
                />
              )}
              <Row
                label={P.joinedAtLabel}
                value={new Date(state.me.createdAt).toLocaleDateString(locale)}
              />
            </dl>
            {revealed && (
              <p className="mt-3 rounded-xl bg-amber-50/60 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                {P.revealNote}
              </p>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              {P.note}
            </p>
            <button
              type="button"
              onClick={() => void handleEditStart()}
              disabled={busy}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
            >
              {E.cta}
            </button>
          </>
        )}

        {state.status === 'ok' && editing && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
              >
                {E.errors[formError as keyof typeof E.errors] ?? E.errors.generic}
              </div>
            )}

            <EditField
              label={F.name.label}
              value={form.name}
              onChange={(v) => setForm((s) => ({ ...s, name: v }))}
              type="text"
              maxLength={40}
              placeholder={F.name.placeholder}
              autoComplete="name"
            />
            <EditField
              label={F.phone.label}
              value={form.phone}
              onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
              type="tel"
              placeholder={F.phone.placeholder}
              autoComplete="tel"
            />
            <EditField
              label={F.birthYear.label}
              value={form.birthYear}
              onChange={(v) => setForm((s) => ({ ...s, birthYear: v }))}
              type="number"
              min={1900}
              placeholder={F.birthYear.placeholder}
            />
            <EditSelect
              label={F.sex.label}
              value={form.sex}
              onChange={(v) => setForm((s) => ({ ...s, sex: v }))}
              options={[
                { value: 'male', label: F.sex.options.male },
                { value: 'female', label: F.sex.options.female },
                { value: 'other', label: F.sex.options.other },
              ]}
            />
            <EditSelect
              label={F.nationality.label}
              value={form.nationality}
              onChange={(v) => setForm((s) => ({ ...s, nationality: v }))}
              options={countryOptions(locale, F.nationality.options.OTHER)}
            />

            <p className="rounded-xl bg-stone-50 px-3 py-2 text-[11px] leading-relaxed text-stone-500 dark:bg-stone-800/60 dark:text-stone-400">
              {E.nicknameNote}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleEditCancel}
                disabled={saving}
                className="flex-1 rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition active:scale-[0.98] disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
              >
                {E.cancel}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? E.saving : E.save}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="card-shadow mt-4 rounded-3xl card-emerald p-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-200">
            <ShieldIcon className="h-5 w-5" />
          </span>
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            <span className="accent-bar bg-rose-500" />
            {P.sectionPrivacy}
          </h2>
        </div>
        <ul className="space-y-2 text-[13px] text-stone-800 dark:text-stone-200">
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{P.consentMedical}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{P.consentTerms}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{P.consentPrivacy}</span>
          </li>
        </ul>
        {state.status === 'ok' && state.me.consentRecordedAt && (
          <p className="mt-3 text-[10px] text-stone-500 dark:text-stone-400">
            {P.consentGrantedAt}: {new Date(state.me.consentRecordedAt).toLocaleDateString(locale)}
          </p>
        )}
      </section>

      {/* 더보기 — 전체메뉴 탭 해체(2026-08)에 따라 마이페이지 항목을 여기로 이동 + 전체 메뉴 접근 */}
      <section className="card-shadow mt-4 overflow-hidden rounded-3xl bg-white/95 dark:bg-stone-900">
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {(
            [
              ['/notices', t.menu.itemNotices, BellIcon, 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-200'],
              ['/diary', t.menu.itemProfileDiary, BookIcon, 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-200'],
              ['/community?mine=1', t.menu.itemProfileMyPosts, UsersIcon, 'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-200'],
              ['/feature-requests', t.menu.itemFeatureRequest, ChatBubbleIcon, 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-200'],
              ['/menu', t.menu.pageTitle, MenuIcon, 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-200'],
            ] as [string, string, (p: IconProps) => React.ReactElement, string][]
          ).map(([href, label, Icon, badge]) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 px-5 py-3.5 text-stone-700 transition active:bg-rose-50/60 dark:text-stone-200 dark:active:bg-stone-800"
              >
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${badge}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{label}</span>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 차단한 사용자 (2026-11-08 신고·차단) */}
      <div className="mt-6">
        <BlockedUsers />
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-6 py-4 text-base font-semibold text-rose-700 transition active:scale-[0.98] hover:bg-rose-50 dark:border-rose-900 dark:bg-stone-900 dark:text-rose-300 dark:hover:bg-rose-950"
        >
          <LogoutIcon className="h-5 w-5" />
          {P.logout}
        </button>
        {/* 회원 탈퇴 (2026-11-08) — 공개 페이지 /account-delete 와 같은 화면 */}
        <Link
          href="/account-delete/"
          className="mt-4 block text-center text-[13px] text-stone-500 underline underline-offset-2 dark:text-stone-400"
        >
          {P.deleteAccount}
        </Link>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-stone-100 pb-2 last:border-0 dark:border-stone-800">
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {label}
      </dt>
      <dd
        className={`break-all text-right text-stone-800 dark:text-stone-100 ${mono ? 'font-mono text-[13px]' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = 'text',
  min,
  maxLength,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  min?: number;
  maxLength?: number;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-stone-700 dark:text-stone-300">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        min={min}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={type === 'number' ? 'decimal' : type === 'tel' ? 'tel' : undefined}
        className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:bg-stone-900"
      />
    </label>
  );
}

function EditSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-stone-700 dark:text-stone-300">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:focus:bg-stone-900"
      >
        <option value="" disabled>
          —
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
