'use client';

// 관리자 · 회사 홍보 사이트(vitalabsinc.com) 콘텐츠 편집 — 미션/비전/가치/소개 등 카피 블록.
// 값이 비어 있으면 회사 사이트는 내장 기본값을 사용한다(여기서 채우면 override).

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { fetchAdminSiteContent, upsertSiteContentApi } from '@/lib/api-client';

// 회사 사이트가 사용하는 편집 키(apps/vitalabs 의 기본값 키와 일치).
const FIELDS: { key: string; label: string; hint: string; rows: number }[] = [
  { key: 'hero_title', label: '홈 히어로 제목', hint: '메인 상단 큰 제목', rows: 2 },
  { key: 'hero_sub', label: '홈 히어로 부제', hint: '제목 아래 한두 문장', rows: 3 },
  { key: 'mission', label: '미션', hint: '한 문장', rows: 2 },
  { key: 'vision', label: '비전', hint: '한 문장', rows: 2 },
  { key: 'values', label: '핵심 가치', hint: '한 줄에 하나씩(줄바꿈 구분)', rows: 5 },
  { key: 'about', label: 'VITA Labs 소개문', hint: '회사 소개 본문', rows: 6 },
  { key: 'product_intro', label: '제품 소개문', hint: 'VITAcode 제품 설명', rows: 5 },
  { key: 'contact_note', label: '문의 안내문', hint: '문의 페이지 상단 안내', rows: 3 },
  // 앱(vitacodeapp.com) 홈 상단 — 비우면 내장 기본값.
  { key: 'app_home_title', label: '앱 홈 상단 타이틀', hint: 'vitacodeapp.com 홈 최상단 큰 제목. 비우면 "VITA CODE"', rows: 1 },
  { key: 'app_home_greeting', label: '앱 홈 인사말', hint: '타이틀 아래 인사말 문구', rows: 3 },
  { key: 'app_vitacode_result_desc', label: '앱 홈 · VITA 코드 결과 하단 표기', hint: '홈 VITAcode 분석결과 하단 특허 출원번호 표기(줄바꿈으로 여러 줄). 비우면 기본 문안(비타코드 특허 출원번호 제10-2026-0197729호)', rows: 3 },
  // 앱 법적 고지 — vitacodeapp.com/privacy · /terms. 비우면 내장 기본 문안.
  { key: 'legal_privacy', label: '개인정보처리방침 (앱)', hint: 'vitacodeapp.com/privacy · 비우면 기본 문안. 규칙: # 제목 / ## 소제목 / - 목록', rows: 14 },
  { key: 'legal_terms', label: '서비스 약관 (앱)', hint: 'vitacodeapp.com/terms · 비우면 기본 문안. 규칙: # 제목 / ## 소제목 / - 목록', rows: 14 },
  { key: 'legal_health_data', label: '건강데이터 처리방침 (앱)', hint: 'vitacodeapp.com/health-data · 비우면 기본 문안. 규칙: # 제목 / ## 소제목 / - 목록', rows: 14 },
];

export default function AdminSiteContentPage() {
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading');
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminSiteContent()
      .then((items) => {
        const map: Record<string, string> = {};
        for (const it of items) map[it.key] = it.value;
        setValues(map);
        setState('ok');
      })
      .catch((e) => {
        const code = e instanceof Error ? e.message : '';
        setState(code === 'FORBIDDEN' || code === 'UNAUTHORIZED' ? 'forbidden' : 'error');
      });
  }, []);

  async function save(key: string) {
    setSavingKey(key);
    setSavedKey(null);
    try {
      const items = await upsertSiteContentApi(key, values[key] ?? '');
      const map: Record<string, string> = {};
      for (const it of items) map[it.key] = it.value;
      setValues((prev) => ({ ...prev, ...map }));
      setSavedKey(key);
    } catch {
      /* noop — 실패 시 표시 생략(재시도 가능) */
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <AdminShell title="회사 사이트 콘텐츠">
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
            vitalabsinc.com 홍보 사이트에 노출되는 문구입니다. 비워두면 사이트 기본값이 표시됩니다. 배너(이미지·동영상)는 <b>배너 관리 → 회사 사이트</b> 탭에서 관리하세요.
          </p>

          {FIELDS.map((f) => (
            <div key={f.key} className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
              <div className="flex items-baseline justify-between gap-2">
                <label className="text-[13px] font-bold text-stone-900 dark:text-stone-100">{f.label}</label>
                <span className="text-[10px] text-stone-400">{f.key}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">{f.hint}</p>
              <textarea
                rows={f.rows}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="mt-2 w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-stone-800 outline-none focus:border-brand-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                placeholder="(비워두면 기본값 사용)"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingKey === f.key}
                  onClick={() => void save(f.key)}
                  className="rounded-xl bg-brand-700 px-4 py-2 text-[12px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
                >
                  {savingKey === f.key ? '저장 중…' : '저장'}
                </button>
                {savedKey === f.key && (
                  <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">저장됨</span>
                )}
              </div>
            </div>
          ))}

          {state === 'error' && (
            <p className="text-[12px] text-rose-600 dark:text-rose-300">불러오지 못했습니다.</p>
          )}
        </div>
      )}
    </AdminShell>
  );
}
