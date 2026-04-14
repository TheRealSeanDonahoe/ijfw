(node:80790) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///Users/seandonahoe/dev/ijfw/core/benchmarks/report.js is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /Users/seandonahoe/dev/ijfw/package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
# IJFW Benchmark Report

Runs: 3 | Tasks: 1 | Generated: 2026-04-14T04:36:39.328Z

> Scaffold results. Wide CIs expected at n=2 epochs. Full suite in Phase 3.5.

| Task | Arm | n | mean cost | mean duration ms |
|------|-----|---|-----------|------------------|
| 01-bug-paginator | A | 1 | $0.2770 | 105650 |
| 01-bug-paginator | B | 1 | $0.2339 | 80574 |
| 01-bug-paginator | C | 1 | $0.1636 | 145762 |

## Paired deltas (cost_usd, 95% bootstrap CI)

| Task | Contrast | Δ mean | 95% CI | n |
|------|----------|--------|--------|---|
| 01-bug-paginator | C−A | -0.1134 | [-0.1134, -0.1134] | 1 |
| 01-bug-paginator | C−B | -0.0703 | [-0.0703, -0.0703] | 1 |
| 01-bug-paginator | B−A | -0.0431 | [-0.0431, -0.0431] | 1 |
