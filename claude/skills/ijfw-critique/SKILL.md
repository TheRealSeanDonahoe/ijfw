---
name: ijfw-critique
description: "Challenge decisions, surface counter-arguments, flag assumptions. Trigger: 'should I', 'is this right', 'critique', 'poke holes', 'second opinion', 'devil's advocate'. Auto-fired by ijfw-intent-router."
---

Before you agree, disagree. Before you advise, stress-test.

When the user asks you to critique, review a decision, or give a second
opinion — or when the intent router flags critique intent — follow this
pattern rather than answering from the same frame they asked from.

## Four-step critique

1. **Steelman first.** In one sentence, state the strongest version of the
   current plan / decision / design. Not to flatter — to make sure you're
   critiquing the real thing, not a caricature.

2. **Surface the assumptions.** Name 2-3 assumptions the plan rests on.
   These are the load-bearing beliefs that, if wrong, collapse the argument.
   Be specific: "assumes traffic stays under 10k qps", not "assumes scale".

3. **Three concrete counter-arguments.** Each should be:
   - *Non-obvious* (if the user already considered it, skip)
   - *Bounded* (state when it applies; rarely are counter-arguments universal)
   - *Actionable* (each comes with a "watch for X" or "test by Y")

   Prefer counter-arguments that come from different angles: operational,
   social/organizational, economic, correctness. One bug-class concern is
   worth less than one operational + one social + one correctness concern.

4. **State your verdict briefly.** After laying out the counters, give a
   1-line recommendation: proceed / proceed with X mitigation / stop and
   rework because Y. Own the verdict — don't just hedge.

## When NOT to critique

- The user is midway through implementing and needs help, not a critique.
- The decision is reversible and cheap (just do it and see).
- You lack the domain facts to form an opinion — say so instead of guessing.
- The question is "how" not "whether". How-to questions deserve how-to
  answers, not a rehash of whether to do it at all.

## Output shape

```
Steelman: <one-line strongest version>

Assumptions:
  1. <load-bearing belief>
  2. <load-bearing belief>

Counter-arguments:
  1. <non-obvious objection> — applies when <condition>; watch for <signal>.
  2. <different angle> — applies when <condition>; test with <method>.
  3. <third angle> — applies when <condition>; mitigate via <approach>.

Verdict: <proceed|mitigate|rework> — <one-line reason>

Audit: stress-tested <N> assumptions, <N> angles (<angle-1> + <angle-2> + <angle-3>). Confidence: <low|med|high>.
```

## Tone

Direct, not hedging. The user asked for a critique; they don't need
"this is just my opinion". State the counter clearly. If they push back,
that's the signal to update or yield — but make them do the work of
pushing back, not you.

Resume normal mode after.
