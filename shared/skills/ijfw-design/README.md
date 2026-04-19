# ijfw-design

First-class design intelligence for IJFW. Independently curated from public standards.

## Attribution

All knowledge bases are independently curated from:
- **WCAG 2.2** (W3C, 2023) -- accessibility rules, contrast requirements
- **Apple Human Interface Guidelines 2025** -- iOS/macOS/visionOS platform patterns
- **Material Design 3** (Google, 2022) -- Android and cross-platform patterns
- **W3C Standards** -- CSS, HTML, PWA, Internationalization
- **Baymard Institute** -- E-commerce and CRO UX research
- **Nielsen Norman Group** -- Usability heuristics and research
- **USWDS 3.0** -- US Web Design System
- **GOV.UK Design System** -- UK government accessibility standards
- **Diátaxis** -- Documentation structure framework
- **IBM Carbon Design System** -- Typography and data visualization
- **Vercel Geist** -- Developer font system

Structure and CLI shape inspired by the excellent **ui-ux-pro-max** and **frontend-design** Claude Code plugins. Data is independently curated -- not copied.

## Usage

```bash
# Full design system recommendation
node scripts/search.js "developer dashboard data-dense" --design-system -p "MyProject"

# Search specific domain
node scripts/search.js "accessibility" --domain ux -n 15
node scripts/search.js "" --domain color -n 70
node scripts/search.js "" --domain style -n 55

# Explain reasoning
node scripts/search.js "healthcare app" --design-system --explain

# ASCII box output
node scripts/search.js "saas landing" --design-system -f box

# Route with dispatcher (detects installed skills)
bash scripts/dispatch.sh "marketing landing" --design-system

# Force internal (skip external skills)
IJFW_PREFER_INTERNAL=1 bash scripts/dispatch.sh "dashboard" --design-system

# Log design pass to observation ledger
bash scripts/design-pass.sh "dashboard redesign" "cockpit" "slate-pro" "internal"
```

## Domains

| Domain | Flag | Rows | Coverage |
|--------|------|------|----------|
| styles | `--domain style` | 55 | 15 categories: minimal, dashboard, landing, editorial, native-platform, glass, dark/light mode, brutalist, experimental, data-dense, content-first, multi-platform |
| palettes | `--domain color` | 62 | By product type: SaaS, dev tools, finance, healthcare, education, consumer, startup, enterprise, AI, accessibility |
| typography | `--domain typography` | 30 | System-first stacks; web-optional with self-host notes; accessibility-first options |
| ux | `--domain ux` | 101 | WCAG AA/AAA, Apple HIG, Material Design 3, IJFW-specific; organized by priority |
| charts | `--domain charts` | 17 | Accessibility grade per chart type; fallback requirements |
| patterns | `--domain patterns` | 32 | Product-type reasoning with anti-patterns |
| reasoning | internal | 28 | Style-to-product matching rules with confidence levels |

## Extending

- Add rows to any CSV. All columns must include `source` with the public standard citation.
- New style categories: add to `styles.csv` with a new `category` value.
- New palettes: verify WCAG contrast before adding; set `wcag_level` accurately.
- New reasoning rules: add to `reasoning.csv`; set `confidence` to HIGH/MEDIUM/LOW.

## IJFW Invariants (always enforced)

1. Zero runtime deps -- system font stacks first
2. Positive framing -- no "error" / "not found" / "broken" in any output
3. Platform segregation -- Claude/Codex/Gemini output areas color-coded
4. WCAG AA minimum -- 4.5:1 contrast; 44px touch targets
5. ASCII-only source -- no unicode in code or config
6. Every rule cites its public standard source
