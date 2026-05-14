# Chronos Health

AI 기반 노화/질병/사망시점 예측 헬스케어 앱 + Health-to-Earn 토큰($CHR) 생태계

## Vision

> 자신의 건강 데이터로 자신의 미래를 설계하고, 그 데이터의 가치를 자신이 보유한다.

- **AI 예측**: 웨어러블/EHR/유전체 데이터를 종합하여 생물학적 나이, 기대수명 범위, 질병 위험을 산출
- **Health-to-Earn**: 익명화된 데이터를 연구용으로 제공하면 $CHR 토큰 보상
- **데이터 주권**: 영지식 증명 + IPFS/Filecoin 분산 저장으로 사용자 본인이 통제

## Roadmap

| Phase | 목표 |
|-------|------|
| Phase 0 | 풀스택 웹 프로토타입 (Next.js + Supabase) — 데이터 입력, 예측 리포트 UI |
| Phase 1 | AI 예측 백엔드 (Python FastAPI), 모델 v1, 웨어러블 1~2개 연동 |
| Phase 2 | 모바일 앱 (React Native), 본격 웨어러블 연동 (Apple/Galaxy/Fitbit) |
| Phase 3 | $CHR 토큰 발행, ZK PoH, CertiK 감사 |
| Phase 4 | LBank 등 글로벌 거래소 상장 |

## Tech Stack (Phase 0)

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS 4
- Zustand (no persist)
- Supabase (Auth + DB + RLS)
- Vitest + Playwright
- Cloudflare Pages 배포

## Getting Started

```bash
# 1. Next.js 프로젝트 초기화 (아직 진행 전이면)
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir=false

# 2. 의존성
npm install @supabase/supabase-js zustand zod

# 3. 환경변수
cp .env.example .env.local
# Supabase URL/Anon Key 입력

# 4. 개발 서버
npm run dev
```

## Claude Code

이 프로젝트는 Claude Code 설정이 포함되어 있습니다.

- `CLAUDE.md` — 프로젝트 가이드
- `.claude/commands/` — 슬래시 커맨드 (`/commit-push-pr`, `/build-all` 등)
- `.claude/agents/` — 전문 에이전트 (build-validator, code-reviewer 등)
- `.claude/skills/` — 도메인 스킬 (architecture, prediction-engine, token, health-data, testing)

## License

TBD (상장 전 결정 — Apache 2.0 검토 중)

## Disclaimer

본 서비스는 의학적 진단/처방/치료를 제공하지 않습니다. 건강 증진을 위한 참고용 리포트만 제공합니다.
