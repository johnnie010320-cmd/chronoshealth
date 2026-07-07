// 케마바디 레시피 건강 점수 — Workers AI 로 레시피 본문을 분석해 3축으로 채점.
//   1) 칼로리 적정성  2) 영양 균형  3) 초가공식품(NOVA)
// AI 는 1인분 kcal·매크로·초가공등급·한 줄 코멘트만 추정하고, 점수 산식은 서버가 결정적으로 계산
// (모델별 편차 최소화 + 재현성). 참고 지표일 뿐 의학적 평가 아님(윤리 규칙).
import { aiText } from '../routes/ai/ai-text.js';
import type { Bindings } from '../bindings.js';

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const RECIPE_SCORE_MODEL_VERSION = `recipe-score-v0.1.0:${MODEL}`;

export type RecipeGrade = 'excellent' | 'good' | 'fair' | 'caution';
export type UpfTier = 'clean' | 'processed' | 'ultra';

export type RecipeScore = {
  total: number; // 0~100 가중 총점
  grade: RecipeGrade;
  calorieScore: number; // 0~100
  nutritionScore: number; // 0~100
  upfScore: number; // 0~100
  estKcal: number; // 1인분 추정 kcal
  proteinG: number;
  carbG: number;
  fatG: number;
  upfTier: UpfTier;
  servings: number;
  summary: string; // 한 줄 평가(웰니스 톤)
  modelVersion: string;
};

const SYSTEM_PROMPT = `You are a nutrition assistant scoring a home recipe.
You receive a recipe title and body (ingredients and/or steps, possibly in Korean).
Estimate values for ONE serving and reply with STRICT JSON only, no prose, no markdown fence:
{"servings":<int>=1>,"kcal":<int kcal per serving>,"proteinG":<grams>,"carbG":<grams>,
 "fatG":<grams>,"upf":"clean|processed|ultra","comment":"<one short wellness sentence, same language as the recipe>"}
"upf" = overall NOVA processing level of the ingredients: "clean" = mostly whole/unprocessed
(vegetables, fruit, eggs, plain meat/fish, legumes, plain rice/oats), "processed" = some simple
processed items (tofu, canned beans, cheese, plain bread, yogurt), "ultra" = contains ultra-processed
items (instant noodles, ham/sausage/bacon, soda, chips, candy, fried fast food, packaged sauces/snacks).
"comment" must be a neutral, encouraging note about the dish — NEVER a medical claim, diagnosis, or
treatment. Keep it under 90 characters. If the recipe is unclear, give your best estimate. Do not refuse.`;

// 레시피를 채점. AI 호출·파싱 실패 시 null(호출측이 "평가 준비 중" 처리).
export async function scoreRecipe(
  ai: Bindings['AI'],
  input: { title: string; body: string },
): Promise<RecipeScore | null> {
  const userPayload = JSON.stringify({
    title: input.title.slice(0, 200),
    body: input.body.slice(0, 3000),
  });
  let text = '';
  try {
    const res = await ai.run(MODEL, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPayload },
      ],
      temperature: 0.1,
      max_tokens: 400,
    });
    text = aiText(res);
  } catch {
    return null;
  }
  const raw = parseJson(text);
  if (!raw) return null;

  const servings = clampInt(raw.servings, 1, 20) || 1;
  const estKcal = clampInt(raw.kcal, 0, 5000);
  const proteinG = clampGram(raw.proteinG);
  const carbG = clampGram(raw.carbG);
  const fatG = clampGram(raw.fatG);
  const upfTier = normUpf(raw.upf);

  const calorieScore = calorieScoreFrom(estKcal);
  const nutritionScore = nutritionScoreFrom(estKcal, proteinG, carbG, fatG);
  const upfScore = upfScoreFrom(upfTier);
  // 가중치: 칼로리 30% · 영양 40% · 초가공 30%.
  const total = clampInt(
    Math.round(calorieScore * 0.3 + nutritionScore * 0.4 + upfScore * 0.3),
    0,
    100,
  );

  return {
    total,
    grade: gradeFrom(total),
    calorieScore,
    nutritionScore,
    upfScore,
    estKcal,
    proteinG,
    carbG,
    fatG,
    upfTier,
    servings,
    summary: cleanComment(raw.comment),
    modelVersion: RECIPE_SCORE_MODEL_VERSION,
  };
}

export function gradeFrom(total: number): RecipeGrade {
  if (total >= 80) return 'excellent';
  if (total >= 60) return 'good';
  if (total >= 40) return 'fair';
  return 'caution';
}

// 칼로리 적정성 — 1인분 400~700kcal 를 이상대(100점)로, 벗어날수록 감점.
function calorieScoreFrom(kcal: number): number {
  if (kcal <= 0) return 50; // 추정 실패 시 중립.
  if (kcal >= 400 && kcal <= 700) return 100;
  if (kcal < 400) return clampInt(100 - (400 - kcal) / 4, 0, 100); // 200kcal→50
  return clampInt(100 - (kcal - 700) / 6, 0, 100); // 1300kcal→0
}

// 영양 균형 — 단백질 비중(높을수록 좋음) + 지방 비중(과다 감점).
function nutritionScoreFrom(kcal: number, p: number, carb: number, fat: number): number {
  const energy = kcal > 0 ? kcal : p * 4 + carb * 4 + fat * 9;
  if (energy <= 0) return 50;
  const proteinPct = (p * 4) / energy;
  const fatPct = (fat * 9) / energy;
  // 단백질 열량비 25% 를 만점 기준.
  const proteinScore = clampInt((proteinPct / 0.25) * 100, 0, 100);
  // 지방 열량비 30% 이하 만점, 이후 급감(63%→0).
  const fatScore = fatPct <= 0.3 ? 100 : clampInt(100 - (fatPct - 0.3) * 300, 0, 100);
  return clampInt(Math.round(proteinScore * 0.6 + fatScore * 0.4), 0, 100);
}

function upfScoreFrom(tier: UpfTier): number {
  if (tier === 'clean') return 100;
  if (tier === 'processed') return 65;
  return 25;
}

type RawScore = {
  servings?: unknown;
  kcal?: unknown;
  proteinG?: unknown;
  carbG?: unknown;
  fatG?: unknown;
  upf?: unknown;
  comment?: unknown;
};

function parseJson(raw: string): RawScore | null {
  if (!raw) return null;
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    const parsed: unknown = JSON.parse(stripped.slice(start, end + 1));
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as RawScore;
  } catch {
    return null;
  }
}

function clampInt(v: unknown, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function clampGram(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(2000, Math.round(v * 10) / 10));
}

function normUpf(v: unknown): UpfTier {
  return v === 'clean' || v === 'processed' || v === 'ultra' ? v : 'processed';
}

// 코멘트 방어 — 길이 제한 + 금지 의료표현이 있으면 비움(호출측이 템플릿 폴백).
function cleanComment(v: unknown): string {
  if (typeof v !== 'string') return '';
  const s = v.trim().replace(/\s+/g, ' ').slice(0, 120);
  return /진단|처방|치료|완치|사망|여명|diagnos|prescri|cure|treat/i.test(s) ? '' : s;
}
