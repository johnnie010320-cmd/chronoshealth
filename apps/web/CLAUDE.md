# apps/web — Next.js Marketing + Dashboard

> Next.js 15 + React 19. 마케팅 + 베타 대시보드.

## 책임

- 랜딩 / 가입 / 로그인
- 베타 사용자 대시보드 (예측 리포트 UI)
- 관리자 콘솔은 `apps/admin/`에 별도

## 절대 규칙 (윤리)

1. UI 문구에 "진단" / "처방" / "치료" / "여명" / "사망일" / "죽음" 금지
2. 위험 점수 임계 초과 시 **1393 / 1577-0199** 안내 자동 노출
3. 미성년자(만 19세 미만) 가입 차단 — 회원가입 단계 생년월일 검증
4. 모든 예측 표시에 신뢰구간 + 면책 문구 ("본 리포트는 의학적 진단이 아닙니다")
5. 카운트다운 UI (D-XXX 같은) 절대 금지

## 표준

- App Router (`src/app/`)
- Tailwind CSS 4
- Zustand (no persist — DB가 단일 진실원천)
- API 호출은 `packages/sdk/` 통해서만 (직접 fetch 금지)
- i18n: 한국어 / 영어 (절차서 1.2)

## SLO

- LCP ≤ 2.5s
- TTI ≤ 3.5s
- 크래시 없는 세션 99.5%
- 리포트 출고 p95 3초 (절차서 5.2 P1)

## 배포

- Cloudflare Pages 프로젝트: `chronoshealth` (CF 계정 `l2pamerica@gmail.com`)
- 임시 도메인: `chronoshealth.ever-day.com` (ADR 0006)
- GitHub: `johnnie010320-cmd/chronoshealth`

### ⚠️ 대시보드 "Deployments paused" 는 정상 상태 (장애 아님)

Pages 대시보드의 **"Deployments paused"** 배지는 배포 실패가 아니라 **GitHub 자동 배포를 의도적으로 꺼둔 상태**다
(`deployments_enabled=false`, `production_deployments_enabled=false`). 실제 배포는 전부 수동 업로드(`ad_hoc`)로 성공하고 있다.

**끄는 이유** — 이 프로젝트의 배포는 죠니 사전 승인 + 관리자 `releases` 개발로그 동기화가 필수인데,
push 마다 자동 배포되면 두 규칙을 모두 우회하게 된다.

**배포 방법 (유일)**

```bash
pnpm --filter web build          # apps/web/out 생성
cd apps/web
npx wrangler pages deploy out --project-name=chronoshealth --branch=master
```

`--branch=master` 가 프로덕션이다. 배포 후 analysis D1 `releases` 에 버전 기록.

**빌드 설정 주의** — 과거 설정이 `build_command=""`, `destination_dir="public"`, `root_dir="apps/web"` 로 잘못돼 있었다.
이 상태로 자동 배포를 재개하면 `apps/web/public`(이미지 2개뿐)이 사이트 전체로 발행되어 **프로덕션이 파괴된다**.
2026-07-20 에 아래 값으로 교정했다(자동 배포는 계속 중지 유지):

| 항목 | 값 |
|---|---|
| `root_dir` | `` (repo 루트 — pnpm workspace 의존성 설치 필요) |
| `build_command` | `pnpm --filter web build` |
| `destination_dir` | `apps/web/out` |

자동 배포를 켜려면 위 규칙(승인·devlog)을 어떻게 지킬지 먼저 정해야 한다.
