# Castle Art Direction Phase 1 Implementation Plan

**Spec:** `docs/superpowers/specs/2026-08-23-castle-art-direction-design.md`

## Slice 1 — Establish the two visual poles

- [x] Document the five-level visual progression and CC0 source evidence.
- [x] Author the approved Level 1 gatehouse treatment.
- [x] Author the Level 5 Director trial-hall treatment.
- [x] Preserve map dimensions, tileset mapping, combat routes, and Level 5's existing dais.

## Slice 2 — Make architecture match movement

- [x] Add tested tile semantics for walkable floors and blocking wall/closed-door pieces.
- [x] Support explicit axis-aligned `blocksMovement` Tiled objects for future architecture.
- [x] Render all tile layers and create mage-only Arcade colliders.
- [x] Clean up layers, blocker zones, and colliders between levels.

## Slice 3 — Iterate through the developer playtest

- [x] Remove rejected computer-like grates, large motifs, and temporary pillars from Level 1.
- [x] Replace the top wall with continuous gray masonry and irregular upper chamber doors.
- [x] Match the bottom wall to the gray masonry language without lower doors.
- [x] Verify map JSON, tests, typecheck, build, Docker rendering, and developer playtest.

## Deferred issue #172 work

- [ ] Propagate the approved castle vocabulary to Levels 2-4 in a later PR.
