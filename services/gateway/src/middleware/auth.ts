import { createMiddleware } from 'hono/factory';

export type AuthVariables = {
  userPseudonymId: string;
};

/**
 * 모의 인증 미들웨어.
 * Authorization: Bearer <token> 헤더 검사 → 토큰을 pseudonym으로 사용.
 * 정식 JWT 검증은 회원가입 spec 도입 시 교체.
 */
export const authMiddleware = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED' } }, 401);
  }
  const token = auth.slice('Bearer '.length).trim();
  if (token.length === 0) {
    return c.json({ error: { code: 'UNAUTHORIZED' } }, 401);
  }
  // 모의: 토큰 앞 16자를 pseudonym으로 사용. 정식 구현은 JWT sub claim.
  c.set('userPseudonymId', `user_${token.substring(0, 16)}`);
  await next();
  return;
});
