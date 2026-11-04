'use client';

// 디지털 트윈 기본 프로필 폼 (PDF 3번 페이지) — 출생연도/성별/키/몸무게/흡연/음주/운동/수면 노출·수정.
// 로컬 프리필 캐시에 저장(DB가 단일 진실원천 원칙 유지). 정밀 분석은 VITA test/설문이 수행.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  loadHealthProfile,
  saveHealthProfile,
  type StableHealthProfile,
} from '@/lib/health-profile';
import { useTwinNickname } from '@/lib/profile-state';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { useVitaResultT } from '@/locales/vita-result';

const EMPTY: StableHealthProfile = {
  birthYear: null,
  sex: '',
  heightCm: null,
  weightKg: null,
  familyHistoryDiabetes: false,
  familyHistoryHypertension: false,
  familyHistoryCardiovascular: false,
  familyHistoryOther: [],
  smoking: '',
  alcohol: '',
  exerciseHoursPerWeek: null,
  sleepHours: null,
};

function numOrNull(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const inputCls =
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-stone-500 dark:text-stone-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export function TwinProfileForm() {
  const nickname = useTwinNickname();
  const t = useVitaResultT().t.profileForm;
  const [p, setP] = useState<StableHealthProfile>(EMPTY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const cur = loadHealthProfile();
    if (cur) setP({ ...EMPTY, ...cur });
  }, []);

  function set<K extends keyof StableHealthProfile>(k: K, v: StableHealthProfile[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
    setSaved(false);
  }
  function save() {
    saveHealthProfile(p);
    setSaved(true);
  }

  return (
    <div className="card-shadow rounded-3xl card-sky px-5 py-5">
      {/* 닉네임 */}
      <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
            {t.nickname}
          </p>
          <p className="truncate text-[15px] font-bold text-cyan-700 dark:text-cyan-300">
            {nickname || t.notSet}
          </p>
        </div>
        <Link
          href="/twin"
          className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-cyan-600 px-3 py-1.5 text-[11px] font-bold text-white"
        >
          {nickname ? t.change : t.set}
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t.birthYear}>
          <input
            type="number"
            inputMode="numeric"
            placeholder={t.eg('1988')}
            value={p.birthYear ?? ''}
            onChange={(e) => set('birthYear', numOrNull(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label={t.sex}>
          <select value={p.sex} onChange={(e) => set('sex', e.target.value as StableHealthProfile['sex'])} className={inputCls}>
            <option value="">{t.select}</option>
            <option value="male">{t.male}</option>
            <option value="female">{t.female}</option>
            <option value="other">{t.other}</option>
          </select>
        </Field>
        <Field label={t.height}>
          <input type="number" inputMode="numeric" placeholder={t.eg('172')} value={p.heightCm ?? ''} onChange={(e) => set('heightCm', numOrNull(e.target.value))} className={inputCls} />
        </Field>
        <Field label={t.weight}>
          <input type="number" inputMode="numeric" placeholder={t.eg('68')} value={p.weightKg ?? ''} onChange={(e) => set('weightKg', numOrNull(e.target.value))} className={inputCls} />
        </Field>
        <Field label={t.smoking}>
          <select value={p.smoking ?? ''} onChange={(e) => set('smoking', e.target.value as StableHealthProfile['smoking'])} className={inputCls}>
            <option value="">{t.select}</option>
            <option value="none">{t.smokeNone}</option>
            <option value="past">{t.smokePast}</option>
            <option value="current">{t.smokeCurrent}</option>
          </select>
        </Field>
        <Field label={t.alcohol}>
          <select value={p.alcohol ?? ''} onChange={(e) => set('alcohol', e.target.value as StableHealthProfile['alcohol'])} className={inputCls}>
            <option value="">{t.select}</option>
            <option value="none">{t.alcNone}</option>
            <option value="sometimes">{t.alcSometimes}</option>
            <option value="often">{t.alcOften}</option>
          </select>
        </Field>
        <Field label={t.exercise}>
          <input type="number" inputMode="numeric" placeholder={t.eg('3')} value={p.exerciseHoursPerWeek ?? ''} onChange={(e) => set('exerciseHoursPerWeek', numOrNull(e.target.value))} className={inputCls} />
        </Field>
        <Field label={t.sleep}>
          <input type="number" inputMode="numeric" placeholder={t.eg('7')} value={p.sleepHours ?? ''} onChange={(e) => set('sleepHours', numOrNull(e.target.value))} className={inputCls} />
        </Field>
      </div>

      <button
        type="button"
        onClick={save}
        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3 text-[14px] font-extrabold text-white transition active:scale-[0.99]"
      >
        {saved ? t.saved : t.save}
      </button>
      <p className="mt-2 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
        {t.note}
      </p>
    </div>
  );
}
