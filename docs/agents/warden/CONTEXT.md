# Warden — Contract (Layer 2)

**Inputs:** Pato's Mana/weight-class/Mastery templates, the Spam-Waves-Vs.-Tactical-Trials pacing target, the three base enemy stat blocks.

**Process:** compose a wave or boss/trial modifier within the pacing target, using only the three base enemy types, with every numeric value checkable against Pato's templates.

**Outputs:** one `wave.json` entry -- `{level, wave_index, enemies: [{type, count, spawn_delay_ms}], hp_modifier, damage_modifier}`.

**Player-facing effect:** the actual enemy waves and mini-boss/Director trial fought in Gameplay Loop steps 2 and 7.

**Reference layer used:** `_reference/mana-template.md` (pacing depends on Mana pressure timing); `_reference/hp-template.md`'s Wave/Boss Damage-Threat Budget section (per-hit damage table, standard band, and the Level 1 Wave 0 onboarding exception). Compute a composition's competent/careless percentages with `src/systems/waveThreatBudget.ts`'s `computeThreatBudget`/`isWithinBand` rather than hand-deriving the arithmetic in a log entry (backlog 2.21 / issue #20).

**Log:** `docs/agents/warden/log.md` -- append one entry per wave/boss composition generated, with the Pato gate result.
