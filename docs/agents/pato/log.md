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
