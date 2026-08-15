# Mana Template (Pato's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Mana And Spell Costs".

- Base Mana pool: **130**. Retuned from 100 2026-08-14 (issue #235, replacing closed #200) — see
  "Wave 3 Pacing Retune" below for the full diagnosis and derivation.
- Passive regen: **8 per second**, in and out of combat. Unchanged by the 2026-08-14 retune
  below — the steady-state math this figure was validated against still holds exactly as
  written. Retuned from 5/sec 2026-08-03 (backlog
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

## Wave 3 Pacing Retune (2026-08-14, issue #235, replacing closed #200)

**Complaint:** a course-peer playtester hit Mana trouble specifically getting through wave 3,
even after the wave-start Mana reset (#204/PR #205) removed carry-over from earlier waves.
Developer decision: retune first (regen rate and/or weight-class costs and/or wave 3
composition), stay inside Pato's existing authority — don't redesign to cooldown-only casting
yet (every spell's `master_discount: "cost" | "cooldown"` field means a chunk of spells' whole
Mastery payoff is defined in terms of Mana cost; dropping the pool would strand those spells'
bonus, crossing into Pato+Frieren+Loomwright gated-planning territory).

**Root-cause diagnosis, re-derived against the shipped numbers, not assumed:**

1. **Steady-state single-spell spam is not the bottleneck.** This was already established by
   the 2026-08-03 regen retune above and re-confirmed here: every weight class's own cost
   regenerates inside its own cooldown at 8/sec (Light 1.25s < 2s, Standard 2.5s < 4s, Heavy
   4.375s < 8s), so a player spamming one spell in isolation never actually runs the pool dry —
   it self-sustains indefinitely regardless of wave length. No change needed on this axis.
2. **The real pressure is burst depth against a mixed-archetype wave.** A player reacting to a
   wave with multiple enemy archetypes at once (melee + ranged + debuffer) plausibly fires 2-3
   *different* weight-class spells in quick succession — e.g. one Light + one Standard + one
   Heavy costs 10+20+35 = 65 Mana almost instantly, while the flat 8/sec regen only replaces
   ~8 Mana in that same second. At the old 100-point pool, a single such 3-spell burst already
   leaves only 35 Mana — barely one more Light cast — before the player is pool-limited for the
   rest of the fight, i.e. forced to wait on regen exactly as the playtester described.
3. **Wave composition growth by wave 3 is what turns this from a rare edge case into a felt
   problem.** Comparing shipped wave files (`src/data/waves/level-*.json`), modifier-scaled
   total enemy HP grows well past Level 1's onboarding-scale waves (Wave 0: 50, Wave 1: 100,
   Wave 2: 126) by Level 3 (Wave 0: 121, Wave 1: 142, Wave 2: 123) — up to ~42% more total HP
   than Level 1's biggest wave, meaning meaningfully longer fights with more archetype variety
   to react to, and therefore more opportunities for a multi-spell burst to hit the pool floor
   before regen catches up. (This holds whichever reading of "wave 3" is meant — Level 1's own
   third wave already shows the same 2-Debuffer, mixed-archetype shape that recurs and
   intensifies through Level 2 and Level 3 — so the fix below isn't sensitive to resolving that
   ambiguity.)
4. **A mana-regen-draining Debuffer compounds this during exactly the waves it appears in.**
   `murmur_wisp` (the mana-regen Debuffer variant) drains 2.4 Mana/sec per stack
   (`hp-template.md`'s Debuffer Magnitudes table), cutting effective regen from 8/sec to 5.6/sec
   for the whole time it's alive (no decay until wave-clear/death) — worsening the post-burst
   recovery exactly when the player most needs it. The GDD's own issue #211 note already flags
   this as a real exception to the "cast freely, don't think about the pool" framing; this
   retune's diagnosis is consistent with that already-documented gap, not a new finding.

**Conclusion:** the bottleneck is burst *depth* (pool size), not the regen *rate* (already
correct in steady state) and not per-spell costs (would strand Mastery's cost-discount payoff
for no diagnosed reason). Wave composition itself is Warden's already-validated threat-budget
domain (`hp-template.md`'s Per-Level Difficulty Curve, issue #162) — retuning it here would
re-open a separately-validated system without a diagnosed need to.

**Retune applied:** `MAX_MANA` 100 → 130 (+30%), `MANA_REGEN_PER_SEC` and the weight-class
cost/cooldown table left untouched. This buys room for two full 3-spell (Light+Standard+Heavy,
65 Mana each) bursts back-to-back before the pool empties, versus one-and-change at the old 100,
while leaving every already-validated single-spell-class regen margin, every Mastery
cost-discount, and every wave's threat-budget margin exactly as they were. Real resource
tension remains: post-burst recovery at the drained 5.6/sec (murmur_wisp active) still takes
real time, and pool depth alone doesn't let a player ignore Mana entirely — it only extends how
many reactive bursts the pool absorbs before the unchanged regen has to catch up.

**Mastery-margin check (mastery-template.md):** unaffected. Mastery growth is gated purely on
**kills** (`MasterySystem.recordLandedCast`, resolved 2026-08-01), completely decoupled from
Mana spent or casts fired. This retune changes neither wave composition nor enemy kill counts
nor casts-to-kill ratios (no spell power, cooldown, or cost changed) — so the existing 24
kills/tier margin (48/20 = 2.4x at Level 4, the binding level) needs no re-verification beyond
this explicit confirmation that its inputs didn't move.

**Pending:** developer playtest re-confirming wave 3 pacing feels right — this is the ticket's
own gate and cannot be self-verified by Pato; typecheck/test/build are clean (see PR).

Only Pato edits this file. Warden and Frieren read it; they never invent their own numbers.
