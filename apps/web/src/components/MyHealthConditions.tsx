'use client';

// 마이 루틴 상단 — 디지털 트윈 탭(/twin)에서 저장한 건강 상태(만성/중증/가족력 + 수술)를 반영 표시.
// 데이터 출처: 게이트웨이 /api/v1/me/medical/conditions · /surgeries (DB 단일 진실원천).
// 저장 직후 돌아오면 바로 보이도록 화면 복귀(visibility/focus) 시 자동 재조회하고,
// 조회 실패는 "없음"과 구분해 재시도를 제공한다(실패를 빈 상태로 오인하지 않도록).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchConditions, fetchSurgeries, type Surgery } from '@/lib/api-client';
import { readSession } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { ChevronRightIcon } from '@/components/HealthIcons';

const CUSTOM_PREFIX = 'custom:';

type Cats = Record<'chronic' | 'critical' | 'family', string[]>;

export function MyHealthConditions() {
  const { t } = useI18n();
  const T = t.twin;
  const [cats, setCats] = useState<Cats>({ chronic: [], critical: [], family: [] });
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error' | 'unauth'>('loading');

  const load = useCallback(() => {
    if (!readSession()) {
      setStatus('unauth');
      return;
    }
    const labelsByCat: Record<string, Record<string, string>> = {
      chronic: T.chronicCodes,
      critical: T.criticalCodes,
      family: T.familyCodes,
    };
    const labelFor = (cat: string, code: string): string => {
      if (code.startsWith(CUSTOM_PREFIX)) return code.slice(CUSTOM_PREFIX.length);
      return labelsByCat[cat]?.[code] ?? code;
    };
    Promise.all([fetchConditions(), fetchSurgeries()])
      .then(([cond, surg]) => {
        const next: Cats = { chronic: [], critical: [], family: [] };
        for (const c of cond.conditions) {
          if (c.granted && c.code !== 'none') next[c.category].push(labelFor(c.category, c.code));
        }
        setCats(next);
        setSurgeries(surg);
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  }, [T]);

  useEffect(() => {
    load();
  }, [load]);

  // 화면 복귀 시 재조회 — /twin 에서 저장 후 돌아오면 즉시 반영.
  useEffect(() => {
    const onBack = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('focus', onBack);
    return () => {
      document.removeEventListener('visibilitychange', onBack);
      window.removeEventListener('focus', onBack);
    };
  }, [load]);

  if (status === 'loading' || status === 'unauth') return null;

  const empty =
    cats.chronic.length === 0 &&
    cats.critical.length === 0 &&
    cats.family.length === 0 &&
    surgeries.length === 0;

  const Group = ({ title, tone, items }: { title: string; tone: string; items: string[] }) =>
    items.length === 0 ? null : (
      <div className="mt-2.5 first:mt-0">
        <p className="mb-1 text-[11px] font-bold text-stone-500 dark:text-stone-400">{title}</p>
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <span
              key={`${it}-${i}`}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}
            >
              {it}
            </span>
          ))}
        </div>
      </div>
    );

  return (
    <section className="card-shadow mt-3 rounded-3xl card-emerald px-5 py-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
          <span className="accent-bar bg-emerald-500" />
          내 건강 상태
        </h2>
        <Link
          href="/twin"
          className="inline-flex items-center gap-0.5 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white"
        >
          {status === 'ok' && !empty ? '수정' : '입력하기'}
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      {status === 'error' ? (
        <div className="text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
          <p>건강 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={load}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-stone-900 dark:text-emerald-300"
          >
            다시 시도
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : empty ? (
        <p className="text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
          아직 입력된 건강 상태가 없습니다. 디지털 트윈 탭(변경)에서 만성질환·중증질환·가족력·수술 이력을
          저장하면 여기에 반영됩니다.
        </p>
      ) : (
        <>
          <Group
            title="만성질환"
            tone="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            items={cats.chronic}
          />
          <Group
            title="중증질환"
            tone="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
            items={cats.critical}
          />
          <Group
            title="가족력"
            tone="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
            items={cats.family}
          />
          {surgeries.length > 0 && (
            <div className="mt-2.5">
              <p className="mb-1 text-[11px] font-bold text-stone-500 dark:text-stone-400">
                수술 이력
              </p>
              <div className="flex flex-wrap gap-1.5">
                {surgeries.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                  >
                    {s.surgeryName}
                    {s.surgeryYear != null ? ` (${s.surgeryYear})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="mt-3 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
            입력한 건강 상태는 리포트 정확도(신뢰도)와 AI 케어 맞춤 제안에 반영됩니다.
          </p>
        </>
      )}
    </section>
  );
}
