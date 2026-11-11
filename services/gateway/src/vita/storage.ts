import type { VitaSectionScores } from '../schemas/vita.js';

// VITA CODE V8 분류(서버 정본 — 클라이언트 engine.ts와 동일 로직).
// 1축 대사·에너지 V/F: energy,glucose · 2축 심혈관·순환 I/G: circulation ·
// 3축 장·간·해독 T/L: gut,inflammation,detox · 4축 호르몬·리듬 A/S: hormone,sleep,musculoskeletal,neuro.
// 축 평균 증상 부하(0~100)가 스펙트럼 중앙(50) 초과 → 보존 엔진(F/G/L/S), 이하 → 주 엔진(V/I/T/A).
// 코드 순서=[1축][2축][3축][4축]. 전 영역 최적이면 'VITA'.
// 🚨 apps/web/src/lib/vita/engine.ts VITA_SPECTRUM_MIDPOINT 와 반드시 같은 값.
//   (2026-11-11 사고: 웹은 50, 서버는 옛 경계 20 → 저장 코드 FITS 인데 본문은 VITA 설명이 나옴.
//    웹은 이제 sectionScores 로 코드를 다시 계산해 쓰지만, 서버 저장값도 맞춰 둔다.)
export const VITA_SPECTRUM_MIDPOINT = 50;

function secondary(...vals: number[]): boolean {
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return avg > VITA_SPECTRUM_MIDPOINT;
}

export function classifyVita(s: VitaSectionScores): { code: string; totalScore: number } {
  const metabolic = secondary(s.energy, s.glucose);
  const circulation = secondary(s.circulation);
  const gutliver = secondary(s.gut, s.inflammation, s.detox);
  const hormonal = secondary(s.hormone, s.sleep, s.musculoskeletal, s.neuro);
  const code =
    (metabolic ? 'F' : 'V') +
    (circulation ? 'G' : 'I') +
    (gutliver ? 'L' : 'T') +
    (hormonal ? 'S' : 'A');
  const totalScore = Object.values(s).reduce((sum, v) => sum + v, 0);
  return { code, totalScore };
}

export type VitaResultRow = {
  code: string;
  totalScore: number;
  sectionScores: VitaSectionScores;
  createdAt: string;
};

export async function saveVitaResult(
  db: D1Database,
  pseudonymId: string,
  sectionScores: VitaSectionScores,
  modelVersion: string,
): Promise<VitaResultRow> {
  const { code, totalScore } = classifyVita(sectionScores);
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO vita_results (id, user_pseudonym_id, code, total_score, section_scores, model_version)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, pseudonymId, code, totalScore, JSON.stringify(sectionScores), modelVersion)
    .run();
  const row = await db
    .prepare('SELECT created_at FROM vita_results WHERE id = ?')
    .bind(id)
    .first<{ created_at: string }>();
  return { code, totalScore, sectionScores, createdAt: row?.created_at ?? '' };
}

export async function readLatestVitaResult(
  db: D1Database,
  pseudonymId: string,
): Promise<VitaResultRow | null> {
  const row = await db
    .prepare(
      `SELECT code, total_score, section_scores, created_at
         FROM vita_results WHERE user_pseudonym_id = ?
        ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(pseudonymId)
    .first<{ code: string; total_score: number; section_scores: string; created_at: string }>();
  if (!row) return null;
  let sectionScores: VitaSectionScores;
  try {
    sectionScores = JSON.parse(row.section_scores) as VitaSectionScores;
  } catch {
    return null;
  }
  return {
    code: row.code,
    totalScore: row.total_score,
    sectionScores,
    createdAt: row.created_at,
  };
}
