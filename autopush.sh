#!/bin/bash
# Auto-push: sleduje změny v HTML/CSS/JS souborech a automaticky commitne + pushne
# Spuštění: ./autopush.sh
# Ukončení: Ctrl+C

cd "$(dirname "$0")"

echo "🔄 Sleduju změny v $(pwd)..."
echo "   Ctrl+C pro ukončení"

fswatch -o -e ".*" -i "\\.html$" -i "\\.css$" -i "\\.js$" -i "\\.json$" . | while read; do
  sleep 1
  git add -A
  CHANGES=$(git diff --cached --stat)
  if [ -n "$CHANGES" ]; then
    MSG="Auto-deploy: $(date '+%H:%M:%S')"
    git commit -m "$MSG"
    git push
    echo "✅ $MSG — pushed"
  fi
done
