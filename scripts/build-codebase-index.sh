#!/usr/bin/env bash
# IJFW codebase indexer — MVP text-based index.
# Writes .ijfw/index/files.md with path, language, size, first meaningful line.
# Incremental: only rewrites if any source file changed since last build.
# Scout agent queries this instead of grepping the whole tree.
#
# Usage: bash scripts/build-codebase-index.sh [root]
# Default root: current directory.

IJFW_DIR=".ijfw"
INDEX_DIR="$IJFW_DIR/index"
INDEX_FILE="$INDEX_DIR/files.md"
STAMP="$INDEX_DIR/.last-build"

ROOT="${1:-.}"
mkdir -p "$INDEX_DIR" 2>/dev/null

# Skip if fresh (index newer than any source file in the last 60 seconds —
# this is a quick-run check; full incremental detection happens on save).
if [ -f "$STAMP" ] && [ -f "$INDEX_FILE" ]; then
  NEWER=$(find "$ROOT" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.rb" -o -name "*.java" -o -name "*.kt" -o -name "*.swift" -o -name "*.php" -o -name "*.md" \) -newer "$STAMP" -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/.next/*' -not -path '*/target/*' -not -path '*/.ijfw/*' 2>/dev/null | head -1)
  [ -z "$NEWER" ] && exit 0
fi

{
  echo "<!-- ijfw schema:1 codebase-index -->"
  echo "# Codebase index"
  echo ""
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || TZ=UTC date +%Y-%m-%dT%H:%M:%SZ)"
  echo "Root: $ROOT"
  echo ""
} > "$INDEX_FILE"

FILE_COUNT=0
BY_LANG=$(mktemp 2>/dev/null || echo "$INDEX_DIR/.lang-count")
: > "$BY_LANG"

# Find source files, categorized by extension.
find "$ROOT" -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
     -o -name "*.py" -o -name "*.rs" -o -name "*.go" -o -name "*.rb" \
     -o -name "*.java" -o -name "*.kt" -o -name "*.swift" -o -name "*.php" \
     -o -name "*.md" -o -name "*.sh" \) \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  -not -path '*/.next/*' \
  -not -path '*/target/*' \
  -not -path '*/.ijfw/*' \
  2>/dev/null | sort > "$INDEX_DIR/.files.tmp"

FILE_COUNT=$(wc -l < "$INDEX_DIR/.files.tmp" | tr -d ' ')

{
  echo "Files: $FILE_COUNT"
  echo ""
  echo "## By file"
  echo ""

  while IFS= read -r f; do
    [ -f "$f" ] || continue
    SIZE=$(wc -l < "$f" 2>/dev/null | tr -d ' ')
    EXT="${f##*.}"
    # First non-comment, non-blank line as a "what-is-this" hint.
    FIRSTLINE=$(grep -Ev '^[[:space:]]*(//|#|/\*|\*|--|"""|\*\*|$)' "$f" 2>/dev/null | head -1 | sed 's/["]/\\"/g' | cut -c1-120)
    echo "- \`$f\` ($SIZE lines, .$EXT) — ${FIRSTLINE:-<empty>}"
    echo "$EXT" >> "$BY_LANG"
  done < "$INDEX_DIR/.files.tmp"

  echo ""
  echo "## By language"
  sort "$BY_LANG" | uniq -c | sort -rn | head -20 | while read -r count ext; do
    echo "- .$ext: $count"
  done
} >> "$INDEX_FILE"

rm -f "$INDEX_DIR/.files.tmp" "$BY_LANG" 2>/dev/null
touch "$STAMP"

echo "Codebase indexed ($FILE_COUNT files)"
