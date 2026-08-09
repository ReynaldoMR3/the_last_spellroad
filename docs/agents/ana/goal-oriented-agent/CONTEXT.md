# Goal-Oriented Agent — Context

**Purpose:** Course Assignment #5. Automates the gap-detection/prioritization Ana already
does by hand via `docs/agents/ana/backlog.md`, and generates real code for the
top-priority gap found.

**Layer 1 — deterministic scanners (no LLM, run from this folder):**

```bash
python3 scan_gdd.py > output/gdd_features.json
python3 scan_codebase.py > output/codebase_inventory.json
```

**Layer 2 — reasoning.** Open a Claude Code or Codex session in this repo, point it at
`AGENT_CONTRACT.md`, and give it the two JSON files above plus the raw text of
`docs/agents/ana/backlog.md`. No API key needed — this is a live coding session
following a written procedure, the same way Loomwright/Frieren/Warden already work.

**Tests:** `python3 -m unittest discover -s . -p 'test_*.py' -v` (run from this folder).

**Evidence of one real run:** `output/gdd_features.json`, `output/codebase_inventory.json`,
`output/run_report.md` — committed, not regenerated fresh for grading. Re-running the
scanners is safe and idempotent, but the committed run is what `README.md`'s claims are
based on. Note: `output/codebase_inventory.json` intentionally predates the SaveSystem-
wiring fix (it captures the pre-fix "gap" state `run_report.md` reasons over) — a fresh run
produces a different, also-valid, but different snapshot, so save a re-run elsewhere rather
than overwriting this committed evidence file.
