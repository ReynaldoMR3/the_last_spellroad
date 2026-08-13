# Automated Agent Dispatch Pipeline — Design

**Gates:**
- Product — approved 2026-08-12 (developer, in conversation)
- Architecture — approved 2026-08-12 (developer, in conversation)
- Program Design — pending (written-plan review is the remaining gate)
- Vertical Slices — not started

**Branch:** TBD (created when the implementation plan starts)

## Context

Issue #195 ("Automate ready-for-agent issue dispatch, recurring, Ana-orchestrated") already specs the developer-facing goal: a recurring job that finds `ready-for-agent` GitHub issues, dispatches them to the right named agent, self-verifies, runs Heckler's critique as a blocking gate, and merges when safe — because Claude Code's cloud routine creation is blocked and the developer's Claude access is separately constrained. That issue deliberately left the mechanism open.

This spec picks the mechanism and closes four more open questions the developer raised: what format the pipeline's own artifacts should be in, how it picks which model/backend to use per task, how it guarantees changes are sandboxed and safe, and how it gives the developer something to look at (not just read) between sessions.

**Why this repo, why now:** the developer's actual bottleneck is time, not ideas (per the GDD's Developer Time Budget section — ~10 hrs/week, almost none of it hands-on-keyboard). The explicit goal is to spend that time playtesting and directing art/design, not running dispatch sessions by hand. This system exists to buy back that time without lowering the bar the existing roster already holds itself to (Ana's three-state model, ADR-0001's verification-rationale rule, Heckler's blocking critique).

## Product

**What changes for the developer:** instead of opening a Claude Code/Codex session to dispatch `ready-for-agent` issues, a background job on the developer's own Mac does it every ~2 hours, unattended. Each run produces one `report.html` the developer can open in a browser — a timeline of what was attempted, which model handled each step and why, what shipped, what's blocked and on whom, and screenshots of anything visual that changed. The developer's only remaining loop-closing actions are: read the report, answer anything tagged `blocked-with-reason`, and playtest anything the report flags as needing hands-on feel (interactive combat timing, etc. — screenshots don't replace that).

**Done looks like:** a full cycle — scan issues, pick backend, implement in an isolated worktree, verify inside Docker, security-gate the diff, Heckler-critique it, merge or block, capture a prototype screenshot if relevant, write the JSON trail and the HTML report — runs end-to-end with zero developer input, and ships nothing that violates the security gate's hard rules (below) no matter what an LLM backend tries to do.

**Explicitly not in scope for this spec:** GitHub Actions as the runner (ruled out — no API keys exist for Codex/Gemini on this machine or in repo secrets, and the developer's Codex auth is a local subscription login, not a portable key). Fully autonomous adoption of new models found via research (see Model Routing) — discovery is separate from adoption, and adoption always goes through a human-reviewed PR. Replacing hands-on playtesting for interactive/feel-based verification — screenshots and short clips are proof-of-change, not a playtest substitute (this repo already has a documented limitation here: the sandboxed browser pane can starve Phaser's game loop via `visibilityState`).

## Architecture

**Runner:** a `launchd` user agent on the developer's Mac (`~/Library/LaunchAgents/com.spellroad.dispatch.plist`), firing every 2 hours, invoking `tools/dispatch/run.sh`. Chosen over GitHub Actions because the only real dispatch-quality backend currently available (Codex CLI) is authenticated via a local subscription login that doesn't transfer to a CI runner; Gemini and Ollama are added the same way once credentials/containers exist, without needing a runner change.

**Stage shape**, mirroring `content-pipeline/`'s existing ICM numbered-stage convention (one job per stage, each with a `CONTEXT.md` Inputs/Process/Outputs contract), but JSON for every stage's actual output instead of markdown — these files are read by the next stage and by `report.html`'s generator, not by a human directly:

```
tools/dispatch/
  CONTEXT.md                       # Layer 1: pipeline purpose, stage order, how to run it
  model-registry.json              # Layer 3 reference: backends, tags, live-probed availability
  security-policy.json             # Layer 3 reference: denylist paths, secret-pattern rules
  00-scan/
    CONTEXT.md
    scan.sh                        # gh issue list --label ready-for-agent; filters in-flight issues; no LLM call
  01-route/
    CONTEXT.md
    route.py                       # classifies agent(s) per AGENTS.md roster table; picks backend via model-registry.json
  02-dispatch/
    CONTEXT.md
    dispatch.py                    # creates git worktree per issue (.worktrees/ convention); invokes chosen backend
                                    # with a prompt built from AGENTS.md + docs/agents/<name>/{AGENT,CONTEXT}.md + issue body
  03-verify/
    CONTEXT.md
    verify.sh                      # docker-compose run --rm game: typecheck, build, relevant tests (docker-testing-contract.md)
  04-security/
    CONTEXT.md
    security_gate.py               # hard gate: denylist paths, secret-pattern grep, confirms 03 ran inside Docker
  05-review/
    CONTEXT.md
    heckler_review.py              # Heckler critique pass via chosen backend; BLOCKING findings halt merge
  06-preview/
    CONTEXT.md
    capture_preview.py             # docker-compose up game; containerized Playwright hits ?prototype=/?debugLevel=; screenshot(s)
  07-merge/
    CONTEXT.md
    merge_gate.py                  # applies issue #195's merge guardrails; gh pr merge or blocked-with-reason comment
  run.py                           # orchestrates 00 -> 07 per issue; writes runs/<run_id>/manifest.json
  report/
    generate_report.py             # reads runs/<run_id>/*.json -> self-contained runs/<run_id>/report.html
    index.py                       # regenerates runs/index.html linking recent runs
  runs/<run_id>/
    00_scan.json ... 07_merge.json
    manifest.json                  # provenance: which backend/model per issue, timing, hashes — same spirit as
                                    # content-pipeline's bundle.json provenance block
    report.html
    preview/*.png
```

