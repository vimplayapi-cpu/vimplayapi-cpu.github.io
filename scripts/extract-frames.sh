#!/usr/bin/env bash
set -euo pipefail

VIDEO="${1:-src/hero.mp4}"
OUT="${2:-frames}"
FPS="${FPS:-30}"
QUALITY="${QUALITY:-75}"

if [[ ! -f "$VIDEO" ]]; then
  echo "Video not found: $VIDEO" >&2
  echo "Usage: ./scripts/extract-frames.sh ./src/hero.mp4" >&2
  exit 1
fi

mkdir -p "$OUT/1920w" "$OUT/960w"
rm -f "$OUT"/1920w/frame_*.webp "$OUT"/960w/frame_*.webp

echo "Extracting ${FPS}fps desktop frames…"
ffmpeg -hide_banner -loglevel error -y -i "$VIDEO" \
  -vf "fps=${FPS},scale=1920:-2:flags=lanczos" \
  -c:v libwebp -q:v "$QUALITY" -compression_level 6 -preset picture \
  "$OUT/1920w/frame_%04d.webp"

echo "Extracting mobile frames…"
ffmpeg -hide_banner -loglevel error -y -i "$VIDEO" \
  -vf "fps=${FPS},scale=960:-2:flags=lanczos" \
  -c:v libwebp -q:v "$QUALITY" -compression_level 6 -preset picture \
  "$OUT/960w/frame_%04d.webp"

FIRST="$OUT/1920w/frame_0001.webp"
if [[ ! -f "$FIRST" ]]; then
  echo "No frames were generated." >&2
  exit 1
fi

read -r WIDTH HEIGHT < <(identify -format '%w %h' "$FIRST" 2>/dev/null || printf '1920 1080')
COUNT=$(find "$OUT/1920w" -name 'frame_*.webp' | wc -l | tr -d ' ')
node -e "const fs=require('fs'); fs.writeFileSync('$OUT/manifest.json', JSON.stringify({frameCount:$COUNT,fps:$FPS,quality:$QUALITY,width:$WIDTH,height:$HEIGHT,sets:{desktop:'1920w',mobile:'960w'},generatedAt:new Date().toISOString()},null,2)+'\\n')"

echo "Generated $COUNT frames per set in $OUT/"
echo "Manifest: $OUT/manifest.json"
