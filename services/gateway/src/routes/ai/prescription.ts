// 스토리보드 p31 — 나의 건강 AI 처방.
// 위험 추정·루틴 데이터·만성질환 입력을 LLM 에 전달해 식습관/운동/수면 교정 코칭을 생성.
// 의료 자문 아님 명시 (apps/web CLAUDE.md 규칙 4 — 신뢰구간 + 면책).

import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  listConditions,
  displayConditionCode,
  NONE_CODE,
} from '../../medical/storage.js';
import { aiText } from './ai-text.js';
import { savePrescription, listPrescriptions } from '../../ai/prescription-storage.js';
import type { Bindings } from '../../bindings.js';

// 모델 이력:
//  - @cf/meta/llama-3.1-8b-instruct: 2026-05-30 폐기(AiError 5028).
//  - @cf/meta/llama-3.3-70b-instruct-fp8-fast: 한국어 출력이 깨진 유니코드(서러게이트)+
//    퇴화 반복으로 사용 불가 → Qwen3(다국어 강함)로 교체. 2026-06-25.
const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';
const MODEL_VERSION = `ai-prescription-v0.3.0:${MODEL}`;

// FormCoach(www.ever-day.com) 연동 가능한 건강 운동 종목 슬러그.
// 운동 처방 → 해당 종목 자세 교정 화면으로 딥링크(웹 클라이언트가 URL 구성).
const FORMCOACH_SPORTS = ['running', 'swimming', 'yoga', 'pilates', 'crossfit', 'hiking'] as const;
type FormcoachSport = (typeof FORMCOACH_SPORTS)[number];

// 운동 텍스트(요약+운동 팁)에서 종목을 추론하기 위한 다국어 키워드.
// LLM 이 formcoachSports 를 누락해도 결정적으로 딥링크를 채워 넣는 보강 장치.
const SPORT_KEYWORDS: Record<FormcoachSport, string[]> = {
  running: ['러닝', '달리기', '조깅', 'run', 'jog', 'correr', 'ランニング', 'ジョギング'],
  swimming: ['수영', 'swim', 'natación', 'natacion', '水泳'],
  yoga: ['요가', 'yoga', 'ヨガ'],
  pilates: ['필라테스', 'pilates', 'ピラティス'],
  crossfit: ['크로스핏', 'crossfit', 'cross-fit', 'クロスフィット'],
  hiking: ['등산', '하이킹', 'hik', 'trek', 'senderismo', 'ハイキング', '登山'],
};

const PrescriptionRequest = z
  .object({
    bioAge: z.number().min(0).max(150).optional(),
    youthAge: z.number().min(0).max(150).optional(),
    chronologicalAge: z.number().min(0).max(150).optional(),
    risks: z
      .object({
        cvd: z.number().min(0).max(1).optional(),
        diabetes: z.number().min(0).max(1).optional(),
        ckd: z.number().min(0).max(1).optional(),
        dementia: z.number().min(0).max(1).optional(),
        cancer: z.number().min(0).max(1).optional(),
      })
      .optional(),
    routine: z
      .object({
        caloriesKcal: z.number().nullable().optional(),
        exerciseMinutes: z.number().nullable().optional(),
        sleepHours: z.number().nullable().optional(),
      })
      .optional(),
    locale: z.enum(['ko', 'en', 'ja', 'es']).default('ko'),
  })
  .strict();

type Prescription = {
  summary: string;
  diet: string[];
  exercise: string[];
  rest: string[];
  // 운동 처방과 연계된 FormCoach 자세교정 종목(딥링크용). 0~3개.
  formcoachSports: FormcoachSport[];
};

export const aiPrescriptionRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

aiPrescriptionRoute.post(
  '/prescription',
  authMiddleware,
  rateLimit(20),
  async (c) => {
    const pseudonymId = c.get('userPseudonymId');
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: { code: 'INVALID_JSON' } }, 400);
    }
    const parsed = PrescriptionRequest.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
    }

    const conditions = await listConditions(c.env.DB, pseudonymId);
    const result = await callAi(c.env.AI, parsed.data, conditions);
    if (!result) {
      return c.json({ error: { code: 'AI_PARSE_FAILED' } }, 502);
    }
    // '나의 건강 일기' — 오늘 날짜로 처방 저장(저장 실패해도 응답은 정상).
    try {
      const today = new Date().toISOString().slice(0, 10);
      await savePrescription(c.env.DB, pseudonymId, today, JSON.stringify(result), MODEL_VERSION);
    } catch {
      /* best-effort */
    }
    return c.json({ prescription: result, modelVersion: MODEL_VERSION });
  },
);

