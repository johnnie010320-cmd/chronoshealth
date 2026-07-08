import { VITALITY_TIER_CUTS } from '../avatar/vitality.js';
import type { AgeBand } from './distribution.js';

// spec docs/spec/leaderboard.md §3 — 실측 분포(ECDF).
//
// P1 은 모의 정규분포(percentile.ts)로 순위를 추정한다. 표본이 충분히 쌓이면
// 같은 (연령대 × 성별) 셀의 실제 사용자 점수 분포로 자동 전환한다.
// 전환 조건은 본 모듈의 MIN_SAMPLE_SIZE 하나뿐이며, 코드 배포 없이 표본 증가만으로 넘어간다.
//
// ADR 0003: 본 모듈은 analysis DB 만 접근하며 user_pseudonym_id 외 식별자를 다루지 않는다.

// 셀(연령대 × 성별) 당 최소 표본. 미달 시 모의분포 유지.
// 근거: 정규성 가정 없이 백분위를 1%p 해상도로 말하려면 최소 수십 표본이 필요.
// spec §3 의 "베타 1,000명+" 는 전체 표본 기준이고, 본 게이트는 셀 기준이다.
export const MIN_SAMPLE_SIZE = 30;

export type Sex = 'male' | 'female' | 'other';

export type EmpiricalCell = {
  sampleSize: number;
  /** 사용자 점수보다 낮은 표본 수 */
  below: number;
  /** 사용자 점수와 같은 표본 수 (본인 포함) */
  ties: number;
  tierDistribution: {
    excellent: number;
    good: number;
    fair: number;
    attention: number;
  };
};

/**
 * 사용자의 최신 활력 점수를 표본 테이블에 반영한다 (사용자당 1행).
 * 리포트/랭킹 조회 경로에서 호출되어 자기치유적으로 표본을 채운다.
 */
export async function upsertVitalitySnapshot(
  analysisDb: D1Database,
  args: {
    userPseudonymId: string;
    vitalityScore: number;
    ageBand: AgeBand;
    sex: Sex;
    updatedAt: string;
  },
): Promise<void> {
  await analysisDb
    .prepare(
      `INSERT INTO vitality_snapshots
         (user_pseudonym_id, vitality_score, age_band, sex, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_pseudonym_id) DO UPDATE SET
         vitality_score = excluded.vitality_score,
         age_band       = excluded.age_band,
         sex            = excluded.sex,
         updated_at     = excluded.updated_at`,
    )
    .bind(
      args.userPseudonymId,
      args.vitalityScore,
      args.ageBand,
      args.sex,
      args.updatedAt,
    )
    .run();
}

/**
 * (연령대 × 성별) 셀의 실측 분포를 읽는다.
 * 표본이 MIN_SAMPLE_SIZE 미만이면 호출자가 모의분포로 폴백해야 한다.
 */
export async function readEmpiricalCell(
  analysisDb: D1Database,
  args: { ageBand: AgeBand; sex: Sex; score: number },
): Promise<EmpiricalCell> {
  const { excellent, good, fair } = VITALITY_TIER_CUTS;

  const row = await analysisDb
    .prepare(
      `SELECT
         COUNT(*)                                                      AS sample_size,
         SUM(CASE WHEN vitality_score <  ?  THEN 1 ELSE 0 END)         AS below,
         SUM(CASE WHEN vitality_score =  ?  THEN 1 ELSE 0 END)         AS ties,
         SUM(CASE WHEN vitality_score >= ?  THEN 1 ELSE 0 END)         AS t_excellent,
         SUM(CASE WHEN vitality_score >= ? AND vitality_score < ? THEN 1 ELSE 0 END) AS t_good,
         SUM(CASE WHEN vitality_score >= ? AND vitality_score < ? THEN 1 ELSE 0 END) AS t_fair,
         SUM(CASE WHEN vitality_score <  ?  THEN 1 ELSE 0 END)         AS t_attention
       FROM vitality_snapshots
       WHERE age_band = ? AND sex = ?`,
    )
    .bind(
      args.score,
      args.score,
      excellent,
      good,
      excellent,
      fair,
      good,
      fair,
      args.ageBand,
      args.sex,
    )
    .first<{
      sample_size: number;
      below: number | null;
      ties: number | null;
      t_excellent: number | null;
      t_good: number | null;
      t_fair: number | null;
      t_attention: number | null;
    }>();

  // 빈 셀이면 COUNT(*)=0, SUM(...)=NULL.
  return {
    sampleSize: row?.sample_size ?? 0,
    below: row?.below ?? 0,
    ties: row?.ties ?? 0,
    tierDistribution: {
      excellent: row?.t_excellent ?? 0,
      good: row?.t_good ?? 0,
      fair: row?.t_fair ?? 0,
      attention: row?.t_attention ?? 0,
    },
  };
}

/**
 * ECDF 백분위 — 동점자는 절반만 아래로 센다 (mid-rank).
 * percentile = (below + ties/2) / n × 100
 */
export function ecdfPercentile(cell: EmpiricalCell): number {
  if (cell.sampleSize <= 0) return 0;
  const p = ((cell.below + cell.ties / 2) / cell.sampleSize) * 100;
  return Math.round(p * 10) / 10; // 0.1 자리
}

/**
 * 표본 내 절대 순위 (1 = 최고점). 동점은 같은 순위(competition rank).
 */
export function ecdfRank(cell: EmpiricalCell): number {
  const above = cell.sampleSize - cell.below - cell.ties;
  return Math.max(1, above + 1);
}
