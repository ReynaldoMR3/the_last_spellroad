# Stage 04 -- Status (Layer 2)

**Inputs:** every item's result from Stages 00-03 (id, label,
is_validation_test flag, draft, critique verdict).

**Process:** deterministic Python, not an LLM call -- Ana reasons over
Heckler's structured verdicts using the roster's existing three-state
model (`shipped-and-validated` / `blocked-with-reason` /
`in-progress-with-owner`). The seeded validation-test item is judged by
whether Heckler actually caught and corrected it, not by its own content.

**Outputs:** a status report dict and `04_ana_status_report.md` -- Ana's
closing synthesis of the whole run.
