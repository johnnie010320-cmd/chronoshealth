# Chronos Health — Claude Code Project Guide

> 디지털 트윈 헬스케어 × 분산형 인프라(DePIN). AI 기반 노화/질병 위험 예측 + Health-to-Earn 토큰(**CHRO**) 생태계.

## 현재 단계

**P1 — 제품 확장 / 실측 전환 준비** (최종 갱신 2026-07-08, 릴리스 `v0.0.48`)

`chronoshealth.ever-day.com` 라이브. 릴리스 이력은 관리자 `/admin/devlog` (analysis D1 `releases` 테이블)가 정본.

### 라이브 (구현·배포 완료)

- **identity** — 이름·전화·이메일 가입 + 세션 토큰 (ADR 0010/0011). 이메일 대소문자 무관 유니크(`lower(email)`)
- **risk-survey** — 23문항 → Framingham + 경험적 bio age. D1 저장 + 동의 이력. modelVersion `rs-v0.1.0`. 설문 세분화(흡연 갑수 / 주종·주량 다중입력 / 운동 강도 / 기타 가족력, migration `0035`)
- **avatar / reports** — 활력 점수, 예측 잔여 연수, 5종 나이, 생애 예상 의료비
- **simulation** — `/simulate` What-if. 마지막 설문(`GET /simulate/last-input`) 재사용으로 재설문 없이 직접 진입
- **leaderboard** — `/leaderboard`. **모의 정규분포 기반 추정** (실사용자 랭킹 아님, 화면 배너 고지)
- **care** — 식이·운동·의료 룰 + 제휴 카드. 제휴는 미연동(`comingSoon` 토스트)
- **diary / routine** — 오늘의 루틴(날짜 선택 + 최근 2주 누락일 안내), 건강 일기 캘린더(공휴일 한/미), 개인 첨부(사진/PDF, R2, 본인 전용)
- **self-check** — 구조화 증상 입력, 긴급도 신호등 4단계, AI 후속 질문, 정신건강 간이 스크리너(비진단) + 위기 핫라인 1393 / 1577-0199, 사진·동영상 첨부
- **community** — 3계층 카테고리, 큐레이션 유튜브, 키워드 검색, 오늘의 핫피플, 케마바디 레시피(AI 건강 점수), 관리자 오버라이드
- **messaging** — 1:1 / 단체. 대화기록 영구보관, 첨부 90일, 방 삭제 시 전량 purge
- **notices** — 첨부(이미지·PDF·링크) + 새 공지 뱃지
- **admin** — 대시보드, 회원, 콘텐츠, 공지, 설문 집계(나이대×성별, PII 배제), 변경 감사 로그, devlog
- **AI** — Workers AI `llama-3.3-70b-instruct-fp8-fast` (칼로리 추정, 푸드샷, 증상, 레시피 점수). `llama-3.1-8b`는 폐기(5028) — 사용 금지
- **i18n** — ko / en / ja / es 4언어 전 화면

### 코드 완료 · 배포 대기 (2026-07-08, 미배포)

배포 시 **analysis D1 migration 0036 · 0037 먼저 적용** → worker → Pages 순.

1. **리더보드 실측 전환** — `vitality_snapshots` + ECDF (`lb-v0.2.0`, migration 0036). 셀 표본 ≥ 30 이면 자동 전환, 미달 시 모의분포. `docs/spec/leaderboard.md` §3.1
2. **케어 제휴 D1 이관** — `care_affiliates` + 관리자 CRUD `/admin/care-affiliates` (`care-v0.2.0`, migration 0037). 실 제휴 URL 입력 시 `comingSoon` 자동 해제
3. **vascular age 실계산** — Framingham 역산 (`vascular-age-v0.1.0`). 상한 80(`vascularAgeCapped` → UI "80+"). `docs/spec/avatar-chronos.md` §9.1
4. **생애 의료비 총액 정합** — `totalKrw` = `perDecadeKrw` 합 (`lifetime-cost-v0.2.0`)

### 알려진 한계 (UI에 항목별 고지)

