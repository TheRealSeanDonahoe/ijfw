#!/usr/bin/env bash
# IJFW SessionStart — detect environment, migrate existing tools, load memory
set -euo pipefail

IJFW_DIR=".ijfw"
IJFW_GLOBAL="$HOME/.ijfw"
MIGRATED_FLAG="$IJFW_DIR/.migrated"

mkdir -p "$IJFW_DIR/memory" "$IJFW_DIR/sessions" "$IJFW_DIR/index"
mkdir -p "$IJFW_GLOBAL/memory" 2>/dev/null || true

# Clear startup flags from previous session
> "$IJFW_DIR/.startup-flags" 2>/dev/null || true

# ============================================================
# DETECT MODE & EFFORT
# ============================================================
MODE="${IJFW_MODE:-smart}"
EFFORT="${CLAUDE_CODE_EFFORT_LEVEL:-high}"

UPGRADED_EFFORT=""
if [ "$EFFORT" = "medium" ]; then
  export CLAUDE_CODE_EFFORT_LEVEL="high"
  EFFORT="high"
  UPGRADED_EFFORT="Upgraded thinking depth"
fi

# ============================================================
# DETECT ROUTING ENVIRONMENT
# ============================================================
ROUTING=""
OLLAMA_AVAILABLE=""

# OpenRouter
if [ -n "${OPENROUTER_API_KEY:-}" ] || [[ "${ANTHROPIC_BASE_URL:-}" == *"openrouter"* ]]; then
  ROUTING="OpenRouter multi-model"
fi

# Claude Code Router
if [ -f "$HOME/.claude-code-router/config.json" ] || pgrep -f "claude-code-router" > /dev/null 2>&1; then
  [ -z "$ROUTING" ] && ROUTING="smart model routing" || ROUTING="$ROUTING"
fi

# Ollama
if curl -sf --max-time 0.5 --connect-timeout 0.5 http://localhost:11434/api/tags > /dev/null 2>&1; then
  OLLAMA_AVAILABLE="1"
  [ -z "$ROUTING" ] && ROUTING="local model" || ROUTING="$ROUTING + local model"
fi

# LM Studio
if [ -z "$OLLAMA_AVAILABLE" ] && curl -sf --max-time 0.5 --connect-timeout 0.5 http://localhost:1234/v1/models > /dev/null 2>&1; then
  [ -z "$ROUTING" ] && ROUTING="local model" || ROUTING="$ROUTING + local model"
fi

ROUTING_STR=""
[ -n "$ROUTING" ] && ROUTING_STR=" | $ROUTING"

# ============================================================
# DETECT & MIGRATE EXISTING PLUGINS (first run only)
# ============================================================
MIGRATION_MSGS=()

