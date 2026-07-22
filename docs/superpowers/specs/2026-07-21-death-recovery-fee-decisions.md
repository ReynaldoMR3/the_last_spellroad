# Phase-Transition Recovery Fee — Five Blocking Decisions

**Status:** Approved, ready to hand off to Ana for dispatch.
**Branch:** `death-system-hp-design`

## Context

Ana dispatched the death system (HP/damage trigger) work to close the GDD review board's top BLOCKING finding (no HP/death trigger existed). Pato finalized the numeric spec (`docs/agents/_reference/hp-template.md`), and Heckler ran a six-persona critique on the full bundle (`docs/agents/heckler/log.md`, 2026-07-21 entry). Heckler's critique surfaced five open items — four inside the Phase-Transition Partial HP Recovery mechanic itself, plus one adjacent, pre-existing dispute in `docs/agents/_reference/hexcoin-template.md` about whether the Hexcoin economy is reachable at all within the vertical slice's scope. None of the five could be resolved by another agent guessing — all five are developer calls per Ana's own dispatch procedure.

Guiding design intent for all five decisions, stated by the developer up front: boss fights should be genuinely hard, a win should feel earned, and the Hexcoin-for-HP mechanic should be a real, punishing choice — "I understand this fight and I'm willing to pay to push through" versus "I should retreat, get better, and try again" — not a cheap safety net that trivializes the fight.

## Decisions

### 1. Cap on phase-recovery purchases per boss fight

**Systems Designer's BLOCKING finding:** nothing bounded how many phase-breaks a boss could have or how many times the fee could be paid — a fight tuned to threaten 40-60% of the HP pool on competent play could have that budget bought back 30-60%+ with enough Hexcoin, making currency (not positioning) decide the fight.

**Resolved:** the recovery cap is tied to Warden's own per-boss phase design, not a flat developer-picked number, but Pato enforces a hard ceiling on top of it so no boss submission can let money out-vote skill:

- Cap = (that boss's total phase-breaks − 1), hard-ceilinged at 3 recoveries regardless of fight length.
- Pato additionally validates that total HP recoverable via fee across the whole fight never exceeds **33% of that boss's competent-play threat budget** (`hp-template.md`'s Wave/Boss Damage-Threat Budget table). This is the actual skill-over-money guarantee — Pato rejects any Warden phase design that would let purchased recovery exceed this share.
- On the shortest possible multi-phase boss (1 phase-break), this cap formula yields **zero recoveries** — confirmed intentional. The mechanic exists to prevent a death spiral in a *long* fight; the shortest fights were never the risk it protects against.

### 2. The fee curve's inverted incentive

**Player Psychologist's BLOCKING finding:** pricing the fee at 50% of Hexcoin earned *this expedition* meant a player playing well could easily afford it, while a player actually spiraling toward death (fewer kills, less Hexcoin) could least afford the exact mechanic meant to catch them.

**Resolved:** drop the percentage-of-earnings model. The fee is a **flat, fixed Hexcoin cost** — the same price every time, set by Pato per boss/expedition tier, sized to sting (a real chunk of what a reasonably active player would have banked) but not to lock anyone out. Because the price no longer depends on how the run is going, a struggling player and a thriving player face the identical choice — this fully removes the inverted incentive rather than dampening it.

### 3. Expedition-scoped vs. lifetime Hexcoin as the fee's basis

**Feasibility Lead's BLOCKING finding:** the fee's basis was explicitly unresolved in both templates, so the bundle couldn't be built as specified despite being dispatched to close the board's top finding.

**Resolved:** the flat fee (decision 2) draws from **expedition-scoped** Hexcoin — earned since the current expedition/road-segment began, resetting at each checkpoint — matching Pato's original "on this road" framing. (Considered and rejected: drawing from the lifetime persistent balance, which would guarantee affordability regardless of how the current expedition is going, but the developer chose to keep each expedition's economy self-contained instead.)

### 4. Whether mid-fight kills count toward the fee basis

**Adversarial QA's MAJOR finding:** if kills during a boss fight (adds, summons) count toward "earned this expedition" before the fee computes, the fee partially pays for itself mid-fight — a real farm-to-afford loophole, not hypothetical, especially once the fee draws from a bounded expedition-scoped pool (decision 3).

**Resolved:** the eligible balance is **frozen at fight-start**. Hexcoin earned mid-fight banks toward the expedition total for later, but cannot be spent on that same fight's own recovery fee. A player either comes into the boss financially prepared or doesn't; the fight itself can't be ground for its own bailout money.

### 5. Adjacent dispute: is the Hexcoin economy reachable at all? (backtracking)

**Business Analyst's BLOCKING finding:** the new fee and the existing flat 100-Hexcoin spell-choice fee (`hexcoin-template.md`) both draw on the same expedition-scoped pool, whose reachability/farmability was already an open, escalated disagreement from the 2026-07-21 GDD review board — unresolved because whether backtracking into cleared levels is allowed was itself undefined. Business Analyst's position: the economy can't be tuned or evaluated until this is settled.

**Resolved:** the Spellroad is **strictly forward-only** — no backtracking into cleared road segments. This closes the farmability dispute directly and bounds per-expedition Hexcoin income to a predictable number, which is what actually lets Pato pick a concrete flat-fee value for decision 2 instead of guessing against an unbounded economy.

## GDD updates made

All five decisions are now written into the living GDD (`docs/game/the-last-spellroad-design.md`), not left as agent-template-only knowledge:

- **Gameplay Loop:** added the forward-only/no-backtracking rule.
- **Death And Mastery Loss → new "HP Pool And The Death Trigger" subsection:** pulls the HP pool, per-hit damage, and Debuffer numbers out of `hp-template.md` into the GDD itself (previously undocumented there).
- **Hexcoin:** added a paragraph on the new fee competing with the existing 100-Hexcoin fee for the same bounded per-expedition pool.
- **New "Phase-Transition Recovery" subsection:** the full mechanic as resolved above (cap formula, money ceiling, flat fee, expedition-scoped basis, mid-fight-kill freeze).
- **Open Design Questions:** updated the stale Hexcoin-spending question, and added a new item flagging that the exact flat-fee Hexcoin amount is Pato's numeric call against these rules, not an open developer question.

## Next steps (owned by Ana, per her dispatch procedure)

1. **Pato** — fold these five decisions into `hp-template.md` and `hexcoin-template.md` as the final numeric spec, including picking the actual flat-fee Hexcoin amount now that expedition income is bounded (decision 5).
2. **Warden** — design each boss's phase-break count against the new cap formula and validation gate; also owns the backtracking rule's implications on wave/road design going forward.
3. **Loomwright** — implement the HP/damage/death engine trigger and the recovery-fee flow against Pato's finalized templates. Gate: developer playtest, not another agent.
4. **Heckler** — one more critique pass on the finalized bundle (numbers plus engine behavior) before Ana marks anything `shipped-and-validated`.
5. **Lorena** — narrative framing for the fee and the Debuffer archetype (still MAJOR, not blocking), once the mechanic is numerically stable enough to be worth narrating.

## Out of scope

- The actual flat Hexcoin fee number, and each boss's specific phase-break count — both are Pato's/Warden's numeric calls within the rules fixed here, not re-opened developer decisions.
- The broader future item/upgrade economy Hexcoin is meant to eventually support — still an open design question, untouched by this spec.
