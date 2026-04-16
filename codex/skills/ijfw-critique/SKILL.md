---
name: ijfw-critique
description: "Challenge decisions, surface counter-arguments, flag assumptions. Trigger: 'should I', 'is this right', 'critique', 'poke holes', 'second opinion', 'devil's advocate'. Auto-fired by ijfw-intent-router."
---


Before you agree, disagree. Before you advise, stress-test.

When the user asks you to critique, review a decision, or give a second
opinion -- or when the intent router flags critique intent -- follow this
pattern rather than answering from the same frame they asked from.

## Four-step critique

1. **Steelman first.** In one sentence, state the strongest version of the
   current plan / decision / design. Not to flatter -- to make sure you're
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
   rework because Y. Own the verdict -- don't just hedge.

## When NOT to critique

- The user is midway through implementing and needs help, not a critique.
- The decision is reversible and cheap (just do it and see).
- You lack the domain facts to form an opinion -- say so instead of guessing.
- The question is "how" not "whether". How-to questions deserve how-to
  answers, not a rehash of whether to do it at all.

## Output shape

```
Steelman: <one-line strongest version>

Assumptions:
  1. <load-bearing belief>
  2. <load-bearing belief>

Counter-arguments:
  1. <non-obvious objection> -- applies when <condition>; watch for <signal>.
  2. <different angle> -- applies when <condition>; test with <method>.
  3. <third angle> -- applies when <condition>; mitigate via <approach>.

Verdict: <proceed|mitigate|rework> -- <one-line reason>

Audit: stress-tested <N> assumptions, <N> angles (<angle-1> + <angle-2> + <angle-3>). Confidence: <low|med|high>.
```

### Worked example

```
Steelman: Rewriting the auth layer in Rust eliminates the class of memory bugs that caused last quarter's outages.

Assumptions:
  1. The team has enough Rust fluency to maintain the new code without slowdown.
  2. The outages trace to memory bugs, not logic or config errors.

Counter-arguments:
  1. Operationally: Rust compile times and borrow-checker friction could double review cycles -- applies when the team has <3 months Rust experience; watch for PR cycle time increasing past 2 days.
  2. Socially: the auth team may resist a full rewrite when incremental hardening (address-sanitiser + fuzzing) could close the same risk at 20% of the effort -- applies when management is measuring velocity; test by asking the team to estimate both approaches.
  3. Correctness: auth logic bugs (e.g. missing token expiry checks) are language-agnostic -- applies if the root-cause analysis is incomplete; mitigate by running a postmortem before deciding on the rewrite.

Verdict: mitigate -- commission a 2-week root-cause analysis first; if the cause is confirmed memory-safety, Rust is the right call.

Audit: stress-tested 2 assumptions, 3 angles (operational + social + correctness). Confidence: high.
```

## Tone

Direct, not hedging. The user asked for a critique; they don't need
"this is just my opinion". State the counter clearly. If they push back,
that's the signal to update or yield -- but make them do the work of
pushing back, not you.

Resume normal mode after.
