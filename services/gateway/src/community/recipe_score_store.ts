// recipe_scores 접근 — post_id 당 1행 upsert/read. analysis DB.
import type { RecipeScore, RecipeGrade, UpfTier } from './recipe_score.js';

// 채점 결과 저장(재평가 시 덮어쓰기).
export async function upsertRecipeScore(
  db: D1Database,
  postId: string,
  s: RecipeScore,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO recipe_scores
         (post_id, total_score, calorie_score, nutrition_score, upf_score, grade,
          est_kcal, protein_g, carb_g, fat_g, upf_tier, servings, summary, model_version, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(post_id) DO UPDATE SET
         total_score=excluded.total_score, calorie_score=excluded.calorie_score,
         nutrition_score=excluded.nutrition_score, upf_score=excluded.upf_score,
         grade=excluded.grade, est_kcal=excluded.est_kcal, protein_g=excluded.protein_g,
         carb_g=excluded.carb_g, fat_g=excluded.fat_g, upf_tier=excluded.upf_tier,
         servings=excluded.servings, summary=excluded.summary,
         model_version=excluded.model_version, created_at=datetime('now')`,
    )
    .bind(
      postId,
      s.total,
      s.calorieScore,
      s.nutritionScore,
      s.upfScore,
      s.grade,
      s.estKcal,
      s.proteinG,
      s.carbG,
      s.fatG,
      s.upfTier,
      s.servings,
      s.summary,
      s.modelVersion,
    )
    .run();
}

type ScoreRow = {
  post_id: string;
  total_score: number;
  calorie_score: number;
  nutrition_score: number;
  upf_score: number;
  grade: string;
  est_kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  upf_tier: string;
  servings: number;
  summary: string;
  model_version: string;
};

function mapRow(r: ScoreRow): RecipeScore {
  return {
    total: r.total_score,
    grade: r.grade as RecipeGrade,
    calorieScore: r.calorie_score,
    nutritionScore: r.nutrition_score,
    upfScore: r.upf_score,
    estKcal: r.est_kcal,
    proteinG: r.protein_g,
    carbG: r.carb_g,
    fatG: r.fat_g,
    upfTier: r.upf_tier as UpfTier,
    servings: r.servings,
    summary: r.summary,
    modelVersion: r.model_version,
  };
}

const COLS = `post_id, total_score, calorie_score, nutrition_score, upf_score, grade,
              est_kcal, protein_g, carb_g, fat_g, upf_tier, servings, summary, model_version`;

export async function readRecipeScore(
  db: D1Database,
  postId: string,
): Promise<RecipeScore | null> {
  const r = await db
    .prepare(`SELECT ${COLS} FROM recipe_scores WHERE post_id = ?`)
    .bind(postId)
    .first<ScoreRow>();
  return r ? mapRow(r) : null;
}

// 목록용 일괄 조회 — post_id → RecipeScore.
export async function readRecipeScores(
  db: D1Database,
  postIds: string[],
): Promise<Map<string, RecipeScore>> {
  const out = new Map<string, RecipeScore>();
  if (postIds.length === 0) return out;
  const placeholders = postIds.map(() => '?').join(',');
  const { results } = await db
    .prepare(`SELECT ${COLS} FROM recipe_scores WHERE post_id IN (${placeholders})`)
    .bind(...postIds)
    .all<ScoreRow>();
  for (const r of results ?? []) out.set(r.post_id, mapRow(r));
  return out;
}

// 백필용 — 아직 점수 없는 특정 커뮤니티의 살아있는 게시물.
export async function listUnscoredPosts(
  db: D1Database,
  communityId: string,
  limit: number,
): Promise<{ id: string; title: string; body: string }[]> {
  const { results } = await db
    .prepare(
      `SELECT p.id, p.title, p.body
         FROM community_posts p
         LEFT JOIN recipe_scores s ON s.post_id = p.id
        WHERE p.community_id = ? AND p.deleted_at IS NULL AND s.post_id IS NULL
        ORDER BY p.created_at ASC
        LIMIT ?`,
    )
    .bind(communityId, limit)
    .all<{ id: string; title: string; body: string }>();
  return results ?? [];
}
