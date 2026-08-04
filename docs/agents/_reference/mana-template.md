# Mana Template (Pato's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Mana And Spell Costs".

- Base Mana pool: **100**.
- Passive regen: **8 per second**, in and out of combat. Retuned from 5/sec 2026-08-03 (backlog
  2.34 / issue #77) — developer playtest found the opening minutes' pacing too Mana-starved to
  support the intended "learn to cast fast" rush. Tuning pass only: every weight class's own
  cost still regenerates well inside its own cooldown window (Light 1.25s vs. 2s, Standard 2.5s
  vs. 4s, Heavy 4.375s vs. 8s — was 2.0/4.0/7.0s at 5/sec), the cost/cooldown table itself is
  unchanged. Pato-validated same day (`pato/log.md`, 2026-08-03): independently re-derived
  8/sec as a real (not break-even) surplus for all three classes, PASS, though not the unique
  correct number in the range (6/sec already clears the same bar — the first fallback to check
  if a playtest reports 8/sec overshoots). **Correction to this file's own prior wording**
  (Pato's same validation pass): the old 5/sec base was "essentially break-even" for Light and
  Standard specifically (both exactly 0% margin), not for Heavy, which already carried a real
  12.5% surplus (35/5=7.0s vs. an 8s cooldown) even before this retune. Pending a developer
  playtest to confirm the feel.
- Weight classes (every spell is authored into exactly one):

| Weight | Mana Cost | Cooldown |
| --- | --- | --- |
| Light | 10 | 2s |
| Standard | 20 | 4s |
| Heavy | 35 | 8s |

- At Master Mastery, cost or cooldown drops **10%** from the weight-class baseline (whichever the spell's design leans on more).
- Pacing target this feeds: regular waves are tuned to resolve before Mana pressure kicks in; boss/trial encounters are tuned to outlast a careless Mana budget (see "Spam Waves Vs. Tactical Trials" in the GDD).

Only Pato edits this file. Warden and Frieren read it; they never invent their own numbers.
