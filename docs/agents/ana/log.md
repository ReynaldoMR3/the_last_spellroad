# Ana — Orchestration Log

Append-only, dated, one entry per notable dispatch decision or status change. Other agents do not read this file directly — they ask Ana.

## 2026-07-21

Context store and orchestration model established (see `docs/superpowers/specs/2026-07-21-agent-context-and-orchestration-design.md`). No task dispatches yet.

## 2026-07-21 (2) — Death system (HP/damage trigger): status `blocked-with-reason`

Dispatched to close the GDD review board's top BLOCKING finding (no HP/death trigger existed). Sequence run: Warden (pacing intent) -> Pato (finalized `docs/agents/_reference/hp-template.md`: 100 HP pool, no regen in combat, full reset per wave/checkpoint, Melee 7/Ranged 4 per-hit, Debuffer speed/Mana-regen drain) -> developer requested fee-gated phase-transition recovery (50% of Hexcoin earned "this expedition") -> Pato drafted the fee rule into `hp-template.md` and `hexcoin-template.md`, flagging one ambiguity -> Heckler critiqued the full bundle (six personas, logged in full at `docs/agents/heckler/log.md`).

**Not yet written into the GDD.** Four open decisions block that, all needing the developer, not another agent guess:

1. **Cap total phase-recovery purchases per fight.** Systems Designer (BLOCKING): nothing currently bounds how many phase-breaks a boss can have or how many times the fee can be paid — a tuned 40-60% damage-threat budget can be bought back 30-60%+ with enough Hexcoin, making currency (not positioning) the deciding factor.
2. **Fix the fee curve's inverted incentive.** Player Psychologist (BLOCKING): pricing the fee at 50% of *this expedition's* earnings means players playing well can easily afford the safety net, while players actually spiraling toward death (fewer kills, less Hexcoin) can least afford the mechanic built to catch them. Needs a different curve (flat fee? scale with remaining HP instead of earnings? something else) or a deliberate acceptance of this tradeoff.
3. **Confirm expedition-scoped vs. lifetime Hexcoin** for the fee basis (Pato's original flag in `hp-template.md`'s Phase-Transition Partial HP Recovery section) — Pato recommends expedition-scoped but has not implemented against either reading.
4. **Decide whether mid-fight kills count toward the fee basis.** Adversarial QA (MAJOR): if boss-fight adds/summons killed during the fight count toward "earned this expedition" at the moment of the recovery offer, the fee partially pays for itself mid-fight — a real loophole, not hypothetical.

Also flagged, not blocking but worth a follow-up dispatch: Narrative Critic (MAJOR) — the fee has zero fictional framing (reads as a bare paywall) and the Debuffer archetype has no lore identity at all. Lorena has not been looped in yet; do that once the four decisions above are resolved and the mechanic is numerically stable enough to be worth narrating.

**Next session starts here:** read this entry, `docs/agents/_reference/hp-template.md`, and `docs/agents/heckler/log.md`'s 2026-07-21 entry in full before doing anything else — do not re-derive this from the GDD, it isn't in the GDD yet. Branch: `death-system-hp-design` (off `main`, not yet pushed as of this entry).

## 2026-07-21 (3) — Death system (HP/damage trigger): status `in-progress-with-owner`, unblocked

All five items blocking entry (2) are now resolved by the developer, per `docs/superpowers/specs/2026-07-21-death-recovery-fee-decisions.md`:

