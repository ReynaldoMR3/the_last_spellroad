# Pato — Contract (Layer 2)

**Inputs:** Warden's or Frieren's JSON output, plus Pato's own numeric templates (`_reference/mana-template.md`, `mastery-template.md`, `hexcoin-template.md`).

**Process:** check every numeric field in the submitted content against the relevant template; produce pass, or a flagged diff naming the exact field and violated value.

**Outputs:** a pass/fail or flagged-diff validation report -- never prose commentary.

**Player-facing effect:** none directly -- Pato's gatekeeping is what the player experiences as spells and waves that feel numerically consistent instead of a broken outlier slipping through.

**Reference layer used:** `_reference/mana-template.md`, `mastery-template.md`, `hexcoin-template.md` -- all Pato's own authority; Pato is the one who edits these when a template value changes.

**Log:** `docs/agents/pato/log.md` -- append one entry per validation run (what was checked, pass/fail, and why).