**Isolation:** every issue gets its own `git worktree` under `.worktrees/` (already an established convention in this repo, not new) — sidesteps the single-shared-working-tree gotcha already recorded in project memory, where `git checkout`/`restore` on the main tree can silently discard or carry along unrelated uncommitted work.

**Model routing (bounded).** `model-registry.json` lists each backend with: how to invoke it (`codex exec`, a future `gemini` CLI call, containerized Ollama's HTTP API), live-probed availability (is Codex authenticated right now, is the `ollama` container up, is `GEMINI_API_KEY` set), a cost tier, and a structured-output-reliability tag. `route.py`'s rule, extending the policy already written into `docs/agents/ana/AGENT.md`:

- Deterministic stages (00-scan, 04-security, parts of 07-merge) never call an LLM.
- Content-authoring tasks (Frieren/Warden/Lorena-shaped issues) try Ollama first; escalate to Codex after N consecutive schema-validation failures on the output.
- Heckler's critique (05-review) and any Loomwright engine-code issue always route to Codex — the highest-reliability backend currently available — regardless of cost, matching the existing rationale that a small local model has already shown real structured-output drift in this repo (`agent-crew`'s Assignment #3 run).
- Gemini slots into the same rule set once a free-tier key exists — no redesign needed, just a new registry entry and a probe check.

**Model *discovery* is a separate, human-gated, infrequent task** — not part of the 2-hour loop. A manually-triggered (or weekly-scheduled) `tools/dispatch/research_models.py` checks Ollama's model library and a small curated list of alternatives, and opens a PR proposing additions to `model-registry.json` with its reasoning. Nothing it finds is used in live dispatch until the developer reviews and merges that PR. This keeps "go find better options" from becoming an unsupervised agent pulling untrusted models into the build pipeline on its own schedule.

**Security gate (04-security, hard block, not a judgment call).** Three checks, all must pass or the run stops at `blocked-with-reason` and does not merge:

1. Every command the chosen backend ran during 02-dispatch and 03-verify actually executed inside `docker-compose run` — checked by inspecting the recorded command log from those stages, not assumed.
2. The diff touches none of `security-policy.json`'s denylist (`docker-compose.yml`, `.github/workflows/*`, `Dockerfile*`, `package.json`/`package-lock.json`, any `.env*`, anything under `.codex`/`.claude`). This is a strict, non-overridable superset of issue #195's existing step-9 "risk judgment" — those paths always go to human review, full stop.
3. A secret-pattern grep (API-key-shaped strings, private-key headers, AWS-style key patterns) over the full diff.

**Prototype capture (06-preview).** After a clean build, `docker-compose up -d game`, then a containerized Playwright script (new `tools/dispatch/playwright/` image, same pattern as `tools/pixel-gen`'s dedicated Dockerfile) loads the issue's relevant `?prototype=<key>` or `?debugLevel=<n>` URL and saves a screenshot (or a short scripted-input clip for simple state changes) into `runs/<run_id>/preview/`. `report.html` embeds these inline. This only fires for issues that plausibly changed something visual (route.py tags this at classification time) — a pure data/config issue doesn't get a preview step.

**Human report.** `generate_report.py` turns the run's JSON files into one static `report.html`: a stage timeline per issue, a status table (color-coded by the three-state model), which backend handled which step and why (surfacing the routing decision, not hiding it), security-gate results, Heckler's findings verbatim, and embedded preview screenshots. Self-contained (inline CSS/SVG, no external CDN) so it opens offline. `runs/index.html` links the last N runs.

## Program Design

Left to the implementation plan (`docs/superpowers/plans/2026-08-12-automated-agent-dispatch.md`, written next): exact JSON schemas per stage file, `route.py`'s scoring function, the `launchd` plist contents, the Playwright container's Dockerfile, and the default `--dry-run` behavior (ships on by default — auto-merge only enables once the developer has watched several dry runs and flips it off explicitly).

## Testing

- Each stage script gets a unit test with a fixture issue/diff, run via `docker-compose run --rm dispatch pytest` (new service, same shape as `content-pipeline`'s test setup).
- An end-to-end dry run against a real but harmless test issue, checked manually before `--dry-run` is ever turned off.
- The security gate gets adversarial test fixtures: a diff that touches `docker-compose.yml`, a diff containing an API-key-shaped string, a verify-log that shows a bare host command instead of a `docker-compose run` — each must produce a hard block, not a warning.