if [ ! -f "$MIGRATED_FLAG" ]; then

  # --- claude-mem: SQLite observation database ---
  if command -v sqlite3 > /dev/null 2>&1; then
    for DB_CANDIDATE in "$HOME/.claude-mem/observations.db" "$HOME/.claude-mem/claude-mem.db"; do
      if [ -f "$DB_CANDIDATE" ]; then
        OBS_COUNT=$(sqlite3 "$DB_CANDIDATE" "SELECT COUNT(*) FROM observations;" 2>/dev/null || echo "0")
        if [ "$OBS_COUNT" -gt 0 ]; then
          sqlite3 "$DB_CANDIDATE" \
            "SELECT content FROM observations ORDER BY created_at DESC LIMIT 100;" 2>/dev/null | \
            while IFS= read -r line; do
              echo "- **observation** [imported]: $line" >> "$IJFW_DIR/memory/project-journal.md"
            done 2>/dev/null || true

          sqlite3 "$DB_CANDIDATE" \
            "SELECT summary FROM sessions WHERE summary IS NOT NULL ORDER BY created_at DESC LIMIT 20;" 2>/dev/null | \
            while IFS= read -r line; do
              echo "- **session** [imported]: $line" >> "$IJFW_DIR/memory/knowledge.md"
            done 2>/dev/null || true

          MIGRATION_MSGS+=("Imported $OBS_COUNT observations from existing memory")
        fi
        break
      fi
    done
  fi

  # --- memsearch: daily markdown memory files ---
  if [ -d ".memsearch/memory" ]; then
    MEM_FILES=$(find ".memsearch/memory" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$MEM_FILES" -gt 0 ]; then
      for f in .memsearch/memory/*.md; do
        echo "" >> "$IJFW_DIR/memory/project-journal.md"
        echo "## Imported: $(basename "$f" .md)" >> "$IJFW_DIR/memory/project-journal.md"
        head -20 "$f" >> "$IJFW_DIR/memory/project-journal.md" 2>/dev/null || true
      done
      MIGRATION_MSGS+=("Imported $MEM_FILES days of session history")
    fi
  fi

  # --- MemPalace: ChromaDB-based (needs Python to read) ---
  if [ -d "$HOME/.mempalace" ]; then
    echo "IJFW_MIGRATE_MEMPALACE=1" >> "$IJFW_DIR/.startup-flags"
    MIGRATION_MSGS+=("MemPalace history available for enrichment")
  fi

  # --- Memorix: JSON-based cross-agent memory ---
  for MX_CANDIDATE in ".memorix" "node_modules/.memorix"; do
    if [ -f "$MX_CANDIDATE/memories.json" ]; then
      MX_COUNT=$(python3 -c "
import json
try:
    data = json.load(open('$MX_CANDIDATE/memories.json'))
    mems = data if isinstance(data, list) else data.get('memories', [])
    print(len(mems))
except: print(0)
" 2>/dev/null || echo "0")

      if [ "$MX_COUNT" -gt 0 ]; then
        python3 -c "
import json
try:
    data = json.load(open('$MX_CANDIDATE/memories.json'))
    mems = data if isinstance(data, list) else data.get('memories', [])
    for m in mems[:50]:
        content = str(m.get('content', m.get('text', str(m))))[:200]
        mtype = m.get('type', 'observation')
        print(f'- **{mtype}** [imported]: {content}')
except: pass
" >> "$IJFW_DIR/memory/project-journal.md" 2>/dev/null || true
        MIGRATION_MSGS+=("Imported $MX_COUNT memories from cross-agent store")
      fi
      break
    fi
  done

  # --- Claude Auto Memory: built-in MEMORY.md files ---
  CLAUDE_MEM_DIR="$HOME/.claude/projects"
  if [ -d "$CLAUDE_MEM_DIR" ]; then
    # Find MEMORY.md files for current project
    PROJECT_ID=$(basename "$(pwd)" | tr ' ' '_')
    for mem_file in "$CLAUDE_MEM_DIR"/*"$PROJECT_ID"*/memory/MEMORY.md; do
      if [ -f "$mem_file" ]; then
        head -50 "$mem_file" >> "$IJFW_DIR/memory/project-journal.md" 2>/dev/null || true
        MIGRATION_MSGS+=("Enriched with Claude's native project memory")
        break
      fi
    done 2>/dev/null || true
  fi

  # --- RTK: defer tool stripping to RTK if present ---
  if command -v rtk > /dev/null 2>&1 || [ -f "$HOME/.config/rtk/config.toml" ]; then
    echo "IJFW_RTK_ACTIVE=1" >> "$IJFW_DIR/.startup-flags"
  fi

  # --- context-mode: defer PreToolUse to context-mode if present ---
  if [ -d ".claude/plugins/context-mode" ] || grep -q "context-mode" "$HOME/.claude/settings.json" 2>/dev/null; then
    echo "IJFW_CONTEXT_MODE_ACTIVE=1" >> "$IJFW_DIR/.startup-flags"
  fi

  # --- caveman: coexists silently, no action needed ---
  # IJFW core skill supersedes caveman output rules. No conflict.

  # Mark migration complete
  echo "migrated=$(date +%Y-%m-%d)" > "$MIGRATED_FLAG"
fi

# ============================================================
# GENERATE CLAUDE.md IF NEEDED
# ============================================================
PROJECT_TYPE=""
if [ ! -f "CLAUDE.md" ] && [ ! -f ".claude/CLAUDE.md" ]; then
  if [ -f "package.json" ]; then
    PROJECT_TYPE=$(python3 -c "
import json
try:
    p = json.load(open('package.json'))
    deps = list(p.get('dependencies', {}).keys()) + list(p.get('devDependencies', {}).keys())
    fw = 'Next.js' if 'next' in deps else 'React' if 'react' in deps else 'Vue' if 'vue' in deps else 'Express' if 'express' in deps else 'Node.js'
    lang = 'TypeScript' if any('typescript' in d for d in deps) else 'JavaScript'
    print(f'{fw} / {lang}')
except: print('Node.js')
" 2>/dev/null || echo "Node.js")
  elif [ -f "pyproject.toml" ] || [ -f "setup.py" ] || [ -f "requirements.txt" ]; then
    PROJECT_TYPE="Python"
    [ -f "pyproject.toml" ] && grep -q "django" "pyproject.toml" 2>/dev/null && PROJECT_TYPE="Django / Python"
    [ -f "pyproject.toml" ] && grep -q "fastapi" "pyproject.toml" 2>/dev/null && PROJECT_TYPE="FastAPI / Python"
    [ -f "pyproject.toml" ] && grep -q "flask" "pyproject.toml" 2>/dev/null && PROJECT_TYPE="Flask / Python"
  elif [ -f "Cargo.toml" ]; then
    PROJECT_TYPE="Rust"
  elif [ -f "go.mod" ]; then
    PROJECT_TYPE="Go"
  elif [ -f "Gemfile" ]; then
    PROJECT_TYPE="Ruby on Rails"
    grep -q "rails" "Gemfile" 2>/dev/null || PROJECT_TYPE="Ruby"
  elif [ -f "pom.xml" ]; then
    PROJECT_TYPE="Java / Maven"
  elif [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
    PROJECT_TYPE="Java / Gradle"
  elif [ -f "composer.json" ]; then
    PROJECT_TYPE="PHP"
    grep -q "laravel" "composer.json" 2>/dev/null && PROJECT_TYPE="Laravel / PHP"
  elif [ -f "Package.swift" ]; then
    PROJECT_TYPE="Swift"
  fi

  if [ -n "$PROJECT_TYPE" ]; then
    echo "IJFW_NEEDS_SUMMARIZE=1" >> "$IJFW_DIR/.startup-flags"
  fi
fi

# ============================================================
# CHECK CLAUDE.MD COMPRESSION
# ============================================================
NEEDS_COMPRESS=""
if [ -f "CLAUDE.md" ]; then
  CLAUDE_MD_LINES=$(wc -l < "CLAUDE.md" 2>/dev/null || echo "0")
  if [ "$CLAUDE_MD_LINES" -gt 100 ] && [ ! -f "CLAUDE.md.original.md" ]; then
    echo "IJFW_NEEDS_COMPRESS=1" >> "$IJFW_DIR/.startup-flags"
    NEEDS_COMPRESS="1"
  fi
fi

# ============================================================
# COUNT MEMORY STATE
# ============================================================
SESSION_COUNT=$(ls "$IJFW_DIR/sessions/" 2>/dev/null | wc -l | tr -d ' ')
DECISION_COUNT=0
[ -f "$IJFW_DIR/memory/project-journal.md" ] && \
  DECISION_COUNT=$(grep -c "^- " "$IJFW_DIR/memory/project-journal.md" 2>/dev/null || echo "0")

# ============================================================
# BUILD STARTUP REPORT — Positive framing only
# ============================================================
echo "━━━ IJFW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$MODE mode | $EFFORT effort$ROUTING_STR"
echo ""

# Upgrades applied
[ -n "$UPGRADED_EFFORT" ] && echo "$UPGRADED_EFFORT"

# Migration results (positive framing — "imported", "enriched")
for msg in "${MIGRATION_MSGS[@]+"${MIGRATION_MSGS[@]}"}"; do
  [ -n "$msg" ] && echo "$msg"
done

# Project context created
if [ -n "$PROJECT_TYPE" ] && [ ! -f "CLAUDE.md" ] && [ ! -f ".claude/CLAUDE.md" ]; then
  echo "Optimised project context created ($PROJECT_TYPE)"
fi

# Compression applied
[ -n "$NEEDS_COMPRESS" ] && echo "Project context optimised for efficiency"

# Memory loaded
if [ "$SESSION_COUNT" -gt 0 ] || [ "$DECISION_COUNT" -gt 0 ]; then
  echo "Memory loaded ($SESSION_COUNT sessions, $DECISION_COUNT decisions)"
fi

# Handoff continuation
if [ -f "$IJFW_DIR/memory/handoff.md" ]; then
  LAST_STATUS=$(grep -A1 "### Status" "$IJFW_DIR/memory/handoff.md" 2>/dev/null | tail -1 | sed 's/^[[:space:]]*//')
  NEXT_STEP=$(grep -A1 "### Next Steps" "$IJFW_DIR/memory/handoff.md" 2>/dev/null | tail -1 | sed 's/^[[:space:]]*//' | sed 's/^[0-9]*\. //')
  [ -n "$LAST_STATUS" ] && echo "Last session: $LAST_STATUS"
  [ -n "$NEXT_STEP" ] && echo "Next: $NEXT_STEP"
fi

# Codebase index
if [ -f "$IJFW_DIR/index/codebase.db" ] && command -v sqlite3 > /dev/null 2>&1; then
  INDEX_COUNT=$(sqlite3 "$IJFW_DIR/index/codebase.db" "SELECT COUNT(*) FROM files;" 2>/dev/null || echo "0")
  [ "$INDEX_COUNT" -gt 0 ] && echo "Codebase indexed ($INDEX_COUNT files)"
elif [ ! -f "$IJFW_DIR/index/codebase.db" ]; then
  echo "IJFW_NEEDS_INDEX=1" >> "$IJFW_DIR/.startup-flags" 2>/dev/null || true
fi

# Dream cycle trigger
if [ "$SESSION_COUNT" -gt 0 ] && [ $(( SESSION_COUNT % 5 )) -eq 0 ]; then
  echo "IJFW_NEEDS_CONSOLIDATE=1" >> "$IJFW_DIR/.startup-flags"
fi

echo ""
echo "Ready."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
