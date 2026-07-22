# Warden — Encounter Generation Log

Append-only, dated, one entry per wave/boss composition generated.

## 2026-07-21

Context store established. No encounters generated yet. The GDD's illustrative example (level 3, wave_index 1, warden_hound x4) is documentation only, not a shipped entry.

### 2026-07-21 -- HP/damage design-intent proposal (pre-template, dispatched by Ana ahead of Pato)

Not a wave/boss composition -- a design-intent proposal against the newly locked HP/death conceptual design (closing the GDD's top BLOCKING finding). Pato owns the actual HP pool size, per-hit damage numbers, and debuff magnitudes; this entry records only the pacing-informed *intent* Warden handed off for Pato to finalize into the numeric template, per the same author/grader split that governs wave composition.

Proposed, framed as % of whatever base HP pool Pato sets (not absolute numbers):

1. Regular wave total-damage-threat: ~10-15% of HP pool for a positioning-competent player, ~25-35% for a careless one. Consistent with HP resetting every wave (unlike Mana, which persists across an expedition) -- this is a per-wave budget, not cumulative.
2. Boss/trial total-damage-threat: careful play cumulative ~40-60% of pool by the end of the fight; careless play should threaten 70-90%+ (real death risk), mirroring how Mana pressure "catches up" in trials -- but with zero in-combat recovery instead of Mana's steady 5/sec, so the threat curve is steeper per unit of misplay.
3. Per-hit starting ranges (rough, all as % of base pool, Pato to convert to absolute numbers once pool size is set): Melee contact ~5-8% per hit (higher -- melee proximity is the more avoidable-through-positioning damage source, so it should punish bad positioning harder). Ranged ~3-5% per hit (lower per-hit, but harder to fully avoid, so it supplies more of the steady pressure in a long trial).
4. Debuffer magnitude recommendations: speed drain ~10-15% move-speed reduction per application; Mana-regen drain ~1-2 Mana/sec reduction per application (off the base 5/sec). Flagging a stacking risk on both: multiplicative or uncapped-stack drain can spiral (speed toward zero breaks positioning-based play entirely; regen toward zero turns "careful budgeting" into "hard lockout"). Recommend Pato treat both as additive with a hard stack cap (2-3) and a regen floor above zero, not multiplicative/uncapped.
5. Pacing risk flagged, not solved: "no regen in combat" + a genuinely long multi-phase boss/trial means a single bad early phase could compound into an unrecoverable death spiral regardless of how well the player plays the rest of the fight -- turning the trial into "one mistake locks in a loss" rather than a running skill/budget test. Whether phase transitions get any partial HP recovery, or whether this is accepted as intended stakes, is a developer/Ana call. Secondary risk: since Debuffer's speed-vs-regen drain is a per-instance variety knob Warden picks when composing waves, a wave/trial with multiple Debuffers on the *same* drain type could stack beyond whatever safe cap Pato sets -- Warden will need to watch that mix once actual wave composition against this template begins.
