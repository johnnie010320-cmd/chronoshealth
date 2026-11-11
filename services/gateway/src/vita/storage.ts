import type { VitaSectionScores } from '../schemas/vita.js';
import {
  ageDecade,
  axisLoads,
  classifyAxes,
  linearSectionScores,
  type PeerLoads,
  type VitaAnswers,
  type VitaAxes,
  type VitaAxisLoads,
} from './classify.js';

// VITA CODE V8 결과 저장·조회. 유형 판정 규칙은 classify.ts(v8.1) — 서버가 정본.
// 🚨 2026-11-11 사고: 서버(경계 20)·웹(50)이 따로 판정해 'FITS' 머리말 아래 'VITA' 본문이 나왔다.
//    이제 웹은 판정하지 않고 결과의 code·axes 를 그대로 쓴다.

export type VitaResultRow = {
  code: string;
  totalScore: number;
  sectionScores: VitaSectionScores;
  axes: VitaAxes | null; // v8.1 이전 결과는 null(웹은 코드만 표시)
  createdAt: string;
};

export type VitaInput = { sectionScores?: VitaSectionScores | undefined; answers?: VitaAnswers | undefined };

const VALID_SEX = new Set(['male', 'female']);

// 같은 성별·나이대 / 전체 사용자의 최신 결과 축 부하(본인 제외).
export async function loadPeerLoads(
  db: D1Database,
  pseudonymId: string,
  sex: string | null,
  ageBand: string | null,
): Promise<PeerLoads> {
  const base = `SELECT v.axis_loads, v.sex, v.age_band FROM vita_results v
    JOIN (SELECT user_pseudonym_id, MAX(created_at) mc FROM vita_results GROUP BY user_pseudonym_id) l
      ON v.user_pseudonym_id = l.user_pseudonym_id AND v.created_at = l.mc
    WHERE v.axis_loads IS NOT NULL AND v.user_pseudonym_id != ?`;
  const { results } = await db
    .prepare(base)
    .bind(pseudonymId)
    .all<{ axis_loads: string; sex: string | null; age_band: string | null }>();
  const all: VitaAxisLoads[] = [];
  const cohort: VitaAxisLoads[] = [];
  for (const r of results ?? []) {
    let loads: VitaAxisLoads;
    try {
      loads = JSON.parse(r.axis_loads) as VitaAxisLoads;
    } catch {
      continue;
    }
    all.push(loads);
    if (sex && ageBand && r.sex === sex && r.age_band === ageBand) cohort.push(loads);
  }
  return { cohort, all };
}

async function readCohort(
  identityDb: D1Database | undefined,
  pseudonymId: string,
): Promise<{ sex: string | null; ageBand: string | null }> {
  if (!identityDb) return { sex: null, ageBand: null };
  const u = await identityDb
    .prepare('SELECT sex, birth_year FROM users WHERE user_pseudonym_id = ? LIMIT 1')
    .bind(pseudonymId)
    .first<{ sex: string | null; birth_year: number | null }>();
  return {
    sex: u?.sex && VALID_SEX.has(u.sex) ? u.sex : null,
    ageBand: ageDecade(u?.birth_year ?? null),
  };
}

export async function saveVitaResult(
  db: D1Database,
  identityDb: D1Database | undefined,
  pseudonymId: string,
  input: VitaInput,
  modelVersion: string,
): Promise<VitaResultRow> {
  const answers = input.answers ?? null;
  const sectionScores = answers ? linearSectionScores(answers) : (input.sectionScores as VitaSectionScores);
  const totalScore = Object.values(sectionScores).reduce((sum, v) => sum + v, 0);
  const loads = axisLoads(sectionScores, answers);
  const { sex, ageBand } = await readCohort(identityDb, pseudonymId);
  const peers = await loadPeerLoads(db, pseudonymId, sex, ageBand);
  const { code, axes } = classifyAxes(loads, peers);

  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO vita_results (id, user_pseudonym_id, code, total_score, section_scores, model_version,
                                 answers, axis_loads, axis_detail, sex, age_band)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      pseudonymId,
      code,
      totalScore,
      JSON.stringify(sectionScores),
      modelVersion,
      answers ? JSON.stringify(answers) : null,
      JSON.stringify(loads),
      JSON.stringify(axes),
      sex,
      ageBand,
    )
    .run();
  const row = await db
    .prepare('SELECT created_at FROM vita_results WHERE id = ?')
    .bind(id)
    .first<{ created_at: string }>();
  return { code, totalScore, sectionScores, axes, createdAt: row?.created_at ?? '' };
}

export async function readLatestVitaResult(
  db: D1Database,
  pseudonymId: string,
): Promise<VitaResultRow | null> {
  const row = await db
    .prepare(
      `SELECT code, total_score, section_scores, axis_detail, created_at
         FROM vita_results WHERE user_pseudonym_id = ?
        ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(pseudonymId)
    .first<{ code: string; total_score: number; section_scores: string; axis_detail: string | null; created_at: string }>();
  if (!row) return null;
  let sectionScores: VitaSectionScores;
  try {
    sectionScores = JSON.parse(row.section_scores) as VitaSectionScores;
  } catch {
    return null;
  }
  let axes: VitaAxes | null = null;
  if (row.axis_detail) {
    try {
      axes = JSON.parse(row.axis_detail) as VitaAxes;
    } catch {
      axes = null;
    }
  }
  return { code: row.code, totalScore: row.total_score, sectionScores, axes, createdAt: row.created_at };
}
