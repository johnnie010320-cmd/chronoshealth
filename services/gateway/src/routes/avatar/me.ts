import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { readLatestReport, readUserName } from '../../avatar/storage.js';
import { calcVitalityScore } from '../../avatar/vitality.js';
import { predictedYearsRemaining } from '../../avatar/pyr.js';
import { listConditions } from '../../medical/storage.js';
import { listSurgeries } from '../../medical/storage.js';
import { estimateLifetimeCost } from '../../avatar/medical_cost.js';
import { bandFor } from '../../leaderboard/distribution.js';
import { upsertVitalitySnapshot } from '../../leaderboard/ecdf.js';
import type { Bindings } from '../../bindings.js';

// 스토리보드 p25 — Data 입력 수준에 따른 신뢰도 표시.
// 1차(설문) 50%, 2차(의료이력) +25%, 3차(특수진단, 미구현) +21%.
// 본 함수는 P0~P1 한정 — 3rd Data 미구현이므로 최대 75% 권장.
function calcConfidence(opts: {
  hasReport: boolean;
  conditionCount: number;
  surgeryCount: number;
}): number {
  let c = 0;
  if (opts.hasReport) c += 50; // 1st Data — survey 완료
  if (opts.conditionCount > 0 || opts.surgeryCount > 0) c += 25; // 2nd Data
  // 3rd Data는 미구현 — P3에서 +21% 추가 예정.
  return Math.max(0, Math.min(100, c));
}

// spec docs/spec/avatar-chronos.md §5.
// ADR 0003 — name 은 identity-vault 에서 응답 직전에만 조회.

const DISCLAIMER = '본 카드는 예측 추정으로 의료 자문을 대체하지 않습니다.';

export const avatarMeRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

avatarMeRoute.get('/', authMiddleware, async (c) => {
  const pseudonymId = c.get('userPseudonymId');

  const latest = await readLatestReport(c.env.DB, pseudonymId);
  if (!latest) {
    return c.json({ error: { code: 'NO_REPORT' } }, 404);
  }

  const [name, conditions, surgeries] = await Promise.all([
    readUserName(c.env.IDENTITY_DB, pseudonymId),
    listConditions(c.env.DB, pseudonymId),
    listSurgeries(c.env.DB, pseudonymId),
  ]);
  const confidence = calcConfidence({
    hasReport: true,
    conditionCount: conditions.length,
    surgeryCount: surgeries.length,
  });

  const chronologicalAge = latest.payload.bioAge.chronologicalAge;
  const diseaseProbs = latest.payload.diseaseRisk.map((d) => d.probability5y);

  const vitality = calcVitalityScore({
    bioAgeValue: latest.payload.bioAge.value,
    chronologicalAge,
    diseaseProbs,
    stressLevel: latest.stressLevel ?? 'medium',
  });

  // 리더보드 실측 분포(ECDF) 표본 — 사용자당 1행 upsert. PII 미포함.
  await upsertVitalitySnapshot(c.env.DB, {
    userPseudonymId: pseudonymId,
    vitalityScore: vitality.value,
    ageBand: bandFor(chronologicalAge),
    sex: latest.sex,
    updatedAt: new Date().toISOString(),
  });

  const pyr = predictedYearsRemaining({
    country: 'KR',
    chronologicalAge,
    bioAge: latest.payload.bioAge.value,
    sex: latest.sex,
  });

  // 5종 나이 P1 한정 — bioAge 기반 휴리스틱 (avatar-chronos.md §9 미해결, P3 정밀화)
  const bioAge = latest.payload.bioAge.value;
  const fiveAges = {
    life: bioAge,
    vitality: bioAge - Math.round((vitality.value - 70) / 10),
    skin: bioAge,
    vascular: bioAge,
    joint: bioAge + (latest.stressLevel === 'high' ? 2 : 0),
  };

  const lifetimeCost = estimateLifetimeCost({
    chronologicalAge,
    predictedRemainingYears: pyr.median,
    bioAgePenalty: Math.max(0, latest.payload.bioAge.value - chronologicalAge),
    risks: latest.payload.diseaseRisk.reduce<Partial<Record<string, number>>>((acc, d) => {
      acc[d.code] = d.probability5y;
      return acc;
    }, {}),
  });

  return c.json({
    name: name ?? '',
    chronologicalAge,
    vitalityScore: vitality,
    predictedYearsRemaining: pyr,
    fiveAges,
    confidence,
    lifetimeMedicalCost: lifetimeCost,
    lastReportAt: latest.generatedAt,
    modelVersion: latest.payload.modelVersion,
    disclaimer: DISCLAIMER,
  });
});
