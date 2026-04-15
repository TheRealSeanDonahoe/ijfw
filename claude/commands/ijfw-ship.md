---
name: ijfw-ship
description: "Run the IJFW workflow Ship phase (Deep D6). Pre-flight, deploy, and close. Usage: /ijfw-ship"
---

Run the Ship phase of the IJFW workflow. This is the final phase -- pre-flight
checks, deployment, monitoring, rollback plan, documentation, and memory update.

**Ship checklist:**

- Changelog updated with what shipped
- Deployment steps verified (or deployment executed if automated)
- Monitoring and alerting confirmed in place
- Rollback plan documented
- User-facing documentation current
- IJFW memory updated with the full project summary

**Donahoe principles enforced at ship:**

- P15: Updates invisible to users -- no action required from them
- P20: Works on all target platforms
- P21: Pricing respects the user (no surprise costs introduced)

Before running, the SHIP GATE re-reads the original brief and confirms what was
built matches what was asked. If gaps remain, ship is held until they close.

This command invokes `ijfw-workflow` at the D6 Ship phase directly.

**GATE:** The SHIP GATE must pass before deployment proceeds -- original brief
re-read, changelog updated, monitoring confirmed, rollback plan documented.

**Natural triggers:** "ship it", "deploy", "let's ship", "go live", "time to ship",
"wrap this up."
