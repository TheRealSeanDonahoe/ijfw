---
name: consolidate
description: "Run memory consolidation (dream cycle). Promotes patterns, prunes stale data, reconciles contradictions."
---

Run the IJFW dream cycle on project memory.

1. Read all session journals from .ijfw/sessions/
2. Read current knowledge base from .ijfw/memory/knowledge.md
3. Identify patterns that repeat across 3+ sessions → promote to knowledge base
4. Detect contradictions (old decision vs recent behaviour) → reconcile with temporal weighting
5. Prune session journal entries older than 14 days (archive, don't delete)
6. Compress knowledge base — deduplicate, merge related entries
7. Optionally promote universal knowledge to ~/.ijfw/memory/global-knowledge.md
8. Report: entries promoted, pruned, reconciled, new knowledge base size

Uses architect agent for deep analysis. Cost: ~5-10K tokens.
Runs automatically after every 5 sessions in smart mode.