// '나의 건강 일기' — 저장된 처방 날짜별 조회.
aiPrescriptionRoute.get('/prescriptions', authMiddleware, rateLimit(60), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const from = c.req.query('from') ?? '';
  const to = c.req.query('to') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const rows = await listPrescriptions(c.env.DB, pseudonymId, from, to);
  const items = rows.map((r) => {
    let prescription: Prescription | null = null;
    try {
      prescription = JSON.parse(r.payload) as Prescription;
    } catch {
      prescription = null;
    }
    return { entryDate: r.entryDate, prescription };
  });
  return c.json({ items, modelVersion: MODEL_VERSION });
});

const SYSTEM_PROMPT = `You are a wellness coach (NOT a doctor). Given health predictions and routines,
produce specific, concrete habit nudges. PRIORITIZE the diet plan and the exercise plan — these
are the two most important sections; make them the most detailed and actionable. Keep rest brief.
Reply with STRICT JSON only, no prose, no markdown fence.
Schema:
{"summary":"<1-2 sentence overview>",
 "diet":["<concrete meal/eating tip>","..."],
 "exercise":["<concrete workout tip>","..."],
 "rest":["<short recovery tip>"],
 "formcoachSports":["<0-3 of: running, swimming, yoga, pilates, crossfit, hiking>"]}
diet and exercise have 3-4 items each; rest has 1-2 items. Each item under 80 characters.
For formcoachSports, pick only sports that match your exercise advice (e.g. suggest running/jogging -> "running");
use an empty array if none clearly apply. Only use slugs from the allowed list.
Never use the words "diagnose", "prescribe", "cure", "treat", "death" or their translations.
Always frame advice as suggestion, not prescription.
Write every text field in fluent, natural language for the given locale (natural Korean for "ko", natural Japanese for "ja", Spanish for "es", English for "en"). Do not mix languages or output broken text.`;

async function callAi(
  ai: Bindings['AI'],
  req: z.infer<typeof PrescriptionRequest>,
  conditions: { code: string; category: string }[],
): Promise<Prescription | null> {
  const payload = JSON.stringify({
    bioAge: req.bioAge ?? null,
    youthAge: req.youthAge ?? null,
    chronologicalAge: req.chronologicalAge ?? null,
    risks: req.risks ?? null,
    routine: req.routine ?? null,
    // '해당 없음' 센티넬은 코칭에 무의미하므로 제외, 직접입력은 접두 제거 후 실제 병명만 전달.
    conditions: conditions
      .filter((c) => c.code !== NONE_CODE)
      .map((c) => ({ code: displayConditionCode(c.code), category: c.category })),
    locale: req.locale,
  });
  const res = await ai.run(MODEL, {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      // Qwen3 추론(thinking) 비활성화 — 바로 JSON만 출력.
      { role: 'user', content: `/no_think\n${payload}` },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });
  return parseJson(aiText(res));
}

function parseJson(raw: string): Prescription | null {
  if (!raw) return null;
  const stripped = raw
    .trim()
    // 추론형 모델의 <think>...</think> 블록 제거 후 JSON 추출.
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    const parsed = JSON.parse(stripped.slice(start, end + 1)) as Partial<Prescription>;
    if (
      typeof parsed.summary !== 'string' ||
      !Array.isArray(parsed.diet) ||
      !Array.isArray(parsed.exercise) ||
      !Array.isArray(parsed.rest)
    ) {
      return null;
    }
    const summary = parsed.summary.slice(0, 400);
    const exercise = cleanList(parsed.exercise);
    return {
      summary,
      diet: cleanList(parsed.diet),
      exercise,
      rest: cleanList(parsed.rest),
      formcoachSports: resolveFormcoachSports(parsed.formcoachSports, [summary, ...exercise]),
    };
  } catch {
    return null;
  }
}

// LLM 이 준 종목(허용 목록 검증) + 운동 텍스트 키워드 추론을 합쳐 0~3개로 정리.
function resolveFormcoachSports(
  raw: unknown,
  exerciseText: string[],
): FormcoachSport[] {
  const out: FormcoachSport[] = [];
  const add = (s: FormcoachSport) => {
    if (!out.includes(s)) out.push(s);
  };
  if (Array.isArray(raw)) {
    for (const v of raw) {
      if (typeof v === 'string' && (FORMCOACH_SPORTS as readonly string[]).includes(v)) {
        add(v as FormcoachSport);
      }
    }
  }
  const hay = exerciseText.join(' ').toLowerCase();
  for (const sport of FORMCOACH_SPORTS) {
    if (SPORT_KEYWORDS[sport].some((kw) => hay.includes(kw.toLowerCase()))) add(sport);
  }
  return out.slice(0, 3);
}

function cleanList(items: unknown[]): string[] {
  return items
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter((x) => x.length > 0 && x.length <= 120)
    .slice(0, 4);
}