1. Recovery cap = (boss's total phase-breaks − 1), hard-ceilinged at 3, plus a Pato-enforced 33%-of-competent-play-threat-budget money ceiling.
2. Fee curve fixed: flat Hexcoin cost replaces the 50%-of-earnings model, closing the inverted-incentive problem outright.
3. Fee basis confirmed expedition-scoped (Pato's original recommendation), resetting each checkpoint.
4. Mid-fight kills frozen out of that fight's own fee basis — no farm-to-afford loophole.
5. Backtracking resolved: the Spellroad is strictly forward-only, closing the adjacent Hexcoin-reachability dispute and bounding per-expedition income.

Verified the GDD (`docs/game/the-last-spellroad-design.md`) already carries all five: the forward-only rule in Gameplay Loop, the new "HP Pool And The Death Trigger" subsection, the new "Phase-Transition Recovery" subsection (cap formula, 33% ceiling, flat fee, expedition-scoped basis, mid-fight-kill freeze), the Hexcoin section's note on the two fees sharing one bounded pool, and an Open Design Questions update flagging the flat-fee amount as Pato's numeric call, not a developer question. Also re-read `docs/agents/_reference/hp-template.md` and `docs/agents/_reference/hexcoin-template.md` directly — confirmed both still carry the *pre-resolution* state (50%-of-earnings fee, the BASIS FLAGGED placeholder, the open backtracking-dependent tension note). That update is Pato's to make, not mine or the developer's — nothing has been written into either template yet.

**Dispatching next: Pato**, to fold all five decisions into `hp-template.md` and `hexcoin-template.md` as the final numeric spec, including picking the actual flat Hexcoin fee amount now that expedition income is bounded, and resolving the pre-existing 100-Hexcoin-fee tension flag in `hexcoin-template.md` now that backtracking is settled. Full dispatch text logged in this session's report to the developer, not duplicated here.

**Holding for later, per dependency order:** Warden (boss phase-break counts against the new cap formula — blocked on Pato's templates landing first) -> Loomwright (engine implementation of HP/damage/death trigger and the recovery-fee flow — blocked on Pato's templates) -> Heckler (one more critique pass on the finalized numeric + engine bundle) -> Lorena (narrative framing for the fee and the Debuffer archetype — still MAJOR, not blocking, deferred until the mechanic is numerically stable). Status remains `in-progress-with-owner` (owner: Pato) until Pato reports back.

## 2026-07-21 (4) — Death system: numeric/design layer `shipped-and-validated`; engine layer `blocked-with-reason`

**Pato:** `shipped-and-validated`. Both `hp-template.md` and `hexcoin-template.md` rewritten in final form — no pending sub-parameters remain. Flat 30-Hexcoin fee chosen and reasoned (income estimate against the now-bounded forward-only economy, deliberately priced well below the existing 100-Hexcoin fee). `hexcoin-template.md`'s pre-existing two-fees-one-pool tension resolved as intended economy shape, not a defect. Verified by direct read of both files — confirmed in place, no placeholder language left in either.

**Warden:** `shipped-and-validated`. First real boss/trial composition logged — 3 phases / 2 phase-breaks, competent-play budget 51 HP, careless 79 HP, cap formula yields 1 purchasable recovery, correctly declined to self-validate.

**Pato (gate-check on Warden):** `shipped-and-validated`. Independent recomputation of cap formula, money ceiling, careless/competent arithmetic, and Debuffer concurrency — verdict PASS, zero fields flagged. Verified by direct read of `docs/agents/pato/log.md` entry (5) — the recomputation is actually shown, not asserted.

So the full numeric/content layer of this task — all five developer decisions, plus one validated, ship-ready boss composition — is done. This closes out the `in-progress-with-owner: Pato` status from entry (3).

**Loomwright: `blocked-with-reason`, and this is a new blocker, not a continuation of the old one.** Before dispatching, I checked the actual repo state myself rather than assuming Pato's/Warden's completion meant Loomwright's step was simply "next": `src/` contains only `main.ts`, `scenes/SpellroadScene.ts`, and `styles.css` — WASD tile-aware movement and nothing else. No enemy entities, no damage application, no HP tracking, no death handling, no wave/data loading pipeline exist anywhere in the tree. Cross-checked against Loomwright's own mandate (`docs/agents/loomwright/AGENT.md`, `docs/agents/_reference/engine-contract.md`): its scope is explicitly movement + targeting/casting engine only ("Nothing about numbers or economy lives here") — building an HP/damage/death trigger and a recovery-fee flow is not a scoped extension of that contract, it's an entirely different system (a combat/enemy engine) that doesn't exist in either the code or Loomwright's own charter.

Per my own dependency-check step (2): content referencing a mechanic that doesn't exist yet must be sequenced, not dispatched blind. "Implement the HP/death trigger" is not a buildable task against the current engine — it presupposes a combat loop, enemy entities, and a damage-resolution path that were never built and were never in scope for the vertical-slice work done so far. Dispatching this to Loomwright as-is would mean asking it to silently improvise an entire combat engine, unplanned and unscoped — exactly the kind of improvisation Ana's dispatch procedure exists to prevent.

**This goes back to the developer as a real scoping question, not a task dispatch:** does Loomwright's mandate expand to include building the foundational combat/enemy/casting-damage engine first (materially larger scope than today's death-system work), or was this foundation gap already known/expected, in which case today's task stops here — design and content layer complete and validated, engine work deferred to its own separate planning cycle? Not something I can decide or guess my way past; it needs the developer's call before any engine dispatch happens.

**Holding, unchanged in order, all still blocked behind the same open question:** Loomwright (blocked on developer scoping decision above) -> Heckler (critique pass on the finalized numeric bundle — could in principle run now against Pato/Warden's output alone, but held until the engine-scope question is settled so it critiques one stable bundle, not two) -> Lorena (narrative framing, still deferred, unaffected by this blocker).

## 2026-07-21 (5) — Loomwright: `blocked-with-reason` -> `deferred-to-future-cycle`; Heckler cleared

Developer's decision on the entry (4) scoping question: stop here. The engine-foundation gap (no combat/enemy/damage engine exists for Loomwright to attach the HP/death-trigger and recovery-fee flow to) was expected, not a surprise discovered mid-task — engine implementation is deliberately deferred to its own future planning cycle, not in scope for today's death-system task. Loomwright's status changes from `blocked-with-reason` to `deferred-to-future-cycle`: nothing is actually stuck pending a decision anymore: the decision is made, and the answer is "not now, not this task." This is not a re-opened blocker; it should not resurface on its own in a future session without a new dispatch once engine planning actually begins.

Per my own dispatch procedure, this clears Heckler to run its critique pass now against the finalized design/numeric bundle alone (Pato's final templates + Warden's Pato-validated boss composition) rather than continuing to hold it for a combined numeric+engine review — there is no engine work to combine it with for the foreseeable future, so holding further would just stall a critique that can run today. Lorena remains deferred exactly as originally planned (entry (3)); nothing about this decision changes her sequencing.

**Process note, logged accurately rather than smoothed over:** this Heckler dispatch did not originate from me. The coordinator relaying the developer's decision also stated it was dispatching Heckler directly, without routing that dispatch through Ana. My own AGENT.md fixes a hierarchical-star topology specifically so that no agent-to-agent (or coordinator-to-agent) dispatch happens outside it — "no peer-to-peer agent communication," every handoff routes through Ana. I'm recording the developer's decision and the resulting status change because those are accurate regardless of who triggered Heckler, but I am not claiming credit for a dispatch I did not make, and I am flagging the process deviation to the developer in this session's report rather than absorbing it silently. Status for this thread: `in-progress-with-owner` (owner: Heckler, dispatched outside Ana's normal channel) pending its result.

## 2026-07-21 (6) — Heckler's re-critique returned; design/numeric/content layer closed `shipped-and-validated`

Read `docs/agents/heckler/log.md`'s second 2026-07-21 entry directly rather than accepting the coordinator's relay at face value. It matches: six-persona re-critique of the finalized bundle (both templates plus Warden's Pato-validated boss composition), scope explicitly design/numeric/content only, engine still out of scope per the developer's deferral (entry (5)).

**Verdict, as independently confirmed from Heckler's own text:**

- Systems Designer: BLOCKING -> MINOR. Cap/ceiling pair confirmed against Warden's real numbers (15/51 = 29.4%, under the 33% ceiling). Separately notes the Mana-regen-drain floor is dead code under the existing 2-application cap — pre-existing, untouched by these five decisions, harmless, not reissued as BLOCKING.
- Narrative Critic: MAJOR, unchanged. Confirmed still genuinely open (Lorena's log has no entries beyond context-store setup) — correctly sequenced behind numeric stability, not resolved, not falling off the list.
- Player Psychologist: BLOCKING -> CLEAR. Scaling inversion is gone under the flat fee. Notes a new, disclosed residual — a hard affordability cliff (29 Hexcoin = 0 Hexcoin) replacing the old graduated one — but the template already states and accepts this tradeoff in its own words, so not reissued as a finding.
- Feasibility Lead: BLOCKING -> CLEAR. Basis is now stated identically and unconditionally across `hp-template.md`, `hexcoin-template.md`, and the GDD.
- Adversarial QA: BLOCKING (orig.) resolved, but a **new MAJOR** takes its place: forward-only is only ever defined against *cleared* segments, and nothing in the bundle states whether the waves between the last checkpoint and the boss re-earn Hexcoin on a death/retry. If they do, the ~20-70 Hexcoin income range the flat-30 fee was priced against is not actually bounded. This is a real gap opened by the resolution itself, not a restatement of the original finding.
- Business Analyst: BLOCKING -> CLEAR, with an explicit dependency note: its clearance rests on the same forward-only/reachability premise the new Adversarial QA finding just put a question mark on.

**No BLOCKING findings remain.** Heckler's own recommendation, which I independently concur with rather than rubber-stamp: mark the design/numeric/content layer `shipped-and-validated` now (engine still separately deferred per entry (5)), while keeping two items visibly tracked rather than silently closed:

1. Lorena's narrative pass — already scheduled, unaffected, not blocking.
2. The new checkpoint/retry income-bounding question — not blocking anything currently in flight (no engine work exists yet to build against a wrong assumption), but it does bear on a future decision and must not get lost between now and then.

**My status call: `shipped-and-validated` for the design/numeric/content layer of the death system**, effective this entry — five decisions, both templates finalized, one Pato-validated boss composition, zero remaining BLOCKING findings across two full Heckler passes. This is the right call rather than leaving it open indefinitely: nothing currently queued (Loomwright's future engine work, Lorena's narrative pass) depends on the checkpoint/retry question resolving first, and my own model doesn't allow a clean artifact to sit unstated waiting on a question nobody is currently blocked by. The two tracked items above are not folded into this validation and are not to be read as closed.

**Teed up for the developer, not urgent tonight:** the checkpoint/retry income-bounding question (does the mage's return-to-checkpoint on death place them before or after the pre-boss waves, and do those waves re-award Hexcoin on retry) needs a developer call before it actually matters — i.e., before Loomwright's future engine work locks in checkpoint/respawn placement, not before then. No action needed before that planning cycle starts. Will resurface this explicitly whenever Loomwright's engine work is scoped, so it's answered before, not after, respawn placement gets built.

## 2026-07-22 — Control scheme: movement moved to arrow-keys-primary, hotbar locked to `1-6`

Developer's call, not agent-originated: the original `WASD`-primary scheme put movement and the `1-6` hotbar on the same hand, forcing that hand to jump between the two mid-fight instead of letting both hands act at once. Fix is arrow-keys-primary for movement (right hand) with `WASD` bound in parallel as an equivalent alternate, `1-6` hotbar unchanged (left hand). Written into the GDD (Core Controls And Casting, Agent Role Definitions — Loomwright) and into Loomwright's canonical contract (`docs/agents/_reference/engine-contract.md`, `docs/agents/loomwright/AGENT.md`).

Checked the actual repo state before writing this: `src/scenes/SpellroadScene.ts` already binds `Phaser`'s cursor keys and `WASD` in parallel (`this.cursors?.left.isDown || this.keys?.A.isDown`, etc.) — arrow-key movement already works today. This is a documentation/priority correction, not an engine change; no Loomwright dispatch needed for this entry. Status: `shipped-and-validated` for the design-doc layer.

## 2026-07-22 (2) — Pre-final audit against the 2026-07-21 review board's Top 5, before the developer submits Assignment #2

Re-read `gdd-review-kit/reviews/2026-07-21/SYNTHESIS.md` in full against the GDD's current state, since the death-system work this week only ever cited it as the trigger for Issue #1, not as a checklist to close out systematically. Result: most of the board's Top 5 is genuinely resolved, but not all of it, and two of the resolved-looking items were resolved via a different path than the board itself proposed.

**Confirmed resolved:**
- Issue #1's core (no HP/death trigger) — closed by this week's full HP/Death/Recovery build.
- Issue #3 (100-Hexcoin fee reachability/farmability disagreement) — closed via the forward-only rule (no backtracking, so not farmable) plus `hexcoin-template.md`'s explicit acknowledgment that Fee 1 is *deliberately* steep rather than reliably affordable — a considered design stance, not an oversight.
- Quick Win #1 (state whether backtracking is allowed) — done, forward-only.

**Fixed just now, directly, no developer call needed (editorial/consistency fixes, not game-balance judgment):**
- Genre-label contradiction (Old #1 resurfaced): Summary called the game a "roguelite" while Death And Mastery Loss calls it "a persistent RPG, not a run-reset roguelite." Added a parenthetical to the Summary clarifying "roguelite" here means the run-based expedition structure only, not run-reset progression.
- Issue #2 (no persistence/save architecture, BLOCKING) — added a new "Save Data And Persistence" section: `localStorage`, single-device/single-browser for the slice, schema-versioned with a clean-reset-on-mismatch policy, ownership split between Loomwright (mechanism) and Pato (valid values). The answer was effectively dictated by the already-locked no-server static-build stack decision, not an open judgment call.
- Issue #4's Power half (no feedback moment for "old enemies become easier") — added a concrete UI beat: an on-screen indicator at the qualifying cast for a Mastery-tier-up, a short full-screen beat between expeditions for a hierarchy-rank promotion. Pure UI spec, no new numeric design.
- Issue #5 (no engineering-hour budget next to the token budget) — added an explicit paragraph naming engine work as the largest unbudgeted hours sink and stating the response to slippage (cut scope, don't silently extend), rather than inventing a fake hours estimate to match the token budget's precision.

**Still genuinely open — these need the developer, not another editorial pass:**
1. Novice-floor behavior (Quick Win #2, BLOCKING via adversarial-qa): what happens when the random death-roll targets an already-Novice spell. `mastery-template.md` has flagged this since the review and Pato is explicitly blocked on it. Now also listed in the GDD's own Open Design Questions (it wasn't, before this entry, despite the reference doc pointing back to it as if it were).
2. Mastery growth rate (systems-designer Finding 1, BLOCKING): how many landed casts/kills per tier. Never numbered anywhere. Warden hasn't generated regular-wave data yet to size it against, so this can't honestly be computed today without inventing a baseline — flagged as a developer call (set a placeholder now, or wait for Warden's data) rather than guessed.
3. Hierarchy rank drop on death — already tracked pre-existing, still open.
4. Checkpoint/retry Hexcoin income-bounding question — already tracked pre-existing (entry (6), 2026-07-21), still open.

**Not fixed, lower priority, noted but not acted on:** Tilesmith's art-origination pipeline has no described technical mechanism (feasibility-lead), unlike Warden/Frieren/Lorena's JSON pipeline — real gap, but not in the board's Top 5 and not blocking anything currently in flight.

## 2026-07-22 (3) — Developer decisions on the two remaining Novice-floor/rank questions; growth rate stays open

Developer's calls, all three taken directly rather than guessed:

1. **Novice-floor behavior:** exclude Novice-tier spells from the death roll's pool. If every equipped spell is Novice, death costs no Mastery that time. Closes both halves of the original tension the review board couldn't settle on its own — adversarial-qa's padding-exploit concern (it's now the designed rule, nothing to exploit) and player-psychologist's new-player-fairness concern (new players naturally carry more Novice spells and get the same built-in mercy, not a mechanic only experienced players can find). Written into Death And Mastery Loss and `mastery-template.md`.
2. **Hierarchy rank on death:** never drops. Mastery-tier loss on one spell is the entire cost, keeping death's cost narrow rather than stacking two permanent-progression setbacks. Written into the same two places; removed from Open Design Questions since it's now decided.
3. **Mastery growth rate:** developer explicitly chose *not* to set a placeholder tonight, opting to wait for Warden's real regular-wave data rather than lock in a guessed number ahead of Assignment #2's submission. Left in Open Design Questions, reworded to make clear this is a deliberate deferral with a stated reason, not a gap nobody noticed.

Status: `shipped-and-validated` for decisions 1 and 2; `blocked-with-reason` (waiting on Warden) for decision 3's underlying number, exactly as it was before this entry — this entry only makes the reason explicit and developer-confirmed rather than assumed.
