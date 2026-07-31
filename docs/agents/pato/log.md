# Pato — Validation Log

Append-only, dated, one entry per validation run.

## 2026-07-21

Context store established. No validation runs logged yet.

## 2026-07-21 (2)

Set the new HP template (`docs/agents/_reference/hp-template.md`) at Ana's dispatch, following Warden's pacing-informed design intent for the mage's HP pool and the three base enemy archetypes' damage/debuffs. Basis: structurally parallel to the existing Mana template (100-point pool) but with no in-combat regen and a full reset per wave/checkpoint, per the developer's locked conceptual design. Finalized authoritative numbers from Warden's proposed ranges rather than taking them verbatim — picked 7/4 flat per-hit damage for Melee/Ranged (top and bottom of Warden's suggested ranges respectively), 12% speed drain and 1.5 Mana/sec regen drain for the Debuffer variants, and tightened Warden's suggested 2-3 stacking cap down to a hard cap of 2 applications specifically because the no-regen-in-combat rule makes compounding debuffs riskier here than against a regenerating pool. Left the phase-transition-recovery question (Warden's flagged death-spiral risk on long multi-phase bosses) as an explicitly optional, off-by-default rule pending developer sign-off — did not resolve that fork myself, since the developer has not decided it.

## 2026-07-21 (3)

Developer signed off on the phase-transition recovery fork: enabled by default, gated behind a Hexcoin fee ("50% of the money it already won on this road, so the game is not so easy"). Updated `docs/agents/_reference/hp-template.md`'s "Phase-Transition Partial HP Recovery" section in place — status changed from PENDING to ENABLED, rule fully specified (choice offered at each boss/trial phase-break, fee must be paid in full or no recovery, no stacking within a phase-break, 15% restore amount left unchanged since the fee is a cost/accessibility lever on the Hexcoin economy and not a signal to revise the HP-restore magnitude). Left one parameter explicitly flagged rather than guessing: "on this road" is ambiguous between (1) 50% of Hexcoin earned since entering the current expedition/road segment (expedition-scoped, resets each expedition) and (2) 50% of lifetime Hexcoin balance. Recommended reading 1 on textual grounds ("on this road" mirrors the expedition/road-segment scope already used elsewhere in the HP template) and design grounds (keeps the fee proportional to the current run's stakes rather than drifting upward over a whole playthrough) — but did not silently pick it; flagged for developer confirmation before Warden/Frieren build against it, same handling as the original phase-recovery fork.

Also updated `docs/agents/_reference/hexcoin-template.md` to record the new fee line and flagged a second-order tension: the new fee draws from the same undecided, potentially-scarce Hexcoin pool as the existing 100-Hexcoin spell-choice fee, whose reachability/farmability is already an open developer decision. Under the expedition-scoped reading this makes that existing disagreement higher-stakes (two fees now compete for one scarce per-segment sub-total); under the lifetime reading it instead risks making the flat 100-Hexcoin fee's tuning comparatively irrelevant without resolving reachability either way. Not resolved — flagged for the developer, who should weigh both fees together when deciding the backtracking/farmability question.

## 2026-07-21 (4)

Developer resolved all five of Heckler's blocking findings against the Phase-Transition Recovery bundle (`docs/superpowers/specs/2026-07-21-death-recovery-fee-decisions.md`, dispatched by Ana). Folded all five into `docs/agents/_reference/hp-template.md` and `hexcoin-template.md` as the final numeric spec — no pending sub-parameters remain in either file.

`hp-template.md`, "Phase-Transition Partial HP Recovery" section rewritten in place:

- **Cap formula** (developer decision 1): (boss's total phase-breaks − 1), hard-ceilinged at 3 recoveries. Settled, no longer tied to a flat developer-picked number.
- **Money ceiling** (decision 1, Pato's own enforcement layer on top of the cap): total HP recoverable via fee per fight can never exceed 33% of that boss's competent-play threat budget (this file's own Damage-Threat Budget table). Worked the actual arithmetic into the file rather than leaving it as a percentage: one 15-HP recovery only clears the ceiling at a competent-play budget ≥ ~45.5 HP, so within the current 40-60 HP budget table, Pato should expect to clear 0-1 purchasable recoveries per boss in practice, not the full 3 the cap formula alone permits on a long fight. Stated explicitly that Pato rejects any Warden phase-break submission exceeding this share — enforcement, not a suggestion to Warden.
- **Fee model** (decision 2): deleted the "50% of [BASIS FLAGGED]" model entirely. Replaced with a flat, fixed Hexcoin cost, same every time regardless of run performance — removes the inverted incentive Heckler's Player Psychologist persona flagged (struggling players affording it least).
- **Fee amount — my own numeric call: flat 30 Hexcoin.** Reasoning shown in full in the file: forward-only backtracking (GDD, Gameplay Loop) bounds per-expedition income to a real number for the first time; estimated a reasonably active player's pre-boss Hexcoin balance at ~20-70 for the vertical slice's 5-10-level, single-mini-boss scope (a handful of kills per wave across ~4-9 waves before the boss checkpoint), cross-checked against the GDD's own framing of the existing 100-Hexcoin fee as "deliberately steep... roughly the return from 100 defeated enemies." 30 lands near the middle of that range — affordable for active play, a real bite for a struggling run, and clearly lighter-weight than the 100-Hexcoin fee so the two don't read as duplicates. Deliberately did not tier by boss/expedition — the vertical slice ships exactly one boss, so a tier table now would be guessing at budgets that don't exist yet; flagged in-file that Pato re-prices this when a second boss or tier exists, using the same income-estimate method rather than a guessed multiplier.
- **Basis** (decision 3): closed my own earlier flag in favor of expedition-scoped Hexcoin (earned since the current expedition/road-segment began, resetting at each checkpoint) — my original recommendation, now developer-settled. Removed the "flag, not resolution" language; this is no longer conditional.
- **Mid-fight-kill freeze** (decision 4): eligible balance frozen at fight-start; mid-fight kills (adds, summons) bank toward the expedition total but cannot fund that same fight's own fee. Called this out explicitly as an instruction to Loomwright (snapshot the balance at encounter start, validate every payment against the frozen snapshot, not the live total) so the implementation detail isn't missed.
- Referenced forward-only (decision/GDD item 6) as justification for why the fee amount is pickable at all, without re-deriving the rule itself — that's Warden's/the GDD's territory, not mine to restate.

`hexcoin-template.md` updated in parallel: deleted the "50% of [BASIS FLAGGED]" fee line, replaced with the flat 30-Hexcoin Fee 2 alongside the existing 100-Hexcoin Fee 1; resolved the basis (expedition-scoped) and mid-fight freeze in the same terms as `hp-template.md`; closed the 2026-07-21 review-board reachability/farmability disagreement (forward-only settles it — the economy is neither unreachable nor farmable, just bounded); and resolved my own previously-open "new tension" flag about the two fees competing for one pool. Resolution: this is not a bug — it's the intended shape of the economy now that backtracking is settled and both fees are flat numbers. Fee 2 is affordable against the ~20-70 Hexcoin pre-boss estimate most of the time; Fee 1 is not, by the GDD's own design intent ("deliberately steep"). A mage spending on one has less banked for the other — a real, felt tradeoff, not a defect. Explicitly declined to re-price Fee 1 to compensate; if a future playtest shows Fee 1 is truly unreachable (not just steep) within a normal expedition, that's a developer call, not something Pato quietly fixes by moving Fee 2's number.

Handed off back to Ana per the standard gate — next stop per the decision record is Warden (phase-break counts against the new cap/ceiling), then Loomwright (engine implementation, including the freeze-snapshot behavior), then Heckler (one more critique pass), then Lorena (narrative framing), all per Ana's own dispatch order.

## 2026-07-21 (5)

Gate-check run against Warden's first real wave/boss composition (`docs/agents/warden/log.md`, "First real wave/boss composition: the vertical slice's mini-boss/Director trial" entry) — the vertical slice's one mini-boss/Director avatar, 3 phases / 2 phase-breaks, aggregate Melee x5, Ranged x11, Debuffer x3. Independently recomputed every numeric claim against `hp-template.md` rather than accepting Warden's arithmetic on inspection, per the author/grader split (Pato does not trust content to look plausible — it re-derives).

**1. Cap formula** — template: cap = min(phase_breaks − 1, 3). Warden's phase_breaks = 2. min(2−1, 3) = **1**. Warden's claimed cap of 1 recovery is correct.

**2. Money ceiling** — template: recoverable HP ≤ 33% of competent-play budget. Warden's competent-play budget = 51 HP. 0.33 × 51 = 16.83 HP ceiling. Warden's one 15-HP recovery: 15 ≤ 16.83 — **clears**. As a share of budget: 15 / 51 = 29.41%, vs. the 33% ceiling — margin = 33% − 29.41% = 3.59 percentage points, matching Warden's own "~3.6-point margin" claim. Confirmed independently, not just restated.

**3. Damage-threat recomputation against the fixed per-hit table** (Melee 7, Ranged 4, Debuffer 0 direct — this file's Enemy Archetype table):
- Careless play (every enemy's fixed hit landing once): 5 × 7 (Melee) + 11 × 4 (Ranged) = 35 + 44 = **79 HP**. Matches Warden's claimed 79 HP / 79% exactly, and sits inside the Boss/Trial careless-play band (70–90%+).
- Competent play (Warden's stated model: Ranged fully realized + only ~20% of Melee realized): 11 × 4 + 0.2 × 5 × 7 = 44 + 7 = **51 HP**. Matches Warden's claimed 51 HP / 51% exactly, and sits inside the Boss/Trial competent-play band (40–60%), upper-middle as claimed.
- Both totals independently reproduced from the fixed per-hit values and the stated enemy counts — no discrepancy in either.

**4. Debuffer stacking claim** — Warden logged 3 Debuffers total, one per phase across 3 phases (drain types speed / mana-regen / speed), and claimed no two concurrent same-drain-type Debuffers share a phase. Checked: with exactly one Debuffer spawned per phase, at most one Debuffer is ever active within a given phase — same-drain-type concurrency within a single phase is structurally impossible at this composition, so the claim holds (trivially, but it holds; it isn't a coincidence Warden got right by luck, it's guaranteed by the 1-per-phase design). Per-phase application count (1) is also within this template's hard stacking cap of 2 for both speed and mana-regen drain, with margin to spare even if drains were to persist across a phase transition.

**Verdict: PASS.** No field diverges from `hp-template.md`. All four checks — cap formula, money ceiling, careless/competent damage-threat arithmetic, and Debuffer concurrency — independently reproduce Warden's claimed numbers exactly; nothing flagged.

**Unblocked:** this composition is now ship-ready numerically. Loomwright can build the encounter (including the frozen-Hexcoin-snapshot recovery offer at each of the 2 phase-breaks) against these exact figures; Heckler can take this composition into its next adversarial pass without re-litigating the arithmetic Pato already cleared.

## 2026-07-23 (2) — Gate-check: Frieren's first 3 spells (backlog Task 2.1/2.2)

Checked `arc_lance` (lightning/line/light), `flame_sweep` (fire/cone/standard), `frost_nova` (ice/circle/heavy) against `mana-template.md` and `mastery-template.md`.

**Constraint checks:**
- Elements: lightning, fire, ice — all four of {fire, ice, earth, lightning} are valid; 3 distinct elements used, clearing the ≥2-element requirement. Not a violation that earth is unused — nothing requires every element in the first 3 spells.
- Shapes: line, cone, circle — exactly one of each, matching the vertical slice's full shape set with no repeats.
- Weight classes: light, standard, heavy — all three tiers used, clearing the ≥2-weight requirement with margin.
- Mastery scaling: not authored per spell in any of the three (correct — it's automatic per `mastery-template.md`, never a per-spell field).
- Tactical tradeoff: all three state a genuine cost, not a pure upgrade — arc_lance trades power for pierce+cheapness, flame_sweep is a deliberate generalist (no single best stat), frost_nova trades exposure time and Mana cost for its peak power/target count. None read as a strictly-dominant option over the other two.

**One flagged diff, mechanical not creative — normalized before shipping:** Frieren's `weight` field values were submitted capitalized (`"Light"`, `"Standard"`, `"Heavy"`), matching the template's prose headings, but the GDD's own `spell.json` schema example uses lowercase (`"weight": "standard"`) and the engine's `Weight` type is lowercase-only. Normalized all three to `light`/`standard`/`heavy` in `src/data/spells/spells.json` — this is Pato checking Frieren's output against the fixed schema convention, not altering a template value, so it doesn't cross the "cannot silently adjust a template to make content pass" line; the numbers themselves (base_power, base_targets) are untouched.

**Numeric sanity check** (not a hard template rule, since `mana-template.md` doesn't bound base_power/base_targets directly — Frieren has latitude here, this is just confirming nothing looks like an invented Mastery-scaling or weight-class number sneaking in): base_power values (3, 5, 7) and base_targets (2, 2, 3) are small integers in the same rough range as the GDD's own illustrative example (base_power 5, base_targets 1), and loosely track weight class (Light lowest power, Heavy highest) — no red flag.

**Verdict: PASS**, one normalization applied (weight-field casing), zero numeric violations.

## 2026-07-23 (3) — Gate-check: Warden's first regular-wave batch, Level 1 waves 0-2 (backlog Task 2.4/2.5)

Independently recomputed every arithmetic claim in Warden's 2026-07-23 log entry against `hp-template.md`'s fixed per-hit table (Melee 7, Ranged 4, Debuffer 0 direct) and the regular-wave damage-threat band (competent 10-15%, careless 25-35%), rather than accepting Warden's numbers on inspection — same standard as the mini-boss gate-check above.

**Wave 0** (spellbound_thug/Melee x3, hexbow_skirmisher/Ranged x2): careless 3×7 + 2×4 = 21 + 8 = **29** — matches, inside 25-35. Competent 2×4 + 0.2×3×7 = 8 + 4.2 = **12.2** — matches, inside 10-15.

**Wave 1** (Melee x2, Ranged x3, murmur_wisp/Debuffer-mana_regen x1): careless 2×7 + 3×4 = 14 + 12 = **26** — matches, inside 25-35. Competent 3×4 + 0.2×2×7 = 12 + 2.8 = **14.8** — matches. Warden flagged this as close to the 15% ceiling and asked for an explicit call: **14.8 < 15, this passes**, margin is 0.2 percentage points — real but thin. Ruling: ship as-is; any future edit to this specific wave (adding a Ranged unit, in particular) must be re-checked against this ceiling before shipping, since there is no margin left to absorb one more Ranged unit (a 4th Ranged alone would add 0.8, landing at 15.6% and failing). Debuffer: 5 − 1.5 = 3.5 Mana/sec regen, above the 2/sec floor; 1 application, under the 2-application cap — clears.

**Wave 2** (Melee x3, Ranged x2, creeping_bramble/Debuffer-speed x1, murmur_wisp/Debuffer-mana_regen x1): careless and competent arithmetic identical to Wave 0 (29 / 12.2) since both Debuffers contribute 0 direct HP — confirmed, not just restated. Debuffer stacking: one speed application (12%, under the 24%/2-application cap) and one separate mana-regen application (3.5/sec effective, under cap and above floor) — two different variants, not two of the same, so neither's own cap is anywhere near touched by this composition.

**Enemy-registry mapping check:** all 4 invented names (spellbound_thug, hexbow_skirmisher, murmur_wisp, creeping_bramble) map to exactly one of the three valid archetypes each, no fourth archetype invented, no name reused across archetypes. `hp_modifier`/`damage_modifier` held at 1.0 across all three waves — consistent with the mini-boss precedent (no base-enemy-HP template exists to scale against).

**Verdict: PASS on all three waves.** No field diverges from `hp-template.md`. Explicit ruling recorded on Wave 1's tight margin per Warden's own request, rather than a silent assumed pass.

**Unblocked:** both Frieren's 3 spells and Warden's 3-wave Level 1 batch are ship-ready. Handed to Loomwright to wire into the engine (AoE shape implementation against the 3 spells, wave-loader against the 3 waves).

## 2026-07-23 (4) — Mastery growth rate (backlog item 0.4): still not sizeable, even with Warden's first wave data now in hand

The backlog's own task 2.5 framed Warden's first wave batch as the trigger to finally size this number. Checked the actual arithmetic before doing so: Level 1's three waves total 5 + 6 + 7 = 18 enemies. With Frieren's three spells hitting 2, 2, and 3 targets respectively at Novice, clearing an entire level plausibly takes something on the rough order of 7-8 total landed casts split across three spells — meaning a naive per-spell growth rate sized off this one level alone would land somewhere around 2-3 landed casts per tier, maxing most of the player's spellbook to Master within a single level of a 5-10-level slice. That's not a defensible number, it's an artifact of too small a sample: one level's data can't responsibly size a curve meant to span the whole vertical slice's progression arc, any more than one data point can fit a trend line.

**Not setting a number now, for the same reason the developer originally deferred this on 2026-07-22** — the difference is the deferral condition needs restating more precisely: "wait for Warden's regular-wave data" meant enough data across multiple levels to see a real curve, not literally the first wave batch that happens to exist. Restating this in `mastery-template.md` so the next session doesn't mistake "Warden generated some wave data" for "the blocking condition cleared." Recommend picking this up once at least 2-3 levels' worth of wave data exist (roughly 40-60+ enemies), enough to size a rate that doesn't cap the spellbook in the first level.

Status: `blocked-with-reason`, reason narrowed and corrected rather than left as originally (and now inaccurately) scoped.

## 2026-07-25 — Gate-check: Warden's kiting/lane-containment retune (backlog 2.10)

Warden's 2026-07-25 log entry (`docs/agents/warden/log.md`) proposes `RANGED_PREFERRED_RANGE` 220→240 and `DEBUFFER_PREFERRED_RANGE` 200→150, explicitly asking for Pato's independent check since `hp-template.md` has no kiting-range table to look this up against. Independently recomputed against the actual lane geometry (`SpellroadScene.ts`: `ROAD_LEFT` 90, `ROAD_TOP` 190, `ROAD_WIDTH` 780, `ROAD_HEIGHT` 160 → lane x∈[90,870], y∈[190,350], centerline y=270) and `Enemy.ts`'s actual `update()` movement logic, rather than accepting Warden's 90px/3.5x-sprite framing on inspection.

**1. Ring-separation arithmetic — corrected.** `Enemy.ts` doesn't hold a kiter at one fixed distance; the movement branch (`distance > preferredRange+20` → approach, `< preferredRange-20` → retreat, else hold) settles each archetype into a **band of preferredRange ± 20 (40px wide)**. Old values (ranged 220, debuffer 200) produce bands [200,240] and [180,220] — these **overlap by 20px**, they are not merely "20px apart" as the raw-delta framing implies; that overlap is the actual mechanism behind the reported stacking. New values (240/150) produce bands [220,260] and [130,170] — a real, non-overlapping **50px gap** (170→220), not the 90px Warden computed from the raw preferred-range delta (240−150=90). 50px against the 26px sprite is **~1.9x footprint, not ~3.5x**. This is a correction to the stated reasoning, not to the numbers: 50px is still a clean, non-overlapping separation, so 240/150 still solves the overlap problem — just with roughly half the margin claimed. Correct figure to cite going forward: **50px / ~1.9x sprite footprint**, not 90px / 3.5x.

**2. Wall-pin re-trigger near spawn — checked, no new issue.** Enemy spawn `{x:820,y:270}` (`SpellroadScene.startWave`) sits only 50px from the right lane wall (870), under either preferred range. But initial mage-to-enemy distance at wave start (mage `{x:180,y:270}`, same y) is 640px — outside even the attack-trigger radius (preferredRange+40 = 280 max) — so the enemy's first move is *approach*, away from the wall, not retreat. Wall-pinning only arises later if the mage pushes the enemy back toward the wall end of the lane, a positioning dynamic that existed identically at 220 and isn't changed by moving to 240 — matches Warden's own reasoning that this is exactly why the wall-slide behavior spec is the complementary fix, not something a numeric retune alone should resolve. Common mid-lane case: at lane-center (x≈480) max room to either wall is 390px, comfortably above the 280px max operational radius either archetype ever needs.

**3. No other arithmetic issues found.** Debuffer's new 150 sits 116px clear of `MELEE_RANGE` (34), no overlap risk; both new preferred ranges (max radius incl. attack buffer: 280 ranged / 210 debuffer) fit well inside the 780px lane and the 390px mid-lane per-side headroom; `MELEE_RANGE` and all other archetype constants correctly left untouched.

**Verdict: PASS.** 240 (ranged) / 150 (debuffer) do solve the stated overlap/kiting problem — bands no longer overlap and settle at a clearly distinct, correctly-ordered separation. Flagging one correction to Warden's stated reasoning (true hold-band gap is 50px/~1.9x sprite, not 90px/3.5x — the ±20 movement-tolerance band on each side eats 40px of the nominal delta), not to her chosen numbers. No number change recommended. Unblocked: Loomwright can implement both the retune and the wall-slide behavior spec against 240/150 as proposed.

## 2026-07-25 — Gate-check: Frieren's 9 new spells (backlog Task 3.2) — BLOCKED, incomplete submission

Read Frieren's 2026-07-25 log entry directly (`docs/agents/frieren/log.md`) rather than taking the dispatch summary's word for its contents, per standing practice. The dispatch summary characterized the entry as including "each entry's tradeoff sentence and JSON." That is not accurate: the entry contains, per spell, only an id (the spell name), element/shape/weight stated in prose (weight capitalized — same convention drift as the 2026-07-23 batch), and a tradeoff sentence. **No JSON block exists anywhere in the entry, and no per-spell `base_power`, `base_targets`, or `master_discount` value is logged for any of the 9 entries** — only batch-level prose claims ("no entry sets both `master_discount` values," "every base_power/base_targets pair is distinct"). Confirmed this isn't logged elsewhere either: checked `src/data/spells/spells.json` (still only the 3 shipped entries), the `.worktrees/phase-1-2-production` copy of both files, and a repo-wide grep for all 9 new ids — zero hits outside the prose log entry.

**Checkable fields only (id, element, shape, weight) — verified for all 9:**

1. `stone_spike` (earth/line/Light) — valid element/shape/weight; niche unique vs. the 3 shipped and the other 8. id unique.
2. `flare_jab` (fire/cone/Light) — valid; niche unique (shipped fire is cone/**standard**, not light); id unique.
3. `spark_ring` (lightning/circle/Light) — valid; niche unique (shipped lightning is line/light, not circle); id unique.
4. `glacial_shard` (ice/line/Standard) — valid; niche unique (shipped ice is circle/heavy); id unique.
5. `rubble_burst` (earth/cone/Standard) — valid; niche unique; id unique.
6. `thunder_dome` (lightning/circle/Standard) — valid; niche unique; id unique.
7. `magma_lance` (fire/line/Heavy) — valid; niche unique (shipped fire is cone/standard); id unique.
8. `frost_breath` (ice/cone/Heavy) — valid; niche unique (shipped ice is circle/heavy, not cone); id unique.
9. `tremor_field` (earth/circle/Heavy) — valid; niche unique; id unique.

Also independently verified the two batch-level structural claims: the weight×shape 3x3 grid (light/standard/heavy × line/cone/circle) is genuinely one-each with no repeats or gaps, and the element split is earth 3 / fire 2 / lightning 2 / ice 2 in this batch, which combined with the 3 already-shipped (1 fire, 1 ice, 1 lightning, 0 earth) does land on 3/3/3/3 across the finished 12-spell roster as claimed.

**Not checkable — blocking:** `base_power`, `base_targets`, and `master_discount` are absent for all 9 entries. Per my own contract, I check submitted numeric fields against template/schema; I don't invent values on Frieren's behalf to wave a batch through, and I don't approve a `master_discount` I never saw. This is not a template violation (nothing invented contradicts a template value) — it's a missing submission, so no entry can be marked PASS.

**Verdict: BLOCKED for all 9 individually**, pending Frieren logging the actual per-spell `base_power`/`base_targets`/`master_discount` JSON. Flagged back through Ana for Frieren to complete the submission before this gate can re-run.

## 2026-07-25 (2) — Gate-check: Frieren's 9 new spells (backlog Task 3.2), re-run on completed submission — supersedes/completes the entry directly above from this same session

Ana appended a "Correction (same session)" block to Frieren's 2026-07-25 log entry with the full `spell.json` payload for all 9 entries, taken verbatim from Frieren's original dispatch response. Re-running the gate now that `base_power`, `base_targets`, and `master_discount` actually exist to check. This entry does not retract the earlier BLOCKED verdict as wrong — that block was correct against what was logged at the time (a missing submission) — it records that the submission is now complete and re-validates it.

Checked all 9 against `mana-template.md`'s weight-class table (Light 10/2s, Standard 20/4s, Heavy 35/8s — `weight` need only name a valid class, since cost/cooldown are derived at runtime, not stored per-spell) and `src/data/types.ts`'s `SpellDefinition` schema (`master_discount` ∈ {"cost","cooldown"}; `weight` ∈ {"light","standard","heavy"}; `element` ∈ the 4 valid elements; `shape` ∈ the 3 valid shapes; `base_power`/`base_targets` numeric; `id` unique against each other and the 3 shipped ids `arc_lance`/`flame_sweep`/`frost_nova`).

1. `stone_spike` — earth/line/light, base_power 4, base_targets 1, master_discount cooldown. **PASS.**
2. `flare_jab` — fire/cone/light, base_power 2, base_targets 2, master_discount cost. **PASS.**
3. `spark_ring` — lightning/circle/light, base_power 2, base_targets 4, master_discount cooldown. **PASS.**
4. `glacial_shard` — ice/line/standard, base_power 4, base_targets 3, master_discount cost. **PASS.**
5. `rubble_burst` — earth/cone/standard, base_power 3, base_targets 3, master_discount cost. **PASS.**
6. `thunder_dome` — lightning/circle/standard, base_power 5, base_targets 4, master_discount cooldown. **PASS.**
7. `magma_lance` — fire/line/heavy, base_power 9, base_targets 1, master_discount cost. **PASS.**
8. `frost_breath` — ice/cone/heavy, base_power 6, base_targets 4, master_discount cooldown. **PASS.**
9. `tremor_field` — earth/circle/heavy, base_power 5, base_targets 6, master_discount cost. **PASS.**

All 9 `weight` values are correctly lowercase this time (no repeat of the 2026-07-23 batch's capitalization drift that required normalization). All 9 `master_discount` values are single, valid enum strings — none sets both, none uses an invalid value. `id` uniqueness independently re-checked: 9 new ids are pairwise distinct and none collides with `arc_lance`/`flame_sweep`/`frost_nova`. `element`/`shape` values all valid.

Also re-verified, now against real numbers, the batch-level claim from the original entry that every (`base_power`, `base_targets`) pair across the full 12-spell roster is distinct: shipped (3,2) (5,2) (7,3); new (4,1) (2,2) (2,4) (4,3) (3,3) (5,4) (9,1) (6,4) (5,6). All 12 pairs are pairwise distinct — claim holds, no copy-pasted pair.

**Verdict: PASS on all 9 entries, individually.** Zero flagged diffs.

**Cleared:** this batch is now ship-ready numerically. Ana/Loomwright are clear to write all 9 entries into `src/data/spells/spells.json` (bringing the shipped roster from 3 to 12) — Pato has not written to that file itself, per standing practice (Pato validates, never authors the shipped data).

## 2026-07-25 (3) — Part 1: Gate-check Warden's Level 2 + Level 3 wave batch (backlog 3.3/3.5); Part 2: Mastery growth rate sizing (backlog 0.4)

### Part 1

Read Warden's second 2026-07-25 log entry directly (`docs/agents/warden/log.md`, "Level 2 and Level 3, 3 waves each"). Independently re-ran the integer search over the fixed per-hit table (Melee 7, Ranged 4, Debuffer 0 direct) rather than accepting Warden's claim that (M=3,R=2) and (M=2,R=3) are the *only* pairs clearing both the competent (10-15%) and careless (25-35%) regular-wave bands: brute-forced M,R 0-6 and confirmed exactly those two pairs and no others — claim holds.

**Level 2 wave 0** (M=3,R=2, 1 speed application): 29 careless / 12.2 competent — in-band. Speed 12% (1 app, cap 2/24%) — clear. **PASS.**
**Level 2 wave 1** (M=2,R=3, 2 mana-regen applications): 26 / 14.8 — in-band, top-of-band margin reused from Level 1 wave 1, not exceeded. Mana-regen 1.5×2=3.0 drain, 5−3.0=2.0/sec — lands exactly on the floor ("never drop below 2" — 2.0 is not below 2.0, compliant, not a violation). **PASS.**
**Level 2 wave 2** (M=3,R=2, 2 speed + 1 mana-regen applications): 29 / 12.2 — in-band. Speed 12×2=24% — exactly at the 24% hard cap, compliant (cap is "2 applications (24% max)," not exceeded). Mana-regen 1 app, 3.5/sec — clear. **PASS.**
**Level 3 wave 0** (M=3,R=2, 1 mana-regen application): 29 / 12.2 — in-band. Regen 3.5/sec — clear. **PASS.**
**Level 3 wave 1 — flagged by Warden for explicit check** (M=2,R=3, 2 speed + 2 mana-regen applications simultaneously): 26 / 14.8 — in-band. Speed 24% — at cap. Mana-regen 3.0/sec → 2.0/sec — at floor. Both caps hit in the same wave for the first time in the game, exactly as Warden flagged; independently confirmed both land ON their respective boundary, neither exceeds it — the template's wording ("max," "never drop below") treats the boundary itself as compliant, not a violation. **PASS**, not a rubber stamp: this is the tightest wave in the batch and it clears on the actual numbers, not on Warden's say-so.
**Level 3 wave 2** (Total M=3 [2 spellbound_thug+1 dread_reaver], Total R=2 [1 hexbow_skirmisker+1 storm_lancer], 1 speed application): 29 / 12.2 — in-band, correctly re-verified with the two new names folded into the same M/R arithmetic as any other melee/ranged unit (they carry no debuff variant and no distinct stat line, per Warden's own statement). Speed 12% — clear. **PASS.**

Enemy counts independently re-tallied per wave (not taken from Warden's summary): L2 = 6+7+8 = 21, L3 = 6+9+6 = 21, matching Warden's claim exactly. `hp_modifier`/`damage_modifier` held at 1.0 throughout — correct, no template field exists to scale against.

**`dread_reaver`→melee and `storm_lancer`→ranged (both no debuff variant)** are correctly used in Warden's arithmetic above. Adding these two mappings to `src/data/enemyRegistry.ts` is Loomwright/Ana's action per the standing rule Warden herself states (Warden names the mapping, never edits the registry) — not something Pato edits either, since Pato validates numeric content, not engine data files. Flagging, not doing it.

**Verdict: PASS on all 6 waves, individually, no flagged diffs.** Unblocked: Loomwright can build Level 2 and Level 3 against these compositions once the two new registry entries are added.

### Part 2

Part 1 cleared fully (all 6 waves passed), so backlog item 0.4 is unblocked per the task's own gate. Total enemies across the 3 validated levels: 18 (L1) + 21 (L2) + 21 (L3) = **60**, matching the developer's stated "2-3 levels' worth of wave data (40-60+ enemies)" threshold exactly.

**Derivation.** `MasterySystem.recordLandedCast` increments per-spell per landed cast regardless of target count, so the spell that mathematically mastery-races fastest is the kit's lowest-target spell (base_targets=1: `stone_spike`, `magma_lance`) — one landed cast can equal one kill for those, unlike a 6-target spell (`tremor_field`) which needs far fewer casts to clear the same enemies. Worst-case bound: the largest single level in the data (L2 or L3, 21 enemies) could yield up to 21 landed casts of a 1-target spell if a player spammed it against every enemy that level alone. The failure mode to avoid (my own 2026-07-23 (4) finding) is exactly this: a rate that lets 2 tier-ups (Novice→Adept→Master, i.e. 2× the per-tier rate) complete inside that single-level ceiling.

**Sized rate: 20 landed casts/tier (40 to fully master one spell).** 40 vs. the 21-enemy single-level ceiling gives ~1.9x headroom — mastering even a 1-target spell needs nearly 2 full levels of exclusive single-spell spam at minimum, a real margin past the single-level failure mode, not a razor-thin pass. Checked against the full 60-enemy, 3-level sample too: 40 ≤ 60, so a maximally dedicated specialist can just about master one favored spell by the end of Level 3 — a reachable, earned payoff — while ordinary varied play (kit-wide average 35 total base_targets / 12 spells = 2.92 targets/cast, → only ~60/2.92 ≈ 20.5 total landed casts available across all 3 levels if spread efficiently across the *whole* kit) leaves every spell far short of even one tier-up without deliberate focus. That asymmetry is the intended shape: most of the 12-spell kit stays Novice/Adept through the sampled levels; only actively-mained spells progress, and not before roughly level 2-3 — directly avoiding the "caps most of the spellbook at Master within a single level" failure this was deferred over.

Updated `docs/agents/_reference/mastery-template.md` in place (Pato's own file) with this resolution and the full arithmetic, replacing the "still open" framing. Did not touch `src/systems/MasterySystem.ts` myself (engine code, Loomwright's territory) — recorded an explicit action item there instead: replace `PLACEHOLDER_LANDED_CASTS_PER_TIER = 5` with **20** and drop the placeholder comment, since this is now a sized design number.

**Status: RESOLVED**, backlog item 0.4 closed pending Loomwright's constant update.

## 2026-07-25 (4) — Correction to backlog 0.4: Mastery growth rate re-derived, supersedes entry (3)'s Part 2

Heckler's 2026-07-25 critique (`docs/agents/heckler/log.md`, finding 2) found a real error in the 20-casts/tier sizing from entry (3) Part 2: that derivation assumed "1 landed cast ≈ 1 kill" for the fastest-mastering (lowest-`base_targets`) spell. That premise is false against the game's own shipped numbers — `Enemy.ts` HP (melee 18, ranged 14, debuffer 22) is well above any Novice-tier spell's `base_power`, so no spell one-shots an enemy; every kill costs multiple landed casts. Heckler recomputed: `stone_spike` (power 4, default-equipped) spammed against Level 2's real composition (8 melee/7 ranged/6 debuffer, 21 total, from `src/data/waves/level-2.json`) yields `8×ceil(18/4) + 7×ceil(14/4) + 6×ceil(22/4) = 40+28+36 = 104` landed casts achievable in that single level — 2.6x the 40-cast mastery threshold, reproducing the exact failure mode ("caps most of the spellbook at Master within a single level") the original sizing was meant to avoid.

Re-derived from scratch, not just patched Heckler's specific example.

**1. Actual worst-case (fastest-mastering) strategy.** `MasterySystem.recordLandedCast` still increments per-spell per landed cast regardless of target count — that part of the original reasoning was correct. What's wrong is that the mastery-race speed is driven by casts-to-kill = `ceil(enemy_HP / spell_power)`, not by `base_targets`. A spell's target count doesn't force a player to spread damage across multiple enemies — a player grinding mastery can deliberately isolate one enemy at a time, in which case only `power` matters, not `base_targets`. That makes the true worst case the kit's **lowest-`base_power`** spell, not its lowest-`base_targets` one: checking all 12 spells in `src/data/spells/spells.json`, the minimum `base_power` is **2** (`flare_jab`, `spark_ring`), below `stone_spike`'s 4 — and both are already in the default 6-spell loadout (Heckler's finding 4), so this is a reachable worst case today, not hypothetical. This is a stronger worst case than Heckler's own exemplar, not merely a fix to it.

Mastery scaling also feeds back into the grind itself, as flagged in the task: as the spammed spell tiers up, its own power rises (+1 Adept, +2 Master per `MasterySystem.getScaling`), so kills get cheaper partway through the grind. The corrected number has to model this as a cumulative-damage step function over cast count, not a flat Novice-power estimate, since a flat estimate would either over- or under-state the achievable total depending on where the tier-up thresholds land relative to the grind.

**2. Corrected number and why it holds.** Let `k` = casts/tier (mastery at `2k` total casts). Spamming the power-2 spell in isolation: casts 1..k deal 2 dmg each (Novice), casts k+1..2k deal 3 dmg each (Adept, +1 power). Cumulative damage at the mastery point = `2k + 3k = 5k`. Casts needed to fully clear one level of total enemy HP `D`, accounting for the same step-up: `T(k) = (k + D) / 3` (valid once `k ≥ D/5`, i.e. the Adept phase alone finishes the clear — true for the k values considered here). Safety condition: `2k` (mastery point) must clearly exceed `T(k)` (casts to clear one level) — mastering must cost more than a single level can supply, with real margin, not a hair's-breadth pass.

**3. Arithmetic against real compositions.** Level 2 (`level-2.json`): 8 melee×18 + 7 ranged×14 + 6 debuffer×22 = 374 total HP. Level 3 (`level-3.json`, `dread_reaver`→melee, `storm_lancer`→ranged folded in per `enemyRegistry.ts`): same composition shape, also 374 HP — tied for the largest single level, matching entry (3) Part 1's independently-verified 21-enemy counts for both. Level 1 (`level-1.json`): 8 melee + 7 ranged + 3 debuffer = 308 HP, smaller, non-binding.

Solving for `k = 180`: `T(180) = (180 + 374) / 3 = 184.67 → 185` casts to fully clear Level 2 (or 3) alone with the power-2 spell in isolation. Mastery point `2k = 360`. Margin: `360 / 185 ≈ 1.95x` — mastering the kit's weakest-power spell requires nearly two full Level-2/3-sized levels of exclusive single-target spam, not a fraction of one. Level 1 is even safer (`T(180) = 163`, margin ≈ 2.2x). This is the same ~1.9-2x margin standard the original (flawed) derivation aimed for, now checked against the actual casts-to-kill relationship instead of the false 1:1 assumption.

**Full 3-level reachability, so the number still rewards dedication.** Across all three levels (1056 total HP: 308+374+374), the same power-2 spell exclusively spammed reaches the `2k=360` mastery point at cumulative damage 875 (end of the Adept phase, cast 360) — 875/1056 ≈ 83% through the full 3-level kill-budget. A maximally dedicated single-spell specialist still masters one favored spell within the sampled 3-level arc (a bit before finishing Level 3), preserving the original design intent, just anchored to a relationship that actually holds. Ordinary varied play (spread across the 12-spell kit, most of which hit harder than `base_power=2`) needs far more effective kills per landed cast on average, so generalist play leaves every spell far short of 360 without deliberate single-spell focus — the specialist/generalist asymmetry the original sizing wanted is preserved, just at the corrected magnitude.

**Corrected rate: 180 landed casts per tier (360 to fully master one spell)**, up from the flawed 20/tier (40 total). Updated `docs/agents/_reference/mastery-template.md` in place — the old "Resolved 2026-07-25" block is marked `SUPERSEDED`, not deleted, with the false premise stated explicitly, and a new "Corrected 2026-07-25 (4)" block holds the full re-derivation above. Did not touch `src/systems/MasterySystem.ts` myself (engine code, Loomwright's territory) — action item recorded in the template: replace `LANDED_CASTS_PER_TIER = 20` with **180** and update its doc comment to cite this corrected derivation instead of the superseded reasoning.

**Status: RESOLVED (correction).** This entry supersedes entry (3)'s Part 2 in full; Part 1 of entry (3) (Level 2/3 wave gate-check) is untouched and still stands as PASS.

## 2026-07-27 — Re-verification: mini-boss reconstruction (`boss-1.json`) against the already-PASS'd 2026-07-21/2026-07-23 arithmetic

Ana reconstructed the 2026-07-21 boss composition into an actual file (it had only ever existed as log narrative). Re-ran the same checks against `boss-1.json`'s actual per-phase entries rather than assuming the reconstruction preserved the numbers correctly:

Phase totals: Phase 1 (1 `spellbound_thug`, 3 `hexbow_skirmisher`, 1 `creeping_bramble`) = M1/R3. Phase 2 (2 `spellbound_thug`, 4 `hexbow_skirmisher`, 1 `murmur_wisp`) = M2/R4. Phase 3 (2 `spellbound_thug`, 4 `hexbow_skirmisher`, 1 `creeping_bramble`) = M2/R4. **Aggregate: M=5, R=11, Debuffer=3 (speed, mana_regen, speed)** — matches entry (5)'s validated aggregate exactly, field for field. Careless: 5×7+11×4=79. Competent: 11×4+0.2×5×7=51. Both reproduce entries (5)/2026-07-23's numbers unchanged. Cap formula: 3 phases → 2 breaks → `min(2-1,2)=1` recovery — unchanged. Debuffer concurrency: exactly one Debuffer per phase, same as the original — concurrency-safe by construction, same as before.

**Verdict: PASS, no drift.** The reconstruction is numerically identical to what already cleared gate-checks twice; only the per-phase spawn split (not previously validated individually, since only the aggregate was ever checked) is new, and it doesn't change any of the aggregate math this gate actually cares about.

## 2026-07-30 — Gate-check: Warden's Level 4 wave batch (backlog 3.3, follow-up to 2026-07-25 (2))

Independently recomputed every numeric field in `src/data/waves/level-4.json`'s 3 waves against `hp-template.md`'s fixed per-hit table (Melee 7, Ranged 4, Debuffer 0 direct) and the regular-wave damage-threat band (competent 10-15%, careless 25-35%), rather than accepting Warden's numbers on inspection. Per-hit computation reuses the exact convention Warden established: careless play = every enemy's fixed per-hit value landing once; competent play = Ranged fully realized + ~20% of Melee realized.

**Wave 0** (spellbound_thug x3, hexbow_skirmisher x2, creeping_bramble x2): 
- Careless: 3×7 + 2×4 = 21 + 8 = **29 HP (29%)** — in-band (25-35%). 
- Competent: 2×4 + 0.2×3×7 = 8 + 4.2 = **12.2 HP (12.2%)** — in-band (10-15%). 
- Debuffer: creeping_bramble x2 = speed drain 2 applications × 12% = **24%** — at hard cap (24% max/2 applications), compliant.
- **PASS** — both damage-threat figures independently verified; debuffer cap hit exactly, not exceeded.

**Wave 1** (spellbound_thug x2, hexbow_skirmisher x3, creeping_bramble x2, murmur_wisp x2):
- Careless: 2×7 + 3×4 = 14 + 12 = **26 HP (26%)** — in-band (25-35%).
- Competent: 3×4 + 0.2×2×7 = 12 + 2.8 = **14.8 HP (14.8%)** — in-band (10-15%), top-of-band, margin 0.2 percentage points (same tight ceiling as Level 1 wave 1, Level 2-3 wave 1; margin held, not exceeded).
- Debuffer: creeping_bramble x2 = speed drain 2 applications × 12% = **24%** — at hard cap (24% max/2 applications), compliant. murmur_wisp x2 = mana-regen drain 2 applications × 1.5/sec = **3.0/sec drain** off 5/sec base → 5 - 3.0 = **2.0/sec effective** — exactly on the floor (2.0/sec minimum, not below), compliant.
- **PASS** — both damage-threat figures independently verified; both debuffer caps hit simultaneously exactly at their boundaries, neither exceeded. This is new: both caps in the same wave, same Level 3 wave 1 combination, but Level 4 sustains it across multiple waves (wave 1 and wave 2), per Warden's stated escalation axis.

**Wave 2** (spellbound_thug x2, voidfang_stalker x1, hexbow_skirmisher x1, storm_lancer x1, creeping_bramble x2, murmur_wisp x2):
- Total Melee count: spellbound_thug x2 + voidfang_stalker x1 = **3** (voidfang_stalker confirmed as melee archetype reskin, no stat divergence from standard melee in the composition arithmetic).
- Total Ranged count: hexbow_skirmisher x1 + storm_lancer x1 = **2** (storm_lancer confirmed as ranged archetype reskin, no stat divergence).
- Careless: 3×7 + 2×4 = 21 + 8 = **29 HP (29%)** — in-band (25-35%).
- Competent: 2×4 + 0.2×3×7 = 8 + 4.2 = **12.2 HP (12.2%)** — in-band (10-15%).
- Debuffer: creeping_bramble x2 = speed drain 2 applications × 12% = **24%** — at hard cap (24% max/2 applications), compliant. murmur_wisp x2 = mana-regen drain 2 applications × 1.5/sec = **3.0/sec drain** → 5 - 3.0 = **2.0/sec effective** — exactly on floor, compliant.
- **PASS** — both damage-threat figures independently verified; both debuffer caps sustained at boundaries, not exceeded. Same double-cap combination as Wave 1.

**Additional field checks (all waves):**
- `hp_modifier` and `damage_modifier` held at 1.0 across all three waves — correct per template reasoning (no base enemy-HP field exists to scale against, per-hit values are the fixed numbers themselves, not multiplier bases).
- Enemy name → archetype mappings: `spellbound_thug` → melee, `hexbow_skirmisher` → ranged, `creeping_bramble` → speed-drain debuffer, `murmur_wisp` → mana-regen-drain debuffer (all established in prior logs). New names `voidfang_stalker` → melee and `storm_lancer` → ranged correctly stated as reskins (no new stat lines) by Warden; flagged for Loomwright/Ana to add both mappings to `enemyRegistry.ts` per standing rule.

**Escalation analysis — all within template bounds:**
1. **Wave 0 speed-cap opener (new):** Level 1-3 delayed their first debuffer-at-cap past wave 0; Level 4 opens wave 0 already at speed-drain hard cap (2 applications = 24%). This is a design choice within the 2-application ceiling, not a template violation.
2. **Sustained double-cap across waves 1 & 2 (new):** Level 3 touched both caps simultaneously only once (wave 1), then deliberately relieved pressure (wave 2 single-application cap, per log entry). Level 4 sustains both caps across wave 1 and wave 2 both (per Warden's stated escalation axis). Both figures hit exactly at their boundaries (24% speed, 2.0/sec mana-regen floor) in both waves, neither exceeded.
3. **No damage-threat ceiling breached:** all three waves' competent and careless figures fall cleanly inside the regular-wave band; the tightest margin remains Level 1/2/3 wave 1's 14.8% competent, replicated here in Wave 1 at identical 14.8% (0.2 points under the 15% ceiling), margin held.

**Verdict: PASS.** No field in `src/data/waves/level-4.json` diverges from `hp-template.md`. All three waves independently reproduce Warden's stated arithmetic exactly; both debuffer caps are hit at exact boundaries in the double-cap waves, not exceeded; `hp_modifier`/`damage_modifier` correctly held at 1.0 across all waves. The double-cap escalation (both caps simultaneously in waves 1 and 2, plus wave 0 opening at a single cap) is new territorial escalation within the template's own bounds—a legitimate design choice that hits the hard limits without exceeding them.

**Unblocked:** this composition is ship-ready numerically. Loomwright can build Level 4 against these exact figures; Heckler can take this composition into its next adversarial pass without re-litigating the arithmetic Pato already cleared.
