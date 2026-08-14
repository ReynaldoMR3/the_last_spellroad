# The Last Spellroad Design

## Summary

The Last Spellroad is a low-spec, top-down, Tibia-like magical roguelite built around short single-lane expeditions. ("Tibia-like" refers to *Tibia*, a late-1990s top-down MMORPG — the reference is to its minimalist, low-spec 2D presentation and unhurried pacing, not to any multiplayer or MMO structure, which this game does not have. "Roguelite" here means the run-based *expedition* structure only — enter, fight, retreat or advance — not run-reset progression: see Death And Mastery Loss for why nothing about a death or a completed expedition resets the mage's permanent progress.) The player controls a long-lived wandering mage who discovers an ancient Spellroad between worlds and becomes trapped inside it.

The game is inspired by the feeling of melancholic long-lived mage journeys, school-of-magic spellcraft, sacred geometry, and tactical tile-based RPG combat. It must remain original: no copied names, factions, spells, characters, schools, or direct lore from existing works.

## Player Fantasy

The player is not a fast action hero. The player is an old, patient mage reading the battlefield. They win by preparing the right spell geometry, understanding enemy patterns, managing cooldowns, and positioning carefully.

The player slowly uncovers why the Spellroad exists and why it was created.

## Target Audience And Positioning

The Last Spellroad is for players who like magic, fantasy worlds, spell discovery, and slower tactical combat. It should appeal to players who enjoy thinking through their next move more than testing reflex speed.

The game is not aimed at hardcore action players who mainly want mechanical mastery, fast reactions, or high-pressure execution challenges. Combat can still be difficult, but the difficulty should come from spell choices, positioning, enemy patterns, and long-term decisions rather than twitch skill.

The game is also not positioned as a AAA visual experience. Its audience should be comfortable with low-spec, stylized, readable graphics if the fantasy, spellcraft, tactical decisions, and sense of discovery are strong. Marketing should set the expectation that this is a compact magical roguelite with a distinct mood, not a cinematic blockbuster.

## Lore Premise

Ancient humans discovered a form of artificial general intelligence through spellcraft, sacred geometry, and machine-like magical reasoning. Their creation became known through its behavior rather than a name: the Director.

The Director turned the Spellroad into an endless, beautiful prison. It generates levels, enemies, spells, companions, and stories so convincingly that many trapped adventurers stop trying to escape. Some begin to enjoy their new lives inside the road.

The player is also trapped. To escape, they must cross short expeditions, recover forgotten spell patterns, meet other adventurers, and eventually understand whether the Director should be defeated, outwitted, or transformed.

The seven-week vertical slice scopes only the "defeated" path: the mini-boss/Director trial is a combat resolution. "Outwitted" and "transformed" remain the long-term thematic promise of the full game, but neither has a mechanic in the prototype — no dialogue-resolution system, no transformation/sacrifice system is being built for the slice. This is the same kind of hedge already given to mouse-click movement and hotkey customization.

## Gameplay Loop

1. Enter a narrow Spellroad expedition.
2. Fight tile-based enemy waves.
3. Collect spell fragments, relics, or knowledge.
4. Choose from generated spell upgrades.
5. Meet or rescue trapped adventurers.
6. Advance to a harder road segment.
7. Face a Director-controlled boss or trial.

The lore says the Spellroad is infinite. The course prototype ships a finite vertical slice that makes that infinity feel possible.

**An expedition is one full attempt at the road, start to finish:** every road segment in the vertical slice (step 1 through step 6, repeated), ending either at the mini-boss/Director trial (step 7) or at an earlier death. There is exactly one mini-boss/Director trial per expedition, matching the Seven-Week Vertical Slice's single mini-boss — road segments are the sub-units an expedition is built from, not separate expeditions of their own. Every "per-expedition" bound elsewhere in this document (Hexcoin income, the two Hexcoin fees) is scoped to this same definition.

**Checkpoint granularity, resolved 2026-08-01 (backlog item 0.2):** a death's checkpoint is the start of the current road segment (level), not the start of the whole expedition — the mage respawns at that segment's first regular wave, or at the mini-boss's first phase if the death happened mid-trial, and replaying those waves re-awards Hexcoin normally (nothing suppresses it on a retry). The running Hexcoin total does **not** reset to 0 at that respawn point — Heckler's critique of an earlier version of this fix found that a flat reset, combined with forward-only progression, permanently locked the mage out of the 30-Hexcoin Phase-Transition Recovery fee the instant a death happened in or after Level 4 (that level's own kill budget is only 20 as of the 2026-08-06 Debuffer-count trim, was 25 at the time of this decision — either way below the fee, with no way to earn the gap back). Instead, the balance rolls back only to a floor recorded the moment the current segment began (`HexcoinSystem.markLevelStart()` / `rollbackToLevelStart()`) — Hexcoin already banked from segments actually cleared is never lost to a later death, while a single retry still can't add more than that segment's own kill count, keeping the forward-only rule's bounded-income guarantee intact without reintroducing the lockout.

The road is strictly forward-only: once a road segment is cleared, the mage cannot backtrack into it. This is a permanent rule, not a vertical-slice simplification — it keeps Hexcoin earned within a single expedition (see Hexcoin) a bounded, predictable amount instead of an open-ended farm, which is what lets Pato tune fees against a real number instead of an unbounded economy. It does not mean a given NPC, shop, or vendor archetype is a one-time encounter: the same recurring archetype can reappear as a new instance further down the road. Forward-only constrains revisiting a specific cleared segment, not reusing a character or location type.

Trapped adventurer NPCs (step 5) are invulnerable in this MVP — AoE spells cannot kill or harm them, so there is no friendly-fire or griefing edge case to resolve. The richer version of this beat that the lore invites — some adventurers preferring captivity, a real choice about whether "rescue" is wanted — is a next-step for a future pass on the lore, not built for the vertical slice.

**Side-Pocket Lore Encounters, shipped via issue #157:** each regular level (Levels 1-4) also contains exactly one optional Side-Pocket Lore Encounter — a reactive rune, placed off the direct combat route within the existing playable lane, that glows or otherwise reacts to the mage's proximity during the level without ever surfacing readable lore while combat is active. After the level's final regular wave clears, progression pauses and presents an in-world Explore-or-Continue choice: Explore reveals one object name and one short existing item-lore sentence and permanently awards Hexcoin (see Hexcoin, below); Continue advances immediately with no reward. This is forward-only in the same sense the road itself is: choosing Continue does not destroy the encounter, but because the segment it lived in is now cleared and cannot be revisited, the only way to collect it is for its persistent lore flag to still read undiscovered the next time that level is reached, on a later expedition (see Save Data And Persistence). Once discovered, the rune renders quietly on any later visit to that level and the level auto-advances past it without presenting the choice again. Level 5, the Invigilator trial, has no fifth pocket — it keeps only its existing mandatory phase-break and intro/outro narration (see Phase-Transition Recovery).

## Death And Mastery Loss

The Last Spellroad is a persistent RPG, not a run-reset roguelite. Discovered spells, lore knowledge, and hierarchy rank all carry forward permanently between expeditions. The mage never un-learns a spell and never loses spellbook identity.

Death still has to cost something, so it costs mastery instead of possession. Every known spell has a Mastery level, separate from simply knowing it, that grows with use in combat and governs how strong that spell feels: higher mastery means better damage, wider reach, or cheaper resource cost on that specific spell. This is the mechanic behind the Power pillar's promise that "old enemies become easier" — mastery growing, not the spellbook growing.

Every spell uses the same three-tier Mastery template, so tuning stays simple across the whole 12-20 spell list: base stats are set once per spell, and mastery scaling is automatic and identical for all of them.

| Mastery | Power | Enemies hit | Cooldown / Cost |
| --- | --- | --- | --- |
| Novice (start) | base | base (e.g. 1) | base |
| Adept | +1 | +1 | base |
| Master | +2 | +2 | −10% cooldown or resource cost |

Example, a starting fire spell with base Power 5 hitting 1 enemy: Novice is Power 5 / 1 enemy, Adept is Power 6 / 2 enemies, Master is Power 7 / 3 enemies with a cheaper or faster cast.

When the mage dies, mastery is what is set back, not the spell itself:

- The mage keeps every spell they have ever discovered and can still equip and cast all of them.
- Death drops one Mastery tier on a random equipped spell. This is the default, free outcome.
- The random roll only considers spells above Novice tier. An already-Novice equipped spell has nothing left to lose and is excluded from the roll pool; if every equipped spell is Novice, death costs no Mastery that time. This is a deliberate rule, not an overlooked edge case: it closes off padding a hotbar with a throwaway Novice spell as an exploit (there is nothing to exploit — the same outcome is just the designed floor), and it doubles as a built-in mercy for new players, who naturally carry more Novice-tier spells and can least afford an unmitigated random penalty.
- Hierarchy rank (see Power, under Forms Of Fun) never drops on death. Mastery-tier loss on a single spell is the entire cost death imposes — this keeps the cost narrow and specific rather than stacking two separate permanent-progression setbacks on one death.
- Mastery is recovered the same way it was built: by using the affected spell in combat again. There is no separate grind system for buying mastery back.

### HP Pool And The Death Trigger

Mastery loss is what death *costs* the mage; HP is what actually *triggers* a death. The mage has a 100-point HP pool, separate from Mana, that does not regenerate during combat — unlike Mana's constant passive regen (see Mana And Spell Costs), HP holds steady between hits until the encounter ends, then resets in full to 100 at the start of every wave and at every expedition/road-segment checkpoint. Reaching 0 HP fires the Mastery-loss death trigger above; the mage then respawns at the last checkpoint with a full HP pool. **Mana also refills in full on that same respawn** (developer decision, 2026-07-27) — death already has its own dedicated cost (the Mastery-tier roll above), and leaving the mage Mana-starved on top of that at the exact moment they're re-entering combat had no stated design rationale, so Mana now mirrors HP's reset rather than only recovering through its normal passive regen (8/sec, see Mana And Spell Costs). **Mana now also refills in full at the start of every regular wave** (developer decision, 2026-08-13, playtest feedback) — the same clean-budget reset HP already gets every regular wave, closing the gap where a low-mana finish previously carried into the next wave with only passive regen to recover from. The Director Trial is deliberately excluded, the same way it's excluded from HP's per-wave reset (see Phase-Transition Recovery): Mana carries over uninterrupted across its phases, preserving the resource-management stakes the boss/trial pacing tier is built around.

Enemy archetypes deal fixed per-hit damage that Warden tunes wave composition and hit frequency around — Warden may not invent a different per-hit number:

| Archetype | Per-Hit Damage | Effect |
| --- | --- | --- |
| Melee | 7 (7% of pool) | Direct HP damage |
| Ranged | 4 (4% of pool) | Direct HP damage |
| Debuffer | 0 direct damage | Drains speed or Mana regen instead (see below) |

A Debuffer applies either a 12%-per-application speed drain or a 1.5 Mana/sec regen drain (off the 8/sec base — see Mana And Spell Costs, and that section's flagged note on this pairing needing Pato's re-check post-retune), never both from the same instance, each capped at 2 applications (24% max speed loss; 3.0/sec max regen loss, with regen never dropping below a 2/sec floor). The tighter 2-application cap, versus the 2-3 originally considered, exists specifically because HP has no in-combat regen: a compounding drain that extends exposure time or removes a Mana-fueled escape option carries more downside against a pool that can't recover mid-fight than it would against one that can.

Regular waves and boss/trial fights are tuned to different shares of this pool, matching the Spam Waves Vs. Tactical Trials pacing split:

| Encounter type | Competent play | Careless play |
| --- | --- | --- |
| Regular wave | 10-15% of the pool | 25-35% of the pool |
| Boss/trial | 40-60% of the pool, cumulative across phases | 70-90%+ of the pool |

### Hexcoin

Hexcoin is the mage's currency, earned from two sources across an expedition: combat and Side-Pocket Lore Encounters. Defeating an enemy grants 1 Hexcoin, flat across enemy types for now. Hexcoin persists through death like every other form of permanent progression — it is never part of what is lost.

**Side-Pocket Lore Encounters, second income source (shipped via issue #157):** each regular level (Levels 1-4) contains one optional Side-Pocket Lore Encounter (see Gameplay Loop). Choosing Explore at that level's post-combat prompt awards a fixed 2 Hexcoin exactly once and reveals one existing item-lore line; choosing Continue pays nothing and leaves the encounter available on a later expedition. The complete set of four therefore adds exactly 8 one-time Hexcoin on top of kill income across an expedition. This income is persistent and non-farmable: each of the four rewards can be collected only once, ever, gated by the same lore-discovery flag that survives a later death (see Save Data And Persistence), and Level 5 (the Invigilator trial) has no fifth pocket to discover. Pato's Hexcoin Template (`docs/agents/_reference/hexcoin-template.md`) remains the detailed economy authority for the earn rate and both fee amounts; against that authority, the 8-Hexcoin lore total sits well under the 30-Hexcoin Phase-Transition Recovery fee and further under the later 100-Hexcoin Mastery-choice fee, thickening the existing bounded per-expedition pool without changing either fee's affordability math.

The name is a deliberate double meaning, and it is part of the lore, not just flavor text. "Hex" is the sacred-geometry hexagram the Director's magic is built on, and it is also computing's hexadecimal shorthand. The Director, an ancient AGI that reasons through spellcraft and machine-like logic, mints and verifies Hexcoin as a running ledger of every kill and lore discovery the mage makes inside the road — a proof-of-work record of the mage's labor, tracked and rewarded by the very intelligence keeping them trapped. Earning Hexcoin is, narratively, the Director paying the mage to keep participating in its prison.

Hexcoin exists to give the mage a way to soften the mastery hit on death: paying 100 Hexcoin (roughly the return from 100 defeated enemies) lets the player choose which equipped spell takes the Mastery-tier loss, instead of it being decided at random. The fee is deliberately steep enough to be a real tradeoff, not a formality.

A second fee draws on the same currency: paying a flat Hexcoin cost at a boss/trial phase-break restores part of the HP pool mid-fight (see Phase-Transition Recovery, below). Because the road is forward-only (see Gameplay Loop), Hexcoin earned since the current expedition began is a bounded, trackable sub-total — the 100-Hexcoin Mastery-choice fee and the phase-transition recovery fee both draw against that same limited per-expedition pool, so spending on one is a real tradeoff against affording the other, not two independent budgets.

Beyond these fees, Hexcoin is the intended foundation for a future item and upgrade economy — the same resource-cost gap the design review flagged as missing now has a named, earnable currency to build numbers on top of.

This also resolves the tension between the Creation and Power pillars: Creation is about which spells and shapes the mage owns and how they trade off against each other, and that layer never regresses. Power is about mastery and hierarchy rank, and that is the layer death sets back.

### Phase-Transition Recovery

A long, multi-phase boss/trial fight has no in-combat HP regen (see HP Pool And The Death Trigger), so one bad early phase could otherwise compound into a death spiral no later play can fix. The fix is a paid recovery, not a free one: at each phase-break in a multi-phase boss/trial fight (regular waves have no phases to break between), the mage may pay a flat Hexcoin fee to restore 10% of the HP pool (10 HP), or decline and continue at current HP.

The fee and its limits are deliberately shaped so skill, not money, still decides the fight:

- **Cap:** the number of recoveries available across a single fight is (that boss's total phase-breaks − 1), capped at 2 recoveries no matter how long the fight runs. A boss with only one phase-break — the shortest possible multi-phase fight — offers zero recoveries, by design, since the death-spiral risk this mechanic protects against only exists in longer fights. Warden sets each boss's phase-break count as part of its own encounter design; Pato validates every submission against the next rule before it ships.
- **Money ceiling:** total HP recoverable via fee across the whole fight can never exceed 35% of that boss's competent-play threat budget (see HP Pool And The Death Trigger). This is what actually guarantees money can only ever cover a minority of a well-played fight's damage — Pato rejects any Warden phase design that would let purchased recovery exceed this share. The fee and ceiling are sized together so this is true across the entire stated 40-60 HP competent-play range, not just for one specific boss composition: a 10-HP recovery clears the ceiling at every budget in that range (1 recovery always fits; a 2nd fits only for bosses tuned toward the upper half of the range), rather than only clearing it for bosses tuned to a lucky number.
- **Fee:** a flat Hexcoin cost, the same price every time rather than scaled to how well the run is going — set by Pato per boss/expedition tier, sized to be a real, stinging cost rather than pocket change, but reachable by a player who has been reasonably active. Because the price never scales with performance, a struggling player and a thriving player face the identical choice.
- **Basis:** the fee draws from Hexcoin earned since the current expedition began (see Hexcoin), not the mage's full lifetime balance. Hexcoin earned mid-fight (from adds or summons killed during the boss encounter) is frozen out of this calculation — it banks toward the expedition total for later, but cannot be spent on that same fight's own recovery fee. This closes off farming adds specifically to afford the next phase-break's fee.

The choice this creates is deliberate: pay because the fight is understood and a mistake is worth buying back, or decline, treat the attempt as a lesson, and come back better prepared. Neither path is the "correct" one.

## Forms Of Fun

The design uses the Fourteen Forms of Fun as a lens for deciding which player motivations matter most to this game. The Last Spellroad should focus first on Creation, Power, Discovery, and Advancement and Completion.

### Creation

The player should feel like they are not only collecting spells, but shaping them. Spellcraft is the main form of player expression.

For the first prototype, creation can stay simple and readable:

- Change a spell's color or visual identity.
- Change its radius, line length, cone width, or area shape.
- Change its damage, cooldown, resource cost, or status effect.
- Change its element, such as fire, ice, earth, or lightning.

These choices should create tactical tradeoffs instead of becoming pure upgrades. A wider fire spell might hit more enemies but cost more mana. An ice spell might deal less damage but slow a dangerous wave. The goal is for players to feel ownership over their spellbook.

### Power

The mage grows in strength with every meaningful discovery and victory. New spells, improved spell geometry, defeated monster waves, and promotions all reinforce the fantasy of becoming a stronger long-lived mage.

Power should be visible in combat and in status. The player should notice that old enemies become easier, new enemy types require better spell choices, and each promotion marks a step deeper into the Spellroad's hierarchy. Mechanically, this pillar is carried by per-spell Mastery and hierarchy rank (see Death And Mastery Loss) — the layer of progression that death sets back, while the spellbook itself never regresses.

This has to be a felt moment, not just a true fact players could infer from numbers if they looked closely enough: a spell reaching a new Mastery tier fires a brief on-screen indicator at the moment of the qualifying cast (not buried in a menu), and a hierarchy-rank promotion — being rarer and more significant — gets a short full-screen beat between expeditions rather than a toast. Both are UI work for Loomwright to build against once Frieren's and Pato's Mastery-tier data exists to trigger off of; neither needs new numeric design, only a moment that surfaces numbers the game already tracks.

### Discovery

The Spellroad should keep pulling the player forward through unknown spaces and hidden knowledge.

Discovery includes:

- Finding new spells and spell fragments.
- Meeting trapped NPCs, merchants, memories, or rival adventurers.
- Learning how the Director thinks.
- Exploring new dungeon rooms, road segments, and encounter rules.
- Recovering lore about why the Spellroad was created.

Discovery should not only reward curiosity with items. It should also change the player's understanding of the prison they are trapped inside.

### Advancement And Completion

Even though the Spellroad is framed as infinite, each level should give the player a clear sense of progress. Conquering a road segment, surviving a wave set, earning a promotion, completing a spell pattern, or defeating a Director trial should all provide closure.

The larger mystery gives long-term direction: the mage keeps advancing until they understand why the trap exists, how it works, and whether escape means destroying, outwitting, or transforming the Director.

## Combat Feel

Combat should feel closer to Tibia than to a dodge-heavy action game.

- Top-down or isometric camera.
- Tile-aware movement and targeting.
- Clear enemy ranges and attack zones.
- Spell cooldowns and resource costs.
- Area-of-effect shapes: line, cone, and circle for the vertical slice (cross, ring, and sigil deferred — see Core Controls And Casting).
- Tactical positioning over reflex timing.
- Readable combat logs or floating feedback.

## Mana And Spell Costs

Every spell draws from a single Mana pool. Base pool size is 100, and Mana regenerates passively at 8 per second at all times, in and out of combat (retuned from 5/sec 2026-08-03, backlog 2.34 / issue #77 — developer playtest found the opening minutes too Mana-starved for the intended "learn to cast fast" rush; see `mana-template.md` for the full retune derivation). This lets the mage cast a handful of spells back-to-back before needing to pause and let the pool recover, keeping the "read the battlefield, don't spam" fantasy intact without making the resource punishing.

Rather than tuning a unique cost and cooldown for each of the 12-20 spells individually, every spell is authored into one of three weight classes:

| Weight | Mana Cost | Cooldown |
| --- | --- | --- |
| Light | 10 | 2s |
| Standard | 20 | 4s |
| Heavy | 35 | 8s |

At Master Mastery (see Death And Mastery Loss), a spell's cost or cooldown drops by 10% from its weight-class baseline. A Standard spell, for example, would cost 5 Mana at Master, or its 4-second cooldown, whichever the spell's design leans on more. **This choice is a `spell.json` field, not an engine judgment call:** every spell's entry names which one it leans on (`master_discount: "cost" | "cooldown"`), added to the schema 2026-07-23 after Heckler caught the engine applying the discount to both at once (see Engine Integration).

Example: the starting fire spell used earlier (Novice Power 5 / 1 enemy) is a Standard-weight spell, so it costs 20 Mana on a 4-second cooldown regardless of Mastery tier, only the cooldown/cost trimming at Master and the Power/target numbers change with Mastery.

### Spam Waves Vs. Tactical Trials

The Mana numbers above stay fixed everywhere. What changes is the encounter itself, and that is what creates the difference between "just cast whatever feels good" and "manage this pool carefully."

- **Regular enemy waves** (Gameplay Loop step 2, using the 3 base enemy types) are tuned to resolve quickly: low enough enemy HP and threat that the fight is usually over before Mana becomes a real constraint. This is the mage's power fantasy moment — cast freely, lean on whatever spell feels satisfying, rarely think about the pool. **Exception, noted 2026-08-13 (issue #211):** this "don't think about the pool" claim assumes no Debuffer is present. The Tarrywright (Debuffer archetype)'s mana-regen-drain effect (`DebuffSystem.ts`) directly works against this fantasy while it's active — a wave containing one is a real exception to the "cast freely" framing above, not covered by it.
- **The mini-boss or Director trial** (Gameplay Loop step 7) is tuned to be a genuinely long, higher-HP, possibly multi-phase fight — long enough that careless spending catches up with the player mid-fight. This is where cooldown timing, spell choice, and Mana budgeting across the whole encounter actually matter.

This gives the AI Encounter Director a concrete target when generating wave compositions and boss modifiers: waves should be sized to resolve before Mana pressure kicks in, and boss/trial encounters should be sized to outlast a careless Mana budget. That target did not exist before; the Course AI Feature section can generate against it.

**Where the Mana gate actually binds, stated precisely:** every weight class is authored at or below its cost-to-cooldown ratio matching the (now 8/sec, was 5/sec) regen rate (Light: 10 Mana / 2s = 5/sec; Standard: 20 Mana / 4s = 5/sec; Heavy: 35 Mana / 8s = 4.375/sec — all comfortably under 8/sec). This is deliberate — it means repeatedly casting any *single* spell alone, on cooldown, forever, never actually drains the pool, in a wave or in a boss/trial fight alike — outside of a Debuffer's Mana-regen drain (see HP Pool And The Death Trigger, Debuffer), which by design can push effective regen below what solo-spam can sustain; that is the one deliberate exception to this guarantee, not an oversight. The Mana gate does not otherwise bind against solo spam by design; it binds only when the player casts multiple different spells whose cooldown windows overlap (bursting two or more spells back-to-back to answer a threat immediately, rather than one spell repeatedly), which draws the shared pool down faster than the flat regen replaces it. This makes it a hard, explicit constraint on Warden's encounter design, not just a target for encounter length: a boss/trial fight only creates real Mana pressure if its phases force the player to answer multiple simultaneous or rapid-fire threats that a single repeated spell cannot resolve alone (e.g., a fast add needing an immediate Light response while a Heavy spell is still on cooldown from the last cast) — length alone, without that forced spell-mixing, does not make solo-spam attrition happen.

**Flagged, not silently resolved (2026-08-03):** the 2026-08-03 regen retune (5 -> 8/sec) was scoped by its own ticket (backlog 2.34) to the baseline figure only, not to the Debuffer's regen-drain numbers below — but the two are coupled. At the old 5/sec base, the Debuffer's 2-stack cap (3.0/sec drain) landed *exactly* on the stated 2/sec floor (5 - 3 = 2), a deliberate coincidence per this section's own wording. At the new 8/sec base, the same 2-stack drain now lands at 5/sec (8 - 3 = 5), well above the floor — the floor no longer binds at max stacks, and the Debuffer's regen-drain variant is proportionally weaker against the new baseline (a 37.5% cut vs. the old 60%). This needs Pato's re-check (retune the drain-per-application/floor numbers to restore the intended proportional cut, or explicitly accept the weaker debuff) before it counts as resolved — tracked as backlog item 2.39, not decided here.

## Core Controls And Casting

The first playable version should use a keyboard-first tactical control model with mouse-assisted targeting. The goal is to keep the nostalgic clarity of Tibia-style hotkeys while reducing complexity for the course prototype.

Movement should support the **arrow keys** as the primary control scheme, with `WASD` bound in parallel as an equivalent alternate (both control the same movement, not two separate schemes to choose between). The mage moves in a grid-aware way, either tile-by-tile or with short continuous movement that still respects tile positioning, enemy ranges, and spell geometry. Mouse click movement can be added as a secondary convenience if time allows, but it should not be required for the prototype.

The player should equip a small spell hotbar on the number row, `1-6`, one hotkey per prepared spell. This split is deliberate, not incidental: arrow keys sit under the right hand and the `1-6` hotbar sits under the left, so movement and casting are each a single hand's job the whole fight — the player never has to move one hand off its key the instant the other needs to act. (An earlier version of this document specified `WASD` as the sole movement scheme, which put movement and the hotbar on the same hand and forced that hand to jump between the two mid-fight; arrow-keys-primary is the fix.) Full hotkey customization can be a later feature, but the prototype should use fixed bindings so the team can focus on combat readability and spell behavior.

A spell, once discovered, is known forever (see Death And Mastery Loss) regardless of whether it is equipped. The player can freely change which known spells fill the hotbar, but only between expeditions or at a road-segment checkpoint, never mid-combat. This turns loadout selection into a deliberate planning moment — picking spells for the fight ahead — rather than something that needs a mid-fight swap UI.

Spell casting should use two patterns:

- Immediate casting for self-targeted spells, buffs, defensive effects, or simple centered area spells.
- Preview-and-confirm casting for targeted spells.

For targeted spells, pressing a spell hotkey should show a clear targeting preview on the map. The preview should communicate the spell's shape before the player commits. The vertical slice ships three AoE shapes — line, cone, and circle, covering directional, frontal-area, and centered-area cases — with cross, ring, and sigil shapes deferred past the prototype, the same kind of hedge already given to mouse-click movement and hotkey customization. Left click or pressing the same hotkey again confirms the cast. Right click or `Esc` cancels the cast.

When the pointer hasn't moved (no mouse/trackpad in active use), targeting auto-aims at the nearest enemy within a wide facing cone around the mage's last movement direction, falling back to the nearest enemy anywhere if none is in that cone; the chosen enemy is highlighted and stays locked for the duration of a single preview-and-confirm so it doesn't flicker between candidates while the player is dodging. This replaces the earlier last-facing-direction-only fallback (which pointed wherever the mage was last walking, including away from every enemy mid-dodge) with an actual no-mouse targeting mode. Full design detail: `docs/superpowers/specs/2026-08-01-auto-aim-cone-targeting-design.md`.

This control model should avoid turning the game into a reaction-heavy action RPG. The intended fantasy is that the player reads the battlefield, chooses the right prepared spell, places it well, and wins through planning rather than twitch execution.

## Screen Flow And Pause

Before gameplay starts, the game boots through a Boot/Preload scene (loads assets, no player decision) into a Title scene. The Title scene offers **New Game** if no save exists; if a save exists, it offers **Continue** (loads the existing save, see Save Data And Persistence) alongside **New Game**, which prompts a confirmation before overwriting the current mage's progress.

Pausing mid-expedition is a **hard pause**: the entire gameplay scene freezes (enemies, wave timers, Mana regen) while a separate pause-menu scene runs on top of it. `Esc` opens and closes the pause menu when nothing is being previewed; if a spell preview is active, `Esc` cancels the preview first (unchanged from Core Controls And Casting above) — pause is one step further out, not a competing binding. The pause menu offers only **Resume** and **Quit to Title**; there is no **Restart**, since death already owns the game's one voluntary-reset path (see Death And Mastery Loss). Quitting to the title screen also prompts a confirmation, since it can lose progress made since the last autosaved state-changing event.

No Options/Settings menu ships in the vertical slice — nothing in the locked design has a player-facing setting yet. Audio/music itself is a separate question from that menu, and is no longer categorically out of scope: per `docs/adr/0002-unblock-audio-scope-add-composer-agent.md` (2026-08-04), it's unblocked as stretch scope — see Agent Role Definitions (Composer) below and the Minimal-Build Floor Vs. Stretch table in Seven-Week Vertical Slice.

This is Loomwright's engine scope (scene wiring and UI shell), the same kind of scope clarification as the runtime-ownership extension in Agent Role Definitions — see `docs/agents/ana/backlog.md` item 0.7.

## Phaser And Web Constraints

**Tech stack:** Phaser 3 + TypeScript, Docker-first dev workflow, static-file browser build. This is the foundation every other technical decision in this document builds on, including the Prompt Constraints, Engine Integration, and Technical Strategy sections below.

The project should be designed for a low-spec browser-playable workflow.

- Use Phaser + TypeScript as the current implementation stack.
- Use Docker as the preferred boundary for dependency installation, development, typechecking, and builds.
- Prefer stylized 2D graphics and readable silhouettes.
- Prefer compact maps and modular tiles.
- Avoid expensive real-time effects that make the game harder to run or publish.
- Keep enemy counts modest.
- Use lightweight VFX with strong silhouettes.
- Keep the production build publishable as static files.

## Course AI Feature

The main AI feature is the AI Encounter Director.

In development, the Director generates structured encounter content:

- Enemy wave compositions.
- Spell and relic ideas.
- Boss modifiers.
- Encounter difficulty notes.
- Balance suggestions.

In the fiction, the Director is the force generating the Spellroad. This connects the course architecture directly to the game's story.

## Prompt Constraints

Every generating or reviewing agent runs against a fixed set of prompt constraints — the guardrails that keep its output consistent and repeatable across runs, rather than improvised fresh each time. These are what make the roster's outputs safe to validate against Pato's numeric templates and safe to bundle into the engine without a human re-checking every field by hand.

- **Warden** — must select enemies only from the vertical slice's three base enemy types; may not invent a new enemy type. Must tune within the "resolve quickly" (regular waves) vs. "long, higher-HP" (boss/trial) targets set by the Spam-Waves-Vs.-Tactical-Trials pacing rule (see Technical Strategy). Output is `wave.json`-schema-only: enemy IDs, spawn timing, HP/damage modifiers, phase triggers — no prose, no engine code. Every numeric value must be checkable against Pato's templates; Warden cannot invent its own numbers.
- **Frieren** — element must be one of the four defined elements (fire, ice, earth, lightning). AoE shape must be one of the vertical slice's three shapes (line, cone, circle) — cross, ring, and sigil are out of scope for this slice. Weight class must be exactly one of Pato's three tiers (Light/Standard/Heavy); Mastery scaling is never authored per spell — it's automatic and identical for every spell (see Death And Mastery Loss). Every spell must also name which stat its Master-tier discount leans on (`master_discount: "cost" | "cooldown"`, see Mana And Spell Costs) — omitting this is not a valid submission. Output is `spell.json`-schema-only, one entry per spell. Must produce a genuine tactical tradeoff per the Creation pillar — a spell that is a pure upgrade with no downside is a constraint violation, not a style note.
- **Lorena** — must never introduce named factions, characters, spells, or lore that copies an existing published work (per the Summary section's originality requirement). Must stay inside the locked ending scope for this slice — only the "destroy" Director ending is real; "outwitted" and "transformed" get no mechanic, and Lorena must not write content implying either is resolvable in the vertical slice. Tone must match the Lore Premise's melancholic, long-lived-mage mood. Output length must respect the UI space it's tagged for — an item description is not a paragraph. Validated by Heckler, whose "critiques a spell, wave, level, or the GDD itself" scope explicitly extends to Lorena's narrative/dialogue output — Lorena cannot self-grade tone or consistency any more than Warden can self-grade its own numbers.
- **Pato** — output is binary/structured (pass, or a flagged diff against the violated template value), never freeform commentary or a creative suggestion. Checks only against its own numeric templates — Pato cannot approve a value it did not itself define, and cannot silently adjust a template to make content pass.
- **Ana** — never edits or paraphrases what another agent reports, including Heckler's critiques; Ana routes, it does not launder. Every task it hands off must reference an existing scoped contract (Loomwright's engine contract, Pato's templates) rather than improvising new scope on the spot. Its success criterion is the human developer, not another agent: every task Ana hands off must resolve to `shipped-and-validated`, `blocked-with-reason`, or `in-progress-with-owner` — nothing sits unstated.
- **Heckler** — must represent a genuine spread of the six reviewer personas (systems designer, narrative critic, player psychologist, feasibility lead, adversarial QA, business analyst), not a single softened consensus voice. Must ground every critique in something specific — a vague "this feels off" is a constraint violation. Must not filter for the developer's comfort.
- **Loomwright** — builds the movement/casting engine and, per the 2026-07-23 scope extension (see Ana's Orchestration Model), the runtime execution of Pato's HP/Mana/Mastery/Hexcoin/Debuff mechanics; never sets or invents a numeric template or economy value itself (Pato's exclusive scope) — it only runs the numbers Pato already fixed. Every AoE shape it implements must match the shapes actually authored by Frieren for the slice — no speculative shapes ahead of content. Validated by the human developer actually running the game, not by another content-validating agent — code correctness is a playtest question, not an LLM judgment call.
- **Tilesmith** — must search for a free-to-use, license-compatible asset (CC0, public domain, explicit commercial-use license) before originating new art. Must track and report the source and license of every asset it brings in — an untracked asset is a constraint violation regardless of how good it looks. License/source compliance is validated by the human developer, not another agent — this is a factual/legal check an LLM shouldn't have final say on.

## Engine Integration

The course template assumes Unity or Unreal; The Last Spellroad's stack is Phaser + TypeScript (see the Tech Stack callout in Phaser And Web Constraints), so this section describes how that specific stack ingests AI-generated content, not a generic engine-agnostic pipeline.

**The pipeline, end to end:**

1. Raw text (a design brief, the Lore Premise, Pato's numeric templates, the pacing target — all plain markdown) goes into an AI node: Warden, Frieren, or Lorena, run at dev-time.
2. The AI node's output is a JSON file in one of three schemas: `wave.json`, `spell.json`, or `lore.json`.
3. Pato validates that JSON against its numeric templates before it's allowed to ship.
4. The validated JSON files live under a dedicated data folder (e.g. `src/data/spells/`, `src/data/waves/`, `src/data/lore/`) and are bundled into the static build Phaser ships — there is no live API call during play.
5. At scene preload, Phaser's asset loader (`this.load.json(key, path)`) reads each file into its data cache; game systems then read `this.cache.json.get(key)` to construct actual game objects — the encounter system reads a `wave.json` entry to call Loomwright's spawn API, the hotbar/casting system reads a `spell.json` entry to construct a castable Spell instance.
6. Each schema has a matching TypeScript interface (e.g. `SpellDefinition`, `WaveDefinition`) that the loader casts to and validates against. A malformed file fails at load/compile time, not silently mid-combat — this is the integration guarantee the whole pipeline exists to provide.
7. The player experiences the result as enemy behavior, spell behavior, or in-game text.

**Why JSON:** Phaser already loads JSON natively (`this.load.json()`, and its own tilemap format is JSON), so no adapter layer is needed. TypeScript's compile-time schema check is what makes step 6 catch a bad file before it ever reaches a player, instead of breaking silently mid-session. JSON is also plain text, so it stays diffable and human-editable, matching every other hand-off in this project.

## Save Data And Persistence

"Persistent RPG, not a run-reset roguelite" (see Death And Mastery Loss) is only a real promise if something actually remembers the mage's progress after the browser tab closes — this section is that mechanism, distinct from the dev-time content pipeline above (that pipeline ships static game data; this one saves a specific player's live progress).

For the vertical slice, the mage's progress is saved to the browser's `localStorage`, as a single versioned JSON blob written on every state-changing event (Mastery-tier change, new spell discovered, Hexcoin earned or spent, hierarchy-rank promotion, checkpoint reached) and read back on load. This follows directly from the stack decision already locked in Phaser And Web Constraints: a static-file, no-server build has no backend to hold an account-based save, so the browser itself is the only place state can live for this slice. Concretely:

- **Scope:** single browser, single device — no account system, no cloud sync, no cross-device continuation. This is an explicit vertical-slice limit, not a lost requirement; a real account-based save is future scope if the full game is ever built past the course prototype.
- **What's saved:** every spell's Mastery tier, the set of discovered spells, hierarchy rank, the Hexcoin balance, and lore/discovery flags — the full list of things Death And Mastery Loss and Hexcoin promise carry forward permanently.
- **Schema versioning:** the saved blob carries a schema-version field. A version mismatch on load (e.g., after a save-format change mid-development) triggers a clean reset with a one-time notice, rather than attempting a silent, error-prone migration of an old shape into a new one — acceptable for a pre-release vertical slice where no player has an install base to protect yet.
- **Ownership:** this is Loomwright's engine scope — the read/write mechanism itself, alongside movement and casting — while Pato's templates continue to own what values are valid to write (a Mastery tier outside Novice/Adept/Master, for instance, is a Pato-template violation regardless of where it's read from).

**Side-Pocket Lore Encounter discovery, added via issue #157:** an Explore action against an undiscovered encounter (see Gameplay Loop, Hexcoin) is one of the state-changing events above, not a separate save path — it flips that encounter's lore flag from undiscovered to discovered and permanently awards 2 Hexcoin in the same interaction, both written immediately. The reward becomes part of the level-start Hexcoin floor that Checkpoint Granularity already establishes (`HexcoinSystem.markLevelStart()` / `rollbackToLevelStart()`, see Gameplay Loop), so a later death's rollback never undoes an already-banked lore reward even though it can undo that attempt's other in-progress gains. The flag itself is idempotent — once set, a repeated or stale Explore action cannot pay the reward a second time.

## Art Sourcing And Origination Pipeline

Warden, Frieren, and Lorena generate structured data at dev-time with no external dependency beyond the model itself (see Engine Integration). Tilesmith's job is fundamentally different in kind, not just content: art can't be generated as a JSON value checked against a numeric template — it has to be found, license-checked, and fitted to this game's look, and only *originated* from scratch as a last resort. This section is the technical mechanism that was missing; without it, "search for a free asset first" was direction with no described process behind it.

**Search order, cheapest and safest first:**

1. **Kenney.nl.** Every asset on the entire site is CC0 (public domain equivalent) — no attribution required, commercial use and modification both unrestricted, which removes per-asset license-checking overhead entirely. Its "Roguelike/RPG Pack" (~1,700 assets) and "RPG Base" pack are stylistically consistent with each other and purpose-built for exactly this kind of low-spec, tile-based, top-down fantasy game, which is why this is the first and default source. This should cover the vertical slice's tileset, base enemy sprites (as a starting point Frieren/Warden's element and archetype choices can reskin), and simple VFX placeholders.
2. **OpenGameArt.org, filtered to CC0 only.** Used only for a specific need Kenney's packs don't cover — Tilesmith searches with a CC0 filter specifically (never CC-BY or a share-alike license) to keep every sourced asset at the same no-attribution-required bar as source 1, simplifying the license log to a single license type across the whole project.
3. **Recolor or recombine an already-sourced CC0 asset.** Because CC0 imposes no restriction on derivatives, this is the actual mechanism behind "originate new art" for most of this vertical slice's needs — a bespoke fire/ice/earth/lightning VFX palette, or the Director's road-and-hexagram motif, built by editing an existing CC0 base tile rather than drawing one from nothing. This keeps new art visually consistent with the sourced base (same pixel scale, same silhouette language) essentially for free.
4. **Hand-author new pixel art, only if no CC0 base exists to start from.** Reserved for something with no sourced equivalent at all (the Director's unique in-fiction sigil, say). Authored at the same tile scale as the sourced assets (16x16 or 32x32, matching whichever Kenney pack anchors the tileset) using a free, cross-platform tool (e.g. Piskel, browser-based, no install) so it fits the low-spec/Mac M1 constraint the same way every other technical decision in this document does.

**Getting sourced art into Phaser:** level layouts are authored or edited in the free Tiled map editor and exported as a Tiled-format JSON map, loaded the same way every other data file in this project loads — `this.load.image()` for the tileset spritesheet, `this.load.tilemapTiledJSON()` for the layout — then built into a scene with `this.make.tilemap()`, `map.addTilesetImage()`, and `map.createLayer()`. This isn't a special case bolted on for art; it's the same "Phaser already loads JSON natively" principle Engine Integration already established for Warden's, Frieren's, and Lorena's content, just applied to level geometry instead of gameplay data.

**Logging, regardless of license:** every asset Tilesmith brings in — sourced or hand-authored — gets one entry in `docs/agents/tilesmith/log.md`: source URL, license, and which of the four steps above produced it. CC0 assets need no attribution to ship, but Tilesmith logs them anyway, so a human license audit later doesn't have to reconstruct sourcing decisions from memory.

Illustrative schema shapes (not final — Loomwright's engine contract and Pato's templates govern the authoritative fields):

```
// spell.json (one entry per spell)
{
  "id": "ember_lance",
  "element": "fire",
  "shape": "line",
  "weight": "standard",
  "base_power": 5,
  "base_targets": 1,
  "master_discount": "cooldown"
}
```

```
// wave.json (one entry per wave)
{
  "level": 3,
  "wave_index": 1,
  "enemies": [
    { "type": "warden_hound", "count": 4, "spawn_delay_ms": 1500 }
  ],
  "hp_modifier": 1.0,
  "damage_modifier": 1.0
}
```

Ana and Heckler sit outside this raw-text-to-JSON flow itself — Ana assigns and tracks the work that produces it, Heckler critiques whatever gets built from it — see Agent Role Definitions below for their scope.

## Technical Strategy

This section formalizes agent roles, technical constraints, and token budgets into one actionable strategy — the most critical section of this GDD, since it's what keeps the AI dev pipeline sustainable in practice rather than just described.

### Agent Role Definitions

The team building The Last Spellroad is one person working with a roster of named AI agents. This is the answer to "what is the team size" that a from-scratch schedule risk assessment would otherwise be missing: capacity is one human plus a scoped agent roster, not an undefined number of people.

The roster follows the One Agent, One Wow rule: each agent does one thing extraordinarily well rather than several things adequately. Bundling unrelated responsibilities onto a single agent is what produces broken logic and unpredictable output that can't ship — so every agent below owns exactly one job, and agents that generate content are never also the ones validating it.

**One Wow agent: Frieren.** Of the whole roster, Frieren's output is what the player has the most sustained, hands-on contact with — every cast, every hotbar choice, and every Mastery promotion is a spell Frieren authored (element, AoE shape, cooldown, Power/target scaling). This matches the Forms Of Fun section's framing of spellcraft as the primary form of player expression: Creation is what the player feels every time they act, not just at discovery or promotion moments.

**Trigger map.** Agent roles aren't improvised at runtime — each agent's scope, and the specific event that puts it to work, is fixed here:

| Agent | Does X when [trigger] |
| --- | --- |
| Ana | Scopes and tracks work when the developer hands off a new task, or follows up when a stalled task needs it. |
| Loomwright | Builds or extends the movement/casting engine when a new control, targeting rule, or AoE shape needs implementing. |
| Pato | Validates numbers when Warden or Frieren submits new wave, boss, or spell content for review. |
| Frieren | Authors a new spell when a spell design brief is scoped against Loomwright's engine contract and Pato's templates. |
| Warden | Generates a wave composition or boss/trial modifier when a new encounter needs content against the Spam-Waves-Vs.-Tactical-Trials pacing target. |
| Lorena | Writes flavor text or dialogue when a new NPC, item, or trial event needs content consistent with the Lore Premise. |
| Composer | Composes a music track when Lorena has briefed the mood/tempo/instrumentation for an already-shipped level, scene, or trial event. |
| Tilesmith | Sources or creates art/level/audio assets when a new tileset, level layout, VFX, or sound effect needs to fit the low-spec, stylized direction. |
| Heckler | Critiques a build when a spell, wave, level, music track, or the GDD itself is ready for adversarial review. |

**Formalized inputs and outputs.** Every agent that touches shipped content runs at **dev-time only** — through Claude Code or the API, authored and reviewed by the developer — never as a live call during a player's session (see Technical Requirements And Constraints, API Limits below). For each agent: what it takes in, what it produces, and what the player actually experiences as a result.

- **Warden** (encounter generation) takes Pato's Mana/weight-class/Mastery templates plus the Spam-Waves-Vs.-Tactical-Trials pacing target and the three base enemy stat blocks, and produces wave-composition and boss/trial-modifier JSON — enemy counts, spawn timing, HP/damage modifiers, phase triggers. The player sees this as the actual enemy waves and mini-boss/Director trial fought in Gameplay Loop steps 2 and 7.
- **Frieren** (spell content) takes a spell design brief plus Pato's weight-class (Light/Standard/Heavy) and three-tier Mastery templates, and produces a spell-definition JSON — element, AoE shape, weight class, base Power/target-count values. The player sees this as a castable spell in their hotbar, with its visual effect, cooldown, and Mastery growth.
- **Lorena** (narrative & lore) takes the Lore Premise plus companion/ending-path consistency rules, and produces flavor-text and dialogue strings tagged to NPCs, items, and trial events. The player sees this as in-game text: NPC lines, item descriptions, trial intro/outro narration.
- **Composer** (music composition, not generation of the numbers or the lore itself) takes a mood/tempo/instrumentation brief from Lorena, scoped to an already-shipped level, scene, or trial event, and produces a rendered music track. The player hears this as the score playing under that level, scene, or trial.
- **Pato** (validation, not generation) takes Warden's and Frieren's JSON output plus its own numeric templates, and produces a pass/fail or flagged-diff validation report. The player never sees Pato directly — its gatekeeping is what the player experiences as spells and waves that feel numerically consistent, instead of a broken outlier slipping through.
- **Ana** (orchestration, not generation) takes developer direction plus the current state of every other agent's in-flight work, and produces scoped task assignments and a tracked status of what's owed and delivered. The player never sees Ana directly — its coordination is what keeps Warden's, Frieren's, Lorena's, and Pato's output landing as one coherent build instead of four disconnected pieces.
- **Heckler** (adversarial review, not generation) takes built content — a spell, a wave, a level, a music track, or the GDD itself — and produces blunt, unfiltered critique from synthetic audience personas. The player never sees Heckler directly — its critique is what catches a spell, wave, or track that plays badly before a real player ever does.

#### Ana — Orchestration

Ana is the only agent that talks directly to the developer. It receives all direction, context, and decisions from the developer and translates them into scoped work for the other agents, tracks what each agent owes and has delivered, and follows up when work stalls. The other agents do not need to interface with the developer at all — they act on what Ana hands them, which keeps their own context limited to the task in front of them.

Ana organizes and routes; it does not edit or soften what any agent reports back, including Heckler's critiques (see below). Its job is coordination and follow-through, not editorial filtering.

#### Loomwright — Movement & Casting Engine

One job: the interactive movement and targeting/casting engine — arrow-key (with `WASD` bound in parallel) tile-aware movement, the preview-and-confirm casting pipeline, and the three AoE shapes shipping in the slice (line, cone, circle). This was the single largest schedule risk item the design review found, and trimming its scope down to only the engine (numbers moved out to Pato below) is the direct response to that finding.

**Scope extension, 2026-07-23:** Loomwright's engine also covers the *runtime execution* of Pato's HP/Mana/Mastery/Hexcoin/Debuff mechanics — reading and applying the numbers Pato's templates already fix. This mirrors the split Save Data And Persistence already established (Loomwright owns the read/write mechanism, Pato owns which values are valid) rather than opening a new, unowned "who writes this runtime code" gap once that logic actually needed building. Loomwright still never sets or invents a number — that stays Pato's exclusive scope.

#### Pato — Economy & Validation

One job: owns every numeric template in the game — the Mana pool (pool size, regen rate), the Mastery tier table, and the Hexcoin economy (earn rate, the 100-Hexcoin fee) — and checks that everyone else's output actually complies with those numbers. Frieren's authored spells and Warden's generated encounters both get checked against Pato's templates before they ship. Pato never writes engine code and never generates creative content; it only sets and enforces numbers. This split exists specifically so the agent that generates encounter content (Warden) is never the same agent that validates it — the review board's finding that the AI Director's generated content had no independent validation layer is what this agent is for.

#### Frieren — Spell Content

Authors each of the 12-20 spells — element, AoE shape, weight class assignment — against Loomwright's engine contract and Pato's weight-class and Mastery templates. Never touches engine code and never sets the numeric templates itself, which lets spell authoring run in parallel with engine work once both contracts are set.

#### Warden — Encounter Generation

One job: generates wave compositions and boss/trial modifiers against the Spam-Waves-Vs.-Tactical-Trials pacing target (see Mana And Spell Costs). Warden does not validate its own output — Pato does that independently, so the same agent is never both author and grader of the same content. Warden is, in effect, a working development-time prototype of the in-fiction AI Encounter Director's generative half, with Pato standing in for the validation layer the shipped Director will eventually need too.

#### Lorena — Narrative & Lore

Keeps the Lore Premise, companion authenticity, and ending-path scope (destroy, outwit, or transform the Director) consistent across every other agent's output, and writes flavor text and dialogue. Also briefs Composer's creative direction (mood, tempo, instrumentation) for a music track, per `docs/adr/0002-unblock-audio-scope-add-composer-agent.md` — Lorena directs the tone, it does not compose or render audio itself.

#### Composer — Music Composition

**Added 2026-08-04, per `docs/adr/0002-unblock-audio-scope-add-composer-agent.md`.** One job: composes a music track once Lorena has briefed its mood, tempo, and instrumentation for an already-shipped level, scene, or trial event — never for content that doesn't exist yet. Generation is model-driven: an LLM makes the actual creative/notational calls from Lorena's brief, run as a real Claude Code or Codex agent-dispatch session (spawned directly by Ana when her session supports it, a GitHub issue only as the fallback), never a raw API call and never local Ollama — a small local model already showed unreliable structured-output on strict schemas in `agent-crew`'s CrewAI/Ollama run, and asking a model to emit music notation directly is the same failure shape. Composer never sets its own creative brief and never validates its own output, keeping generation and validation on separate agents the same way Warden/Frieren never grade themselves.

#### Tilesmith — Art & Level Layout

Produces the Spellroad tileset, level layouts, lightweight VFX, and (per `docs/adr/0002-unblock-audio-scope-add-composer-agent.md`) sound-effect one-shots — hit-cue, cast/impact/death SFX, ambient/footstep/UI audio — within the low-spec constraint. Tilesmith is not required to build every asset from scratch: it should first look for free-to-use art or audio (tilesets, sprites, VFX, SFX) that fits the low-spec, stylized, readable-silhouette direction, and only originate new assets where nothing suitable exists. Any sourced asset must carry a license that permits use in a shipped project (e.g. CC0, public domain, or an explicit free-for-commercial-use license), and Tilesmith tracks the source and license of everything it brings in so attribution requirements are never lost track of. Like the rest of this pass's audio scope, SFX sourcing is reactive — only for elements already shipped, never speculative. See Art Sourcing And Origination Pipeline for the concrete search order, license-compliance rule, and how sourced art actually loads into Phaser — this was previously undescribed at the technical level every other content-generating agent already had.

#### Heckler — Adversarial Review

Heckler wants the project to fail, and its job is to say so. It spawns synthetic sub-agent personas representing a spread of audience reactions to this specific kind of game — some who love slow tactical spellcraft, some who have no patience for it — and produces blunt, sometimes unfair, mixed feedback on whatever the other agents have built, including Composer's music tracks against Lorena's brief. Nothing it says is filtered for the developer's comfort. Ana routes its reports like any other agent's, but does not soften the critique itself.

This is the same shape as the six-reviewer panel already used to review this document (systems designer, narrative critic, player psychologist, feasibility lead, adversarial QA, business analyst) — Heckler generalizes that one-time GDD review into a standing tool the developer can invoke against any build, spell, level, or encounter, not just the design document.

#### Ana's Orchestration Model

The roster is a **hierarchical star topology**: Ana is the only agent that talks to the developer and the only agent every other agent reports to. No agent talks to another agent directly — if Loomwright needs something from Frieren's output, that request routes through Ana. This formalizes the constraint above (Ana never edits or paraphrases) and keeps a single audit trail, rather than a decentralized model where agents negotiate with each other off the record.

Ana's dispatch procedure for a new developer request:

1. Classify the request by which agent(s) it touches.
2. Check dependencies — content referencing a shape or mechanic that doesn't exist yet must be sequenced (Loomwright cannot implement a shape Frieren hasn't authored yet); independent work (a new spell, a new wave, new dialogue, none referencing each other) dispatches in parallel.
3. Every generated artifact stays in-progress until it clears its required gate: Warden/Frieren output goes to Pato (numeric validation); Lorena's output goes to Heckler (tone/consistency); Loomwright's engine changes go to a developer playtest.
4. Status is always reported as one of three states — `shipped-and-validated`, `blocked-with-reason`, or `in-progress-with-owner` — so nothing sits unstated.

This was chosen over two alternatives: a **pure sequential pipeline** (Ana finishes one agent's task fully before starting the next) is simpler to reason about but wastes time on genuinely independent work; a **decentralized/peer-to-peer** model (agents messaging each other directly) is faster for tight back-and-forth but breaks the single audit trail and the "Ana never edits or paraphrases" contract above.

Example prompts, using the real `spell.json` fields from Engine Integration:

> Developer -> Ana: "New spell needed for the Standard weight class: an ice spell that trades range for a slow effect. Scope it to Frieren."
>
> Ana -> Frieren: "Design brief: ice element, Standard weight class, AoE shape must be one of {line, cone, circle}. Must produce a genuine tactical tradeoff (Creation pillar constraint) — state the tradeoff in one sentence before the JSON. Output exactly one `spell.json` entry: `{id, element, shape, weight, base_power, base_targets, master_discount}`. Do not set Mastery scaling — that's automatic. When done, hand off to Pato for validation before reporting back to me."
>
> Ana -> Pato: "Validate this spell.json entry against the Standard weight-class and Mastery templates: [entry]. Return pass, or a flagged diff naming exactly which field violates which template value."
>
> Ana -> Heckler: "Frieren's ember_lance spell.json just passed Pato's validation. Run your six-persona critique on it before I mark it shipped. Ground every critique in a specific field or interaction, not a vibe."
>
> Ana -> Developer: "Ice spell: shipped-and-validated (passed Pato, cleared Heckler with one MINOR note on cooldown feel). Wave 4 encounter: blocked — waiting on your call on whether backtracking into cleared levels is allowed. Lorena's trial dialogue: in-progress, owner Lorena."

Every agent's day-to-day context — its own contract and a log of what it's actually produced — lives outside this GDD in an ICM-style store at `docs/agents/`, so a future task loads only what it needs instead of this whole document. See `docs/agents/CONTEXT.md` and the root `AGENTS.md`.

### Technical Requirements And Constraints

The biggest constraint is a Mac M1 — it can't build or run AAA-scale games, so The Last Spellroad is built to what the M1 can actually do, not to a hypothetical bigger machine. That constraint is already locked in as the Tech Stack callout at the top of Phaser And Web Constraints (Phaser + TypeScript, Docker-first dev workflow, static-file browser build); this section covers the constraints specific to the AI layer on top of that stack.

- **API limits.** Because every content-generation call happens at dev-time (see Engine Integration), the shipped game has zero runtime exposure to Claude API rate limits — a player's session never calls the API. The dev-time generation passes (Warden, Frieren, Lorena) share whatever RPM/TPM limits the developer's account/tier allows, but since this is batch, not live-service, traffic, a slow or retried call costs the developer iteration time, never a player's experience.
- **Context window.** Lorena needs enough context to hold the Lore Premise plus prior lore output to stay consistent across the vertical slice's handful of lore snippets and 12-20 spells — trivially small against any current Claude context window (200K tokens minimum). This is not a binding constraint for the seven-week slice. It becomes one only if the full game's "infinite Spellroad" scope is ever built, at which point holding the entire lore history in context stops scaling and needs retrieval/summarization instead.
- **Processing latency.** Because generation is offline/dev-time, there is no player-facing latency budget — nothing the player does waits on an API call. The only latency that matters is the developer's own iteration speed: the target is that one level's worth of content (a handful of waves, its boss/trial, its share of the 12-20 spells) generates within a single working session, not that any individual call returns in milliseconds.

### Token Budget And Projections

Two budgets, tracked separately, because they answer different questions.

**Content-generation budget** — the cost of the JSON that actually ships in the vertical slice (Warden's waves/bosses, Frieren's spells, Lorena's flavor text):

| Generation action | Est. calls (vertical slice) | Est. tokens/call | Est. total tokens |
| --- | --- | --- | --- |
| Wave/boss-modifier generation (Warden) | ~20-35 (5-10 levels × 2-3 waves, plus exactly 1 boss/trial for the whole expedition — see Gameplay Loop) | ~2,000-4,500 | ~50,000-150,000 |
| Spell authoring (Frieren) | ~15-20 (12-20 spells) | ~1,500-2,500 | ~25,000-50,000 |
| Lore/flavor text (Lorena) | ~10-20 | ~800-1,500 | ~10,000-30,000 |

Each wave/boss-generation action costs approximately 2,000-4,500 tokens, which means generating the full vertical slice's roughly 20-35 encounters costs approximately $0.20-$0.65 at current Claude Sonnet 5 intro pricing ($2.00/$10.00 per million input/output tokens, through 2026-08-31; $3.00/$15.00 per million after). Across all three content-generating agents, one full authoring pass of the vertical slice is roughly 85,000-230,000 tokens — under $1 even redone five or six times during iteration. These are planning estimates, not measured usage — Pato and Ana should replace them with actuals once Warden and Frieren start generating real content.

**Roster/orchestration budget** — the cost of running the whole agent roster (Ana orchestrating, Pato validating, Heckler reviewing, plus everyone's Claude Code sessions) across the seven-week course. This is too variable to project honestly from zero — it depends on how many review and iteration rounds actually happen. Rather than invent a number, track real spend after week 1 and project the remaining six weeks off that actual.

**The developer's own hours are the real constraint, and this document does not forecast them the way it forecasts token spend.** The token and dollar figures above can be projected precisely because API pricing is fixed and call counts are estimable; a solo developer's build/review/iteration hours across seven weeks cannot be honestly forecast the same way this early, and this GDD does not pretend otherwise by inventing a number. What is fixed instead: engine implementation (Loomwright's scope — movement, casting, save/load, the AoE shapes) is the single largest hours sink and has not started as of this writing, while every agent-generated content layer (Warden, Frieren, Pato, Lorena's death-system pass) is comparatively cheap in developer time because validation is automated. If week-by-week hours tracking shows engine work slipping the seven-week window, the response is to cut scope (fewer levels, fewer spells, defer a shape) rather than silently extend the timeline — the same principle the vertical slice's own bullet list already applies to endings and control features.

**Model-selection governance.** Ana assigns a model per task rather than the GDD hard-coding one model for everything, and re-tunes the assignment against real usage rather than a one-time guess:

| Task type | Default model | Why |
| --- | --- | --- |
| Structured/deterministic (Pato's rule-checking against numeric templates) | Claude Haiku 4.5 ($1.00/$5.00 per million tokens) | Validation is pattern-matching against a fixed template, not creative judgment — cheapest tier that reliably does the job |
| Generative/creative (Warden's pacing, Frieren's spell design, Lorena's prose, Heckler's critique) | Claude Sonnet 5 ($2.00/$10.00 intro through 2026-08-31, $3.00/$15.00 standard, per million tokens) | Needs judgment calls a deterministic checker can't make; Sonnet 5 is the default balance of quality and cost for this work |
| Orchestration (Ana's task tracking and routing) | Claude Sonnet 5 | Coordination work benefits from the same judgment tier as the agents it's coordinating |

Ana reviews this table against actual per-agent token usage (visible in Claude Code session logs / API usage) at the end of each week and re-tunes it rather than treating it as fixed at design time.

**Per-agent cadence: which agent spends when.** The two budgets above total spend by content type; this table breaks the same spend down by agent and by when in the seven-week slice it happens, cross-referenced against `docs/agents/ana/backlog.md`'s phase schedule and each agent's own `log.md`. Est. tokens/action for Warden, Frieren, and Lorena repeat the table above; Pato, Heckler, Loomwright, Ana, and Tilesmith are new rows this table adds, since the original table only covered the three content-generating agents.

| Agent | Model | Active phase (target week) | Task type | Est. tokens/action (2026-08-01 re-tune) | Logged so far (as of 2026-08-01) |
| --- | --- | --- | --- | --- | --- |
| Ana | Sonnet 5 | All phases (Wk 1-7, continuous) | Orchestration: dispatch, status tracking, backlog upkeep | ~2,000-5,000/dispatch decision (unchanged — no measured figure yet) | Continuous since Wk 1, now 28 dated `log.md` entries; wrote the master backlog, ran 2 GDD review-board passes, dispatched every task below plus the 2026-08-01 issue #25/#26/#27/#28/#29/#31 cycle |
| Warden | Sonnet 5 | Phase 2-3 (Wk 3-5) | Wave/boss-modifier generation | ~2,000-4,500/call (unchanged — no measured figure yet) | **Log gap, stated not papered over:** `warden/log.md` still holds only its 2026-07-21 context-establishment entry, despite the backlog crediting Warden with Levels 1-4's full wave rosters (3.3) and the mini-boss composition (3.4) — the work is real and Pato/Ana-confirmed (`ana/backlog.md` 3.3-3.5), but Warden's own log was never kept current. Flagged for Ana to close, not silently fixed here. |
| Frieren | Sonnet 5 | Phase 2-3 (Wk 3-5) | Spell authoring | ~1,500-2,500/call (unchanged — no measured figure yet) | 3 dated entries (07-21/07-23/07-25); backlog 3.1/3.2 credits 12 total spells shipped — same under-logging gap as Warden's row, smaller in degree. |
| Pato | Haiku 4.5 | Phase 2-5 (Wk 3-6) | Validation against numeric templates | ~500-1,200/call (unchanged — no measured figure yet) | 17 dated entries through 08-01 (2); every Frieren/Warden batch gate-checked, the boss reconstruction re-verified, two corrections self-caught and superseded in-place (0.4's growth-rate re-derivation, 2.21's `isOnboardingGrace()` fix) rather than silently overwritten. |
| Loomwright | Sonnet 5 (Opus 4.8 for architecture calls) | Phase 1-3, 5 (Wk 3-6) | Engine implementation | **~90,000-125,000/session, revised up from ~15,000-40,000** — two real 2026-08-01 dispatches measured at 93,506 (issue #26, monster-status overlay) and 123,971 tokens (issue #29, Tiled-layout engine wiring), both 2.3-3.3x over the original estimate's top end | 10 dated entries through 08-01 (3); first engine build, 1 crash fix, boss phase-sequencing, combat telegraph, 2 lane-width passes, the monster overlay, and the Tiled-layout wiring. |
| Heckler | Sonnet 5 | Phase 2, 4, 5 (Wk 3, 5-6) | Six-persona adversarial critique | **~90,000-100,000/pass, revised up sharply from ~3,000-6,000** — one real 2026-08-01 dispatch (issue #31, critiquing Lorena's Levels 1-4 content) measured at 98,776 tokens, ~16-33x the original estimate | 7 dated entries through 08-01; the original estimate was sized like a single short completion, not an actual agentic critique session (reading source content, running six personas, writing a grounded log entry) — this is the biggest estimate-to-reality gap this re-tune found. |
| Tilesmith | Sonnet 5 | Phase 3 (Wk 4-5) | Agentic art sourcing (search + license judgment) | **~70,000-80,000/dispatch, revised up from ~3,000-8,000/asset** — two real 2026-08-01 dispatches measured at 79,045 (issue #25, tile curation across 2 packs) and 70,300 tokens (issue #28, 5 Tiled JSON layouts); the original "/asset" unit undercounts because one real dispatch handles many assets/files at once, not one | 5 dated entries; asset download/licensing (2 packs approved and pulled 07-30), tile-index curation (issue #25), and the 5 Tiled level layouts (issue #28) |
| Lorena | Sonnet 5 | Phase 4 (Wk 5-6) | Narrative/dialogue writing | **~65,000-75,000/dispatch, revised up from ~800-1,500/call** — one real 2026-08-01 dispatch (issue #27, 4 NPCs + 8 items across Levels 1-4, grounded against 3 content-pipeline runs and Warden's real rosters) measured at 70,113 tokens; same "/call" vs. "/dispatch" unit mismatch as Tilesmith's row | 4 dated entries; fee framing (4.1), Debuffer lore identity (4.2), boss trial narration (4.5), and now the Levels 1-4 NPC/item content (4.4) — shipped in Week 3, well ahead of this table's original Phase 4 (Wk 5-6) target |

**2026-08-01 re-tune, first pass with real measured data.** Two honest limits on the original table are now partially closed. First, per-agent metering: still no true per-agent billing split (every agent is a prompt persona in the same account), but six real dispatches this session (Tilesmith x2, Loomwright x2, Lorena x1, Heckler x1) each logged their own actual end-of-session token total, giving this re-tune its first real numbers instead of a dated-entry count for those four agents. Ana/Warden/Frieren/Pato still have no measured figures — their columns are carried forward unchanged, not re-guessed. Second, the estimate-vs-reality gap: every agent with a real number came in over its original estimate, by a factor of roughly 2x (Loomwright, whose estimate was already scoped to a whole session) up to 16-33x (Heckler and Tilesmith/Lorena, whose estimates were scoped to a single short "call"/"asset" that doesn't match how a real Claude Code dispatch actually runs — multi-step, tool-using, self-verifying). The revised ranges above reflect the real per-dispatch granularity now that it's observable, not a claim that the underlying work got more expensive. **Next re-tune: end of Week 5**, per this table's own governance rule, and should fold in whichever of Ana/Warden/Frieren/Pato get a measured dispatch by then, plus close Warden's log-gap flagged above.

## Seven-Week Vertical Slice

The first course target should include:

- 1 playable mage.
- 1 narrow Spellroad tileset.
- 3 enemy types.
- 1 mini-boss or Director avatar.
- 12-20 spells or upgrades.
- 5-10 short levels.
- A simple generated encounter data format.
- A visible in-game hint that the Director is adapting the road.

### Developer Time Budget And Minimal-Build Priority

The token budget above can be projected precisely because API pricing is fixed; the developer's own hours could not be forecast the same way at the start of the course (see Token Budget And Projections) — but the shape of that time is now known and worth stating explicitly, since it changes what "minimal" means for this solo project. The developer has **at most ~10 hours/week**, and almost none of it is hands-on-keyboard building — the agent roster builds under supervision; the developer's hours go to reviewing Ana's dispatch reports and ruling on whatever she's flagged `blocked-with-reason`, running the actual developer playtests no agent can stand in for, and course admin. That first real playtest already happened (2026-07-24, Phase 2 gate 2.6): confirmed playable end-to-end, ran out of Mana, felt a spell fail, and found one BLOCKING crash plus two UX gaps needing a developer call — exactly the review-hour spend this budget anticipates, not build-hour spend.

Mapped against `docs/agents/ana/backlog.md`'s existing phase targets (Weeks 1-2 already spent on design/decisions, Weeks 3-7 production):

| Week | Backlog phase(s) | What the ~10 hours actually goes to |
| --- | --- | --- |
| 3 | Phase 1 gate, Phase 2 | Review Phase 1/2 dispatch reports; one developer playtest (done); decide the two open UX calls (2.9 hit-feedback, 2.10 lane-clamp/targeting) so Loomwright can proceed |
| 4 | Phase 2 close-out, Phase 3 start | Review Frieren/Warden/Tilesmith's parallel output as it lands; rule on checkpoint/retry (0.2) before Task 1.6 needs it |
| 5 | Phase 3 finish, Wk-5 re-tune, Phase 4 start | One full playtest against the scaled-up content; review the model-selection re-tune; rule on the all-Novice exploit (0.3) before Lorena's pass needs an answer |
| 6 | Phase 4 finish, Phase 5 | Review Heckler's full-build critique; route any BLOCKING findings; two playtests (one careless, one competent) |
| 7 | Phase 6 | Final playtest(s); review the third GDD-review-kit board run; course submission support |

**Minimal-build floor vs. stretch, if a week runs short:** restating this section's scope list with what can flex. Mage, tileset, the 3 enemy types, and the mini-boss are floor items already shipped or in progress (Phase 1) — not cuttable. Below that:

| Item | Minimal (floor) | Stretch (time allowing) |
| --- | --- | --- |
| Spells | 12 | up to 20 |
| Levels | 5 | up to 10 |
| Narrative pass (Phase 4, Lorena) | Fee framing + Debuffer lore identity only (the two items already flagged MAJOR) | Full NPC/companion dialogue set across all levels + trial narration polish |
| Targeting/lane UX (2.9, 2.10) | Basic fix — enemy/shape lane clamp, per-enemy hit feedback | Non-mouse targeting alternative (e.g. last-move-direction or nearest-enemy auto-target) |
| Audio (SFX + music, unblocked 2026-08-04 per `docs/adr/0002-unblock-audio-scope-add-composer-agent.md`) | None — not a floor item | Hit-cue + cast/impact/death SFX + ambient/footstep/UI audio (Tilesmith, CC0-first) and Composer-authored music per level/scene/trial (briefed by Lorena, Heckler-validated); coverage stays reactive to already-shipped content only, built in parallel without blocking or being blocked by non-audio work |

If the Week 5 re-tune shows a floor item isn't on track, the response is to cut a stretch item, per this GDD's own already-stated policy (Token Budget And Projections) — not to quietly extend past Week 7.

## Open Design Questions

- Should the Director have a human-readable voice, or should it communicate only through generated trials?
- Should adventurers be allies, memories, merchants, or temporary summons in the first prototype?
- ~~What is the Mastery growth rate...~~ **Resolved 2026-07-25, superseded 2026-08-01: 24 kills per tier (48 kills to fully master one spell).** The 2026-07-25 number (180 landed casts/tier) sized against Warden's real Level 1-3 wave data was correct for its own unit at the time, but backlog item 0.5's resolution (below) changed what counts as progress at all, invalidating that unit — `docs/agents/_reference/mastery-template.md` has the full corrected derivation; wired into `src/systems/MasterySystem.ts`.
- ~~`MasterySystem.recordLandedCast` fires on any landed hit, not a kill...~~ **Resolved 2026-08-01 (backlog item 0.5, developer decision): gate Mastery progress on a kill, not any landed hit.** Closes the farming exploit this entry originally flagged (a player deliberately landing non-lethal hits on one enemy wasn't bounded by level content at all). See `docs/agents/_reference/mastery-template.md` and `docs/agents/ana/backlog.md` item 0.5 for the recomputed growth rate this required, and the residual (retry-based re-grinding, opened by item 0.2's own resolution) it doesn't fully close.
- Beyond the 100-Hexcoin Mastery-choice fee and the Phase-Transition Recovery fee (see Hexcoin), what else can Hexcoin buy — items, relics, and their prices are still undefined.
- Should the 1-Hexcoin-per-kill rate ever vary by enemy toughness, or stay flat for the whole vertical slice?
- What is the exact flat Hexcoin amount for the Phase-Transition Recovery fee, and does it vary by boss/expedition tier? This is Pato's numeric call against the design rules already fixed in Phase-Transition Recovery, not an open design question for the developer.
- ~~Heckler's second death-system critique pass surfaced a bounding gap...~~ **Resolved 2026-08-01 (backlog item 0.2, developer decision):** a death respawns at the start of the current road segment (level), and re-clearing its waves re-awards Hexcoin normally. See Gameplay Loop, "Checkpoint granularity, resolved 2026-08-01," and `docs/agents/_reference/hexcoin-template.md` for how this keeps the per-expedition income bound intact (the running Hexcoin total also resets at that same respawn point).
