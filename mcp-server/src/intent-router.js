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
    priority: 1,
    // Bare "build" is too vague; "build X" + "brainstorm" + "let's design"
    // are the high-signal ones.
    patterns: [
      /\bbrainstorm(?:\s|ing)\b/i,
      /\blet'?s\s+(?:think|design|plan|figure)\b/i,
      /\b(?:new project|starting a project|greenfield)\b/i,
      /\bhelp me (?:build|design|plan|figure)\b/i,
    ],
    nudge: "Looks like you want to plan a new project. Try: /ijfw-workflow (quick mode for rapid exploration, deep mode for full project planning).",
  },
  {
    intent: 'ship',
    skill:  'ijfw-commit',
    priority: 5,
    patterns: [
      /\b(?:ship it|let'?s ship|ready to commit|commit this|push this)\b/i,
      /\bmake a commit\b/i,
      /\b(?:create|open) (?:a )?PR\b/i,
    ],
    nudge: "Looks like you want to commit and ship your changes. Try: /ijfw-commit for a terse conventional commit, then open a PR following your git conventions.",
  },
  {
    intent: 'review',
    skill:  'ijfw-review',
    priority: 5,
    patterns: [
      /\b(?:code review|review (?:the|this|my) (?:code|diff|PR|change))/i,
      /\breview PR\b/i,
    ],
    nudge: "Looks like you want to review code or a diff. Try: /ijfw-review for concise, actionable findings.",
  },
  {
    intent: 'remember',
    skill:  'ijfw_memory_store',
    priority: 5,
    patterns: [
      /\b(?:remember (?:this|that)|store (?:this|that)|save (?:this|that) (?:for (?:later|next time)|to memory))\b/i,
      /\b(?:this is|that'?s) important (?:to remember|for (?:later|next time))\b/i,
      /\b(?:note to self|save for later)\b/i,
    ],
    nudge: "Looks like you want to save something to memory. Try: ijfw_memory_store with a type (decision, observation, pattern, handoff, or preference) and a brief summary.",
  },
  {
    intent: 'recall',
    skill:  'ijfw_memory_recall',
    priority: 5,
    patterns: [
      /\b(?:what did we|what (?:did|have) I|do you remember)\b/i,
      /\b(?:recall|pull up|look up) (?:from|in) memory\b/i,
      /\bshow me what you remember\b/i,
    ],
    nudge: "Looks like you want to recall something from memory. Try: ijfw_memory_recall or ijfw_memory_search to pull up what was stored.",
  },
  {
    intent: 'cross-research',
    skill:  '/cross-research',
    priority: 10,
    patterns: [
      /\bcross[- ]?research(?:\s|ing)?\b/i,
      /\blet'?s cross[- ]?research\b/i,
      /\bdig into .+ from multiple angles\b/i,
      /\bmulti[- ]?angle research\b/i,
      /\bresearch (?:this|that) from multiple angles\b/i,
    ],
    nudge: "Looks like you want to research a topic from multiple angles. Try: /cross-research (auto-detects target; no args needed). Phase A fans out to Codex and Gemini in parallel, Phase B synthesizes results -- all via background bash.",
  },
  {
    intent: 'cross-critique',
    skill:  '/cross-critique',
    priority: 10,
    patterns: [
      /\bcross[- ]?critique(?:\s|ing)?\b/i,
      /\blet'?s cross[- ]?critique\b/i,
      /\bstress[- ]?test this claim\b/i,
      /\badversarial (?:critique|review)\b/i,
      /\bchallenge this from every angle\b/i,
      /\battack this from all sides\b/i,
    ],
    nudge: "Looks like you want to stress-test a claim or plan from multiple angles. Try: /cross-critique (auto-detects target). Codex covers technical weaknesses, Gemini covers strategic weaknesses, and a fresh Claude instance covers UX and adoption -- all auto-fired via background bash.",
  },
  {
    intent: 'critique',
    skill:  'ijfw-critique',
    priority: 1,
    patterns: [
      /\b(?:should I|what if|is this (?:right|correct|the best))\b/i,
      /\b(?:critique|poke holes|challenge this)\b/i,
      /\b(?:counter[- ]?argument|devil'?s advocate)\b/i,
    ],
    nudge: "Looks like you want to pressure-test an idea or plan. Try: /ijfw-critique -- steelmans the current approach, then surfaces 2-3 concrete counter-arguments with the conditions that trigger each.",
  },
  {
    intent: 'cross-audit',
    skill:  '/cross-audit',
    priority: 10,
    patterns: [
      /\bcross[- ]?audit(?:\s|ing)?\b/i,
      /\b(?:get|need)\s+(?:a\s+)?second opinion\b/i,
      /\b(?:have|ask)\s+(?:codex|gemini|opencode|aider|copilot)\s+(?:to\s+)?(?:review|audit|check)\b/i,
      /\bsecond[- ]model (?:review|opinion|audit)\b/i,
      /\b(?:peer|adversarial)[- ]?(?:review|audit)\b/i,
    ],
    nudge: "Looks like you want a second-model audit of your code. Try: /cross-audit (no args = auto-picks staged and recent-change files; --with <id> to target a specific auditor). Writes .ijfw/cross-audit/request.md and auto-fires the auditor via background bash.",
  },
  {
    intent: 'handoff',
    skill:  'ijfw-handoff',
    priority: 5,
    patterns: [
      /\b(?:session (?:handoff|summary)|wrapping up|end of session)\b/i,
      /\bcontext (?:is )?getting full\b/i,
    ],
    nudge: "Looks like you want to wrap up this session cleanly. Try: /ijfw-handoff -- writes a structured handoff with decisions made, next steps, and open questions.",
  },
  {
    intent: 'mode-brutal',
    skill:  'ijfw-core',
    priority: 5,
    patterns: [
      /\b(?:brutal mode|be brutal|caveman mode|ultra[- ]?terse)\b/i,
    ],
    nudge: "Looks like you want maximum terseness. Try: /ijfw-mode brutal -- code and single-sentence answers only, no narration unless you ask.",
  },
];

export function detectIntent(prompt) {
  if (typeof prompt !== 'string' || !prompt) return null;
  // Skip if user explicitly bypasses (leading * or `ijfw off`).
  if (/^\s*\*/.test(prompt)) return null;
  if (/\bijfw off\b/i.test(prompt)) return null;

  // Collect ALL matching entries with the longest matching pattern length.
  const matches = [];
  for (const entry of INTENTS) {
    for (const re of entry.patterns) {
      const m = prompt.match(re);
      if (m) {
        matches.push({ entry, matchLen: m[0].length });
        break; // one match per entry is enough
      }
    }
  }

  if (matches.length === 0) return null;

  // Sort: (a) priority DESC, (b) matchLen DESC, (c) INTENTS array order ASC (stable via index).
  matches.sort((a, b) => {
    const pd = (b.entry.priority ?? 0) - (a.entry.priority ?? 0);
    if (pd !== 0) return pd;
    const ld = b.matchLen - a.matchLen;
    if (ld !== 0) return ld;
    return INTENTS.indexOf(a.entry) - INTENTS.indexOf(b.entry);
  });

  const winner = matches[0].entry;
  return { intent: winner.intent, skill: winner.skill, nudge: winner.nudge };
}