- 리더보드 순위·백분위 = 모의 정규분포 추정 (프로덕션 고유 사용자 3명 → 셀 표본 30 미달). `scope=country` 는 국가 미수집이라 항상 모의
- `fiveAges.skin` / `fiveAges.joint` / `life` / `vitality` = `bioAge` 휴리스틱 — ML 데이터셋 의존, `docs/spec/pending-features.md` #7. 응답 `fiveAgesBasis` 로 항목별 구분
- 생애 예상 의료비 = 통계 추정 (`lifetime-cost-v0.2.0`), 의료 자문 아님
- 케어 제휴 = 실제 제휴 계약 전이라 전 카드 "준비중". 노출/클릭 추적·정산은 미구현 (`pending-features.md` #9)
- 미구현 항목 전체 목록은 `docs/spec/pending-features.md` (SNS 로그인, 공단 연동, DID, 웨어러블, 푸시 등)

### 기존 실패 (본 작업 무관, 별도 처리 필요)

`vitest` 4건 실패 — `community.test.ts`(타인 게시물 삭제 404), `community-author-edit.test.ts`(타인 본문 수정·삭제 404), `messaging-files.test.ts`(방 삭제 403). `gateway typecheck` src 오류 7건 (`auth/password.ts` 4, `index.ts` Bindings 중복 2, `community/index.ts` 1).

## 임시 도메인 (ADR 0006)

- **URL**: `chronoshealth.ever-day.com` (FormCoach `ever-day.com` 하위)
- **DNS**: Gabia (`ns1.gabia.co.kr`) — CNAME 추가 필요
- **배포**: Cloudflare Pages 프로젝트 `chronoshealth`
- **CF 계정**: `l2pamerica@gmail.com` (Account ID `70461e52de37c19b674705151b865aca`, 투윈즈와 공유)
- **GitHub**: `johnnie010320-cmd/chronoshealth`
- **이동 시점**: P1 종료 조건 충족 시 정식 도메인 (`chronoshealth.io` 등)으로
- **표기 규칙**: 모든 기술 식별자는 하이픈 없는 `chronoshealth`. 브랜드 표시명은 "Chronos Health" 2단어.

## 1차 근거 문서

- `docs/work-procedure.txt` — 작업 절차서 v1.0 (모든 결정의 기준, ADR 0000)
- `docs/adr/` — 비가역적 결정 기록
  - ADR 0000 — 절차서 정본 채택
  - ADR 0001 — 모노레포 pnpm + Turborepo
  - ADR 0002 — AWS 서울 리전 **(Superseded by 0007)**
  - ADR 0003 — identity-vault PII 격리
  - ADR 0004 — 토큰 체인 Polygon PoS
  - ADR 0005 — 코딩 표준 (TS / Python / Solidity)
  - ADR 0006 — 임시 도메인 chronoshealth.ever-day.com
  - ADR 0007 — 인프라 전략: P0~P1 Cloudflare 단독, P2+ 재결정
  - ADR 0008 — 저장소 Cloudflare D1 (P0~P1 한정)
  - ADR 0009 — API 프레임워크 Hono on CF Workers
  - ADR 0010 — 인증 / 회원관리: P0/P1 단순 가입 (이름·전화·이메일, 비밀번호/OTP/OAuth 미도입)
  - ADR 0011 — 베타 등록 데이터 모델: identity-vault 격리 (이메일 평문 / HMAC pseudonym 분리)
- `docs/spec/` — 기능별 명세 (risk-survey, identity, product-mvp, roadmap-ui, simulation, avatar-chronos, leaderboard)

**모든 작업은 위 3개 문서 중 하나에 근거해야 한다.** 근거 없는 결정은 ADR로 먼저 합의.

## 운영 4대 원칙 (절차서 0장)

1. **명세 우선 개발** — 코드 전에 `docs/spec/`. `/spec` 슬래시 커맨드 사용.
2. **수직 슬라이싱** — 한 줄을 인프라부터 UI까지 완성 후 살을 붙인다. `/slice` 사용.
3. **Compliance-by-Design** — HIPAA / GDPR / 의료법 / 특금법 요건을 데이터 모델 단계에서 반영.
4. **재현 가능성** — 모든 ML 실험과 컨트랙트 배포는 깃 SHA + 데이터셋 해시 + 실행 해시로 재현 가능.

## 모노레포 구조 (절차서 3.1)

```
chronos-health/
├── apps/
│   ├── mobile/          # React Native (Expo)
│   ├── web/             # Next.js (마케팅 + 대시보드)
│   └── admin/           # 내부 운영 콘솔
├── services/
│   ├── gateway/         # NestJS API 게이트웨이
│   ├── identity/        # 개인정보 금고 (격리 배포)
│   ├── ingestion/       # 웨어러블/의료기록 수집
│   ├── ml-serving/      # FastAPI + Triton
│   └── reward/          # 온체인 정산 인덱서
├── ml/
│   ├── pipelines/       # Kedro / Prefect
│   ├── models/          # PyTorch / scikit-learn
│   └── notebooks/       # 탐색 (커밋은 .py 변환 후)
├── contracts/           # Foundry 워크스페이스
├── packages/            # 공유 TS 라이브러리 (types, sdk, ui)
├── infra/               # Terraform + Helm
├── docs/                # ADR, 명세, 컴플라이언스, 감사, 일지
└── .claude/             # Claude Code 설정
```

- 패키지 매니저: **pnpm + Turborepo**
- 도메인별 `CLAUDE.md` 추가 가능 (해당 폴더 진입 시 자동 로드)

## 절대 규칙 (위반 시 자동 거부)

1. **PII는 `services/identity/` 외부에서 다루지 않는다.** 분석 DB에는 `user_pseudonym_id`만.
2. **`.env*`, 비밀키, KMS 키 ARN 커밋 금지.** SOPS + age 또는 GitHub OIDC만 허용.
3. **마이그레이션 없는 스키마 변경 금지.** `migrate → backfill → 코드 배포 → 마이그레이션 정리` 4단계 분리 PR.
4. **`main` 강제 푸시 금지.** 스쿼시 머지, 컨벤셔널 커밋.
5. **`enum` 금지** → 문자열 리터럴 유니온
6. **`any` 금지** → `unknown` + 타입가드
7. **`console.log` 금지** → `lib/logger`

## 의료·윤리 금지 표현 (UI / 응답 / 리포트 전 영역)

- "진단", "처방", "치료" → "예측 리포트" / "위험 추정"
- "사망일", "여명", "죽음" → "건강 위험 추정" / "개선 여지"
- 단정형 시간 표현 ("75세에 사망") → 항상 신뢰구간 + 확률 분포
- 미성년자(만 19세 미만) 가입 → 차단
- 위험 점수 임계 초과 시 → 자살예방상담전화 **1393**, 정신건강위기상담 **1577-0199** 자동 노출

## 작업 시작 체크리스트

1. 절차서 `docs/work-procedure.txt`에서 현재 단계 확인
2. `/spec` 또는 ADR로 작업 근거 확보
3. Plan Mode로 작업 분해 → 사람 승인
4. TDD (실패 테스트 → 구현 → 통과 → 리팩토링)
5. `/lint-fix` + 타입체크 + 테스트 통과
6. 컴플라이언스 리뷰어 / 솔리디티 감사관 (해당 영역만)
7. PR (자동 템플릿)

## 토큰 ($CHRO) — 절차서 8장

- 심볼: **CHRO** (최종 확정은 상장 직전)
- 체인: **Polygon PoS 1차**, ERC-20 + Permit + Votes
- 총 발행: 1,000,000,000 (고정, 인플레이션 없음)
- 분배: 커뮤니티 40 / 생태계 25 / 팀 15(4년 베스팅 + 1년 클리프) / 투자자 10 / 트레저리 7 / 유동성 3
- 보상: 주간 머클 드롭. 사용자가 직접 클레임.
- 거버넌스: Snapshot → 48h 타임락 → 실행. 정족수 4% + 단순과반 (핵심 60%).
- 키 관리: Gnosis Safe 3-of-5 + Ledger 지리적 분산.

## Claude Code 환경 (절차서 3장)

- `.claude/commands/` — `/spec`, `/adr`, `/slice`, `/audit-prep`, `/commit-push-pr`, `/typecheck-all`, `/lint-fix`
- `.claude/agents/` — `compliance-reviewer`, `solidity-auditor`, `ml-experimenter`, `test-writer`, `docs-curator`
- `.claude/skills/` — `chronos-architecture`, `chronos-prediction-engine`, `chronos-token`, `chronos-health-data`, `chronos-testing`
- `.claude/hooks/` — `pre-commit.sh`, `pre-edit.sh`, `session-start.sh`

## 워크플로

- 코드 변경 후: `git add` → `git commit` → `git push origin master` (자동, 단 비밀키 스캔 + 린트 통과 시)
- 빌드/배포는 죠니 사전 승인 + 빌드 번호 부여 후에만
- 작업 완료 후 배포 진행 여부 반드시 사용자에게 확인
- 변경 이력은 `docs/journal/YYYY-MM-DD.md`에 자동 누적

## 참고 — 자매 프로젝트

- twowinz (`c:\Users\User\my-website`) — Next.js + Supabase + Cloudflare 패턴
- FormCoach (`c:\Users\User\golf_swing_analyzer`) — MediaPipe + 모바일
- CloudBridge (`C:\Users\User\Desktop\Johnnie\MIKS\CloudBridge`) — 운영 안정성 / 멀티시그 / 빌드 절차
