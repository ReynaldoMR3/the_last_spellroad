# Elemental Content Template (Frieren + Pato authority)

Source of truth for Issue #207's spell elemental identity, matchup arithmetic, boss
resistance, and loadout-fairness gate. Frieren authors the spell identity described here;
Pato owns and validates every number in this file. Warden and Loomwright consume this file
and do not invent alternatives. This contract intentionally precedes the TypeScript schema:
Task 2 adds the executable types and validator, and Task 5 writes the effect fields into the
twelve spell entries.

## Fixed direct-damage lookup

The advantage cycle is `fire -> ice -> earth -> lightning -> fire`. Use this explicit table;
do not infer it from enum order.

| Spell element vs. monster element | Fire | Ice | Earth | Lightning |
| --- | ---: | ---: | ---: | ---: |
| Fire | 1.00 | 1.25 | 1.00 | 0.75 |
| Ice | 0.75 | 1.00 | 1.25 | 1.00 |
| Earth | 1.00 | 0.75 | 1.00 | 1.25 |
| Lightning | 1.25 | 1.00 | 0.75 | 1.00 |

The direct-hit calculation is exactly:

1. Start with the spell's `base_power`.
2. Apply the universal Mastery power adjustment (`+0` Novice, `+1` Adept, `+2` Master).
3. Apply one scalar: the table value, or the boss-resistance scalar when resistance has
   precedence.
4. Round once, only after that multiplication, to the engine's final damage integer.

Area spells repeat that calculation per affected target. It changes only spell damage: never
monster HP, enemy attack damage, Hexcoin, Mastery rewards, or wave threat-budget arithmetic.

## Boss resistance

The Level 5 final boss is a **fire** monster and has exactly these two resistant spell
elements: **ice** and **lightning**. Its resistance multiplier is **0.50**.

Resistance is a replacement scalar, not a second multiplier. For a resistant spell element,
use `0.50` instead of the ordinary table value; do not multiply it by the ordinary
disadvantage (`0.50 * 0.75`) and do not apply both. Thus this boss receives:

| Spell element | Applied direct-damage scalar | Reason |
| --- | ---: | --- |
| Fire | 1.00 | Same-element ordinary matchup |
| Ice | 0.50 | Resistance replaces ice's ordinary 0.75 disadvantage against fire |
| Earth | 1.00 | Explicitly neutral remaining element |
| Lightning | 0.50 | Resistance replaces lightning's ordinary 1.25 advantage against fire |

The pair must contain exactly two distinct valid elements and must not contain the boss's
active element. The resistance scalar applies to direct spell damage only; it does not reduce
status duration, status magnitude, or the fire/earth effect bonus. The boss retains the normal
four elemental effects, subject to their caps below.

## Required spell effect payloads

Every spell must carry one `effect` payload matching its element. These are content fields,
not a new targeting shape or a fourth enemy archetype. Task 2 must make this a discriminated
union and reject any missing, extra, malformed, or cross-element payload.

| Element | Required payload | Resolution contract |
| --- | --- | --- |
| Fire | `{ kind: "adjacent_pressure", range_tiles: 1, bonus_damage: 2, max_applications_per_target: 1 }` | After the ordinary direct hit, add 2 damage to every target that was validly hit while within one tile of the caster. It has no duration and applies once per target per cast. It neither expands the shape nor selects a new target. |
| Ice | `{ kind: "weaken", outgoing_damage_multiplier: 0.8, duration_ms: 3000, max_stacks: 1 }` | Every valid hit applies a 20% reduction to that target's outgoing enemy damage for 3 seconds. Reapplication refreshes the duration; it never makes a second stack. It does not alter the target's HP or the authored threat budget. |
| Lightning | `{ kind: "stun", duration_ms: 500, reapply_lockout_ms: 1500, max_stacks: 1 }` | Every valid hit stops the target for 500 ms. A target can hold one stun; after it ends, that target ignores new stun applications for 1,500 ms. A hit during the active stun or lockout deals its normal damage but does not extend control. |
| Earth | `{ kind: "single_target_burst", bonus_damage: 3, max_targets: 1 }` | After ordinary direct damage, add 3 damage to exactly one primary valid target. Lines and cones use the valid target nearest the caster; circles use the valid target nearest the cast centre; ties use stable spawn order. Other targets receive only ordinary direct damage. |

