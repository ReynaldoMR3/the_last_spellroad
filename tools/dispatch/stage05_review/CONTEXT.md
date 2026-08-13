# stage05_review — Context

**Inputs:** the full diff and Heckler's own `AGENT.md` contract text.
**Process:** always dispatches to the Codex backend regardless of what
`stage01_route` picked for content generation (per this repo's policy that
review work always gets the highest-reliability backend); parses the
response into BLOCKING vs MINOR findings.
**Outputs:** `run_heckler_review(...) -> dict` — any non-empty
`blocking_findings` is a hard merge block in `stage07_merge`.
