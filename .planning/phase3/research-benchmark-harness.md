# Benchmark Harness Research — IJFW Phase 3

Three-arm harness: (A) baseline Claude Code, (B) terse-only rules, (C) full IJFW. Goal: prove "smarter not just cheaper" with real numbers on 14 reproducible coding tasks.

## 1. Existing Coding-Agent Benchmarks

| Benchmark | Task format | Scoring | Repro design | Notes |
|---|---|---|---|---|
| **SWE-bench Verified** | GitHub issue + repo, patch to make F→P tests pass | Unit-test pass, binary per instance, 500 human-curated | Docker, no network, ground-truth patches must apply cleanly | Heavy contamination (3-6x bug-loc accuracy vs held-out); UTBoost found ~24% mis-scored on Verified. Too heavyweight for 14 tasks. |
| **HumanEval / MBPP** | Single function + docstring | pass@k unit tests | Fixed dataset, deterministic | Saturated, contaminated, no agentic workflow. |
| **BigCodeBench** | Library-use tasks, 1,140 problems | Branch-coverage unit tests | Dockerized exec | Good for breadth; too many tasks for us. |
| **LiveCodeBench** | LeetCode/AtCoder/CF by release date | pass@1, hidden tests | **Date-gated** — eval only problems post-model-cutoff | Best contamination story; format is solo-function, not agentic. |
| **Aider Polyglot** | 225 Exercism problems across 6 langs, edit-in-place | pass-rate @ 1 or 2 tries, edit-format accuracy, $ cost | Files committed to repo, two-attempt protocol with test feedback | **Closest match to our need** — already tracks cost, already multi-language, already tests edit-format discipline. |
| **SWE-bench Pro** | Proprietary repos, harder | Test-based | Docker | Good task design, licensing unclear. |

**Model after: Aider Polyglot** — already solves edit-format scoring, $ accounting, retry semantics. Fork its runner; swap problem set for IJFW-tuned 14.

## 2. Multi-Arm A/B Harness Designs

- **Promptfoo** — `--repeat N` for variance, token/cost tracked per eval, providers = arms, CSV/JSON export. Simple, declarative YAML. Good for arm isolation (each provider is a subprocess). Lacks statistical tests.
- **Inspect AI (UK AISI)** — `epochs` parameter computes standard errors automatically; sandboxing (process jail / Docker / K8s) enforces arm isolation; built-in bootstrap + pass@k. Anthropic's [statistical eval guide](https://www.anthropic.com/research/statistical-approach-to-model-evals) recommends **paired-differences tests** across arms on the same task to eliminate task-difficulty variance — this is the right methodology for us.
- **LangSmith evals** — good tracing, weak statistics.
- **OpenAI evals** — registry-based, deterministic graders, no built-in variance.

**Takeaway:** run each task across all 3 arms (paired design), n=5 epochs per (arm, task), report paired bootstrap CIs. Use Inspect AI's epochs pattern even if we don't adopt the framework.

## 3. Reproducibility Without LLM-as-Judge

