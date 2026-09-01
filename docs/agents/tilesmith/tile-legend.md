# Tilesmith — Tile/Sprite Legend (backlog 3.6, curation half)

Visual identification pass over the two already-downloaded, CC0, developer-approved packs
(sign-off logged in `docs/agents/tilesmith/log.md`, 2026-07-30 entry). This file is the
curation deliverable for GitHub issue #25: it maps specific numbered tiles to their intended
in-game use. No engine wiring happens here -- `Enemy.ts` and the tileset-loading code are
untouched; this only unblocks Tiled layout authoring and the later placeholder-rectangle-to-
sprite swap.

**Method:** each pack's `Tilemap/tilemap_packed.png` is the exact, gutter-free spritesheet
(16x16 tiles, no spacing) backing the promotional `Preview.png` shown in each pack's folder --
cropping a tile at `(row, col)` from the packed sheet and the corresponding numbered file in
`Tiles/tile_NNNN.png` were cross-checked against each other and against `Preview.png` to confirm
identity before recording a pick below. `tile index` is 0-indexed, computed as `row * cols + col`,
per each pack's stated grid dimensions (`Tilesheet.txt` in each pack folder).

**Filename-numbering gotcha, logged so it isn't rediscovered later:** Tiny Dungeon's
`Tiles/tile_NNNN.png` files are 0-indexed (`tile_0000.png` = index 0), so filename number ==
tile index. Tiny Creatures' `Tiles/tile_NNNN.png` files are **1-indexed**
(`tile_0001.png` = index 0), so filename number == tile index + 1. Verified directly: cropping
index 0 from `tiny-creatures/Tilemap/tilemap_packed.png` and reading `Tiles/tile_0001.png` both
show the same green zombie sprite.

---

## Pack 1 — Kenney "Tiny Dungeon"

- Source: https://kenney.nl/assets/tiny-dungeon (mirrored at https://opengameart.org/content/tiny-dungeon)
- License: CC0 1.0 Universal (`public/assets/third-party/kenney-tiny-dungeon/License.txt`, confirmed 2026-07-30)
- Grid: 12 cols x 11 rows, 16x16 px tiles, 132 tiles total, 0-indexed filenames

### Terrain/floor/wall pieces for the Spellroad tileset/lane

| Use | Tile index | Row, Col (0-indexed) | Filename | Description |
| --- | --- | --- | --- | --- |
| Lane floor (primary walkable surface) | 0 | row 0, col 0 | `tile_0000.png` | Plain dark red-brown dirt/stone floor, no texture noise -- clean base for the lane's main walkable strip. |
| Lane floor variant (edge dressing) | 12 | row 1, col 0 | `tile_0012.png` | Same dirt floor with pebble/rubble speckling -- for lane-edge tiles or transition tiles next to walls, so the lane doesn't read as a perfectly uniform strip. |
| Lane boundary/wall | 36 | row 3, col 0 | `tile_0036.png` | Grey stone brick wall, horizontal coursing pattern -- frames the lane's edges as an impassable border. |
| Alternate path/accent surface | 48 | row 4, col 0 | `tile_0048.png` | Solid tan/sand floor -- distinct enough in hue from tile 0 to use as a worn-path center strip down the lane, or as off-lane surrounding ground. |

### Base character (style/size reference only -- not an archetype pick)

| Use | Tile index | Row, Col | Filename | Description |
| --- | --- | --- | --- | --- |
| Chibi base-character reference | 84 | row 7, col 0 | `tile_0084.png` | Purple-robed, white-bearded base chibi wizard. Per the ticket, this pack's base characters are a scale/style reference only (how a 16x16 humanoid silhouette reads in this art direction) -- archetype identity for the 3 enemies comes from Tiny Creatures, not this pack. |

---

## Pack 2 — OpenGameArt "Tiny Creatures" (Clint Bellanger, Tiny Dungeon-compatible expansion)

- Source: https://opengameart.org/content/tiny-creatures (also https://clintbellanger.itch.io/tiny-creatures)
- License: CC0 1.0 Universal (`public/assets/third-party/tiny-creatures/License.txt`, confirmed 2026-07-30)
- Grid: 10 cols x 18 rows, 16x16 px tiles, 180 tiles total, **1-indexed filenames** (filename = tile index + 1, see gotcha above)

### Enemy archetype picks (one specific tile per archetype, per the ticket)

