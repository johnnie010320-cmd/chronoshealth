'use client';

// 관리자 · 앱 받기 링크(SNS 공유) — 켜기/끄기, App Store 주소, 들어온 수 (2026-11-04, FormCoach '앱 버전 관리'와 같은 방식).
// 설정은 site_content 키 `sns_app_link`('off' 면 끔) · `app_store_ios_url`(비면 아이폰도 웹으로).

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import {
  fetchAdminSiteContent,
  fetchAppLinkStats,
  upsertSiteContentApi,
  type AppLinkStats,
} from '@/lib/api-client';
import { APP_LINK_BASE, isAppLinkOn } from '@/lib/app-share-link';

const SOURCE_LABEL: Record<string, string> = { vita_code: 'VITAcode 결과 공유', '-': '(곳 없음)' };
const OS_LABEL: Record<string, string> = { android: '안드로이드', ios: '아이폰·아이패드', other: '그 밖(PC 등)' };

export default function AdminAppLinkPage() {
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading');
  const [on, setOn] = useState(true);
  const [iosUrl, setIosUrl] = useState('');
  const [stats, setStats] = useState<AppLinkStats | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAdminSiteContent(), fetchAppLinkStats().catch(() => null)])
      .then(([items, st]) => {
        const map: Record<string, string> = {};
        for (const it of items) map[it.key] = it.value;
        setOn(isAppLinkOn(map['sns_app_link']));
        setIosUrl(map['app_store_ios_url'] ?? '');
        setStats(st);
        setState('ok');
      })
      .catch((e) => {
        const code = e instanceof Error ? e.message : '';
        setState(code === 'FORBIDDEN' || code === 'UNAUTHORIZED' ? 'forbidden' : 'error');
      });
  }, []);

  async function save(key: string, value: string) {
    setSaving(key);
    setSaved(null);
    try {
      await upsertSiteContentApi(key, value);
      setSaved(key);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(null);
    }
  }

  async function toggle() {
    const next = !on;
    if (await save('sns_app_link', next ? 'on' : 'off')) setOn(next);
  }

  const iosValid = iosUrl.trim() === '' || iosUrl.trim().startsWith('https://apps.apple.com/');

  return (
    <AdminShell title="앱 받기 링크 (SNS 공유)">
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
          <p className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-2.5 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
            VITAcode 결과를 SNS·메신저로 공유하면 글 끝과 그림 아래에 <b>{APP_LINK_BASE}</b> 링크가 붙습니다.
            누르면 안드로이드는 Play 스토어, 아이폰은 App Store(아래 주소가 비면 웹), 그 밖은 웹으로 갑니다.
          </p>

          <div className="card-shadow flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-stone-900 dark:text-stone-100">공유에 앱 받기 링크 붙이기</p>
              <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                {on ? '켜짐 — 공유 글·그림에 링크와 QR이 붙습니다' : '꺼짐 — 결과 그림과 글만 공유됩니다'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              disabled={saving === 'sns_app_link'}
              onClick={() => void toggle()}
              className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${on ? 'bg-brand-600' : 'bg-stone-300 dark:bg-stone-700'}`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${on ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
            <label className="text-[13px] font-bold text-stone-900 dark:text-stone-100">App Store 주소 (아이폰)</label>
            <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
              예: https://apps.apple.com/app/id1234567890 · 비우면 아이폰은 웹(vitacodeapp.com)으로 갑니다
            </p>
            <input
              value={iosUrl}
              onChange={(e) => setIosUrl(e.target.value)}
              placeholder="https://apps.apple.com/app/id…"
              className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-800 outline-none focus:border-brand-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
            {!iosValid && (
              <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-300">https://apps.apple.com/ 으로 시작해야 합니다.</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={!iosValid || saving === 'app_store_ios_url'}
                onClick={() => void save('app_store_ios_url', iosUrl.trim())}
                className="rounded-xl bg-brand-700 px-4 py-2 text-[12px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                {saving === 'app_store_ios_url' ? '저장 중…' : '저장'}
              </button>
              {saved === 'app_store_ios_url' && (
                <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">저장됨</span>
              )}
            </div>
          </div>

          <div className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
            <p className="text-[13px] font-bold text-stone-900 dark:text-stone-100">링크로 들어온 수</p>
            {stats ? (
              <div className="mt-2 space-y-3 text-[12px] text-stone-700 dark:text-stone-300">
                <div className="flex gap-6">
                  <p>전체 <b className="text-[15px] text-stone-900 dark:text-stone-100">{stats.total}</b></p>
                  <p>최근 7일 <b className="text-[15px] text-stone-900 dark:text-stone-100">{stats.week}</b></p>
                </div>
                <CountList title="공유한 곳" counts={stats.bySource} labels={SOURCE_LABEL} />
                <CountList title="기기" counts={stats.byOs} labels={OS_LABEL} />
              </div>
            ) : (
              <p className="mt-1 text-[12px] text-stone-500">불러오지 못했습니다.</p>
            )}
          </div>

          {state === 'error' && <p className="text-[12px] text-rose-600 dark:text-rose-300">불러오지 못했습니다.</p>}
        </div>
      )}
    </AdminShell>
  );
}

function CountList({ title, counts, labels }: { title: string; counts: Record<string, number>; labels: Record<string, string> }) {
  const rows = Object.entries(counts);
  return (
    <div>
      <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-0.5 text-stone-400">아직 없습니다</p>
      ) : (
        <ul className="mt-0.5 space-y-0.5">
          {rows.map(([k, n]) => (
            <li key={k} className="flex justify-between gap-2">
              <span>{labels[k] ?? k}</span>
              <b>{n}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
