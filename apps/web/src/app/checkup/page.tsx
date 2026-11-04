'use client';

// 건강검진결과 (스토리보드 11) — 공단/병원 검진 데이터 가져오기(연동 or 직접 입력) + 정밀 입력 폼.
// 연동: 국민건강보험공단 간편인증(Tilko 중개) — 현재는 백엔드 표본(mock)을 불러와 폼을 채운다(키 확보 시 자동 전환).
// 직접 입력: 전 항목 수동 입력. 검진 수치는 기기 로컬에만 저장(PII 격리) — 분석엔 파생 입력만 반영.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { readSession } from '@/lib/session';
import { UpdateNotice } from '@/components/UpdateNotice';
import { loadHealthProfile, saveHealthProfile } from '@/lib/health-profile';
import {
  EMPTY_CHECKUP,
  saveCheckups,
  mergeCheckups,
  saveDraft,
  loadDraft,
  loadCheckups,
  checkupToSurveyOverrides,
  type CheckupRecord,
} from '@/lib/checkup';
import {
  requestNhisAuth,
  completeNhisAuth,
  fetchLastSurveyInput,
  submitRiskEstimate,
  type NhisAuthProvider,
  type NhisAuthHandle,
  type NhisCheckupFull,
} from '@/lib/api-client';

const AUTH_PROVIDERS: { key: NhisAuthProvider; label: string }[] = [
  { key: 'kakao', label: '카카오톡' },
  { key: 'naver', label: '네이버' },
  { key: 'pass', label: '통신사 PASS' },
  { key: 'samsung', label: '삼성패스' },
  { key: 'kb', label: 'KB모바일' },
  { key: 'shinhan', label: '신한인증서' },
  { key: 'payco', label: '페이코' },
];

