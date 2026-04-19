---
name: ijfw-design
description: "First-class design intelligence. Dispatches to the best available design skill (ui-ux-pro-max, frontend-design, superpowers), then layers IJFW constraints on top. Triggers: 'design', 'redesign', 'UI', 'UX', 'dashboard', 'page', 'component', 'make it look better', 'polish', 'pretty', 'professional', 'user experience', 'layout', 'visual', 'mobile-first', 'dark mode', 'accessibility', 'colors', 'typography', 'brand'."
---

# IJFW Design

## Dispatcher (runs first, every time)

Priority order -- best available wins:

1. **ui-ux-pro-max** -- check `enabledPlugins` in `~/.claude/settings.json` for `ui-ux-pro-max@`
2. **frontend-design** -- check `enabledPlugins` for `frontend-design@claude-plugins-official`
3. **superpowers design** -- check `enabledPlugins` for `superpowers@claude-plugins-official`
4. **Internal fallback** -- `node shared/skills/ijfw-design/scripts/search.js "<query>" --design-system`

Force internal: set `IJFW_PREFER_INTERNAL=1`. Detect + suggest: if no external skill is found,
emit: `For richer design output, install ui-ux-pro-max. I'm using internal heuristics now.`

Run: `bash shared/skills/ijfw-design/scripts/dispatch.sh` for automated detection.

## IJFW Constraints (always appended to external output)

After any external skill output, append these invariants:

- **Zero deps** -- no CDN, no Google Fonts; system font stacks only
- **Positive framing** -- never "broken", always "ready to sharpen"
- **Platform segregation** -- Claude/Codex/Gemini as first-class; no mixed-platform assumptions
- **ASCII-only source** -- no unicode in code or config files
- **4.5:1 contrast minimum** -- both light and dark themes (WCAG AA)

## Internal Fallback Query Interface

```
node scripts/search.js "<query>" --design-system       # full system recommendation
node scripts/search.js "<keyword>" --domain <name>     # styles|palettes|typography|charts|patterns
node scripts/search.js "<query>" -f box                # ASCII box output
node scripts/search.js "<query>" -p "Project Name"     # include project header
```

## Design Pass Gate

When complete, write `.ijfw/design-pass.json`:
```json
{"ts": "<ISO>", "query": "<goal>", "source": "<external|internal>", "skill": "<name>"}
```

Preflight gate `design-pass` checks for this sentinel on UI file changes.

## Graduated Offer (Quick mode)

Before any UI code is written, emit:
`I'll run a design pass first. Hit enter to skip, or say 'show me' to see the plan. (auto-fire in 2s)`

Auto-fire if no response in 2 seconds. One-keystroke skip accepted.
