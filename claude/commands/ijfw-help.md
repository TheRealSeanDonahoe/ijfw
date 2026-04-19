---
name: ijfw-help
description: "Open the full IJFW guide. Terminal-paged by default, or rendered in a browser tab with `--browser`. Use when the user asks how to use IJFW, what commands exist, or how to do something specific."
---

Dispatch the IJFW guide to the user.

## Detect intent

1. If the user passed `--browser` (or asked for "browser", "render", "pretty view") run `ijfw help --browser` in a Bash tool call. This renders the guide as HTML at `~/.ijfw/guide/index.html` and opens it in the default browser.
2. Otherwise, run `ijfw help` in a Bash tool call. The guide prints to terminal paged through `less -R`.

## If the user is asking a scoped question (not "open the guide")

Examples: "how do I run a cross audit?", "what does `ijfw memory recall` do?", "what are the workflow modes?".

Do NOT open the full guide. Instead:

1. Read `docs/GUIDE.md` from the repo root (fallback: `~/.ijfw/docs/GUIDE.md`).
2. Grep for the section the user asked about.
3. Quote the relevant block (command reference row, FAQ entry, or quickstart win) in your reply. Keep it under 20 lines.
4. Offer: "Full guide: `ijfw help --browser` for the rendered version, or `ijfw help` in the terminal."

## Never

- Never invent commands that are not in `docs/GUIDE.md`.
- Never paraphrase the guide when the user asked a direct "how do I" question. Quote the real command.
- Never open the browser without user intent. If unsure, print the terminal version first and offer the browser option.
