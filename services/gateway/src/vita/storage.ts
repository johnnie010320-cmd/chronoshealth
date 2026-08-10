import type { VitaSectionScores } from '../schemas/vita.js';

// VITA 분류(서버 정본). 대사(energy,glucose) / 정화(gut,inflammation,detox) /
// 순환(circulation,hormone,sleep) / 신경(musculoskeletal,neuro). 축 소속 영역 중
// 하나라도 13점 이상이면 Impaired 문자, 아니면 Good 문자. 코드 순서=[대사][정화][순환][신경].
const OPTIMAL_MAX = 12;

export function classifyVita(s: VitaSectionScores): { code: string; totalScore: number } {
  const metabolic = s.energy > OPTIMAL_MAX || s.glucose > OPTIMAL_MAX;
  const detox = s.gut > OPTIMAL_MAX || s.inflammation > OPTIMAL_MAX || s.detox > OPTIMAL_MAX;
  const circulation =
    s.circulation > OPTIMAL_MAX || s.hormone > OPTIMAL_MAX || s.sleep > OPTIMAL_MAX;
  const neuro = s.musculoskeletal > OPTIMAL_MAX || s.neuro > OPTIMAL_MAX;
  const code =
    (metabolic ? 'M' : 'E') +
    (detox ? 'D' : 'G') +
    (circulation ? 'H' : 'C') +
    (neuro ? 'N' : 'S');
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
