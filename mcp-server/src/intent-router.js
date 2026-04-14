// --- Intent router (W2.1 / A1) ---
// Deterministic keyword → skill dispatch. Runs in UserPromptSubmit hook
// before the vague-prompt check. When a recognized intent hits, emits a
// positive-framed nudge that tells the agent which IJFW skill/tool to use.
//
// This is the "brainstorm auto-fires workflow" moment: we don't leave the
// matching to the LLM; we match deterministically and surface the choice.
//
// Policy: high precision over recall. False positives are expensive (wrong
// skill fired), false negatives cheap (agent just picks normally).

const INTENTS = [
  {
    intent: 'brainstorm',
    skill:  'ijfw-workflow',
    // Bare "build" is too vague; "build X" + "brainstorm" + "let's design"
    // are the high-signal ones.
    patterns: [
      /\bbrainstorm(?:\s|ing)\b/i,
      /\blet'?s\s+(?:think|design|plan|figure)\b/i,
      /\b(?:new project|starting a project|greenfield)\b/i,
      /\bhelp me (?:build|design|plan|figure)\b/i,
    ],
    nudge: "Intent: brainstorm/plan. Use the ijfw-workflow skill (quick mode for rapid exploration, deep mode for full project planning). Do not jump to implementation — reach alignment on intent first.",
  },
  {
    intent: 'ship',
    skill:  'ijfw-commit',
    patterns: [
      /\b(?:ship it|let'?s ship|ready to commit|commit this|push this)\b/i,
      /\bmake a commit\b/i,
      /\b(?:create|open) (?:a )?PR\b/i,
    ],
    nudge: "Intent: ship. Use ijfw-commit for a terse conventional commit; if opening a PR follow the user's git conventions and ask before pushing.",
  },
  {
    intent: 'review',
    skill:  'ijfw-review',
    patterns: [
      /\b(?:code review|review (?:the|this|my) (?:code|diff|PR|change))/i,
      /\breview PR\b/i,
    ],
    nudge: "Intent: code review. Use ijfw-review for one-line comments — no narration, just actionable findings.",
  },
  {
    intent: 'remember',
    skill:  'ijfw_memory_store',
    patterns: [
      /\b(?:remember (?:this|that)|store (?:this|that)|save (?:this|that) (?:for (?:later|next time)|to memory))\b/i,
      /\b(?:this is|that'?s) important (?:to remember|for (?:later|next time))\b/i,
      /\b(?:note to self|save for later)\b/i,
    ],
    nudge: "Intent: persist to memory. Call the ijfw_memory_store MCP tool with a type (decision|observation|pattern|handoff|preference), summary, and why/how-to-apply if stated.",
  },
  {
    intent: 'recall',
    skill:  'ijfw_memory_recall',
    patterns: [
      /\b(?:what did we|what (?:did|have) I|do you remember)\b/i,
      /\b(?:recall|pull up|look up) (?:from|in) memory\b/i,
      /\bshow me what you remember\b/i,
    ],
    nudge: "Intent: recall from memory. Call ijfw_memory_recall or ijfw_memory_search before answering from general knowledge.",
  },
  {
    intent: 'critique',
    skill:  'ijfw-critique',  // lands in W4.4
    patterns: [
      /\b(?:should I|what if|is this (?:right|correct|the best))\b/i,
      /\b(?:critique|poke holes|challenge this)\b/i,
      /\b(?:counter[- ]?argument|devil'?s advocate)\b/i,
      /\bgive me a second opinion\b/i,
    ],
    nudge: "Intent: critique. Steelman the current plan first, then list 2-3 concrete counter-arguments with the conditions under which each applies. If W4 ijfw-critique skill is installed, use it; otherwise apply the pattern manually.",
  },
  {
    intent: 'handoff',
    skill:  'ijfw-handoff',
    patterns: [
      /\b(?:session (?:handoff|summary)|wrapping up|end of session)\b/i,
      /\bcontext (?:is )?getting full\b/i,
    ],
    nudge: "Intent: handoff. Use ijfw-handoff to write a structured session handoff with decisions, next steps, and open questions.",
  },
  {
    intent: 'mode-brutal',
    skill:  'ijfw-core',
    patterns: [
      /\b(?:brutal mode|be brutal|caveman mode|ultra[- ]?terse)\b/i,
    ],
    nudge: "Intent: brutal mode. Set IJFW_TERSE_ONLY=1 for this session OR run /mode brutal. Output: code and single-sentence answers only; no explanation unless asked.",
  },
];

export function detectIntent(prompt) {
  if (typeof prompt !== 'string' || !prompt) return null;
  // Skip if user explicitly bypasses (leading * or `ijfw off`).
  if (/^\s*\*/.test(prompt)) return null;
  if (/\bijfw off\b/i.test(prompt)) return null;

  for (const entry of INTENTS) {
    for (const re of entry.patterns) {
      if (re.test(prompt)) {
        return { intent: entry.intent, skill: entry.skill, nudge: entry.nudge };
      }
    }
  }
  return null;
}
