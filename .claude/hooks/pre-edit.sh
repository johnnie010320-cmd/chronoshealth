#!/usr/bin/env bash
# pre-edit hook (절차서 3.6)
# 민감 영역(개인정보·컴플라이언스·비밀) 편집 시도 시 경고

target="${1:-}"
[ -z "$target" ] && exit 0

# 민감 영역 패턴
sensitive_patterns=(
  '^services/identity/'
  '^docs/compliance/'
  '^infra/secrets/'
  '^contracts/.*Token\.sol$'
  '^contracts/.*RewardDistributor\.sol$'
  '^contracts/.*ZKVerifier\.sol$'
  '\.env'
)

for pattern in "${sensitive_patterns[@]}"; do
  if echo "$target" | grep -qE "$pattern"; then
    echo ""
    echo "🛑 민감 영역 편집 시도: $target"
    echo "   ─ 절차서 3.6 / 4.2: 사람 2명 리뷰 + 컴플라이언스 리뷰어(또는 솔리디티 감사관) 필수"
    echo "   ─ 권장: /spec 으로 명세 합의 후 진행"
    echo ""
    # Claude Code 실제 hooks 환경에서는 exit 1로 차단 가능
    # 일단 경고만 출력 (사용자가 의도 확인하도록)
    exit 0
  fi
done

exit 0