- Commit task fixtures (starter repo + hidden test file) to `benchmarks/tasks/NN-name/`.
- Verification = run hidden pytest/jest/cargo test; exit code is the grade.
- Temperature fixed (0 where supported; Claude Code doesn't expose it — accept residual variance via n=5).
- Docker container per task, no network, pinned toolchain.
- For "explore" and "refactor" tasks where tests are insufficient: structural asserts (AST checks, grep for forbidden patterns, file-count invariants, diff size thresholds). Still deterministic.
- **Avoid LLM-as-judge entirely** — it adds cost and variance, defeats the point of measuring cost.

## 4. Token/Cost Accounting in Claude Code

Three sources, ranked:

1. **OpenTelemetry (best)** — `CLAUDE_CODE_ENABLE_TELEMETRY=1` + OTLP exporter emits counters for input tokens, output tokens, cache read/write, cost USD, session duration. Run a local OTLP collector, dump to JSONL. Canonical, first-party.
2. **Stop hook** — fires once per turn with `session_id` + `transcript_path`. Parse transcript JSONL for `usage` blocks (each assistant message has `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`). Good fallback; requires transcript parser.
3. **`claude` CLI `--output-format json`** — non-interactive mode returns `total_cost_usd` and `usage` in final envelope. Simplest for headless runs. **This is likely our source of truth for harness mode** since each task runs headlessly.

Pick #3 as primary; cross-check with OTel for the final report.

## 5. Task Suite Design (14 tasks)

Categories chosen to differentiate arms. IJFW's edge shows on tasks needing persistent context, terse reasoning, or correct-first-try edits.

| # | Category | Example task | Why it differentiates |
|---|---|---|---|
| 1-2 | **Bug fix (single-file)** | Off-by-one in paginator; failing test provided | Baseline of competence |
| 3-4 | **Bug fix (multi-file)** | Type drift across module boundary | Tests context-gathering efficiency (token cost) |
| 5-6 | **Feature add** | Add `--dry-run` flag with tests | Tests edit discipline |
| 7 | **Refactor** | Extract duplicated logic into helper; tests must still pass | Tests terseness — baseline over-explains |
| 8 | **Test writing** | Write pytest for untested module, ≥80% branch cov | Deterministic scoring via coverage |
| 9 | **Config** | Add ESLint rule + fix violations | Tool-use efficiency |
| 10 | **Explore/answer** | "Where is rate-limiting enforced?" — graded by file path match | Pure retrieval, IJFW memory wins |
| 11-12 | **Memory task** | Task 11 stores fact; Task 12 (new session) requires it | Direct test of IJFW's core value — baseline must fail or re-derive |
| 13 | **Regression fix** | Revert-and-reimplement a known-bad commit | Multi-step planning |
| 14 | **Polyglot port** | Port 30-line Py function to Rust with tests | Cross-language reasoning |

Mix: realistic (drawn from real OSS diffs), multi-file dominant, two tasks explicitly adversarial to no-memory arms.

## 6. Reporting

**JSONL line (one per run):**
```json
{"run_id":"2026-04-14T10:22:01Z-a7f","arm":"C","task":"07-refactor-dedupe","epoch":3,"input_tokens":18422,"output_tokens":2140,"cache_read_tokens":12003,"cost_usd":0.0934,"wall_time_s":47.2,"turns":6,"passed":true,"verification":"pytest","verifier_exit":0,"commit_sha":"ab12cd3","model":"claude-opus-4-6","seed":null}
```

**Markdown table (aggregate, per arm):**

| Arm | Pass-rate | Mean $ | Median $ | Mean tokens (in/out) | Mean turns | Mean time |
|---|---|---|---|---|---|---|
| A baseline | 78.6% | $0.142 | $0.118 | 22.1k / 3.4k | 8.2 | 61s |
| B terse-only | 80.0% | $0.091 | $0.079 | 15.8k / 1.9k | 6.9 | 48s |
| C full IJFW | **85.7%** | **$0.064** | **$0.058** | 11.2k / 1.4k | 5.8 | 39s |

Add per-task table for the paired view; visualize with forest plot of paired deltas (C−A) with 95% bootstrap CIs.

## Sample Task Fixture

```
benchmarks/tasks/07-refactor-dedupe/
  README.md          # task prompt (identical across arms)
  repo/              # starter code, git-init'd
  tests/hidden/      # not visible to agent; verifier runs these
  verify.sh          # exit 0 = pass; runs pytest tests/hidden
  manifest.json      # {category, max_turns, timeout_s, allowed_tools}
```

## Recommendations for IJFW

1. **Fork Aider Polyglot runner**, replace problem set with our 14 tasks. Keep two-attempt protocol optional (off by default to measure first-try correctness — where terse + memory should shine).
2. **14-task suite**: as tabled above. Commit fixtures; Docker per task; verification via `verify.sh` exit code only — no LLM judge.
3. **Token accounting source of truth**: `claude -p --output-format json` envelope's `total_cost_usd` + `usage` block. Cross-validate with `CLAUDE_CODE_ENABLE_TELEMETRY=1` OTLP dump on a sampled subset.
4. **Verification per type**: unit tests (bug/feature/port/test-write), branch coverage threshold (test-write), AST/grep invariants (refactor), exact-file-path match (explore), stored-fact recall check (memory tasks — arm C reads `.ijfw/`, arms A/B get fresh session).
5. **Statistical methodology**: paired design, n=5 epochs per (arm, task) = 210 runs total. Report paired bootstrap 95% CI on deltas (C−A, C−B, B−A). Significance threshold: CI excludes 0, plus Holm-Bonferroni across the three comparisons. Report effect size as $ saved per successful task, not just pass-rate delta — this is the "smarter not just cheaper" framing (higher pass-rate at lower cost).
6. **Output schema**: JSONL keys as sampled above. Markdown report has three sections: (a) headline table (arm aggregates), (b) per-task paired deltas, (c) category breakdown showing where IJFW's advantage concentrates (predict: memory + refactor + explore).
7. **Wow-factor presentation**: lead with "C passes 85.7% at $0.064/task; A passes 78.6% at $0.142" — same budget, 7pp more work done, or same work at 45% of cost. Sutherland reframe: don't say "cheaper," say "more output per dollar AND higher quality."

Sources:
- [SWE-bench Verified | Epoch AI](https://epoch.ai/benchmarks/swe-bench-verified/)
- [Introducing SWE-bench Verified | OpenAI](https://openai.com/index/introducing-swe-bench-verified/)
- [SWE-Bench Illusion (arXiv 2506.12286)](https://arxiv.org/html/2506.12286v3)
- [Aider Polyglot benchmark README](https://github.com/Aider-AI/aider/blob/main/benchmark/README.md)
- [Aider Polyglot | Epoch AI](https://epoch.ai/benchmarks/aider-polyglot/)
- [LiveCodeBench](https://livecodebench.github.io/)
- [Claude Code Hooks reference](https://code.claude.com/docs/en/hooks)
- [Claude Code Monitoring (OTel)](https://code.claude.com/docs/en/monitoring-usage)
- [Claude Code + OpenTelemetry per-session cost/tokens (Bindplane)](https://bindplane.com/blog/claude-code-opentelemetry-per-session-cost-and-token-tracking)
- [Promptfoo configuration reference](https://www.promptfoo.dev/docs/configuration/reference/)
- [Promptfoo — Evaluate Coding Agents](https://www.promptfoo.dev/docs/guides/evaluate-coding-agents/)
- [Inspect AI](https://inspect.aisi.org.uk/)
- [Anthropic — A statistical approach to model evaluations](https://www.anthropic.com/research/statistical-approach-to-model-evals)
- [15 LLM coding benchmarks (Evidently AI)](https://www.evidentlyai.com/blog/llm-coding-benchmarks)
