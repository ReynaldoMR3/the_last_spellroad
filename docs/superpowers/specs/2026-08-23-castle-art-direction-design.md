# Castle Art Direction and Terrain Physics Design

**Gates:**
- Product — approved 2026-08-23 (developer, in conversation)
- Architecture — approved 2026-08-23 (developer, in conversation)
- Program Design — approved 2026-08-23 (developer, in conversation)
- Vertical Slices — Phase 1 approved 2026-08-26 (developer Docker playtest)

## Product

Issue #172 asks for a static top-down castle treatment that makes the road feel inhabited and
architecturally coherent without copying the commercial GraphicRiver reference. The five-level
direction is delivered incrementally: Level 1 establishes the ordinary castle language and Level
5 establishes the Director trial-hall endpoint; Levels 2-4 receive the approved language in later
issue #172 work.

Phase 1 is complete when:

- Level 1 has continuous gray upper and lower wall panels, upper-wall chamber doors only, and no
  rejected computer-like grates, large floor motifs, lower doors, or pillar objects.
- Level 5 has a colder, formal trial-hall treatment using the same existing CC0 source sheet.
- Walls and closed door tiles block the mage while floor tiles remain walkable.
- Map dimensions, combat bounds, spawn positions, encounter routes, and low-spec performance stay
  unchanged.

## Architecture

- **Tilesmith owns** the Tiled JSON layouts, visual vocabulary, source/license evidence, and
  `docs/agents/tilesmith/` records.
- **Loomwright owns** Phaser rendering and mage collision in `SpellroadScene.ts`, plus the pure
  movement-semantics helpers and tests in `src/systems/levelArt.*`.
- Existing Kenney Tiny Dungeon CC0 tiles are reused; no GraphicRiver asset is copied or shipped.
- Tile collision is semantic: shipped wall/door GIDs have compatibility defaults, while explicit
  `blocksMovement` metadata supports future axis-aligned Tiled object blockers. Visual layer names
  do not determine solidity.
- No combat/economy number, enemy behavior, spell behavior, or destructible-cover mechanic is part
  of this checkpoint.

## Program Design

- Author the Level 1 and Level 5 `Terrain` arrays without changing dimensions, tileset mapping, or
  routes.
- Render every tile layer, apply collision per tile through `tileBlocksMovement`, and attach
  mage-only Arcade colliders.
- Convert explicitly marked rectangular Tiled objects into static movement blockers and reject
  unsupported blocker geometry loudly.
- Destroy tile layers, blocker zones, and colliders on level transitions.
- Cover floor/wall/door semantics, object offsets, malformed geometry, and map identity with
  Phaser-free unit tests; verify all map JSON, the full suite, typecheck, production build, and the
  Docker playtest.
