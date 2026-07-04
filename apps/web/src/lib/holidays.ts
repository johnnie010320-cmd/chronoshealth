'use client';

// 공휴일 — Nager.Date 공개 API(한국 KR · 미국 US). date → 공휴일명(중복 시 · 로 결합).
// 실패해도 조용히 빈 결과(달력 표시는 그대로).

export type HolidayMap = Record<string, string>;

export async function fetchHolidays(year: number): Promise<HolidayMap> {
  const out: HolidayMap = {};
  const countries: Array<{ cc: string; local: boolean }> = [
    { cc: 'KR', local: true }, // 한국은 현지명(설날 등)
    { cc: 'US', local: false }, // 미국은 영문명
  ];
  await Promise.all(
    countries.map(async ({ cc, local }) => {
      try {
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${cc}`);
        if (!res.ok) return;
        const list = (await res.json()) as Array<{
          date: string;
          localName: string;
          name: string;
        }>;
        for (const h of list) {
          const label = local ? h.localName : h.name;
          out[h.date] = out[h.date] ? `${out[h.date]} · ${label}` : label;
        }
      } catch {
        /* noop */
      }
    }),
  );
  return out;
}
