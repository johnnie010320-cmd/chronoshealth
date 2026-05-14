---
description: 현재 변경사항을 커밋하고 master에 푸시 (twowinz 워크플로 동일)
---

# /commit-push-pr

## 수행 단계

1. `git status` 로 변경 파일 확인
2. 변경 내용에 맞는 커밋 메시지 작성 (한글, 동사 시작)
   - 예: `feat: 웨어러블 데이터 입력 폼 추가`
   - 예: `fix: bio age 계산 시 음수 방어 코드`
   - 예: `chore: tailwind 4 업그레이드`
3. `git add` (특정 파일만, `-A` 금지)
4. `git commit -m "메시지"` (Co-Authored-By 첨부)
5. `git push origin master`

## 금지

- `--no-verify`
- `--force`
- `.env*` 파일 커밋
- 비밀키 / 토큰이 포함된 파일 커밋
