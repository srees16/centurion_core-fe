# Copilot instructions for centurion_core-fe

The Next.js frontend of Centurion. The backend, and the full briefing, live in the
`centurion_core` repository (`CLAUDE.md`).

- **Checks:** `npx tsc --noEmit -p .` and `npx next build`. There are no frontend tests.
- **What the pages show:** the Trade Center and Fly Kite show the NSE engine's books. The
  Verdict and Screener pages run an older model the engine does not trade
  (`components/common/legacy-notice.tsx` says so on both).
- **Never commit** secrets, `.env` files or credentials.

The owner's working rules apply to every prompt. They are copied from
`centurion_core/CLAUDE.md`, which is the source: change them there first.

- **Scope:**
  - change only what the task needs, and keep unrelated behaviour intact;
  - reuse existing utilities;
  - delete temporary scripts;
  - do not commit or push unless asked;
  - ask before creating any new `.md` file.
- **Communication:** be candid when something misses the goal or is
  premature, and keep summaries crisp.
- **Challenge every request first** (owner's rule, 7 Nov 2026): before any
  work, gauge whether it adds value to the Ind stocks module (or US, when
  applicable): CAGR, Sharpe, robustness, workflow. Search the trackers and
  `docs/nse_engine_validation_plan.md` for prior tests and decisions. Weigh
  its cost (trials, freezes, guards, time against go-live work). If it is
  counter-productive, a duplicate or low-value, say so crisply with the
  reason and a better alternative, and ask before proceeding. Do not agree by
  default (14 Nov 2026): for an idea or strategy, name its biggest weakness,
  the assumption that may be false, what is being overlooked and what could
  make it fail. Keep `docs/MEMORY_TRACKER.txt`
  (India) and `docs/US_MEMORY_TRACKER.txt` (US) current.
- **Think it through before implementing** (owner's rule, 14 Nov 2026): after the
  challenge and before any change, reason step by step and state a short plan:
  the real goal; the root cause confirmed from evidence (logs, data, the code
  path), not inferred; at least one alternative and why the chosen fix is
  better; what else the change touches and how it can fail; how it will be
  verified, on real data where possible, and what cannot be. If the evidence
  contradicts the plan midway, stop and re-plan. For an objective, work
  backward from the outcome wanted: the steps, skills, tools, decisions and
  milestones, and the most efficient path. Keep the write-up to a few
  lines; a one-line change needs one line.
- **Ask before answering ideas and decisions** (owner's rule, 14 Nov 2026): for
  an idea, strategy, objective or design choice, and anything ambiguous,
  costly or hard to undo, first say what the owner is really trying to
  solve, ask the questions whose answers would change the answer (at most
  four), then stop: read-only investigation only until they answer.
  Operational, status and time-critical prompts get a direct answer with the
  assumption stated. Replies stay within one screen.
