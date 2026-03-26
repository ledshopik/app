#!/bin/bash
# Auto-increment version.json after git push
# Called by Claude Code PostToolUse hook

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Only trigger on git push (not on our own version push)
if ! echo "$CMD" | grep -q 'git push'; then exit 0; fi
if echo "$CMD" | grep -q 'Auto-update version'; then exit 0; fi

cd /Users/LEDshopik/app || exit 0

DATE=$(date +%Y.%m.%d)
LAST=$(jq -r '.version' version.json 2>/dev/null || echo "")

if echo "$LAST" | grep -q "^${DATE}\."; then
  N=$(echo "$LAST" | sed "s/^${DATE}\.\([0-9]*\)/\1/")
  N=$((N + 1))
else
  N=1
fi

NOTE=$(git log -1 --format=%s)
echo "{\"version\":\"${DATE}.${N}\",\"note\":\"${NOTE}\"}" > version.json
git add version.json
git commit -m "Auto-update version.json: ${DATE}.${N}" --no-verify
git push origin main
