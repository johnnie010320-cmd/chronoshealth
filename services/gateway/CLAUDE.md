# services/gateway — API Gateway

> NestJS + Fastify. 모든 외부 요청의 단일 입구.

## 책임

- 인증 (JWT + OAuth)
- 권한 검사 (RBAC)
- 호출 제한 (rate limit)
- 데이터 주권 강제 (purpose_code 검증)
- 내부 서비스로 라우팅 (gRPC)
- OpenAPI 스키마 노출

## 절대 규칙

1. **사용자 입력은 모두 Zod 스키마 검증** (parse 실패 → 400)
2. 인증 없는 라우트는 `@Public()` 명시 (기본은 인증 요구)
3. `services/identity/` 외에는 PII를 응답에 포함 금지
4. 로그에 토큰 / 비밀 / PII 포함 금지 (mask middleware)
5. 외부 응답에 내부 에러 stack 노출 금지

## 표준

- 컨트롤러는 라우팅만, 비즈니스 로직은 service / use-case
- DTO = Zod 스키마 + `z.infer<>` 타입
- 에러는 표준 `AppError`로 래핑 (코드 + 메시지 + httpStatus)

## SLO

- p95 200ms, p99 500ms
- 가용성 99.9%
- 호출 제한: 사용자당 60req/min, IP당 600req/min
