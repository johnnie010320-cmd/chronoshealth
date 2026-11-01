#!/usr/bin/env bash
# VITAcode Android 릴리스 빌드 (난독화 + 버전명 보존 사본).
#   사용: bash scripts/build-android.sh          # AAB (Play 업로드용)
#         bash scripts/build-android.sh apk      # APK (직접 설치 시험용)
#   결과: dist/vitacode-<version>.aab|.apk  +  dist/symbols/vitacode-<version>/
#   - 같은 버전 파일이 이미 있으면 중단한다 (덮어쓰기·번호 재사용 금지, 이전 빌드 보존).
#   - dist/ 는 gitignore. 심볼 폴더는 난독화된 크래시 기록을 읽을 때 필요하므로 지우지 말 것.
#   - 빌드는 죠니가 요청할 때만, 버전은 죠니가 정한 번호로 (pubspec.yaml version).
set -euo pipefail

cd "$(dirname "$0")/.."  # → apps/mobile/

KIND="${1:-aab}"
case "$KIND" in
  aab) TARGET=appbundle; SRC_GLOB="build/app/outputs/bundle/release/*.aab" ;;
  apk) TARGET=apk;       SRC_GLOB="build/app/outputs/flutter-apk/app-release.apk" ;;
  *) echo "사용: $0 [aab|apk]" >&2; exit 2 ;;
esac

VER=$(grep '^version:' pubspec.yaml | sed 's/version:[[:space:]]*//' | tr -d '[:space:]')
[ -n "$VER" ] || { echo "pubspec.yaml 에서 version 을 못 찾음" >&2; exit 1; }
OUT="dist/vitacode-${VER}.${KIND}"
SYMDIR="dist/symbols/vitacode-${VER}"

echo "=== VITAcode Android ${KIND} 빌드: ${VER} ==="

if [ -e "$OUT" ]; then
  echo "중단: ${OUT} 이 이미 있습니다. pubspec.yaml 의 빌드번호를 올린 뒤 다시 실행하세요." >&2
  exit 1
fi
if [ ! -f android/key.properties ]; then
  echo "중단: android/key.properties (업로드 키 chronoshealth-2026.jks, 비밀번호 ~/.chronos-secrets/android_upload_key.txt) 가 없습니다." >&2
  exit 1
fi

mkdir -p "$SYMDIR"
flutter build "$TARGET" --release --obfuscate --split-debug-info="$SYMDIR"

SRC=$(ls -t $SRC_GLOB 2>/dev/null | head -1 || true)
[ -n "$SRC" ] && [ -f "$SRC" ] || { echo "빌드 산출물을 찾지 못함: $SRC_GLOB" >&2; exit 1; }

mkdir -p dist
cp -n "$SRC" "$OUT"
echo "=== 보존 사본 ==="
md5sum "$SRC" "$OUT"
echo "=== dist 보관 현황 (이전 버전 유지) ==="
ls -1 dist/
echo "완료: ${OUT}  (심볼: ${SYMDIR})"
