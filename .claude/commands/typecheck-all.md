---
description: 전체 타입체크 실행 (Next.js + ML 타입 stub)
---

# /typecheck-all

```bash
npm run typecheck
```

- TypeScript strict 모드로 전체 스캔
- 오류 발견 시 파일경로:라인 형식으로 보고
- `any` 사용 발견 시 `unknown` 또는 구체 타입으로 교체 제안