| Archetype | Tile index | Row, Col (0-indexed) | Filename | Description | Shortlist match |
| --- | --- | --- | --- | --- | --- |
| **Melee** | 127 | row 12, col 7 | `tile_0128.png` | Grey, rock-textured, blocky humanoid body with rounded head and small moss patches at the feet -- bulky, broad-shouldered silhouette. | Golem (from the 2026-07-25 shortlist's troll/ogre/minotaur/bugbear/golem candidates) |
| **Ranged** | 32 | row 3, col 2 | `tile_0033.png` | Grey/blue-grey creature with large feathered wings spread wide and a birdlike head -- reads as airborne at a glance. | Harpy (from the 2026-07-25 shortlist's harpy/centaur/faerie candidates) |
| **Debuffer** | 66 | row 6, col 6 | `tile_0067.png` | Small robed figure wearing an unmistakable purple pointed witch hat. | Witch (from the 2026-07-25 shortlist's dark wizard/witch/lich/banshee candidates) |

### Runner-up alternates (visually confirmed, kept in case the primary pick doesn't read well once scaled/recolored in-engine)

| Archetype | Tile index | Row, Col | Filename | Description |
| --- | --- | --- | --- | --- |
| Melee | 97 | row 9, col 7 | `tile_0098.png` | Brown-furred humanoid with horned helmet and an axe -- barbarian/bugbear-brute silhouette. |
| Melee | 123 | row 12, col 3 | `tile_0124.png` | Red-skinned, armored, bulky humanoid holding a weapon. |
| Ranged | 54 | row 5, col 4 | `tile_0055.png` | Centaur -- horse lower body, humanoid torso holding a weapon. |
| Ranged | 36 | row 3, col 6 | `tile_0037.png` | Small golden winged figure with a halo -- faerie/cherub-styled. |
| Ranged | 130 | row 13, col 0 | `tile_0131.png` | Grey winged creature, birdlike head, wings spread -- second harpy-style read. |
| Debuffer | 4 | row 0, col 4 | `tile_0005.png` | Grey hooded, faceless robed figure -- lich/grim-reaper read. |
| Debuffer | 75 | row 7, col 5 | `tile_0076.png` | Pink/magenta spectral swirl with a glowing red-ringed eye, no clear limbs -- banshee read. |
| Debuffer | 86 | row 8, col 6 | `tile_0087.png` | Dark grey, faceless, standing shadow silhouette -- lich/shadow read. |

---

## Scope note (matches issue #25's acceptance criteria)

- This legend identifies specific tiles/sprites for the Spellroad tileset terrain and all 3 enemy
  archetypes (Melee, Ranged, Debuffer) -- one primary pick per archetype, plus alternates.
- No rendering code, `Enemy.ts`, or tileset-loading code was changed. Wiring these picks into
  Tiled layouts (backlog 3.7) or into the archetype-color/sprite-swap in `Enemy.ts` is separate,
  later work.
- License/source for both packs is unchanged from the 2026-07-30 sign-off entry in
  `docs/agents/tilesmith/log.md` -- referenced here rather than re-verified, per this ticket's scope.

---

## 2026-08-31 — Elemental monster roster (Issue #207, Task 3)

Task 3 adds no binary assets. It reuses thirteen distinct, individually-loadable files already
committed under `public/assets/third-party/tiny-creatures/Tiles/`; the registry records the exact
URL for each. All source files are from OpenGameArt's [Tiny Creatures](https://opengameart.org/content/tiny-creatures)
pack by Clint Bellanger, under CC0 1.0 Universal (`License.txt`). The pack was developer-approved
for acquisition on 2026-07-30. Tile numbers below are Tiny Creatures' 1-indexed filenames;
`tile index` is the corresponding 0-indexed packed-sheet position.

| Internal visual ID | Role/archetype | Tile index | Source filename | Provenance |
| --- | --- | ---: | --- | --- |
| `monster_m01` | melee | 127 | `tile_0128.png` | Existing CC0 Tiny Creatures Golem pick |
| `monster_m02` | melee | 140 | `tile_0141.png` | Existing CC0 Tiny Creatures tile |
| `monster_m03` | melee | 141 | `tile_0142.png` | Existing CC0 Tiny Creatures tile |
| `monster_m04` | melee | 142 | `tile_0143.png` | Existing CC0 Tiny Creatures tile |
| `monster_r01` | ranged | 32 | `tile_0033.png` | Existing CC0 Tiny Creatures Harpy pick |
| `monster_r02` | ranged | 36 | `tile_0037.png` | Existing CC0 Tiny Creatures Faerie pick |
| `monster_r03` | ranged | 130 | `tile_0131.png` | Existing CC0 Tiny Creatures Harpy alternate |
| `monster_r04` | ranged | 168 | `tile_0169.png` | Existing CC0 Tiny Creatures tile |
| `monster_d01` | debuffer | 4 | `tile_0005.png` | Existing CC0 Tiny Creatures hooded pick |
| `monster_d02` | debuffer | 66 | `tile_0067.png` | Existing CC0 Tiny Creatures Witch pick |
| `monster_d03` | debuffer | 75 | `tile_0076.png` | Existing CC0 Tiny Creatures Banshee pick |
| `monster_d04` | debuffer | 86 | `tile_0087.png` | Existing CC0 Tiny Creatures Shadow pick |
| `monster_boss_01` | boss / melee mechanics | 170 | `tile_0171.png` | Existing CC0 Tiny Creatures distinct boss silhouette |

The role column is internal combat behavior only. It is not an on-screen name or a statement that
a weapon-shaped pixel determines that behavior. In the game, the active **wave element** supplies
the following explicit metadata independently of sprite pixels: a dark neutral outline (`0x14161f`),
an accent color, and a non-color motif: fire flame-spikes, ice crystal, earth corners, and lightning
zigzag. Task 3's automated tests validate that metadata and the actual source URLs; grayscale and
color-vision screenshot evidence is deferred to Task 7 live visual QA.
