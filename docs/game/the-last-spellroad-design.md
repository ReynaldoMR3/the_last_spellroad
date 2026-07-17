# The Last Spellroad Design

## Summary

The Last Spellroad is a low-spec, top-down, Tibia-like magical roguelite built around short single-lane expeditions. The player controls a long-lived wandering mage who discovers an ancient Spellroad between worlds and becomes trapped inside it.

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

Trapped adventurer NPCs (step 5) are invulnerable in this MVP — AoE spells cannot kill or harm them, so there is no friendly-fire or griefing edge case to resolve. The richer version of this beat that the lore invites — some adventurers preferring captivity, a real choice about whether "rescue" is wanted — is a next-step for a future pass on the lore, not built for the vertical slice.

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
- Mastery is recovered the same way it was built: by using the affected spell in combat again. There is no separate grind system for buying mastery back.

### Hexcoin

Hexcoin is a currency the mage earns from combat: defeating an enemy grants 1 Hexcoin, flat across enemy types for now. Hexcoin persists through death like every other form of permanent progression — it is never part of what is lost.

The name is a deliberate double meaning, and it is part of the lore, not just flavor text. "Hex" is the sacred-geometry hexagram the Director's magic is built on, and it is also computing's hexadecimal shorthand. The Director, an ancient AGI that reasons through spellcraft and machine-like logic, mints and verifies Hexcoin as a running ledger of every kill the mage makes inside the road — a proof-of-work record of the mage's labor, tracked and rewarded by the very intelligence keeping them trapped. Earning Hexcoin is, narratively, the Director paying the mage to keep participating in its prison.

Hexcoin exists to give the mage a way to soften the mastery hit on death: paying 100 Hexcoin (roughly the return from 100 defeated enemies) lets the player choose which equipped spell takes the Mastery-tier loss, instead of it being decided at random. The fee is deliberately steep enough to be a real tradeoff, not a formality.

Beyond this fee, Hexcoin is the intended foundation for a future item and upgrade economy — the same resource-cost gap the design review flagged as missing now has a named, earnable currency to build numbers on top of.

This also resolves the tension between the Creation and Power pillars: Creation is about which spells and shapes the mage owns and how they trade off against each other, and that layer never regresses. Power is about mastery and hierarchy rank, and that is the layer death sets back.

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

Every spell draws from a single Mana pool. Base pool size is 100, and Mana regenerates passively at 5 per second at all times, in and out of combat. This lets the mage cast a handful of spells back-to-back before needing to pause and let the pool recover, keeping the "read the battlefield, don't spam" fantasy intact without making the resource punishing.

Rather than tuning a unique cost and cooldown for each of the 12-20 spells individually, every spell is authored into one of three weight classes:

| Weight | Mana Cost | Cooldown |
| --- | --- | --- |
| Light | 10 | 2s |
| Standard | 20 | 4s |
| Heavy | 35 | 8s |

At Master Mastery (see Death And Mastery Loss), a spell's cost or cooldown drops by 10% from its weight-class baseline. A Standard spell, for example, would cost 5 Mana at Master, or its 4-second cooldown, whichever the spell's design leans on more.

Example: the starting fire spell used earlier (Novice Power 5 / 1 enemy) is a Standard-weight spell, so it costs 20 Mana on a 4-second cooldown regardless of Mastery tier, only the cooldown/cost trimming at Master and the Power/target numbers change with Mastery.

### Spam Waves Vs. Tactical Trials

The Mana numbers above stay fixed everywhere. What changes is the encounter itself, and that is what creates the difference between "just cast whatever feels good" and "manage this pool carefully."

- **Regular enemy waves** (Gameplay Loop step 2, using the 3 base enemy types) are tuned to resolve quickly: low enough enemy HP and threat that the fight is usually over before Mana becomes a real constraint. This is the mage's power fantasy moment — cast freely, lean on whatever spell feels satisfying, rarely think about the pool.
- **The mini-boss or Director trial** (Gameplay Loop step 7) is tuned to be a genuinely long, higher-HP, possibly multi-phase fight — long enough that careless spending catches up with the player mid-fight. This is where cooldown timing, spell choice, and Mana budgeting across the whole encounter actually matter.

This gives the AI Encounter Director a concrete target when generating wave compositions and boss modifiers: waves should be sized to resolve before Mana pressure kicks in, and boss/trial encounters should be sized to outlast a careless Mana budget. That target did not exist before; the Course AI Feature section can generate against it.

## Core Controls And Casting

The first playable version should use a keyboard-first tactical control model with mouse-assisted targeting. The goal is to keep the nostalgic clarity of Tibia-style hotkeys while reducing complexity for the course prototype.

Movement should support `WASD` as the primary control scheme. The mage moves in a grid-aware way, either tile-by-tile or with short continuous movement that still respects tile positioning, enemy ranges, and spell geometry. Mouse click movement can be added as a secondary convenience if time allows, but it should not be required for the prototype.

The player should equip a small spell hotbar, starting with `1-4` or `1-6`. Each hotkey maps to one prepared spell. Full hotkey customization can be a later feature, but the prototype should use fixed bindings so the team can focus on combat readability and spell behavior.

A spell, once discovered, is known forever (see Death And Mastery Loss) regardless of whether it is equipped. The player can freely change which known spells fill the hotbar, but only between expeditions or at a road-segment checkpoint, never mid-combat. This turns loadout selection into a deliberate planning moment — picking spells for the fight ahead — rather than something that needs a mid-fight swap UI.

Spell casting should use two patterns:

- Immediate casting for self-targeted spells, buffs, defensive effects, or simple centered area spells.
- Preview-and-confirm casting for targeted spells.

