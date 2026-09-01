# Issue #207: Elemental Spell and Monster Roster Design

## Status

- Product: approved by the developer on 2026-08-31.
- Architecture: approved direction; implementation must preserve the existing three mechanical archetypes.
- Program design: pending implementation plan and agent-by-agent gates.

## Goal

Give the twelve-spell roster and enemy encounters distinct elemental identities so spell choice matters beyond damage, while expanding visual variety and making Levels 1–5 progressively more complex. Monsters have no player-facing names. Level 5 is the capstone where all four elements can appear together, and its final wave introduces a unique boss.

## Decisions

### Elemental matchup

The fixed cycle is:

fire -> ice -> earth -> lightning -> fire

The arrow means the element on the left has an advantage over the element on the right. The explicit multiplier table is:

| Spell element vs. monster element | Multiplier |
| --- | ---: |
| Same element | 1.00 |
| Advantage | 1.25 |
| Disadvantage | 0.75 |

The elemental multiplier applies to spell damage only. It does not modify monster HP, monster attack damage, wave threat-budget arithmetic, Hexcoin rewards, or Mastery rewards. The calculation order is:

base spell power -> Mastery adjustment -> elemental multiplier -> final rounding

Area spells apply the same matchup rule independently to every affected target. The implementation uses an explicit lookup table, not inferred arithmetic.

### Monster identity

The data model separates:

1. monsterId: stable, opaque visual identity.
2. archetype: existing melee, ranged, or debuffer behavior.
3. element: one active element assigned by the wave entry.

The roster contains twelve visual identities, with four silhouettes initially recommended for each existing archetype to make the first authoring pass balanced:

- monster_m01 through monster_m04
- monster_r01 through monster_r04
- monster_d01 through monster_d04

These groupings are authoring defaults, not permanent gameplay identities. Warden may reassign an individual silhouette to another existing archetype when its sprite remains readable and the registry is updated. A silhouette is never a new combat archetype by itself.

Wave entries explicitly carry the monster ID, archetype mapping, and one element. If the same visual identity appears with two elements in one wave, it is represented by two entries. Missing or invalid elements fail validation.

### Player-facing presentation

Monster names and archetype labels are removed from gameplay HUD elements, overhead labels, debuff messages, and reward/yield messages. Stable IDs remain available only to data, logs, tests, and developer diagnostics.

Element feedback uses multiple channels:

- color accent derived from the explicit element field;
- a small element motif or icon;
- matching projectile, impact, or aura treatment.

Color is never the sole signal. Monster bodies retain a dark neutral outline and strong silhouette differences. The art pass must validate normal-size readability, grayscale readability, and common color-vision simulations.

### Level progression

The existing Level 1 Wave 0 onboarding exception remains intact. The following progression uses the repository's current zero-based wave indices:

| Stage | New visual identities | Elements | Intended complexity |
| --- | ---: | --- | --- |
| Level 1 Wave 0 | 1–2 | Fire | Onboarding grace and elemental signal |
| Level 1 Wave 1 | 2–3 | Fire | Harder composition, same element |
| Level 1 Wave 2 | 3 | Fire | Introduce the first debuffer |
| Level 2 | 5 active | Fire + ice | Introduce ice alone, then combine |
| Level 3 | 7 active | Fire + ice + earth | Three elements only in later waves |
| Level 4 | 9 active | All four | Sustain three-element complexity |
| Level 5 | All 12 | All four | Four-element combinations in late waves |

Difficulty must rise on multiple controlled axes without stacking every axis in one wave:

- wave-over-wave threat remains monotonic inside each level;
- each level's opening wave is harder than the previous level's opening wave;
- new elements appear alone before being mixed;
- a new visual, new element, tighter timing, larger composition, and modifier increase are not all introduced simultaneously;
- each mixed wave has at least one viable counter in the player's available spells;
- no wave requires one specific spell to be winnable;
- a relief beat follows the first genuinely multi-element combination.

Elemental complexity is measured separately from the existing enemy threat budget. Replacing a visual identity without changing archetype or element must not change the threat result.

### Level 5 boss

The final wave of Level 5 introduces exactly one unique boss visual identity, in addition to the twelve regular visual identities. The boss:

- has a distinct sprite and stable internal ID;
- has one active element for its color and ordinary matchup;
- has two explicit resistant elements;
- treats the remaining element as neutral;
- appears only in the final Level 5 wave;
- has no player-facing name.

Boss resistance is a separate incoming-spell multiplier from the ordinary cycle. Its exact value must be defined by Pato before implementation and must not be silently combined with the ordinary disadvantage multiplier. The boss wave remains subject to its own boss threat-band rules.

## Agent responsibilities and gates

1. Frieren defines each spell's tactical elemental identity and resubmits the twelve-spell balance proposal.
2. Tilesmith supplies or originates the twelve readable silhouettes and the unique boss sprite, with provenance and palette/motif metadata.
3. Warden authors the per-level monster and element assignments, including the Level 5 final boss wave.
4. Pato validates matchup multipliers, boss resistance, spell efficiency, time to defeat, and existing wave threat budgets. Elemental spell effects do not alter enemy threat-band arithmetic.
5. Loomwright implements the pure matchup calculation, data validation, damage integration, and removal of player-facing monster labels.
6. Heckler reviews discoverability, color-blind readability, hard-counter loadouts, mixed-wave fairness, and whether Level 5 feels harder through combinations instead of arbitrary spikes.
7. Ana coordinates dependencies and reports every artifact as in-progress-with-owner, blocked-with-reason, or shipped-and-validated.

Frieren's spell design precedes Warden's final wave assignments; Pato validates both before Loomwright integrates the runtime behavior. Tilesmith's registry contract must be available before wave data references the twelve IDs.

## Validation requirements

- Test all sixteen spell-element/monster-element pairs.
- Test neutral, advantage, disadvantage, and boss-resistance calculations.
- Test calculation ordering with Mastery and final rounding.
- Test that elemental modifiers do not affect monster attacks, HP, rewards, or threat budgets.
- Reject unknown monster IDs, missing elements, and invalid resistance pairs.
- Reject player-facing monster-name fields in authored wave content.
- Verify all twelve visual IDs and the unique boss resolve to assets.
- Verify Level 1 Wave 1 is easier than Wave 2 using a declared threat/complexity metric.
- Verify Level 5 has more simultaneous archetype/element combinations than Level 1.
- Verify the boss appears only in Level 5's final wave.
- Verify every Level 5 mixed wave remains fair under the available spell loadout.
- Run the full typecheck, test suite, production build, and a live playtest.

## Non-goals

- No fourth enemy archetype.
- No runtime color-pixel analysis.
- No player-facing monster bestiary or naming system in this pass.
- No elemental modifier applied to enemy attack threat.
- No automatic game-file writes from the Art Board.
- No campaign level after Level 5 is introduced by this design; Level 5 is the capstone and its final wave contains the unique boss.
