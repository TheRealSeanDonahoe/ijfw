# Team Templates

Used by BUILD TEAM step. Pick domain template, apply scale rules, add risk specialists.

---

## Domain Templates

### Software
- [Opus] Architect -- system design, API contracts, data model
- [Sonnet] Builder -- general implementation (scale: x1 minimal, x2 standard, x3 full)
- [Sonnet] QA -- test strategy, edge cases, coverage
- [Haiku] Scout -- file exploration, dependency checks, pattern mapping
- [Sonnet] DevOps -- CI/CD, deployment, infra (standard+)
- [Opus] Security Specialist -- auth, data handling, threat model (if risk: auth/payment)

### Book / Long-form Writing
- [Opus] Story Architect -- structure, arc, chapter outline
- [Sonnet] Prose Stylist -- voice, tone, sentence-level craft
- [Sonnet] Continuity Editor -- facts, timeline, character consistency
- [Haiku] Researcher -- source lookup, fact verification

### Campaign / Marketing
- [Opus] Strategist -- positioning, audience, channel mix
- [Sonnet] Copywriter -- headlines, body, CTAs
- [Sonnet] SEO Specialist -- keyword strategy, meta, structure (standard+)
- [Sonnet] Social Media -- platform-native formats, scheduling (standard+)

### Design / UI
- [Opus] Creative Director -- concept, direction, design principles
- [Sonnet] UX Designer -- flows, wireframes, interaction patterns
- [Sonnet] UI Designer -- visual design, component spec, style guide
- [Haiku] Scout -- existing component audit, pattern mapping

### Business / Strategy
- [Opus] Strategist -- market analysis, competitive landscape, positioning
- [Sonnet] Analyst -- data synthesis, financial modeling, metrics
- [Sonnet] Communicator -- decks, memos, stakeholder narratives

---

## Scale Rules

| Task count | Scale | Builders |
|------------|-------|----------|
| < 5 tasks | Minimal | Core roles only (architect + 1 builder + scout) |
| 5-15 tasks | Standard | Full domain template |
| > 15 tasks | Full | Full template + parallel builder tracks |

---

## Risk Additions (auto-add to any team when brief mentions)

| Brief mentions | Add specialist |
|----------------|---------------|
| auth, login, sessions, OAuth | [Opus] Security Specialist |
| payment, billing, Stripe, PCI | [Opus] Security Specialist |
| performance, scale, load, latency | [Sonnet] DevOps / Performance |
| accessibility, a11y, WCAG | [Sonnet] Accessibility Reviewer |
| public launch, press, announcement | [Sonnet] Communicator |

---

## Presentation format

Always present with "because" rationale tied to the brief:
```
Based on your requirements, here's the team:

- [Opus] Security Architect -- your brief mentions auth flow and user data
- [Sonnet] Builder x2 -- core implementation, parallel tracks
- [Haiku] Scout -- maps existing components before Builder starts
- [Sonnet] QA -- test strategy for the OAuth edge cases you flagged

4 specialists, optimized for your project. Approve?
(Y / swap X for Y / remove Z / add W)
```

Never present a team without rationale. Every specialist earns their seat.
