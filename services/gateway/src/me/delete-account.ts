// 회원 탈퇴 (2026-11-08 죠니 — Play 데이터 보안 '계정 삭제' 필수).
// 본인 요청으로 계정과 그 계정이 남긴 기록을 지운다. 되돌릴 수 없다.
//  - identity DB: 개인정보(users)·세션·SNS 연결·프로필 사진·비번 재설정·제휴 계정
//  - analysis DB: 설문·리포트·VITA 결과·루틴·일기·의료 기록·커뮤니티 글/댓글/좋아요/팔로우·보낸 메시지·기능 요청
//  - R2: 일기 첨부·보낸 메시지 첨부·기능 요청 첨부
// 남기는 것: 동의 기록(consent_log 2곳)·보상 원장(chr_ledger) — DB 트리거로 지울 수 없는 append-only 기록이고 pseudonym 뿐이라
//   users 가 지워지면 사람과 이어지지 않는다(2026-11-08 실배포에서 트리거에 막혀 확인). 관리자 작업 기록(감사 로그·공지·배너 등 created_by)과 다른 사람이 만든 대화방·커뮤니티(이 사람은 빠짐).
// 처리 사실만 감사 로그에 'member.self_delete' 로 남긴다(pseudonym 만, PII 없음).

import { appendAudit } from '../admin/audit.js';
import type { Bindings } from '../bindings.js';

/** 분석 DB 에서 이 사람 행을 지우는 문장 (표, 칼럼) */
const ANALYSIS_ROWS: ReadonlyArray<readonly [string, string]> = [
  // 순서 = 외래 키 순서(자식 먼저): 리포트 → 응답, 좋아요·댓글 → 글, 반응 → 메시지
  ['risk_survey_reports', 'user_pseudonym_id'],
  ['risk_survey_responses', 'user_pseudonym_id'],
  ['vita_results', 'user_pseudonym_id'],
  ['vitality_snapshots', 'user_pseudonym_id'],
  ['ai_prescriptions', 'user_pseudonym_id'],
  ['routine_entries', 'user_pseudonym_id'],
  ['my_diary', 'user_pseudonym_id'],
  ['diary_attachments', 'user_pseudonym_id'],
  ['medical_conditions', 'user_pseudonym_id'],
  ['surgery_records', 'user_pseudonym_id'],
  ['community_likes', 'user_pseudonym_id'],
  ['community_comments', 'user_pseudonym_id'],
  ['community_posts', 'user_pseudonym_id'],
  ['community_followers', 'follower_pseudonym_id'],
  ['community_admins', 'admin_pseudonym_id'],
  ['message_reactions', 'user_pseudonym_id'],
  ['messages', 'sender_pseudonym_id'],
  ['conversation_members', 'member_pseudonym_id'],
  ['feature_requests', 'user_pseudonym_id'],
];

const IDENTITY_ROWS: ReadonlyArray<readonly [string, string]> = [
  ['session_tokens', 'user_pseudonym_id'],
  ['oauth_accounts', 'user_pseudonym_id'],
  ['user_avatars', 'user_pseudonym_id'],
  ['password_reset_tokens', 'user_pseudonym_id'],
  ['partner_accounts', 'user_pseudonym_id'],
  ['users', 'user_pseudonym_id'],
];

export type DeleteAccountResult = { ok: true; files: number } | { ok: false; code: 'NOT_FOUND' | 'ADMIN_CANNOT_DELETE' };

/** 이 사람이 올린 R2 파일 키 (일기·메시지·기능 요청) */
async function collectFileKeys(db: D1Database, pid: string): Promise<string[]> {
  const [diary, msgs, frs] = await db.batch<Record<string, string | null>>([
    db.prepare('SELECT r2_key AS k FROM diary_attachments WHERE user_pseudonym_id = ?').bind(pid),
    db.prepare('SELECT attachment_key AS k FROM messages WHERE sender_pseudonym_id = ? AND attachment_key IS NOT NULL').bind(pid),
    db
      .prepare('SELECT image_key AS a, file_key AS b, body_image_key AS c, body_file_key AS d FROM feature_requests WHERE user_pseudonym_id = ?')
      .bind(pid),
  ]);
  const keys: string[] = [];
  for (const r of [...(diary?.results ?? []), ...(msgs?.results ?? []), ...(frs?.results ?? [])]) {
    for (const v of Object.values(r)) if (typeof v === 'string' && v.length > 0) keys.push(v);
  }
  return keys;
}

export async function deleteAccount(env: Bindings, pid: string): Promise<DeleteAccountResult> {
  const user = await env.IDENTITY_DB.prepare('SELECT role FROM users WHERE user_pseudonym_id = ?')
    .bind(pid)
    .first<{ role: string | null }>();
  if (!user) return { ok: false, code: 'NOT_FOUND' };
  // 관리자는 스스로 지우지 못한다(관리 권한을 먼저 내려놓아야 함) — 마지막 관리자가 사라지는 사고 방지
  if (user.role === 'admin') return { ok: false, code: 'ADMIN_CANNOT_DELETE' };

  const keys = await collectFileKeys(env.DB, pid);

  // 이 사람 글에 다른 사람이 단 댓글·좋아요·레시피 점수, 이 사람 메시지에 달린 반응도 함께 (외래 키 — 먼저 지워야 글·메시지가 지워진다)
  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM community_comments WHERE post_id IN (SELECT id FROM community_posts WHERE user_pseudonym_id = ?)',
    ).bind(pid),
    env.DB.prepare(
      'DELETE FROM community_likes WHERE post_id IN (SELECT id FROM community_posts WHERE user_pseudonym_id = ?)',
    ).bind(pid),
    env.DB.prepare(
      'DELETE FROM recipe_scores WHERE post_id IN (SELECT id FROM community_posts WHERE user_pseudonym_id = ?)',
    ).bind(pid),
    env.DB.prepare(
      'DELETE FROM message_reactions WHERE message_id IN (SELECT id FROM messages WHERE sender_pseudonym_id = ?)',
    ).bind(pid),
    ...ANALYSIS_ROWS.map(([t, col]) => env.DB.prepare(`DELETE FROM ${t} WHERE ${col} = ?`).bind(pid)),
  ]);

  let files = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    try {
      await env.ATTACHMENTS.delete(keys.slice(i, i + 1000));
      files += Math.min(1000, keys.length - i);
    } catch (err) {
      console.error('delete-account R2 delete failed', err);
    }
  }

  // 개인정보는 맨 마지막 — 중간에 실패해도 다시 탈퇴를 누를 수 있게(로그인이 살아 있도록)
  await env.IDENTITY_DB.batch(
    IDENTITY_ROWS.map(([t, col]) => env.IDENTITY_DB.prepare(`DELETE FROM ${t} WHERE ${col} = ?`).bind(pid)),
  );

  await appendAudit(env.DB, { actorPseudonymId: pid, action: 'member.self_delete', target: pid, detail: `files=${files}` });
  return { ok: true, files };
}
