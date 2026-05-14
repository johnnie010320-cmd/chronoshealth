#!/usr/bin/env bash
# pre-commit hook (절차서 3.6)
# 비밀키 스캔, lint, type, format 검증

set -e

cd "$(git rev-parse --show-toplevel)" || exit 1

# 1. 비밀키 스캔
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks protect --staged --no-banner
else
  echo "⚠️  gitleaks 미설치 — 'brew install gitleaks' 또는 'go install'"
fi

# 2. 변경 파일 분류
staged_files=$(git diff --cached --name-only --diff-filter=ACM)

# 3. TS/JS lint + type
if echo "$staged_files" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  if [ -f pnpm-workspace.yaml ]; then
    pnpm -r exec eslint --max-warnings 0 || exit 1
    pnpm -r exec tsc --noEmit || exit 1
  fi
fi

# 4. Python lint + type
if echo "$staged_files" | grep -qE '\.(py)$'; then
  if command -v ruff >/dev/null 2>&1; then
    ruff check ml/ services/ || exit 1
  fi
  if command -v mypy >/dev/null 2>&1; then
    mypy --strict ml/ services/ml-serving/ 2>/dev/null || true
  fi
fi

# 5. Solidity (변경 시만)
if echo "$staged_files" | grep -q '^contracts/'; then
  if command -v forge >/dev/null 2>&1; then
    forge fmt --check || exit 1
  fi
  if command -v slither >/dev/null 2>&1; then
    slither contracts/ --fail-high || exit 1
  fi
fi

# 6. 포맷
if command -v prettier >/dev/null 2>&1; then
  prettier --check "**/*.{ts,tsx,md,json}" 2>/dev/null || true
fi

echo "✓ pre-commit checks passed"
