# ADR 0006 — 임시 도메인: chronoshealth.ever-day.com

- **Status**: Accepted
- **Date**: 2026-05-13
- **Decider**: Johnnie

## Context

정식 도메인(chronos-health.io 등) 등록은 (1) 상표 사전 검증, (2) Whois / 등록처 설정, (3) Cloudflare 계정 분리 결정이 선행되어야 한다. 동시에 개발 초기 단계에서 빠른 데모 / 베타 테스트 / 외부 공유 링크가 필요하다.

## Decision

**chronoshealth.ever-day.com** 서브도메인을 P0~P1 단계 임시 도메인으로 사용한다.

- 모든 기술 식별자(저장소·CF 프로젝트·서브도메인·향후 정식 도메인)는 **하이픈 없는 `chronoshealth`** 단일 표기 (2026-05-13 죠니 결정, 사용자 편의성)
- 브랜드 표시명은 "Chronos Health" 2단어 유지 (사람 가독)
- 상위 도메인 `ever-day.com`은 죠니 보유 (FormCoach 프로젝트 도메인)
- DNS 등록처: Gabia (`ns1.gabia.co.kr`)
- 배포 대상: **Cloudflare Pages** (정식 도메인 이동 시 무중단 이전 가능)
- **Cloudflare 계정**: `l2pamerica@gmail.com` (Account ID `70461e52de37c19b674705151b865aca`, 투윈즈와 공유)
- CF Pages 프로젝트명: **`chronoshealth`** (twowinz와 동일 계정 내 분리)
- GitHub 저장소: `johnnie010320-cmd/chronoshealth`
- 환경 분리:
  - `chronoshealth.ever-day.com` — staging/베타
  - `dev.chronoshealth.ever-day.com` — dev (선택)
- 정식 이동 시점: 완성도 임계 도달 시 = 베타 NPS 30 이상 + 코드 안정성 확보 (절차서 P1 종료 조건 충족 시)
- 정식 도메인 후보: `chronoshealth.io` / `chronoshealth.com` / `chronoshealth.kr` (모두 하이픈 없음)

## Consequences

**긍정**
- 도메인 등록 / 상표 검증 작업과 코드 작업을 병렬화
- 정식 도메인 이동 시 ever-day.com에 잔존하지 않음 (FormCoach 브랜드 오염 방지)
- 베타 사용자에게 "임시 도메인" 명시 → 향후 이동 시 사용자 혼란 최소

**부정 / 위험**
- 베타 사용자 브랜드 인지가 ever-day.com 잔향에 영향
- 이메일 / 알림 / OAuth 콜백 URL이 chronos-health.ever-day.com 으로 발급되어, 이동 시 일괄 갱신 필요
- 검색엔진 / 백링크가 임시 도메인에 누적되어 SEO 자산 손실 가능 → 베타 단계에서 검색엔진 noindex 설정

## Migration Plan (정식 도메인 이동)

1. 정식 도메인 등록 + Cloudflare 위임 (P1 종료 직전)
2. 두 도메인 동시 운영 (1~2주, OAuth / Webhook URL 갱신)
3. `chronoshealth.ever-day.com` → 정식 도메인 301 영구 리디렉트
4. 60일 후 서브도메인 DNS 회수
5. 별도 ADR로 이동 완료 기록

## Alternatives Considered

- **Firebase Hosting (FormCoach 멀티사이트)**: 빠르나 production 타겟(CF Pages)과 다른 스택 → 이동 시 마이그레이션 비용. 거부.
- **vercel.app 기본 도메인 (예: chronos-health.vercel.app)**: 외부 공유 시 외관 약함, 추후 Vercel 의존성. 거부.
- **정식 도메인 즉시 등록**: 상표 충돌 시 등록 매몰 비용. 거부.
