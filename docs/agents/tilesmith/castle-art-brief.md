# Castle Art Pass Brief

## Scope and constraints

Issue #172 expands from a Level 1 readability complaint into a five-level static, top-down
castle art pass. The art pass remains decorative: map dimensions, the `Terrain` layer contract,
gameplay bounds, spawn positions, and encounter routes do not change. A separate Loomwright
physics change now makes existing wall terrain blocking and supports explicitly marked future
door/architecture objects; art placement must not rely on visual appearance alone to define that
collision.

Phase 1 implements the two visual poles only:

- Level 1 establishes the ordinary-castle baseline.
- Level 5 establishes the final Director-trial destination.
- Levels 2-4 remain unchanged until the Phase 1 language is approved and propagated.

Phase 1 composes the approved castle detail within the existing `Terrain` layer. The renderer
now supports every authored tile layer and explicitly marked movement-blocking objects for future
maps, but this checkpoint does not add an extra decoration or object layer. All selected tiles
are opaque or floor/wall-integrated pieces from the existing Kenney Tiny Dungeon sheet, so no
transparent object tile removes the floor beneath it.

## Source and license

- Source pack: Kenney, "Tiny Dungeon," https://kenney.nl/assets/tiny-dungeon
- Repository evidence: `public/assets/third-party/kenney-tiny-dungeon/License.txt`
- License: Creative Commons Zero (CC0 1.0); commercial use and modification permitted,
  attribution not required.
- Sourcing-contract step: 1, existing Kenney asset. No OpenGameArt, recolor/recombine,
  hand-authored, GraphicRiver, or other commercial asset is used in Phase 1.

Tiled GIDs retain the existing `firstgid: 1` mapping, so source tile index N is map GID N+1.
Phase 1 uses only GIDs already inside the embedded 132-tile sheet.

## Five-level visual progression

1. **Gatehouse approach — warm, occupied, imperfect.** Red-orange wall braziers, worn stone,
   small floor mosaics, and sparse grates make the first hall read immediately as a castle while
   leaving the broad combat route visually open.
2. **Barracks passage — practical and martial.** Propagate the gatehouse masonry, then emphasize
   weapon storage, repeated thresholds, and more regular floor wear.
3. **Archive/crypt crossing — older and quieter.** Shift toward carved stone, memorial markers,
   shelves, and restrained rune motifs without placing deceptive obstacles in the route.
4. **Siege corridor — damaged and defensive.** Increase rubble, grates, barricade language, and
   broken symmetry to signal escalation before the trial.
5. **Director trial hall — cold, formal, controlled.** Green magical braziers, paired stone-face
   reliefs, strict symmetry, a processional runner, and the existing raised dais distinguish the
   boss chamber from every regular level.

## Phase 1 map language

### Level 1 — gatehouse

- Preserve 60x18 tiles, the single `Terrain` layer, and the full-width central route.
- Use red brazier GID 30 on both wall edges.
- Build continuous gray upper and lower masonry panels from dedicated left, seamless-middle,
  and right pieces (GIDs 37-39).
- Place five irregularly spaced closed chamber doors (GID 23) in the upper wall only. These
  remain solid with the wall; the lower wall contains no doors.
- Use worn-floor GID 25 only along edge rows and sparse pebble GID 13 trails near the margins.
- Do not place the rejected central threshold, lower doors, floor mosaics, circular motifs,
  grate/computer-like props, or temporary pillar objects.

### Level 5 — Director trial hall

- Preserve 60x20 tiles, the single `Terrain` layer, and the exact 12x4 dais at columns 24-35,
  rows 9-12 (GID 49).
- Use green brazier GID 33 and paired wall reliefs GIDs 20-21 symmetrically on the inner walls.
- Use the central wall threshold as a formal Level 5 focal treatment; Level 1 deliberately uses
  separate closed upper-wall chamber doors instead.
- Extend a two-row floor runner toward the dais with GIDs 49-51.
- Frame the dais with four floor sigils (GID 43) and four symmetric grates (GIDs 55-56).
- Keep all apparent hazards or furnishings out of Phase 1; art must not imply collision that the
  unchanged gameplay model does not provide.

## Propagation rule for Levels 2-4

Reuse the masonry, threshold, edge-wear, mosaic, and grate vocabulary, but give each middle level
one dominant identity from the progression above. Keep the center route readable, favor low-
profile floor-integrated motifs, preserve each map's dimensions/schema, and validate every GID
against the same 132-tile Kenney sheet before delivery.