export default function CheckupPage() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [form, setForm] = useState<CheckupRecord>(EMPTY_CHECKUP);
  const [sources, setSources] = useState<{ examDate: string; source: string }[]>([]);
  const [authStep, setAuthStep] = useState<'closed' | 'form' | 'awaiting'>('closed');
  const [authForm, setAuthForm] = useState<{ provider: NhisAuthProvider; name: string; birthDate: string; phone: string }>({
    provider: 'kakao',
    name: '',
    birthDate: '',
    phone: '',
  });
  const [authHandle, setAuthHandle] = useState<NhisAuthHandle | null>(null);
  const [records, setRecords] = useState<CheckupRecord[]>([]);
  const [fetchedFull, setFetchedFull] = useState<NhisCheckupFull[]>([]);
  const [view, setView] = useState(-1); // -1=전체 통합(최신 우선), >=0=해당 회차
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [updateNotice, setUpdateNotice] = useState<{ title: string; message: string; changed: boolean } | null>(null);
  const [analyze, setAnalyze] = useState<'idle' | 'saving' | 'err'>('idle');
  const [savedToast, setSavedToast] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!readSession()) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    // 저장된 회차가 있으면(로그아웃/재로그인 후에도) 재인증 없이 '전체 통합(최신 우선)'으로 표시.
    const saved = loadCheckups();
    if (saved.length > 0) {
      setRecords(saved);
      setView(-1);
      setForm(mergeCheckups(saved));
      setSources(saved.map((r) => ({ examDate: r.examDate, source: r.source })));
    } else {
      const d = loadDraft();
      if (d) setForm({ ...EMPTY_CHECKUP, ...d });
    }
  }, []);

  function set<K extends keyof CheckupRecord>(k: K, v: CheckupRecord[K]) {
    setForm((p) => ({ ...p, [k]: v }));
    setSavedToast(false);
  }

  // NHIS 응답(숫자/널) → 폼 레코드(문자열).
  function nhisToRecord(c: NhisCheckupFull): CheckupRecord {
    const s = (v: number | null | undefined) => (v != null ? String(v) : '');
    return {
      ...EMPTY_CHECKUP,
      examDate: c.examDate || '',
      source: c.source || '국민건강보험공단',
      heightCm: s(c.heightCm),
      weightKg: s(c.weightKg),
      waistCm: s(c.waistCm),
      systolicBp: s(c.systolicBp),
      diastolicBp: s(c.diastolicBp),
      fastingGlucose: s(c.fastingGlucose),
      hba1c: s(c.hba1c),
      totalChol: s(c.totalCholesterol),
      triglyceride: s(c.triglyceride),
      hdl: s(c.hdl),
      ldl: s(c.ldl),
      ast: s(c.ast),
      alt: s(c.alt),
      gtp: s(c.gtp),
      creatinine: s(c.creatinine),
      egfr: s(c.egfr),
      urineProtein: c.urineProtein || '',
    };
  }

  // 회차 선택(-1=전체 통합) → 폼 반영.
  function applyView(recs: CheckupRecord[], v: number) {
    if (recs.length === 0) return;
    const rec = v < 0 ? mergeCheckups(recs) : recs[v];
    if (rec) setForm(rec);
  }

  function authErrText(e: unknown): string {
    const code = e instanceof Error ? e.message : '';
    if (code === 'NHIS_FETCH_FAILED') {
      return '아직 인증이 완료되지 않았어요. 인증앱(카카오·네이버·PASS)에서 승인을 마친 뒤 다시 「인증 완료 · 검진 불러오기」를 눌러 주세요.';
    }
    if (code === 'NHIS_AUTH_FAILED') {
      return '인증 요청에 실패했습니다. 이름 · 생년월일 · 휴대폰번호와 선택한 인증수단이 본인 명의와 일치하는지 확인해 주세요.';
    }
    if (code === 'NHIS_NOT_CONFIGURED') {
      return '공단 실시간 연동이 일시적으로 비활성화되어 있습니다. 「직접 입력하기」를 이용해 주세요.';
    }
    return '요청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
  }

  async function submitAuthRequest() {
    if (
      authForm.name.trim() === '' ||
      !/^\d{8}$/.test(authForm.birthDate) ||
      !/^\d{10,11}$/.test(authForm.phone)
    ) {
      setAuthErr('이름 · 생년월일(YYYYMMDD 8자리) · 휴대폰번호(숫자)를 정확히 입력하세요.');
      return;
    }
    setAuthBusy(true);
    setAuthErr(null);
    try {
      const res = await requestNhisAuth({ ...authForm, name: authForm.name.trim() });
      setAuthHandle(res.handle);
      setAuthStep('awaiting');
    } catch (e) {
      setAuthErr(authErrText(e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function fetchAfterAuth() {
    if (!authHandle) return;
    setAuthBusy(true);
    setAuthErr(null);
    try {
      const res = await completeNhisAuth(authHandle);
      const full = res.checkups ?? [];
      if (full.length === 0) throw new Error('NHIS_FETCH_FAILED');
      const recs = full.map(nhisToRecord);
      // 직전 저장분과 비교해 '업데이트 여부' 판정(이모티콘 안내용).
      const prev = loadCheckups();
      const sig = (l: CheckupRecord[]) => JSON.stringify(l.map((r) => ({ ...r, savedAt: undefined })));
      const changed = sig(prev) !== sig(recs);
      saveCheckups(recs); // 자동 보존(재인증 불필요)
      setUpdateNotice(
        changed
          ? {
              changed: true,
              title: '건강검진 결과가 업데이트되었습니다',
              message: `최신 검진일 ${recs[0]?.examDate ?? '-'} · 최신 우선으로 반영했어요.`,
            }
          : {
              changed: false,
              title: '이미 최신 상태예요',
              message: '새로 바뀐 공단 검진 정보가 없습니다.',
            },
      );
      setRecords(recs);
      setFetchedFull(full);
      setView(-1);
      setForm(mergeCheckups(recs));
      setSources(recs.map((r) => ({ examDate: r.examDate, source: r.source })));
      setAuthStep('closed');
      setAuthHandle(null);
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      setAuthErr(authErrText(e));
    } finally {
      setAuthBusy(false);
    }
  }

  function mergeHeightWeight(rec: CheckupRecord) {
    const h = rec.heightCm.trim() === '' ? null : Number(rec.heightCm);
    const w = rec.weightKg.trim() === '' ? null : Number(rec.weightKg);
    if (h == null && w == null) return;
    const cur = loadHealthProfile();
    saveHealthProfile({
      birthYear: cur?.birthYear ?? null,
      sex: cur?.sex ?? '',
      heightCm: h != null && Number.isFinite(h) ? h : (cur?.heightCm ?? null),
      weightKg: w != null && Number.isFinite(w) ? w : (cur?.weightKg ?? null),
      familyHistoryDiabetes: cur?.familyHistoryDiabetes ?? false,
      familyHistoryHypertension: cur?.familyHistoryHypertension ?? false,
      familyHistoryCardiovascular: cur?.familyHistoryCardiovascular ?? false,
      familyHistoryOther: cur?.familyHistoryOther ?? [],
      smoking: cur?.smoking ?? '',
      alcohol: cur?.alcohol ?? '',
      exerciseHoursPerWeek: cur?.exerciseHoursPerWeek ?? null,
      sleepHours: cur?.sleepHours ?? null,
    });
  }

  async function handleAnalyze() {
    setAnalyze('saving');
    const rec: CheckupRecord = {
      ...form,
      examDate: form.examDate || new Date().toISOString().slice(0, 10),
      source: form.source || '직접입력',
    };
    // 연동 기록이 없으면(직접 입력) 현재 입력을 1건으로 저장·보존.
    if (records.length === 0) {
      saveCheckups([rec]);
      setRecords([rec]);
      setSources([{ examDate: rec.examDate, source: rec.source }]);
    }
    mergeHeightWeight(rec);
    try {
      // 이전 설문이 있으면 검진 수치를 덧씌워 재분석, 없으면 설문으로 유도.
      const base = await fetchLastSurveyInput().catch(() => null);
      if (base) {
        await submitRiskEstimate({ ...base, ...checkupToSurveyOverrides(rec) });
        router.push('/reports');
      } else {
        router.push('/survey');
      }
    } catch {
      setAnalyze('err');
    }
  }

  function handleSaveDraft() {
    saveDraft(form);
    setSavedToast(true);
  }

  if (signedIn === false) {
    return (
      <AppShell title="건강검진결과" decoration="dots" showBack backHref="/reports">
        <LoginRequired />
      </AppShell>
    );
  }

  return (
    <AppShell title="건강검진결과" decoration="dots" showBack backHref="/reports">
      <div className="space-y-4 pb-10 pt-3">
        {updateNotice && (
          <UpdateNotice
            source="nhis"
            title={updateNotice.title}
            message={updateNotice.message}
            emoji={updateNotice.changed ? '😊' : '🙂'}
            onClose={() => setUpdateNotice(null)}
          />
        )}

        {/* 데이터 가져오기 */}
        <section className="card-shadow rounded-3xl card-sky px-5 py-5">
          <h2 className="flex items-center text-[14px] font-extrabold text-stone-900 dark:text-stone-100">
            <span className="accent-bar bg-sky-500" />
            건강 검진 데이터 가져오기
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAuthStep((s) => (s === 'closed' ? 'form' : 'closed'))}
              className="relative flex flex-col items-center gap-2 rounded-2xl bg-white px-3 py-4 text-center shadow-sm transition active:scale-[0.97] dark:bg-stone-900"
            >
              <span className="absolute right-2 top-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                간편인증
              </span>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d="M12 3 4 6v6c0 4.5 3.4 7.9 8 9 4.6-1.1 8-4.5 8-9V6z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <span className="text-[13px] font-extrabold text-stone-900 dark:text-stone-100">
                연동하기
              </span>
              <span className="text-[10px] leading-tight text-stone-500 dark:text-stone-400">
                NHIS 간편인증
              </span>
            </button>
            <button
              type="button"
              onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white px-3 py-4 text-center shadow-sm transition active:scale-[0.97] dark:bg-stone-900"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </span>
              <span className="text-[13px] font-extrabold text-stone-900 dark:text-stone-100">
                직접 입력하기
              </span>
              <span className="text-[10px] leading-tight text-stone-500 dark:text-stone-400">
                검진표 보고 수치 입력
              </span>
            </button>
          </div>

          {authStep !== 'closed' && (
            <div className="mt-3 rounded-2xl border border-sky-200 bg-white px-4 py-4 dark:border-sky-900 dark:bg-stone-900">
              <p className="text-[12.5px] font-bold text-stone-900 dark:text-stone-100">
                국민건강보험공단 간편인증
              </p>
              {authStep === 'form' ? (
                <div className="mt-3 space-y-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-stone-500 dark:text-stone-400">인증 수단</span>
                    <select
                      value={authForm.provider}
                      onChange={(e) => setAuthForm((f) => ({ ...f, provider: e.target.value as NhisAuthProvider }))}
                      className={inputCls}
                    >
                      {AUTH_PROVIDERS.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <LabeledText
                      label="이름"
                      value={authForm.name}
                      placeholder="홍길동"
                      onChange={(v) => setAuthForm((f) => ({ ...f, name: v }))}
                    />
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-stone-500 dark:text-stone-400">생년월일 (YYYYMMDD)</span>
                      <input
                        value={authForm.birthDate}
                        onChange={(e) => setAuthForm((f) => ({ ...f, birthDate: e.target.value.replace(/[^0-9]/g, '').slice(0, 8) }))}
                        inputMode="numeric"
                        placeholder="19880101"
                        className={inputCls}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-stone-500 dark:text-stone-400">휴대폰번호</span>
                    <input
                      value={authForm.phone}
                      onChange={(e) => setAuthForm((f) => ({ ...f, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 11) }))}
                      inputMode="numeric"
                      placeholder="01012345678"
                      className={inputCls}
                    />
                  </label>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void submitAuthRequest()}
                      disabled={authBusy}
                      className="flex-1 rounded-xl bg-sky-600 px-3 py-2.5 text-[13px] font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
                    >
                      {authBusy ? '요청 중…' : '인증 요청'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStep('closed');
                        setAuthErr(null);
                      }}
                      className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-[12px] font-semibold text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="rounded-xl bg-sky-50 px-3 py-2 text-[12px] leading-relaxed text-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
                    {AUTH_PROVIDERS.find((p) => p.key === authForm.provider)?.label} 앱에서{' '}
                    <b>본인인증을 승인</b>한 뒤 아래 버튼을 눌러 검진 결과를 불러오세요.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void fetchAfterAuth()}
                      disabled={authBusy}
                      className="flex-1 rounded-xl bg-sky-600 px-3 py-2.5 text-[13px] font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
                    >
                      {authBusy ? '불러오는 중…' : '인증 완료 · 검진 불러오기'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthStep('form');
                        setAuthErr(null);
                      }}
                      className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-[12px] font-semibold text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                    >
                      이전
                    </button>
                  </div>
                </div>
              )}
              {authErr && (
                <p className="mt-2 text-[11px] font-medium text-rose-600 dark:text-rose-300">{authErr}</p>
              )}
            </div>
          )}
          <p className="mt-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[10.5px] leading-relaxed text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
            <b>연동하기</b>를 누르면 본인 명의 휴대폰으로 <b>카카오·네이버·PASS 간편인증 요청</b>이
            전송됩니다. 인증앱에서 승인하면 국민건강보험공단 건강검진 결과를 바로 불러옵니다. 수치를
            직접 넣고 싶으면 <b>직접 입력하기</b>를 이용하세요.
          </p>

          {/* 연동/저장된 기관 목록 */}
          {sources.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {sources.map((s, i) => (
                <div
                  key={`${s.source}-${s.examDate}-${i}`}
                  className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-[12px] dark:bg-stone-900/70"
                >
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{s.source}</span>
                  <span className="text-stone-500 dark:text-stone-400">{s.examDate} 검진</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 불러온 검진 회차 — 전체 통합(최신 우선) 기본, 회차 선택 가능 */}
        {records.length > 0 && (
          <section className="card-shadow rounded-2xl card-emerald px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12.5px] font-bold text-stone-900 dark:text-stone-100">
                불러온 건강검진 {records.length}건
              </p>
              {records.length > 1 && (
                <select
                  value={view}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setView(v);
                    applyView(records, v);
                  }}
                  className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[12px] text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                >
                  <option value={-1}>전체 통합(최신 우선)</option>
                  {records.map((r, i) => (
                    <option key={i} value={i}>
                      {r.examDate || `${i + 1}회차`}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-700 dark:text-stone-300">
              {view < 0
                ? `여러 회차를 최신 우선으로 통합했습니다 (중복은 최신 값 유지, 빈 항목은 과거 값으로 보완). 최신 검진일 ${records[0]?.examDate || '-'}.`
                : `검진일 ${records[view]?.examDate || '-'} 회차만 표시 중.`}
            </p>
            <p className="mt-0.5 text-[10px] text-stone-500 dark:text-stone-400">
              불러온 데이터는 기기에 보존되어 다음 로그인 때 재인증 없이 그대로 표시됩니다.
            </p>
            {(() => {
              const dbg = fetchedFull[view >= 0 ? view : 0]?.debugItems ?? [];
              return dbg.length > 0 ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] text-stone-400 dark:text-stone-500">
                    원본 항목 보기(매핑 확인용)
                  </summary>
                  <div className="mt-1 max-h-40 overflow-auto text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">
                    {dbg.map((d, i) => (
                      <div key={i}>
                        {d.name}
                        {d.unit ? ` (${d.unit})` : ''}
                      </div>
                    ))}
                  </div>
                </details>
              ) : null;
            })()}
          </section>
        )}

        {/* 입력 폼 */}
        <div ref={formRef} className="space-y-3">
          <h2 className="px-1 pt-1 text-[15px] font-extrabold text-stone-900 dark:text-stone-100">
            최신 건강검진 결과 입력
          </h2>

          <Accordion title="기본 정보" defaultOpen>
            <LabeledDate label="검진일자" value={form.examDate} onChange={(v) => set('examDate', v)} />
            <LabeledText
              label="검진 기관"
              placeholder="예: 국민건강보험공단 / 서울대병원"
              value={form.source}
              onChange={(v) => set('source', v)}
            />
          </Accordion>

          <Accordion title="신체 계측" defaultOpen>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="신장" unit="cm" v={form.heightCm} on={(x) => set('heightCm', x)} />
              <NumField label="체중" unit="kg" v={form.weightKg} on={(x) => set('weightKg', x)} />
              <NumField label="허리둘레" unit="cm" v={form.waistCm} on={(x) => set('waistCm', x)} />
              <NumField label="체지방률" unit="%" v={form.bodyFatPct} on={(x) => set('bodyFatPct', x)} />
              <NumField label="골격근량" unit="kg" v={form.skeletalMuscleKg} on={(x) => set('skeletalMuscleKg', x)} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <NumField label="수축기 혈압" unit="mmHg" v={form.systolicBp} on={(x) => set('systolicBp', x)} />
              <NumField label="이완기 혈압" unit="mmHg" v={form.diastolicBp} on={(x) => set('diastolicBp', x)} />
            </div>
          </Accordion>

          <Accordion title="혈액 검사 · 대사 / 지질" defaultOpen>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="공복 혈당" unit="mg/dL" v={form.fastingGlucose} on={(x) => set('fastingGlucose', x)} />
              <NumField label="당화혈색소 HbA1c" unit="%" v={form.hba1c} on={(x) => set('hba1c', x)} />
              <NumField label="총 콜레스테롤" unit="mg/dL" v={form.totalChol} on={(x) => set('totalChol', x)} />
              <NumField label="중성지방" unit="mg/dL" v={form.triglyceride} on={(x) => set('triglyceride', x)} />
              <NumField label="HDL" unit="mg/dL" v={form.hdl} on={(x) => set('hdl', x)} />
              <NumField label="LDL" unit="mg/dL" v={form.ldl} on={(x) => set('ldl', x)} />
            </div>
          </Accordion>

          <Accordion title="혈액 검사 · 간 / 신장 기능">
            <div className="grid grid-cols-2 gap-2">
              <NumField label="AST (GOT)" unit="U/L" v={form.ast} on={(x) => set('ast', x)} />
              <NumField label="ALT (GPT)" unit="U/L" v={form.alt} on={(x) => set('alt', x)} />
              <NumField label="γ-GTP" unit="U/L" v={form.gtp} on={(x) => set('gtp', x)} />
              <NumField label="크레아티닌" unit="mg/dL" v={form.creatinine} on={(x) => set('creatinine', x)} />
              <NumField label="eGFR" unit="mL/min" v={form.egfr} on={(x) => set('egfr', x)} />
            </div>
          </Accordion>

          <Accordion title="소변 검사">
            <div className="grid grid-cols-2 gap-2">
              <LabeledSelect
                label="요단백"
                value={form.urineProtein}
                onChange={(v) => set('urineProtein', v)}
                options={['', '음성(-)', '약양성(±)', '양성(+)']}
              />
              <LabeledSelect
                label="요당"
                value={form.urineGlucose}
                onChange={(v) => set('urineGlucose', v)}
                options={['', '음성(-)', '양성(+)']}
              />
            </div>
          </Accordion>

          <Accordion title="선택 · 추가 검사 (정밀 분석용)">
            <div className="grid grid-cols-2 gap-2">
              <NumField label="hs-CRP" unit="mg/L" v={form.hsCRP} on={(x) => set('hsCRP', x)} />
              <NumField label="비타민 D (25-OH)" unit="ng/mL" v={form.vitaminD} on={(x) => set('vitaminD', x)} />
              <NumField label="골밀도 T-Score" unit="" v={form.boneTScore} on={(x) => set('boneTScore', x)} />
            </div>
          </Accordion>

          <p className="rounded-2xl border border-sky-200 bg-sky-50/70 px-3.5 py-2.5 text-[11px] leading-relaxed text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
            <b>TIP</b> — 모든 수치를 한 번에 넣기 부담스러우시면 <b>혈압 · 공복혈당 · 콜레스테롤 4종
            (총/중성지방/HDL/LDL) · 당화혈색소</b> 핵심 지표부터 먼저 입력해도 대사 및 혈관 나이 분석이
            바로 진행됩니다.
          </p>
        </div>

        {/* 액션 */}
        <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
          <button
            type="button"
            onClick={() => void handleAnalyze()}
            disabled={analyze === 'saving'}
            className="inline-flex items-center justify-center gap-1 rounded-2xl bg-stone-900 px-3 py-3.5 text-[13.5px] font-extrabold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
          >
            {analyze === 'saving' ? '분석 준비 중…' : '입력 완료 및 분석'}
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="rounded-2xl border border-stone-300 bg-white px-3 py-3.5 text-[13px] font-bold text-stone-700 transition active:scale-[0.98] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          >
            {savedToast ? '저장됨 ✓' : '임시 저장'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/reports')}
            className="rounded-2xl border border-stone-300 bg-white px-3 py-3.5 text-[13px] font-bold text-stone-700 transition active:scale-[0.98] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          >
            뒤로 가기
          </button>
        </div>
        {analyze === 'err' && (
          <p className="text-center text-[12px] text-rose-600 dark:text-rose-300">
            분석 요청에 실패했습니다. 저장은 완료되었습니다. 잠시 후 다시 시도해 주세요.
          </p>
        )}

        <p className="px-1 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
          입력한 검진 수치는 이 기기에만 저장됩니다(민감정보 보호). 분석에는 혈압·공복혈당·LDL/HDL·
          신장·체중 등 파생 지표만 반영됩니다.
        </p>
      </div>
    </AppShell>
  );
}

function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="card-shadow overflow-hidden rounded-2xl bg-white dark:bg-stone-900">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[13.5px] font-bold text-stone-900 dark:text-stone-100">{title}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <div className="border-t border-stone-100 px-4 py-3 dark:border-stone-800">{children}</div>}
    </section>
  );
}

const inputCls =
  'w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100';

function NumField({ label, unit, v, on }: { label: string; unit: string; v: string; on: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-stone-500 dark:text-stone-400">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="text"
          inputMode="decimal"
          value={v}
          onChange={(e) => on(e.target.value.replace(/[^0-9.\-]/g, ''))}
          placeholder="---"
          className={inputCls}
        />
        {unit && <span className="shrink-0 text-[11px] text-stone-500 dark:text-stone-400">{unit}</span>}
      </span>
    </label>
  );
}

function LabeledText({ label, placeholder, value, onChange }: { label: string; placeholder?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-stone-500 dark:text-stone-400">{label}</span>
      <input type="text" value={value} placeholder={placeholder} maxLength={40} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  );
}

function LabeledDate({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-stone-500 dark:text-stone-400">{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  );
}

function LabeledSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-stone-500 dark:text-stone-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o === '' ? '선택' : o}
          </option>
        ))}
      </select>
    </label>
  );
}