For targeted spells, pressing a spell hotkey should show a clear targeting preview on the map. The preview should communicate the spell's shape before the player commits. The vertical slice ships three AoE shapes — line, cone, and circle, covering directional, frontal-area, and centered-area cases — with cross, ring, and sigil shapes deferred past the prototype, the same kind of hedge already given to mouse-click movement and hotkey customization. Left click or pressing the same hotkey again confirms the cast. Right click or `Esc` cancels the cast.

This control model should avoid turning the game into a reaction-heavy action RPG. The intended fantasy is that the player reads the battlefield, chooses the right prepared spell, places it well, and wins through planning rather than twitch execution.

## Phaser And Web Constraints

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

## Development Team: AI Agent Roster

The team building The Last Spellroad is one person working with a roster of named AI agents. This is the answer to "what is the team size" that a from-scratch schedule risk assessment would otherwise be missing: capacity is one human plus a scoped agent roster, not an undefined number of people.

The roster follows the One Agent, One Wow rule: each agent does one thing extraordinarily well rather than several things adequately. Bundling unrelated responsibilities onto a single agent is what produces broken logic and unpredictable output that can't ship — so every agent below owns exactly one job, and agents that generate content are never also the ones validating it.

### The Scholar — Orchestration

The Scholar is the only agent that talks directly to the developer. It receives all direction, context, and decisions from the developer and translates them into scoped work for the other agents, tracks what each agent owes and has delivered, and follows up when work stalls. The other agents do not need to interface with the developer at all — they act on what the Scholar hands them, which keeps their own context limited to the task in front of them.

The Scholar organizes and routes; it does not edit or soften what any agent reports back, including the Heckler's critiques (see below). Its job is coordination and follow-through, not editorial filtering.

### Loomwright — Movement & Casting Engine

One job: the interactive movement and targeting/casting engine — WASD tile-aware movement, the preview-and-confirm casting pipeline, and the three AoE shapes shipping in the slice (line, cone, circle). Nothing about numbers or economy lives here; Loomwright builds the engine that Actuary's numbers run through. This was the single largest schedule risk item the design review found, and trimming its scope down to only the engine (numbers moved out to Actuary below) is the direct response to that finding.

### Actuary — Economy & Validation

One job: owns every numeric template in the game — the Mana pool (pool size, regen rate), the Mastery tier table, and the Hexcoin economy (earn rate, the 100-Hexcoin fee) — and checks that everyone else's output actually complies with those numbers. Spellforge's authored spells and Warden's generated encounters both get checked against Actuary's templates before they ship. Actuary never writes engine code and never generates creative content; it only sets and enforces numbers. This split exists specifically so the agent that generates encounter content (Warden) is never the same agent that validates it — the review board's finding that the AI Director's generated content had no independent validation layer is what this agent is for.

### Spellforge — Spell Content

Authors each of the 12-20 spells — element, AoE shape, weight class assignment — against Loomwright's engine contract and Actuary's weight-class and Mastery templates. Never touches engine code and never sets the numeric templates itself, which lets spell authoring run in parallel with engine work once both contracts are set.

### Warden — Encounter Generation

One job: generates wave compositions and boss/trial modifiers against the Spam-Waves-Vs.-Tactical-Trials pacing target (see Mana And Spell Costs). Warden does not validate its own output — Actuary does that independently, so the same agent is never both author and grader of the same content. Warden is, in effect, a working development-time prototype of the in-fiction AI Encounter Director's generative half, with Actuary standing in for the validation layer the shipped Director will eventually need too.

### Loreweaver — Narrative & Lore

Keeps the Lore Premise, companion authenticity, and ending-path scope (destroy, outwit, or transform the Director) consistent across every other agent's output, and writes flavor text and dialogue.

### Tilesmith — Art & Level Layout

Produces the Spellroad tileset, level layouts, and lightweight VFX within the low-spec constraint. Tilesmith is not required to build every asset from scratch: it should first look for free-to-use art (tilesets, sprites, VFX) that fits the low-spec, stylized, readable-silhouette direction, and only originate new art where nothing suitable exists. Any sourced asset must carry a license that permits use in a shipped project (e.g. CC0, public domain, or an explicit free-for-commercial-use license), and Tilesmith tracks the source and license of everything it brings in so attribution requirements are never lost track of.

### Heckler — Adversarial Review

The Heckler wants the project to fail, and its job is to say so. It spawns synthetic sub-agent personas representing a spread of audience reactions to this specific kind of game — some who love slow tactical spellcraft, some who have no patience for it — and produces blunt, sometimes unfair, mixed feedback on whatever the other agents have built. Nothing it says is filtered for the developer's comfort. The Scholar routes its reports like any other agent's, but does not soften the critique itself.

This is the same shape as the six-reviewer panel already used to review this document (systems designer, narrative critic, player psychologist, feasibility lead, adversarial QA, business analyst) — the Heckler generalizes that one-time GDD review into a standing tool the developer can invoke against any build, spell, level, or encounter, not just the design document.

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

## Open Design Questions

- Should the Director have a human-readable voice, or should it communicate only through generated trials?
- Should adventurers be allies, memories, merchants, or temporary summons in the first prototype?
- Should hierarchy rank (Power pillar) ever drop on death too, or is Mastery loss on a single spell the entire death cost?
- What else can Hexcoin buy beyond paying the 100-Hexcoin fee to choose the Mastery hit (see Hexcoin) — items, relics, and their prices are not yet defined.
- Should the 1-Hexcoin-per-kill rate ever vary by enemy toughness, or stay flat for the whole vertical slice?
