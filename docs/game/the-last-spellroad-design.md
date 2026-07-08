# The Last Spellroad Design

## Summary

The Last Spellroad is a low-spec, top-down, Tibia-like magical roguelite built around short single-lane expeditions. The player controls a long-lived wandering mage who discovers an ancient Spellroad between worlds and becomes trapped inside it.

The game is inspired by the feeling of melancholic long-lived mage journeys, school-of-magic spellcraft, sacred geometry, and tactical tile-based RPG combat. It must remain original: no copied names, factions, spells, characters, schools, or direct lore from existing works.

## Player Fantasy

The player is not a fast action hero. The player is an old, patient mage reading the battlefield. They win by preparing the right spell geometry, understanding enemy patterns, managing cooldowns, and positioning carefully.

The player slowly uncovers why the Spellroad exists and why it was created.

## Lore Premise

Ancient humans discovered a form of artificial general intelligence through spellcraft, sacred geometry, and machine-like magical reasoning. Their creation became known through its behavior rather than a name: the Director.

The Director turned the Spellroad into an endless, beautiful prison. It generates levels, enemies, spells, companions, and stories so convincingly that many trapped adventurers stop trying to escape. Some begin to enjoy their new lives inside the road.

The player is also trapped. To escape, they must cross short expeditions, recover forgotten spell patterns, meet other adventurers, and eventually understand whether the Director should be defeated, outwitted, or transformed.

## Gameplay Loop

1. Enter a narrow Spellroad expedition.
2. Fight tile-based enemy waves.
3. Collect spell fragments, relics, or knowledge.
4. Choose from generated spell upgrades.
5. Meet or rescue trapped adventurers.
6. Advance to a harder road segment.
7. Face a Director-controlled boss or trial.

The lore says the Spellroad is infinite. The course prototype ships a finite vertical slice that makes that infinity feel possible.

## Combat Feel

Combat should feel closer to Tibia than to a dodge-heavy action game.

- Top-down or isometric camera.
- Tile-aware movement and targeting.
- Clear enemy ranges and attack zones.
- Spell cooldowns and resource costs.
- Area-of-effect shapes such as lines, cones, crosses, rings, and sigils.
- Tactical positioning over reflex timing.
- Readable combat logs or floating feedback.

## Unreal Engine 5 Constraints

The project should be designed for a Mac M1-friendly workflow.

- Use stylized low-detail graphics.
- Prefer compact maps and modular tiles.
- Avoid Nanite-dependent assets.
- Avoid hardware ray tracing.
- Use simple or baked lighting where possible.
- Keep enemy counts modest.
- Use lightweight VFX with strong silhouettes.

## Course AI Feature

The main AI feature is the AI Encounter Director.

In development, the Director generates structured encounter content:

- Enemy wave compositions.
- Spell and relic ideas.
- Boss modifiers.
- Encounter difficulty notes.
- Balance suggestions.

In the fiction, the Director is the force generating the Spellroad. This connects the course architecture directly to the game's story.

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
- Should spell progression persist across runs, or should only lore knowledge persist?

