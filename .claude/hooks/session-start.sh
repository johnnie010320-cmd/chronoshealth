#!/usr/bin/env bash
# session-start hook (절차서 3.6, 10.2)
# 세션 시작 시 컨텍스트 자동 주입

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

echo "════════════════════════════════════════"
echo "  Chronos Health — Session Start"
echo "════════════════════════════════════════"

# 1. 현재 단계 (CLAUDE.md에서 추출)
if [ -f CLAUDE.md ]; then
  stage=$(grep -A1 '^## 현재 단계' CLAUDE.md | tail -1 | sed 's/\*\*//g')
  [ -n "$stage" ] && echo "📍 현재 단계: $stage"
fi

# 2. 어제 머지된 PR
echo ""
echo "📋 어제 머지된 PR"
if command -v gh >/dev/null 2>&1; then
  yesterday=$(date -d 'yesterday' '+%Y-%m-%d' 2>/dev/null || date -v-1d '+%Y-%m-%d' 2>/dev/null)
  gh pr list --state merged --search "merged:>=$yesterday" --limit 5 2>/dev/null || echo "  (gh 인증 필요 또는 신규 저장소)"
else
  echo "  (gh CLI 미설치)"
fi

# 3. 최근 ADR 3개
echo ""
echo "📜 최근 ADR"
if [ -d docs/adr ]; then
  ls -t docs/adr/*.md 2>/dev/null | head -3 | sed 's|^|  - |'
else
  echo "  (docs/adr/ 없음)"
fi

# 4. 미해결 spec
echo ""
echo "📝 In Review / Draft 명세"
if [ -d docs/spec ]; then
  grep -l 'Status.*Draft\|Status.*In Review' docs/spec/*.md 2>/dev/null | sed 's|^|  - |' || echo "  (해당 없음)"
fi

# 5. 작업 규범 리마인더
echo ""
echo "✋ 작업 시작 전:"
echo "  1. docs/work-procedure.txt 현재 단계 확인"
echo "  2. /spec 또는 ADR로 근거 확보"
echo "  3. Plan Mode → 사람 승인 → TDD"
echo "════════════════════════════════════════"
