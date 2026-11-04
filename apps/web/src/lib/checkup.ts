'use client';

// 건강검진 결과(국민건강보험공단/병원) — 기기 로컬 보관.
// 검진 수치는 민감정보라 분석 DB로 보내지 않고 이 기기에만 저장한다(PII 격리, ADR 0003 취지).
// "입력 완료 및 분석" 시에는 수치에서 파생되는 분석 입력(혈압·공복혈당·LDL/HDL·신장·체중)만
// 위험 추정 요청에 반영한다. session.ts / health-profile.ts 와 동일한 pseudonym 가드 패턴.

import { readSession } from './session';
import type { RiskSurveyRequest } from './schemas';

const STORAGE_KEY = 'chronos.checkup';

// 모든 입력은 문자열(빈 값 허용). 숫자 변환은 사용 시점에.
export type CheckupRecord = {
  examDate: string;
  source: string;
  // 신체 계측
  heightCm: string;
  weightKg: string;
  waistCm: string;
  bodyFatPct: string;
  skeletalMuscleKg: string;
  systolicBp: string;
  diastolicBp: string;
  // 혈액 — 대사·지질
  fastingGlucose: string;
  hba1c: string;
  totalChol: string;
  triglyceride: string;
  hdl: string;
  ldl: string;
  // 혈액 — 간·신장·염증·기타
  ast: string;
  alt: string;
  gtp: string;
  creatinine: string;
  egfr: string;
  hsCRP: string;
  vitaminD: string;
  boneTScore: string;
  // 소변
  urineProtein: string;
  urineGlucose: string;
  savedAt?: string;
};

export const EMPTY_CHECKUP: CheckupRecord = {
  examDate: '',
  source: '',
  heightCm: '',
  weightKg: '',
  waistCm: '',
  bodyFatPct: '',
  skeletalMuscleKg: '',
  systolicBp: '',
  diastolicBp: '',
  fastingGlucose: '',
  hba1c: '',
  totalChol: '',
  triglyceride: '',
  hdl: '',
  ldl: '',
  ast: '',
  alt: '',
  gtp: '',
  creatinine: '',
  egfr: '',
  hsCRP: '',
  vitaminD: '',
  boneTScore: '',
  urineProtein: '',
  urineGlucose: '',
};

type Stored = {
  pseudonymId: string;
  list: CheckupRecord[];
  draft: CheckupRecord | null;
};

function read(): Stored | null {
  if (typeof window === 'undefined') return null;
  const session = readSession();
  if (!session) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Stored;
    if (p.pseudonymId !== session.userPseudonymId) return null;
    return p;
  } catch {
    return null;
  }
}

function write(next: Omit<Stored, 'pseudonymId'>): void {
  if (typeof window === 'undefined') return;
  const session = readSession();
  if (!session) return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...next, pseudonymId: session.userPseudonymId }),
  );
}

export function loadCheckups(): CheckupRecord[] {
  return read()?.list ?? [];
}

export function loadDraft(): CheckupRecord | null {
  return read()?.draft ?? null;
}

// 최신(저장된 리스트에서 검진일 기준) 검진. 없으면 draft, 그것도 없으면 null.
export function loadLatestCheckup(): CheckupRecord | null {
  const s = read();
  if (!s) return null;
  if (s.list.length > 0) {
    return [...s.list].sort((a, b) => (a.examDate < b.examDate ? 1 : -1))[0] ?? null;
  }
  return s.draft;
}

// 임시 저장(draft만 갱신).
export function saveDraft(draft: CheckupRecord): void {
  const s = read();
  write({ list: s?.list ?? [], draft });
}

// 확정 저장 — 같은 (검진일+기관) 있으면 교체, 없으면 추가. draft는 비운다.
export function commitCheckup(rec: CheckupRecord): void {
  const s = read();
  const stamped: CheckupRecord = { ...rec, savedAt: new Date().toISOString() };
  const list = (s?.list ?? []).filter(
    (r) => !(r.examDate === rec.examDate && r.source === rec.source),
  );
  list.unshift(stamped);
  write({ list, draft: null });
}

// 불러온 전 회차를 통째로 저장(최신순 그대로). 로그아웃/재로그인 후에도 보존 → 재인증 불필요.
export function saveCheckups(records: CheckupRecord[]): void {
  const s = read();
  const stamped = records.map((r) => ({ ...r, savedAt: new Date().toISOString() }));
  write({ list: stamped, draft: s?.draft ?? null });
}

// 여러 회차를 '최신 우선'으로 병합(records는 최신순). 각 항목은 가장 최근의 '비어있지 않은' 값.
// → 최신 값은 그대로 유지, 최신에서 빈 항목만 과거 회차 값으로 채움.
export function mergeCheckups(records: CheckupRecord[]): CheckupRecord {
  if (records.length === 0) return { ...EMPTY_CHECKUP };
  const newest = records[0] as CheckupRecord;
  const out: CheckupRecord = { ...EMPTY_CHECKUP, examDate: newest.examDate, source: newest.source };
  const keys = Object.keys(EMPTY_CHECKUP) as (keyof CheckupRecord)[];
  for (const k of keys) {
    if (k === 'examDate' || k === 'source' || k === 'savedAt') continue;
    for (const r of records) {
      const v = r[k];
      if (typeof v === 'string' && v.trim() !== '') {
        (out[k] as string) = v;
        break;
      }
    }
  }
  return out;
}

function num(v: string): number | null {
  const t = v.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// 검진 수치 → 위험 추정 입력 override(분석에 반영되는 값만).
export function checkupToSurveyOverrides(rec: CheckupRecord): Partial<RiskSurveyRequest> {
  const out: Partial<RiskSurveyRequest> = {};
  const sys = num(rec.systolicBp);
  const dia = num(rec.diastolicBp);
  const glu = num(rec.fastingGlucose);
  const ldl = num(rec.ldl);
  const hdl = num(rec.hdl);
  const h = num(rec.heightCm);
  const w = num(rec.weightKg);
  if (sys != null) out.systolicBp = sys;
  if (dia != null) out.diastolicBp = dia;
  if (glu != null) out.fastingGlucose = glu;
  if (ldl != null) out.ldlCholesterol = ldl;
  if (hdl != null) out.hdlCholesterol = hdl;
  if (h != null) out.heightCm = h;
  if (w != null) out.weightKg = w;
  return out;
}
