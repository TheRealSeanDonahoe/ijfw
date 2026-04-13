# The Donahoe Principles — Quick Audit Reference
## "It Just Fucking Works" by Sean Donahoe

Use this reference during audit gates. Check applicable principles per stage.

## The Loop
BUILD → AUDIT → FIX → SHIP → MEASURE → REPEAT
Principles apply at every stage. The loop never ends.

## TIER 1: PERCEPTION IS THE PRODUCT (First 60 seconds)
P1.  First impressions ARE the product. 50ms to earn trust. One shot.
P2.  Speed is respect. 428ms says "I value your time."
P3.  Never make the user feel stupid. Jargon, config screens, unclear errors = they leave.
P4.  Ship taste, not features. Every feature is a forced decision. Have opinions.
P5.  Configuration is admission of failure. Auto-detect. Smart defaults. Override possible, not necessary.
P6.  Don't expose your architecture. Internal structure is your problem, not theirs.
P7.  Every red state has a green path. Error → what happened → what to do → a button.
P8.  The app starts when I click it. Not after splash, deps, or runtime init.

## TIER 2: THE INVISIBLE ARCHITECTURE (Users never see, always feel)
P9.  Code you can't explain is code you can't ship. Never trust a single AI. Run through three.
P10. Test like someone's trying to break it. Angry users, bad input, no network, attackers.
P11. Offline is a feature, not an error. Design for no network first.
P12. Security without friction. Invisible security gets used. Terminal commands lose 80%.
P13. Their data, their machine, their choice. Minimal resources. Clean up. Don't phone home.
P14. Accessible is not optional. Visual, motor, age — if they can't use it, you told them they don't matter.
P15. Updates should be invisible. No user action. Never break workflows. Improve silently.
P16. Shared infrastructure, shared benefit. Systems thinking for product suites.

## TIER 3: THE CRAFT (Professional vs hobbyist)
P17. The user never opens a terminal. Native installers. Bundled runtimes. Zero prerequisites.
P18. Crashes are bugs, not features. Auto-save. State preservation. Graceful recovery.
P19. Progressive disclosure, not progressive punishment. Reveal complexity as readiness grows.
P20. One app, all platforms. Platform fragmentation is the hidden killer.
P21. Price like you respect them. No hidden costs, no confusing tiers, no insulting free tier.
P22. Standards scale, vibes don't. Encode quality in linters, tests, CI/CD — not just your head.

## THE MULTI-AI QUALITY TRIDENT
GENERATE → VALIDATE → SHIP
Run through 3 AIs. Different training data. Different blind spots.
Disagreements are the most valuable findings. Never skip VALIDATE.

## THE CORE PHILOSOPHY
Marketing makes you money. Your product stops the refund.
Build software that earns the right to exist on someone's machine.
