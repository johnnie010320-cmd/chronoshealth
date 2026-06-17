// R9 메시징 — twin 닉네임 해석(ADR 0015: 닉네임은 비-PII 공개 핸들).
// 발신자/상대 표시를 위해 게이트웨이가 IDENTITY_DB.users 에서 닉네임만 조회해 응답에 포함.
// 실명·이메일 등 PII 는 절대 반환하지 않는다(절대규칙 1 — nickname 컬럼만 SELECT).

export async function findPseudonymByNickname(
  identityDb: D1Database,
  nickname: string,
): Promise<string | null> {
  const r = await identityDb
    .prepare('SELECT user_pseudonym_id FROM users WHERE nickname = ? LIMIT 1')
    .bind(nickname)
    .first<{ user_pseudonym_id: string }>();
  return r?.user_pseudonym_id ?? null;
}

export async function resolveNickname(
  identityDb: D1Database,
  pseudonymId: string,
): Promise<string | null> {
  const r = await identityDb
    .prepare('SELECT nickname FROM users WHERE user_pseudonym_id = ? LIMIT 1')
    .bind(pseudonymId)
    .first<{ nickname: string | null }>();
  return r?.nickname ?? null;
}

// 여러 pseudonym 의 닉네임을 한 번에 해석 — Map<pseudonym, nickname|null>.
// MVP 규모(대화 참여자 ≤ 20)에서는 개별 조회로 충분.
export async function resolveNicknames(
  identityDb: D1Database,
  pseudonymIds: string[],
): Promise<Map<string, string | null>> {
  const unique = Array.from(new Set(pseudonymIds));
  const map = new Map<string, string | null>();
  for (const id of unique) {
    map.set(id, await resolveNickname(identityDb, id));
  }
  return map;
}
