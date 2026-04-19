<!-- IJFW: narration-not-applicable -->
---
name: ijfw-compress
description: "Compress memory/context files into terse form. Trigger: /compress, compress file"
---

Compress the target file. Preserve all meaning. Reduce tokens.

Rules:
- Drop: articles (a/an/the), filler (just/really/basically), hedging, pleasantries.
- Fragments OK. Short synonyms (big not extensive, fix not implement a solution).
- Arrows for causality (X → Y).
- Abbreviate common terms (DB/auth/config/req/res/fn/impl/env/deps).
- Preserve EXACTLY: code blocks, URLs, file paths, commands, headings, dates, versions, technical terms.
- Only compress prose. Never touch code.

Process:
1. Back up: cp <file> <file>.original.md
2. Compress prose sections.
3. Validate: all headings preserved, all code blocks intact, all URLs unchanged.
4. Report savings: "Compressed: 1,847 -> 923 tokens (50% saved -- approx $0.01-0.02 per session at Sonnet input pricing)"
