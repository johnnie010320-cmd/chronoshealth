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

## Amendment — 브랜드/도메인 변경 (2026-08-25, Johnnie)

- 앱 **브랜드 표시명을 `VITAcode`로 확정**(구 "Chronos Health" → "caremybody" → **VITAcode**). 디지털 트윈 아바타명 = "마이 VITA"(ko) / "My VITA"(en) / "マイVITA"(ja) / "Mi VITA"(es).
- **신규 도메인 `vitacode.ever-day.com` 추가** — Gabia(`ns1.gabia.co.kr`)에 CNAME `vitacode` → `chronoshealth.pages.dev`, CF Pages 커스텀 도메인 연결. 기존 `chronoshealth.ever-day.com`도 **유지**(둘 다 라이브, 프록시·쿠키 무변경).
- **기술 식별자는 변경 없음**(비가역 결정 유지) — repo·CF Pages 프로젝트·worker(`chronoshealth-gateway`)·D1(`chronoshealth-identity`/`chronoshealth-analysis`)·R2(`chronoshealth-attachments`)·쿠키(`chronos_session`/`chronos_uid`) 모두 `chronoshealth`/`chronos` 표기 유지(데이터 무중단, 사용자 비노출). `CHRO` 토큰 심볼도 유지.
- 배포: full **`v0.3.0`**. 정식 도메인 이동(§Migration Plan) 시 `vitacode.io` 등 브랜드 정합 도메인을 후보에 포함.

## Amendment — 정식 도메인 이전 + 웹/앱 분리 (2026-09-19, Johnnie)

임시 서브도메인(ever-day.com)에서 **자체 정식 도메인 2종**으로 이전한다.

- **앱(주) 도메인 = `vitacodeapp.com`** — CF Pages `chronoshealth` 커스텀 도메인. 정본(canonical).
- **회사 도메인 = `vitalabsinc.com`** — CF Redirect Rules로 `vitacodeapp.com`에 **301** 리디렉트(경로·쿼리 보존). 어느 도메인으로 들어와도 동일 경험.
- **`vitacode.ever-day.com` · `chronoshealth.ever-day.com` 폐지** — CF Pages 커스텀 도메인 제거 + Gabia CNAME(`vitacode`·`chronoshealth`) 삭제. FormCoach `www.ever-day.com`은 무영향.
- **DNS 방식**: 두 도메인을 CF 계정 `l2pamerica`에 존으로 편입(네임서버 이관). SSL·리디렉트·커스텀도메인 단일 계정 제어.
- **웹/앱 분리(정상 웹페이지화)**: 루트 `/` = 공개 마케팅 사이트(색인 허용, 풀폭 레이아웃, route group `(marketing)`). 로그인 후 앱 홈은 **`/dashboard`**(앱셸·하단탭 유지). 마케팅 카피는 한국어 우선(앱 대시보드는 기존 4개국어 유지).
- **코드 영향**: gateway CORS 허용목록 → `vitacodeapp.com`(+www), care 자리표시자 URL·D1 `care_affiliates.cta_url`(migration 0043) → vitacodeapp.com, 앱 홈 기준점 `/`→`/dashboard`(AppShell·BottomNav·로그인/온보딩 리다이렉트). 기술 식별자(chronoshealth 등)·쿠키·CHRO는 계속 유지.
- 배포는 모든 도메인 존 Active 후 컷오버(gateway migration 0043 → worker → Pages). 배포 시 릴리스 버전은 죠니 승인 후 부여.

## Amendment 2 — 역할 재정의: 회사 사이트 ≠ 리다이렉트 (2026-09-21, v0.5.0 라이브)

Amendment(2026-09-19)의 "회사=301→앱, 앱=마케팅 랜딩(/) + 대시보드(/dashboard)"를 **죠니 지시로 변경**한다.

- **`vitacodeapp.com` = VITAcode 앱(웹) 전용.** 루트 `/`=앱 홈(분리 원복 — `(marketing)`·`/dashboard` 제거, 앱은 다시 루트).
- **`vitalabsinc.com` = 회사 홍보 사이트(별도).** 신규 CF Pages 프로젝트 **`vitalabs`**(정적 다중 페이지 `apps/vitalabs/`: `/`·`/product`·`/about`·`/contact`, Sora+Pretendard, same-origin `/api` 프록시). 301 리다이렉트는 쓰지 않음. 이메일=CF Email Routing.
- **관리자 CMS**(vitacodeapp.com/admin, 같은 gateway): 배너 **placement**(app/vitalabs 분리 — 동영상·이미지·순서), **site_content** 키-값(회사 카피 편집, 비우면 사이트 기본값). migration 0044(placement)·0045(site_content).
- 구 `vitacode/chronoshealth.ever-day.com` CF 커스텀도메인 **제거 완료**(Gabia CNAME 삭제만 잔여). NS 이관·DNS는 CF `l2pamerica` 존에서 관리(배포토큰은 DNS 권한 없음 → 별도 DNS 토큰).
