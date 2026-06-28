'use client';

import { readSession } from './session';

// 변화가 거의 없는 기본 개인정보(생년·성별·키·가족력)를 이 기기에 보관해
// 설문 재입력 번거로움을 줄인다. DB가 단일 진실원천이라는 원칙은 유지되며,
// 이 값은 입력 편의를 위한 로컬 프리필 캐시일 뿐 — 모든 설문 제출은 그대로 게이트웨이로 전송된다.
// PII 격리 원칙(절대 규칙 1): 사용자 본인 기기에만 저장, 분석 DB로는 pseudonym 외 전송하지 않음.
// session.ts / profile-state.ts 와 동일한 localStorage + pseudonym 키 패턴.

const STORAGE_KEY = 'chronos.healthProfile';

export type Sex = '' | 'male' | 'female' | 'other';

export type StableHealthProfile = {
  birthYear: number | null;
  sex: Sex;
  heightCm: number | null;
  familyHistoryDiabetes: boolean;
  familyHistoryHypertension: boolean;
  familyHistoryCardiovascular: boolean;
};

type StoredProfile = StableHealthProfile & {
  pseudonymId: string;
  savedAt: string;
};

// 현재 로그인 사용자에 한해 저장된 기본 정보를 반환. 없거나 다른 사용자면 null.
export function loadHealthProfile(): StableHealthProfile | null {
  if (typeof window === 'undefined') return null;
  const session = readSession();
  if (!session) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as StoredProfile;
    if (p.pseudonymId !== session.userPseudonymId) return null;
    return {
      birthYear: typeof p.birthYear === 'number' ? p.birthYear : null,
      sex: p.sex ?? '',
      heightCm: typeof p.heightCm === 'number' ? p.heightCm : null,
      familyHistoryDiabetes: Boolean(p.familyHistoryDiabetes),
      familyHistoryHypertension: Boolean(p.familyHistoryHypertension),
      familyHistoryCardiovascular: Boolean(p.familyHistoryCardiovascular),
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveHealthProfile(profile: StableHealthProfile): void {
  if (typeof window === 'undefined') return;
  const session = readSession();
  if (!session) return;
  const entry: StoredProfile = {
    ...profile,
    pseudonymId: session.userPseudonymId,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

export function clearHealthProfile(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