Effect bonuses resolve after the direct-hit calculation above and are not fed back through the
matchup or resistance scalar. This preserves the approved direct-damage ordering while making
each effect's separate numeric behavior explicit. The effect's source spell remains the only
thing that can cause it: no chain targeting, no extra shape, no newly authored target count.

## Frieren spell identities, with Pato validation

The current base fields below are retained as the Task 5 starting proposal. Weight fixes the
Mana cost/cooldown (`light` 10/2 s, `standard` 20/4 s, `heavy` 35/8 s); Mastery remains the
shared `+1/+1`, then `+2/+2` template with the listed cost-or-cooldown discount. Pato's result
is **PASS** for those existing values: no weight, cost, cooldown, Mastery-discount, or effect
number is changed silently in this Task 1 contract.

| Spell | Element and payload | Targets / duration or cap | Existing field proposal | Tactical tradeoff |
| --- | --- | --- | --- | --- |
| `arc_lance` | Lightning stun | Line; up to 2 valid targets; 500 ms stun, 1,500 ms lockout, one stack | Light; power 3; targets 2; 10 Mana / 2 s; Master cooldown discount | Fast, inexpensive lane control, but low power and only a narrow two-target line. |
| `flame_sweep` | Fire adjacent pressure | Cone; every hit target within 1 tile gains +2 once | Standard; power 5; targets 2; 20 Mana / 4 s; Master cost discount | Strong close cone pressure, but its bonus disappears at range and the cone limits safe coverage. |
| `frost_nova` | Ice weaken | Circle; up to 3 valid targets; 3,000 ms, one stack | Heavy; power 7; targets 3; 35 Mana / 8 s; Master cooldown discount | Broad defensive weakening and high power cost a heavy cooldown/Mana commitment. |
| `stone_spike` | Earth single-target burst | Line; nearest hit target gains +3; one target may burst | Light; power 4; targets 1; 10 Mana / 2 s; Master cooldown discount | Cheap precise burst is excellent on one target but has no crowd coverage. |
| `flare_jab` | Fire adjacent pressure | Cone; every hit target within 1 tile gains +2 once | Light; power 2; targets 2; 10 Mana / 2 s; Master cost discount | Rapid close-range cleanup trades very low base power and short cone reach for its adjacency bonus. |
| `spark_ring` | Lightning stun | Circle; up to 4 valid targets; 500 ms stun, 1,500 ms lockout, one stack | Light; power 2; targets 4; 10 Mana / 2 s; Master cooldown discount | Cheap emergency crowd stop gives up direct power and cannot repeatedly lock a target. |
| `glacial_shard` | Ice weaken | Line; up to 3 valid targets; 3,000 ms, one stack | Standard; power 4; targets 3; 20 Mana / 4 s; Master cost discount | Reaches a lane of attackers and softens return damage, but has standard pacing and modest base power. |
| `rubble_burst` | Earth single-target burst | Cone; nearest hit target gains +3; one target may burst | Standard; power 3; targets 3; 20 Mana / 4 s; Master cost discount | A cone can tag a group while its damage payoff stays concentrated on one priority target. |
| `thunder_dome` | Lightning stun | Circle; up to 4 valid targets; 500 ms stun, 1,500 ms lockout, one stack | Standard; power 5; targets 4; 20 Mana / 4 s; Master cooldown discount | Reliable area control is paid for with standard cost/cooldown and deliberate anti-stun-lock timing. |
| `magma_lance` | Fire adjacent pressure | Line; its one valid hit target gains +2 only within 1 tile | Heavy; power 9; targets 1; 35 Mana / 8 s; Master cost discount | The highest base single-target fire hit rewards dangerous close commitment but has heavy pacing and one target. |
| `frost_breath` | Ice weaken | Cone; up to 4 valid targets; 3,000 ms, one stack | Heavy; power 6; targets 4; 35 Mana / 8 s; Master cooldown discount | Wide defensive control can protect against a rush but is slower, costly, and weaker per target than magma's burst. |
| `tremor_field` | Earth single-target burst | Circle; up to 6 valid targets; nearest centre target gains +3; one target may burst | Heavy; power 5; targets 6; 35 Mana / 8 s; Master cost discount | The largest area reaches a crowd, while the earth payoff remains one deliberate priority burst at heavy cost. |

