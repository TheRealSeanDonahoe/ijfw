---
name: ijfw-summarize
description: "Generate optimised project context from codebase scan. Trigger: new project, no CLAUDE.md, /ijfw-summarize"
context: fork
model: haiku
effort: low
---

Scan the codebase and generate an optimised project context file.

## Process

1. Read: package.json, tsconfig.json, Cargo.toml, pyproject.toml, go.mod, Dockerfile,
   docker-compose.yml, .env.example, Makefile — whatever exists.
2. Scan: directory structure (2 levels deep), test framework, linter config, CI config.
3. Detect: language, framework, database, ORM, auth approach, deployment target.
4. Identify: key directories, entry points, API route patterns, shared utilities.

## Output

Write a CLAUDE.md (or platform equivalent) with:

```markdown
# Project Context

Stack: <framework> / <language> / <database>
Architecture: <pattern — monolith, microservices, serverless, etc.>
Entry: <main entry point(s)>
Tests: <framework + command to run>
Lint: <tool + command>

## Structure
<key directories and their purpose, 1 line each>

## Patterns
<established code patterns to follow, 1 line each>

## Key Files
<important files a new contributor should know about>
```

Rules:
- Max 50 lines. This loads every session.
- No boilerplate explanations. Just facts.
- If uncertain about a pattern, omit it — don't guess.
