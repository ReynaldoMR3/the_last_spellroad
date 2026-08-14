# Automated agent dispatch

Implements issue #195. A recurring job (every ~2 hours) that scans
`ready-for-agent` GitHub issues, dispatches each to the classified agent in
an isolated worktree, verifies and security-gates the result, runs
Heckler's critique as a blocking check, and merges or reports
`blocked-with-reason` — see `tools/dispatch/CONTEXT.md` for the stage
order and `docs/superpowers/specs/2026-08-12-automated-agent-dispatch-design.md`
for the full design rationale.

Runs on this Mac via `launchd`, not GitHub Actions — the Codex backend
uses a local subscription login, not an API key, so it can't run on a
CI runner. Install: `tools/dispatch/install/install.sh`.

**Ships in `--dry-run` by default.** It reports what it would merge or
block without touching GitHub or merging anything. Only flip
`--dry-run` off (edit the plist's `ProgramArguments`, re-run
`install.sh`) after watching several dry runs and trusting the output.

**Not yet built (tracked as a follow-up plan):** the prototype-screenshot
capture stage (stage06) and the human-readable `report.html`/`index.html`
— today's output is the JSON files under `tools/dispatch/runs/<run_id>/`
plus the plain stdout `run.py` prints.

**Gemini is not wired in yet** — `model_registry.json` reserves an entry;
add a `backends/gemini_backend.py` matching the existing backend shape
plus a live key to enable it.

**Security invariant.** The `ready-for-agent` label is a human-applied
trust boundary, not a formality. Anyone who can add that label to an
issue (or edit an issue's body/comments after it already carries the
label) can inject arbitrary instructions into a fully autonomous
`codex exec --full-auto` agent running on the developer's Mac with repo
write access. This pipeline must never auto-apply `ready-for-agent`
without a human triage step in between. The security gate (stage04) is
not a defense against this: it only inspects the resulting git diff and
command log after the fact, and cannot detect or prevent prompt
injection happening during the agent's run.
