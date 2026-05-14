---
description: ESLint + Prettier 자동 수정
---

# /lint-fix

```bash
npm run lint -- --fix
npx prettier --write "src/**/*.{ts,tsx,md}"
```

- 자동 수정 후 변경 파일 목록 출력
- 자동 수정 불가능한 항목은 따로 보고
