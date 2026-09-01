# Frieren — Spell Authoring Log

Append-only, dated, one entry per spell authored.

## 2026-07-21

Context store established. No spells authored yet. The GDD's illustrative example (`ember_lance` -- fire, line, standard, base_power 5, base_targets 1) is documentation only, not a shipped entry.

## 2026-07-23

Authored arc_lance — lightning/line/Light, tradeoff: pierces the whole line for cheap and fast recasts, but the power per hit is the weakest of my three — a poke tool, not a finisher. Handed to Pato for validation.

Authored flame_sweep — fire/cone/Standard, tradeoff: dependable arc-of-effect damage at a fair mana/cooldown cost, but it splits the difference — never as spammable as the Light line and never as wide or hard-hitting as the Heavy circle. Handed to Pato for validation.

Authored frost_nova — ice/circle/Heavy, tradeoff: the biggest power and target count of the slice, blanketing a centered area, but the 35-mana cost and 8s cooldown mean you're committing hard and standing exposed for a long stretch after the cast. Handed to Pato for validation.

## 2026-07-25

Backlog 3.1: authoring 9 new spells to bring the roster from 3 to the Seven-Week Vertical Slice's 12-spell floor. Earth had zero entries before this batch, so it's prioritized to 3 of the 9 (matching fire, ice, and lightning at 3 each in the finished 12-spell roster). Shape and weight are laid out as a full one-each 3x3 grid across the 9 new entries (light/standard/heavy crossed with line/cone/circle, each combination used exactly once), which gives an even 3/3/3 split both ways without needing to force it. Every `base_power`/`base_targets` pair below is distinct from every other pair in the 12-spell roster, including the 3 already shipped -- none are copy-pasted. No entry sets both `master_discount` values, and no spell duplicates an existing (element, weight, shape) niche (avoided lightning+light+line, fire+standard+cone, and ice+heavy+circle, since those are exactly arc_lance's, flame_sweep's, and frost_nova's slots).

Authored stone_spike — earth/line/Light, tradeoff: a narrow earthen spike that only ever finds one target, giving up the Light class's usual multi-hit spam for a single harder-hitting poke. Handed to Pato for validation.

Authored flare_jab — fire/cone/Light, tradeoff: fire's cheapest, fastest option is a short cone burst that barely reaches past melee range, so it can't threaten anything you haven't already let get close. Handed to Pato for validation.

Authored spark_ring — lightning/circle/Light, tradeoff: a self-centered ring of static that's the cheapest AoE in the whole roster, but its power output is too low to clear anything more than chip damage on a crowd. Handed to Pato for validation.

Authored glacial_shard — ice/line/Standard, tradeoff: a mid-cost icicle that pierces deep, hitting up to three enemies in a row, but it commits you to a 4s cooldown window with no burst follow-up. Handed to Pato for validation.

Authored rubble_burst — earth/cone/Standard, tradeoff: a standard-cost rockfall cone that knocks back everything it touches, but its per-target power is the lowest of any cone in the kit -- it controls space rather than closing fights. Handed to Pato for validation.

Authored thunder_dome — lightning/circle/Standard, tradeoff: a wide static dome that hits four enemies at once for solid power, but standing in the middle to cast it means you're exposed to everything outside the ring for its full 4s cooldown. Handed to Pato for validation.

Authored magma_lance — fire/line/Heavy, tradeoff: the hardest-hitting single-target line spell in the roster, but at 35 mana and an 8s cooldown it's a bad bet against anything but a priority target you're certain you can drop. Handed to Pato for validation.

Authored frost_breath — ice/cone/Heavy, tradeoff: a heavy cone that freezes a wide arc for solid power, but the 8s cooldown means whatever survives the cast gets a long uncontested window to close the distance. Handed to Pato for validation.

Authored tremor_field — earth/circle/Heavy, tradeoff: the widest target count in the entire roster, quaking every enemy around you, but it's the most expensive cast in the kit and leaves you standing still and open for the whole wind-up and cooldown. Handed to Pato for validation.

**Correction (same session):** the numeric fields (`base_power`, `base_targets`, `master_discount`) were stated in this dispatch's own response but omitted from the first write of this log entry — Pato's validation pass caught the gap correctly (missing-submission, not a template violation) rather than rubber-stamping incomplete entries. Appending the full `spell.json` payload here now, unchanged from what was actually authored, so the record matches what was actually produced:

```json
[
  {"id": "stone_spike", "element": "earth", "shape": "line", "weight": "light", "base_power": 4, "base_targets": 1, "master_discount": "cooldown"},
  {"id": "flare_jab", "element": "fire", "shape": "cone", "weight": "light", "base_power": 2, "base_targets": 2, "master_discount": "cost"},
  {"id": "spark_ring", "element": "lightning", "shape": "circle", "weight": "light", "base_power": 2, "base_targets": 4, "master_discount": "cooldown"},
  {"id": "glacial_shard", "element": "ice", "shape": "line", "weight": "standard", "base_power": 4, "base_targets": 3, "master_discount": "cost"},
  {"id": "rubble_burst", "element": "earth", "shape": "cone", "weight": "standard", "base_power": 3, "base_targets": 3, "master_discount": "cost"},
  {"id": "thunder_dome", "element": "lightning", "shape": "circle", "weight": "standard", "base_power": 5, "base_targets": 4, "master_discount": "cooldown"},
  {"id": "magma_lance", "element": "fire", "shape": "line", "weight": "heavy", "base_power": 9, "base_targets": 1, "master_discount": "cost"},
  {"id": "frost_breath", "element": "ice", "shape": "cone", "weight": "heavy", "base_power": 6, "base_targets": 4, "master_discount": "cooldown"},
  {"id": "tremor_field", "element": "earth", "shape": "circle", "weight": "heavy", "base_power": 5, "base_targets": 6, "master_discount": "cost"}
]
```

## 2026-08-31 — Issue #207 Task 5: elemental tactical identities

Authored the required element-matched `effect` payload for every existing spell, without changing
`base_power`, `base_targets`, `weight`, `shape`, or `master_discount` from Pato's retained proposal.

- `arc_lance` — lightning stun: fast, inexpensive lane control, but low power and only a narrow two-target line.
- `flame_sweep` — fire adjacent pressure: strong close cone pressure, but its +2 bonus disappears at range and the cone limits safe coverage.
- `frost_nova` — ice weaken: broad defensive weakening and high power cost a heavy cooldown/Mana commitment.
- `stone_spike` — earth single-target burst: cheap precise burst is excellent on one target but has no crowd coverage.
- `flare_jab` — fire adjacent pressure: rapid close-range cleanup trades very low base power and short cone reach for its adjacency bonus.
- `spark_ring` — lightning stun: cheap emergency crowd stop gives up direct power and cannot repeatedly lock a target.
- `glacial_shard` — ice weaken: reaches a lane of attackers and softens return damage, but has standard pacing and modest base power.
- `rubble_burst` — earth single-target burst: a cone can tag a group while its damage payoff stays concentrated on one priority target.
- `thunder_dome` — lightning stun: reliable area control is paid for with standard cost/cooldown and deliberate anti-stun-lock timing.
- `magma_lance` — fire adjacent pressure: the highest base single-target fire hit rewards dangerous close commitment but has heavy pacing and one target.
- `frost_breath` — ice weaken: wide defensive control can protect against a rush but is slower, costly, and weaker per target than magma's burst.
- `tremor_field` — earth single-target burst: the largest area reaches a crowd, while the earth payoff remains one deliberate priority burst at heavy cost.

Pato gate: PASS, recorded separately in `docs/agents/pato/log.md`. Runtime resolution remains Task 6's scope.

## 2026-08-31 — Issue #207 Task 7 teachability gate

Status `shipped-and-validated`: the approved four effect identities are now taught in the compact
first-use legend with their exact player-facing consequences (fire close +2, ice weaken 3s, earth
primary +3, lightning stun 0.5s). A focused text contract test prevents the tactical distinctions
from disappearing while preserving the no-monster-name rule. Numeric authority remains Pato's
elemental template; no spell values changed in this pass.
