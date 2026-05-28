// WHO/UN 인구통계 기반 5세 단위 잔여 기대 수명 (output age 단위).
// spec docs/spec/avatar-chronos.md §4. P1 한정 4개국. P3 ML 단계에서 정밀화.
// 출처: WHO Global Health Observatory 2024 (간소화), 한국 통계청 보정.

type Sex = 'male' | 'female' | 'other';
type Country = 'KR' | 'US' | 'JP' | 'ES';

// 단순화된 lifetable: age (5세 단위 시작) → 잔여 기대 수명 (years)
// other 는 male/female 평균.
const LIFETABLE: Record<Country, Record<'male' | 'female', number[]>> = {
  KR: {
    male: [80.6, 75.7, 70.8, 65.9, 61.0, 56.2, 51.4, 46.6, 41.9, 37.3, 32.8, 28.4, 24.2, 20.2, 16.4, 13.0, 9.9, 7.3, 5.2, 3.7],
    female: [86.6, 81.7, 76.8, 71.9, 67.0, 62.1, 57.3, 52.5, 47.7, 43.0, 38.4, 33.9, 29.5, 25.2, 21.1, 17.1, 13.4, 10.2, 7.4, 5.2],
  },
  US: {
    male: [76.1, 71.3, 66.4, 61.5, 56.7, 52.0, 47.4, 42.9, 38.5, 34.2, 30.0, 25.9, 22.0, 18.3, 14.9, 11.7, 8.9, 6.5, 4.7, 3.3],
    female: [81.1, 76.3, 71.4, 66.5, 61.7, 56.9, 52.2, 47.5, 42.9, 38.4, 34.0, 29.7, 25.6, 21.6, 17.8, 14.2, 10.9, 8.1, 5.8, 4.0],
  },
  JP: {
    male: [81.5, 76.7, 71.8, 66.9, 62.0, 57.1, 52.3, 47.6, 42.9, 38.3, 33.8, 29.4, 25.2, 21.1, 17.2, 13.6, 10.4, 7.7, 5.5, 3.9],
    female: [87.6, 82.7, 77.9, 73.0, 68.1, 63.2, 58.4, 53.6, 48.8, 44.1, 39.5, 35.0, 30.6, 26.3, 22.1, 18.0, 14.2, 10.8, 8.0, 5.6],
  },
  ES: {
    male: [80.7, 75.9, 71.0, 66.1, 61.3, 56.5, 51.7, 47.0, 42.3, 37.8, 33.3, 29.0, 24.8, 20.8, 17.0, 13.5, 10.4, 7.7, 5.5, 3.9],
    female: [86.2, 81.4, 76.5, 71.6, 66.8, 61.9, 57.1, 52.4, 47.7, 43.0, 38.4, 33.9, 29.5, 25.2, 21.1, 17.0, 13.3, 10.0, 7.2, 5.0],
  },
};

function bucketByAge(age: number): number {
  // 5세 단위 인덱스 — 0:0~4, 1:5~9, ..., 19:95+
  return Math.min(19, Math.max(0, Math.floor(age / 5)));
}

function resolveSex(sex: Sex): 'male' | 'female' {
  // P1: other 는 male/female 평균 — 산출 시 둘 다 호출 후 평균.
  return sex === 'female' ? 'female' : 'male';
}

export function residualLifeExpectancy(
  country: Country | 'OTHER',
  age: number,
  sex: Sex,
): number {
  const safeCountry: Country = country === 'OTHER' ? 'KR' : country;
  const idx = bucketByAge(age);
  if (sex === 'other') {
    const m = LIFETABLE[safeCountry].male[idx]!;
    const f = LIFETABLE[safeCountry].female[idx]!;
    return (m + f) / 2;
  }
  return LIFETABLE[safeCountry][resolveSex(sex)][idx]!;
}
