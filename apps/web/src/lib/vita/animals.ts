// VITA CODE V8 — 16 코드 ↔ 대사 동물 매핑.
// 이미지는 /public/vita/animals/<code 소문자>.png (첨부 "16 VITA CODE METABOLIC TYPES" 그리드를 16분할).
// 출처: VITA CODE V8 Metabolic Matrix(첨부 가이드북). 동물 상징은 대사 성향의 직관적 표현(우열 아님).

export type VitaLocale = 'ko' | 'en' | 'ja' | 'es';

export type VitaAnimal = {
  code: string;
  image: string; // 예: /vita/animals/vita.png
  name: Record<VitaLocale, string>; // 동물 이름(현지화)
  titleEn: string; // 원문 캐릭터명(예: Energetic Sun Lion)
  quadrantEn: string; // 매트릭스 사분면 요약(예: High Power / Specific)
};

export const VITA_ANIMALS: Record<string, VitaAnimal> = {
  VITA: { code: 'VITA', image: '/vita/animals/vita.png', name: { ko: '사자', en: 'Lion', ja: 'ライオン', es: 'León' }, titleEn: 'Energetic Sun Lion', quadrantEn: 'High Power / Specific' },
  VITS: { code: 'VITS', image: '/vita/animals/vits.png', name: { ko: '부엉이', en: 'Owl', ja: 'フクロウ', es: 'Búho' }, titleEn: 'Pajama Night Owl', quadrantEn: 'High Power / Night Rhythms' },
  VILA: { code: 'VILA', image: '/vita/animals/vila.png', name: { ko: '수달', en: 'Otter', ja: 'カワウソ', es: 'Nutria' }, titleEn: 'River Water Otter', quadrantEn: 'High Power / Fluid Burner' },
  VILS: { code: 'VILS', image: '/vita/animals/vils.png', name: { ko: '고양이', en: 'Cat', ja: 'ネコ', es: 'Gato' }, titleEn: 'Moonlight Cleaner Cat', quadrantEn: 'High Power / Flexible Night' },
  VGTA: { code: 'VGTA', image: '/vita/animals/vgta.png', name: { ko: '곰', en: 'Bear', ja: 'クマ', es: 'Oso' }, titleEn: 'Golden Shield Bear Knight', quadrantEn: 'Shield Power / Heavy Fuel' },
  VGTS: { code: 'VGTS', image: '/vita/animals/vgts.png', name: { ko: '코알라', en: 'Koala', ja: 'コアラ', es: 'Koala' }, titleEn: 'Starry Wizard Koala', quadrantEn: 'Starry Power / Rest Balance' },
  VGLA: { code: 'VGLA', image: '/vita/animals/vgla.png', name: { ko: '돌고래', en: 'Dolphin', ja: 'イルカ', es: 'Delfín' }, titleEn: 'Clear Wave Dolphin', quadrantEn: 'Wave Flow / High Active' },
  VGLS: { code: 'VGLS', image: '/vita/animals/vgls.png', name: { ko: '늑대', en: 'Wolf', ja: 'オオカミ', es: 'Lobo' }, titleEn: 'Moonlight Guardian Wolf', quadrantEn: 'Moonlight / Guard Burner' },
  FITA: { code: 'FITA', image: '/vita/animals/fita.png', name: { ko: '여우', en: 'Fox', ja: 'キツネ', es: 'Zorro' }, titleEn: 'Flexible Yoga Fox', quadrantEn: 'Flexible / Low Power' },
  FITS: { code: 'FITS', image: '/vita/animals/fits.png', name: { ko: '판다', en: 'Panda', ja: 'パンダ', es: 'Panda' }, titleEn: 'Deep Sleep Panda', quadrantEn: 'Deep Sleep / Energy Saver' },
  FILA: { code: 'FILA', image: '/vita/animals/fila.png', name: { ko: '토끼', en: 'Bunny', ja: 'ウサギ', es: 'Conejo' }, titleEn: 'Speedy Spring Bunny', quadrantEn: 'Speedy / Light Active' },
  FILS: { code: 'FILS', image: '/vita/animals/fils.png', name: { ko: '다람쥐', en: 'Squirrel', ja: 'リス', es: 'Ardilla' }, titleEn: 'Night Crystal Squirrel', quadrantEn: 'Crystal / Rapid Burner' },
  FGTA: { code: 'FGTA', image: '/vita/animals/fgta.png', name: { ko: '코뿔소', en: 'Rhino', ja: 'サイ', es: 'Rinoceronte' }, titleEn: 'Sturdy Rhino Defender', quadrantEn: 'Sturdy / Dense Energy' },
  FGTS: { code: 'FGTS', image: '/vita/animals/fgts.png', name: { ko: '나무늘보', en: 'Sloth', ja: 'ナマケモノ', es: 'Perezoso' }, titleEn: 'Cosmic Star Sloth', quadrantEn: 'Cosmic / Ultra Saver' },
  FGLA: { code: 'FGLA', image: '/vita/animals/fgla.png', name: { ko: '사슴', en: 'Deer', ja: 'シカ', es: 'Ciervo' }, titleEn: 'Nature Forest Deer', quadrantEn: 'Nature / Clean Detox' },
  FGLS: { code: 'FGLS', image: '/vita/animals/fgls.png', name: { ko: '펭귄', en: 'Penguin', ja: 'ペンギン', es: 'Pingüino' }, titleEn: 'Starlight Tuxedo Penguin', quadrantEn: 'Starlight / Cold Burner' },
};

export function vitaAnimal(code: string | null | undefined): VitaAnimal | undefined {
  if (!code) return undefined;
  return VITA_ANIMALS[code.toUpperCase()];
}

// 코드 → 이미지 경로(매핑에 없어도 규칙상 경로를 반환).
export function vitaAnimalImage(code: string | null | undefined): string {
  return `/vita/animals/${(code ?? '').toLowerCase()}.png`;
}

export function vitaAnimalName(code: string | null | undefined, locale: VitaLocale): string {
  const a = vitaAnimal(code);
  return a ? a.name[locale] : '';
}

// 16 유형 예상 인구 분포(%) — 원문 "VITA CODE V8 설명서 · 16가지 대사 타입 예상 인구 분포표".
// 실사용자 실측이 아니라 보건 통계·현대 라이프스타일 기반 추정치(합계 100%). 화면엔 '예상'으로 고지.
export const VITA_TYPE_DISTRIBUTION: Record<string, number> = {
  VITS: 11.0,
  VGTS: 10.5,
  FITS: 9.5,
  FGTS: 9.0,
  VGLS: 8.0,
  VITA: 7.0,
  VGTA: 6.5,
  VILS: 6.0,
  VILA: 5.5,
  FGLS: 5.5,
  FILA: 4.5,
  FILS: 4.5,
  FITA: 3.5,
  FGTA: 3.5,
  FGLA: 3.0,
  VGLA: 2.5,
};

// 유형의 예상 인구 비율(%). 없으면 null.
export function vitaTypeShare(code: string | null | undefined): number | null {
  if (!code) return null;
  return VITA_TYPE_DISTRIBUTION[code.toUpperCase()] ?? null;
}

// 희소도 순위(1 = 가장 희소). 분포%가 낮을수록 희소. 16유형 기준.
export function vitaRarityRank(code: string | null | undefined): number | null {
  const share = vitaTypeShare(code);
  if (share == null) return null;
  const sorted = Object.values(VITA_TYPE_DISTRIBUTION).sort((a, b) => a - b);
  return sorted.indexOf(share) + 1;
}