### Pato flags for later tasks

- **Schema flag:** `SpellDefinition`, authored JSON, and `validateContent.ts` do not yet carry
  `effect`; Task 2 must add the union/validation before Task 5 writes the payloads. This is a
  required dependency, not permission to omit the fields.
- **Runtime flag:** no current scene code resolves these effects. Task 6 must implement these
  exact caps, refresh/lockout behavior, primary-target tie break, and direct-damage ordering.
- **Content flag:** Task 5 must validate any changed base power/target value against this
  proposal and report a named rejected field rather than overwriting it silently. Weight costs,
  cooldowns, and Mastery discounts remain the authority of `mana-template.md` and
  `mastery-template.md`.

## Default-loadout fairness rule

The fixed six-spell starting loadout is `arc_lance`, `flame_sweep`, `stone_spike`,
`thunder_dome`, `magma_lance`, and `frost_nova` in slots 1–6. It contains every element:
lightning twice, fire twice, earth once, and ice once.

For every ordinary mixed-element wave, content validation must prove both of these rules:

1. Each active monster element has at least two distinct default-loadout spells that deal
   neutral-or-better direct damage (`>= 1.00`), with at least one of them being its 1.25
   counter when that monster's element is present.
2. No one spell ID is the only viable answer to the whole wave. Removing any one default
   spell must leave a neutral-or-better answer for every element present; a wave is winnable
   without exploiting a status effect or an unrepresented spell.

For the fire boss, the same test uses resistance precedence: `flame_sweep`, `magma_lance`, and
`stone_spike` are non-resistant neutral answers. Ice and lightning may still be used for their
effects, but are not counted as viable direct-damage counters. Elemental effectiveness and
status effects are excluded from `computeThreatBudget` and every wave HP/damage-band check;
those measurements stay about enemy-authored threat, not player loadout performance.

## Required executable validation fixtures (Task 2 activation gate)

Task 1 can execute only the existing spell-element structural validator. The following fixtures
are authoritative requirements for Task 2's test-first schema work; they are deliberately not
added as passing production expectations before the types and validator exist.

| Fixture | Required result |
| --- | --- |
| Current valid spell: `arc_lance` with `element: "lightning"` | Passes the current `validateSpells` element check. |
| Current invalid spell: a valid spell with `element` omitted | Fails current validation with `Spell test_spell: unknown element "undefined"`. |
| Invalid effect payload: fire spell with `{ kind: "adjacent_pressure", range_tiles: 2, bonus_damage: 2, max_applications_per_target: 1 }` | Task 2 rejects it because fire range must be exactly 1 tile. It must also reject a missing `effect`, a mismatched kind, and unknown effect keys. |
| Invalid boss resistance pair: fire boss with `resistant_elements: ["ice", "ice"]` | Task 2 rejects it because the pair is not two distinct valid, non-active elements; reject wrong length, unknown values, and active-element inclusion too. |
| Mixed Level 5 wave: fire, ice, earth, and lightning regular entries, one each, plus the final fire boss with `resistant_elements: ["ice", "lightning"]` | After Task 4's registry/wave migration, Task 2/4 fairness validation confirms the six-spell loadout has the required viable non-resistant/counter coverage and no one spell ID is mandatory. |

Only Pato edits this numeric template when an approved balance decision changes. Frieren, Warden,
and Loomwright must cite it rather than duplicating numbers in their own contracts.
