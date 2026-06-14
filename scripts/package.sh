#!/usr/bin/env bash
# Chrome ウェブストアにアップロードする配布用 zip を作成する。
# 実行時に必要な runtime ファイルだけを含め、開発用ファイルは除外する。
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./manifest.json').version")
OUT="dist/chorus-${VERSION}.zip"

mkdir -p dist
rm -f "$OUT"

zip -r "$OUT" \
  manifest.json \
  popup.html \
  popup.js \
  background.js \
  src \
  icons/icon-16.png \
  icons/icon-32.png \
  icons/icon-48.png \
  icons/icon-128.png \
  -x '*/.DS_Store' >/dev/null

echo "Created $OUT"
unzip -l "$OUT"
