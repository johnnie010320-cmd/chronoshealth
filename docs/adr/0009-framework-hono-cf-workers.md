# ADR 0009 — API 프레임워크: Hono on Cloudflare Workers

- **Status**: Accepted
- **Date**: 2026-05-14
- **Decider**: Johnnie
- **Related**: ADR 0007 (CF 단독 인프라)

## Context

절차서 2.1은 API 게이트웨이 스택을 "NestJS(TypeScript), Fastify, 내부 gRPC"로 명시. ADR 0007이 인프라를 CF Workers로 결정한 이상, 게이트웨이 프레임워크도 Workers 호환으로 재선택 필요.

NestJS는 Node.js 풀(Express / Fastify) 어댑터를 가정 — CF Workers 런타임(V8 isolate, 노드 API 일부만 호환)에서 그대로 돌지 않는다.

## Decision

**Hono** 프레임워크 채택 (services/gateway/).

### 채택 사유

| 항목 | Hono |
|------|------|
| CF Workers 네이티브 | ✓ 기본 환경 중 하나 |
| TypeScript 우선 | ✓ 타입 추론 강력 |
| 번들 크기 | ~12 KB gzip (Workers 1 MB 한도 안 안전) |
| Zod 통합 | `@hono/zod-validator` 공식 |
| 미들웨어 모델 | Express-스타일, 익숙 |
| Edge 외 환경 (Node, Deno, Bun) | 동일 코드로 호환 — 향후 마이그레이션 옵션 |

### 표준 패턴

- `import { Hono } from 'hono'` 단일 진입점
- 라우트 그룹: `app.route('/api/v1/risk-estimate', riskEstimateRoute)`
- 미들웨어: `hono/factory`의 `createMiddleware`
- 검증: `hono/zod-validator` 또는 핸들러 안에서 `Schema.safeParse(body)`
- 응답: `c.json({...}, status)` 표준
- 환경 변수: `c.env` 통해 `wrangler.toml [vars]` 접근

## Consequences

**긍정**
- CF Workers 1차 배포 환경에 최적
- 작은 번들 → 콜드 스타트 빠름 (Workers 글로벌 분산 친화)
- Express / Fastify 사용자 진입장벽 낮음
- TypeScript inference로 인한 타입 안전성 (Zod 결합 시)

**부정 / 위험**
- NestJS의 DI / 데코레이터 / 모듈 시스템 미사용 — 규모 커질 시 코드 조직 직접 설계 필요
- 절차서 2.1 "NestJS" 명시와 차이 — 절차서 갱신 또는 본 ADR로 supersede 명시
- 도구 생태계 NestJS 대비 작음 (단, P0~P2 단계 필요한 정도는 충분)
- AWS Lambda / EKS로 향후 이전 시 핸들러 코드 일부 재작성 가능성 (단, Hono는 Node 어댑터 제공 → 큰 어려움 없음)

## 절차서 수정

`docs/work-procedure.txt` 2.1 "API 게이트웨이 = NestJS(TypeScript), Fastify, 내부 gRPC" → "API 게이트웨이 = Hono on Cloudflare Workers (NestJS는 P3 이후 AWS 도입 시 재검토 — ADR 0007/0009 정합)" 갱신.

## Alternatives Considered

- **NestJS**: 풍부한 생태계 / DI / 모듈 / GraphQL 통합 우수. 단 CF Workers 네이티브 아님, 번들 크기 큼 (수십~수백 KB), 콜드 스타트 부담. P3 AWS 이전 시 재검토.
- **Express**: 가장 친숙. 단 CF Workers 비호환 (Node 의존). 거부.
- **Fastify**: 빠름 + 스키마 검증. 단 Workers 비호환. 거부.
- **itty-router**: Workers 호환 최소 라우터. 단 미들웨어 / 타입 추론 / 생태계 부족. 거부.
- **순수 fetch handler (프레임워크 없음)**: 초소형 번들. 단 라우팅 / 미들웨어 직접 구현 비용. 거부.
- **Cloudflare Worker Templates (자체 SDK)**: TypeScript 지원 약함. 거부.
