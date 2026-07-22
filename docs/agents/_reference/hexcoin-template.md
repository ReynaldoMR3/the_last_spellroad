# Hexcoin Template (Pato's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Hexcoin".

- Earn rate: **1 Hexcoin per kill**, flat across enemy types.
- Persists through death like every other permanent-progression element — never lost.
- Fee: **100 Hexcoin** lets the player choose which equipped spell takes the Mastery-tier loss on death, instead of a random roll.
- Fee (new, 2026-07-21 developer sign-off): **50% of [BASIS FLAGGED]** lets the mage buy the Phase-Transition Partial HP Recovery (15% pool restore) at a boss/trial phase-break — see `hp-template.md`, "Phase-Transition Partial HP Recovery" for the full rule. The 50% basis is ambiguous between expedition-scoped Hexcoin earned on the current road (Pato's recommendation) and lifetime Hexcoin balance; flagged there for developer confirmation, not resolved here.

**Open disagreement, escalated to the developer (2026-07-21 review board, `gdd-review-kit/reviews/2026-07-21/SYNTHESIS.md`):** whether this fee is reachable at all within the vertical slice's kill-count scope, or trivially farmable if backtracking into cleared levels is allowed. The backtracking rule itself is undefined. Do not assume an answer — this is a decision for the developer, not for Warden, Frieren, or Pato to resolve unilaterally.

**Flag — new tension introduced 2026-07-21, not resolved:** the new phase-recovery fee competes for the same Hexcoin pool as the 100-Hexcoin spell-choice fee above, and this makes the existing reachability/farmability disagreement more consequential rather than resolving it either way:

- If the phase-recovery fee is read as expedition-scoped (Pato's recommendation), it draws from the exact same limited, per-expedition kill-count sub-total that the 100-Hexcoin fee's reachability question is already about. A mage now has two draws against one scarce, undecided pool within the same road segment — the developer's eventual backtracking/farmability ruling will swing both fees at once, not just one, and a mage may face a real choice between affording the death-spiral or the spell-choice fee rather than affording both.
- If instead read as lifetime, the new fee draws from total accumulated Hexcoin rather than the current segment, so it's less directly coupled to the segment-reachability question — but a 50%-of-lifetime-balance fee would grow to dwarf the flat 100-Hexcoin fee for any mage with a nontrivial balance, which would make the flat fee's own tuning (whatever it turns out to be) comparatively irrelevant without actually resolving whether it's reachable.
- Net: this is not a change Pato is making unilaterally to either rule — it is a flag that the developer's backtracking/reachability decision now has wider blast radius than when only one fee existed, and should be made with both fees in view.

Only Pato edits this file.
