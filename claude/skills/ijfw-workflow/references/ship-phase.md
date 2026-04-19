# Ship Phase -- Reference Detail

This file provides detail for Steps 7-8 in SKILL.md.
SKILL.md is the enforcer. This file is supplementary.

---

## Step 7: VERIFY

### Internal verification (run first, every time)

Run the actual commands -- evidence before claims:
```
- [ ] Tests pass (run: [test command])
- [ ] Linter clean (run: [lint command])
- [ ] Build succeeds (run: [build command])
```

Show output inline. **Never claim "tests pass" without running them.** Evidence before assertions.
Verify against the **brief** (`.ijfw/memory/brief.md`), not just the plan -- tasks can pass while brief goals miss.

### Second Opinion on build

Check CLI availability: `command -v codex gemini`. Fire only those that exist.
When clean: `Second Opinion reviewed your build -- all clear.`
When findings: `Second Opinion surfaced [N] points to consider. Address now?`
If explicitly turned off ("no reviews"): skip silently.

---

## Step 8: SHIP

### Options -- use AskUserQuestion (or plain text if unavailable)

```json
AskUserQuestion({
  "questions": [{
    "question": "Ready to ship. How?",
    "header": "Ship",
    "multiSelect": false,
    "options": [
      { "label": "Create PR (Recommended)", "description": "Keeps history clean, enables review" },
      { "label": "Merge locally", "description": "Fast, direct merge to current branch" },
      { "label": "Keep branch", "description": "I'll ship later -- just save the work" },
      { "label": "Deploy", "description": "Deploy to [detected environment]" }
    ]
  }]
})
```

### Handoff to memory

Write `.ijfw/memory/handoff.md`:
```
# Handoff: [timestamp]
Problem: [original ask]
Solution: [what was built]
Decisions: [key choices + rationale]
Lessons: [captured corrections]
Next: [suggested follow-on tasks]
```

### Session receipt

End with: `You went from [original problem] to [shipped solution] in [total time].`

---

## COMPACTION GATE (final)

Final write to `.ijfw/state/workflow-context.md`:
```
# Workflow Context
Phase: Complete
Shipped: [what]
Handoff: .ijfw/memory/handoff.md
Lessons promoted: [N]
```

Update `.ijfw/state/workflow.json` with `"status": "complete"`.
