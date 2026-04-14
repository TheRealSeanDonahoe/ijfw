---
description: "Show why a memory recall returned what it did — BM25 vs vector vs hybrid provenance."
allowed-tools: ["Read", "Bash"]
---

For a given recall, report which signals contributed. Agent prompt:

When the last `ijfw_memory_recall` / `ijfw_memory_search` call returned a hit, surface:

```
<match-id>
  BM25:       <score>   (matched terms: <tokens>)
  vector:     <cosine>  (model: <model or "disabled">)
  combined:   <merged score>
  snippet:    <first 160 chars>
```

If vectors are disabled (`IJFW_VECTORS=off` or library not installed): say *"Vectors disabled; result from keyword match only."* rather than showing a 0 cosine that looks negative.

Use this to debug why a recall did (or didn't) find something the user expected.
