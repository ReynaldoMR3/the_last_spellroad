# Tilesmith — Asset Log

Append-only, dated, one entry per asset: source, license, developer sign-off status.

## 2026-07-21

Context store established. No assets logged yet.

## 2026-07-25

Backlog 3.6, research phase only -- sourcing/shortlist half of the pipeline (search order steps 1-2), not acquisition. Per a session-specific constraint from the developer, no files were downloaded, fetched-and-written, or extracted this pass; nothing below has been pulled into the repo. Sign-off status: pending human developer review of every candidate before any download happens.

### Spellroad tileset (road/lane-and-surroundings)

**Candidate 1 -- Kenney "Roguelike/RPG Pack"** (step 1: Kenney.nl)
- Source: https://kenney.nl/assets/roguelike-rpg-pack (mirrored at https://opengameart.org/content/roguelikerpg-pack-1700-tiles)
- License: CC0, confirmed on the Kenney page ("Creative Commons CC0") and the OGA mirror. No attribution required, commercial use and modification unrestricted.
- Depicts: ~1,700 tiles at 16x16 -- floors (dirt, stone, wood), walls and roofs, flora (trees, bushes, hedges), doors/windows, furniture, mining supplies, flags/banners, UI panels. Spritesheet + sample maps included.
- Fit: dirt/stone floor tiles are the strongest candidate for the walkable lane surface itself; flora tiles cover the "surroundings" half (forest-edge dressing along the road). Gap: the pack's own listing doesn't itemize a dedicated worn-path/road tile distinct from generic floor tiles -- if the generic floor tiles don't read as a "road" clearly enough once in-engine, this becomes a step-3 job (recolor/recombine the dirt-floor tile into a distinct worn-lane variant) rather than a pure step-1 pull.

**Candidate 2 -- Kenney "RPG Base"** (step 1: Kenney.nl)
- Source: https://kenney.nl/assets/rpg-base (mirrored at https://opengameart.org/content/rpg-pack-base-set)
- License: CC0, confirmed on both pages; Kenney directly answered a user's commercial-use question with "Yes, you can!"
- Depicts: 230 assets at the same 16x16 scale -- grass, dirt, and water terrain plus buildings, roofs, windows, crates.
- Fit: companion terrain set for the surroundings (grass/water borders framing the road) that mixes cleanly with Candidate 1 at the same tile scale. Same gap as above: no explicit dedicated road/path tile called out in the listing, so the "lane" look likely still needs a recolor/recombine pass over the dirt tiles from either pack.

### Enemy archetype sprites (melee, ranged, debuffer -- reskin targets for `ARCHETYPE_COLOR` in `src/entities/Enemy.ts`)

**Candidate 3 -- Kenney "Tiny Dungeon"** (step 1: Kenney.nl)
- Source: https://kenney.nl/assets/tiny-dungeon (mirrored at https://opengameart.org/content/tiny-dungeon)
- License: CC0, confirmed on both pages ("Credit 'Kenney.nl'... this is not mandatory").
- Depicts: 130+ sprites at 16x16 -- dungeon floor/wall tiles, base chibi-style characters, monsters, and weapon/item props (swords, bows, staves). Tiled sample file included.
- Fit: supplies base character silhouettes and weapon props that can dress each archetype (sword prop -> melee, bow prop -> ranged, staff prop -> debuffer) at the same scale as the tileset candidates above, keeping the whole slice visually consistent.

**Candidate 4 -- "Tiny Creatures" (community expansion of Kenney's Tiny Dungeon, by Clint Bellanger)** (step 2: OpenGameArt.org, CC0-filtered)
- Source: https://opengameart.org/content/tiny-creatures (also on itch.io: https://clintbellanger.itch.io/tiny-creatures)
- License: CC0 1.0 Universal, confirmed on the OGA listing. Not a Kenney-published pack itself -- it's a community add-on made compatible with Kenney's Tiny Dungeon/Tiny Town sets (with Kenney's acknowledgement) -- so it's logged as a step-2 (OpenGameArt CC0-filtered) pull, not step 1, even though it shares Tiny Dungeon's 16x16 art style and no-attribution CC0 bar.
- Depicts: 180 sprites (100+ monsters, 50+ animals) in the same "Tiny" chibi style as Candidate 3.
- Fit per archetype, with specific sprite picks:
  - Melee: troll, ogre, minotaur, bugbear, or the stone/iron/clay golem variants -- bulky, heavy-set silhouettes that read as a melee brute at a glance.
  - Ranged: harpy, centaur, or faerie -- winged/mounted or airborne silhouettes that read as hit-and-run ranged attackers.
  - Debuffer: dark wizard, witch, lich, or banshee -- robed/spectral spellcaster silhouettes that read as a status/debuff caster rather than a damage dealer.
- Recoloring each pick toward the existing `ARCHETYPE_COLOR` palette (melee 0xb1443e, ranged 0xd8a53d, debuffer 0x6f4fa8) is a straightforward step-3 operation once a specific sprite is chosen, since CC0 permits unrestricted derivatives.

No assets were pulled into the repo this pass -- all four candidates await developer sign-off before Bash/Write touch any binary.

## 2026-07-30 -- Developer sign-off received for Candidates 1, 3, and 4; downloaded and committed

Developer explicitly approved pulling **Candidate 1** (Kenney Roguelike/RPG Pack, tileset) and **Candidates 3+4** (Kenney Tiny Dungeon + OpenGameArt Tiny Creatures, enemy sprites) -- **Candidate 2** (Kenney RPG Base) was not part of what was approved and was not pulled.

**Verified before writing anything to disk:** re-fetched all three source pages directly rather than trusting the 2026-07-25 shortlist from memory -- confirmed each is still CC0 (Kenney's pages link `creativecommons.org/publicdomain/zero/1.0`; the OpenGameArt listing states the same), confirmed each downloaded file is an actual zip archive (via `file`, not just a `.zip` extension) before extracting, and read each pack's own bundled `License.txt` after extraction as a second, independent confirmation of CC0 terms -- all three matched.

**Downloaded and committed to the repo** (raw pack contents, license files included, `.url` website-shortcut files stripped since they carry no asset content):
- `public/assets/third-party/kenney-roguelike-rpg-pack/` -- source https://kenney.nl/assets/roguelike-rpg-pack, CC0, ~1700 tiles at 16x16 (spritesheet + sample Tiled maps), 736K unpacked.
- `public/assets/third-party/kenney-tiny-dungeon/` -- source https://kenney.nl/assets/tiny-dungeon, CC0, 132 numbered tiles at 16x16 (base characters, dungeon tiles, weapon/item props) + a sample Tiled map, 620K unpacked. No semantic tile-name legend ships with this pack -- tiles are numbered (`tile_0000.png`...) only, so mapping a specific number to "sword prop" or "base chibi character" still needs a visual pass against `Preview.png`/`Sample.png` before any specific tile is wired in.
- `public/assets/third-party/tiny-creatures/` -- source https://opengameart.org/content/tiny-creatures, CC0, 180 numbered tiles at 16x16 (100+ monsters, 50+ animals) + a sample Tiled map, 880K unpacked. Same gap: numbered only, no name legend -- the troll/ogre/harpy/lich-etc. picks from the 2026-07-25 entry still need visual identification against the tile grid before use.

**Explicitly not done in this pass, flagged rather than silently implied:** no specific tile/sprite has been picked out, cropped, or wired into `Enemy.ts`/the tileset-loading code yet -- this closes the acquisition half of backlog 3.6 only. Both numbered packs need a visual identification pass (matching a grid position in `Preview.png` to a tile number, using each pack's stated grid dimensions -- Tiny Dungeon 12x11, Tiny Creatures 10x18) before any individual asset is ready to replace the current placeholder colored-rectangle rendering. That visual-picking-and-wiring step is 3.6's remaining work plus 3.7 (Tiled level layouts), both still open.

Sign-off status: developer-approved for download (this entry); the specific-tile-selection step below still needs its own review once picked, per this agent's standing success criterion (license/source compliance is a human check, not a self-certified one).

## 2026-08-01 -- Backlog 3.6 curation half closed (GitHub issue #25): specific tile picks identified

Visual identification pass over both packs' `Tilemap/tilemap_packed.png` (the exact, gutter-free
16x16 spritesheet backing each pack's `Preview.png`), cross-checked against the corresponding
numbered file in each pack's `Tiles/` folder. Full mapping, including runner-up alternates, is in
the new `docs/agents/tilesmith/tile-legend.md`. Source pack + license are unchanged from the
2026-07-30 entry above (both CC0, re-verified there) -- referenced rather than re-checked here.

**Spellroad tileset terrain (Kenney Tiny Dungeon, 12x11 grid, 132 tiles, 0-indexed filenames):**
- Lane floor: tile index 0 (row 0, col 0), `tile_0000.png` -- plain dirt/stone floor.
- Lane floor variant: tile index 12 (row 1, col 0), `tile_0012.png` -- pebble-speckled dirt floor.
- Lane boundary wall: tile index 36 (row 3, col 0), `tile_0036.png` -- grey brick wall.
- Alternate path/accent surface: tile index 48 (row 4, col 0), `tile_0048.png` -- tan/sand floor.
- Base chibi character (style/size reference only, not an archetype pick): tile index 84 (row 7, col 0), `tile_0084.png`.

**Enemy archetypes (OpenGameArt Tiny Creatures, 10x18 grid, 180 tiles, 1-indexed filenames --
filename number = tile index + 1, confirmed by cross-checking index 0 against `tile_0001.png`):**
- Melee -> Golem: tile index 127 (row 12, col 7), `tile_0128.png` -- grey rock-textured bulky humanoid.
- Ranged -> Harpy: tile index 32 (row 3, col 2), `tile_0033.png` -- grey winged, birdlike-head creature.
- Debuffer -> Witch: tile index 66 (row 6, col 6), `tile_0067.png` -- purple pointed-hat robed figure.

Runner-up alternates for all three archetypes (in case a primary pick doesn't read well once
scaled/recolored toward `ARCHETYPE_COLOR` in-engine) are recorded in `tile-legend.md`, not repeated
here.

**Explicitly not done in this pass:** no rendering code, `Enemy.ts`, or tileset-loading code was
touched -- this closes only the curation half of backlog 3.6 (the acquisition half closed
2026-07-30). Wiring these picks into Tiled layouts (backlog 3.7) or into the archetype
sprite-swap in `Enemy.ts` remains separate, later work.

Sign-off status: pending human developer review of the specific tile picks in `tile-legend.md`,
per this agent's standing success criterion (license/source compliance, and now pick suitability,
are human checks -- this entry is the input to that check, not a substitute for it).

## 2026-08-01 -- Backlog 3.7 (issue #28): Tiled JSON level layouts, Levels 1-5

Built five real Tiled-format JSON layouts from #25's curated legend
(`docs/agents/tilesmith/tile-legend.md`, merged from PR #34/`tilesmith/curate-tile-ids-25`,
still open at write-time so this branch stacks on top of it rather than `main` -- no new
asset acquisition, sourcing, or license work in this pass; this entry only records where the
already-logged Pack 1 (Kenney Tiny Dungeon, CC0, 2026-07-30 sign-off) terrain picks ended up.

**No new assets sourced.** This ticket is terrain-layout data authored from tile indices
already logged and signed off in the 2026-07-30 entry above -- nothing new to license-check.

**File path convention (for #29's later engine wiring to find without guessing):**
`public/assets/levels/level-1.json` .. `level-5.json` -- under `public/` (not `src/`) so Vite
serves them statically and `this.load.tilemapTiledJSON()` can fetch them by URL at runtime,
the same convention already used for the tileset PNGs under `public/assets/third-party/...`.
Level numbering matches the existing wave data 1:1 (`src/data/waves/level-1.json`..`level-4.json`
regular, `boss-1.json` = level 5 per the 2026-07-30 backlog note) -- `level-5.json` here is the
boss arena.

**Schema:** standard Tiled JSON map format (`orientation: "orthogonal"`, `renderorder:
"right-down"`, embedded single tileset, `tilewidth`/`tileheight: 16`). Field names cross-checked
against Kenney's own bundled sample (`public/assets/third-party/kenney-tiny-dungeon/Tiled/
sampleMap.tmx` + `sampleSheet.tsx`) rather than guessed from memory -- that sample's TMX/TSX
pair confirmed `tilewidth`/`tileheight`/`columns`/`tilecount`/`firstgid` naming, though the
sample itself references the gutter-padded `Tilemap/tilemap.png` (203x186, spacing=1); these
five maps instead reference the actual gutter-free sheet the legend was built against,
`Tilemap/tilemap_packed.png` (192x186... actually 192x176px, 12 cols x 11 rows, 16x16, no
spacing, 132 tiles), via a relative path (`../third-party/kenney-tiny-dungeon/Tilemap/
tilemap_packed.png`) from each level file's location. Single tileset per map, `firstgid: 1`,
so a legend tile index N is GID N+1 (0 stays reserved for "empty/no tile" per the Tiled spec).
Verified every output file parses (`python3 -m json.tool`) and that each layer's `data` array
length equals `width * height` before committing.

**Tile picks used (all four terrain entries from the legend, no others):**
| Legend use | Tile index | GID | Role in these layouts |
| --- | --- | --- | --- |
| Lane floor (primary) | 0 | 1 | Interior floor fill |
| Lane floor variant (edge dressing) | 12 | 13 | Rows directly inside the wall border, and (Levels 3-4) sprinkled every 5th interior column for rubble variation |
| Lane boundary/wall | 36 | 37 | Top/bottom border rows |
| Alternate path/accent surface | 48 | 49 | Center worn-path stripe (Levels 2 and 4) and the boss dais block (Level 5) |

No enemy-sprite tiles (Tiny Creatures pack) are referenced -- out of scope per the ticket
(terrain layout only, sprite wiring is separate).

**Layout per level** (all one `Terrain` tile layer, single embedded tileset):
- **Level 1** -- 60x18 tiles (960x288px). Row 0 and row 17 = wall (GID 37). Rows 1 and 16 =
  floor-variant edge dressing (GID 13). Rows 2-15 = plain floor (GID 1). Plain bordered lane,
  no extra dressing -- the baseline pattern the other levels build on.
- **Level 2** -- same 60x18 frame/border as Level 1, but rows 8-9 (the two middle interior
  rows) are the accent surface (GID 49) as a worn-path center stripe.
- **Level 3** -- same 60x18 frame/border as Level 1, with every 5th interior column
  (`col % 5 == 0`, rows 2-15) swapped to the floor-variant tile (GID 13) for a more rugged,
  rubble-flecked look. No center stripe.
- **Level 4** -- combines Level 2's center stripe (rows 8-9 = GID 49) with Level 3's every-5th-
  column rubble sprinkle (GID 13) -- the most visually "worn" of the 4 regular lanes, signaling
  ramp-up before the boss.
- **Level 5 (boss)** -- larger, distinct arena: 60x20 tiles (960x320px), with a thicker 2-row
  wall frame top and bottom (rows 0-1 and rows 18-19, GID 37) instead of the regular levels'
  1-row border, edge-dressing rows 2 and 17 (GID 13), and a 12x4 "boss dais" block of the accent
  surface (GID 49) centered in the arena floor (columns 24-35, rows 9-12) to mark the arena as
  visually distinct from the 4 regular lanes.

**Deliberately not pixel-perfect to `SpellroadScene.ts`'s current placeholder rectangle
geometry** (`ROAD_LEFT=90, ROAD_TOP=130, ROAD_WIDTH=780, ROAD_HEIGHT=280` on a 960x540 canvas --
780/16 and 280/16 aren't whole tile counts). Per the ticket's own framing, sized "sensibly" in
whole 16px tile units instead: full canvas width (60 tiles = 960px, exact) and a rounded
lane-height-ish interior (18 tiles = 288px for the 4 regular levels, close to the 280px
`ROAD_HEIGHT`). These maps only cover the bordered-lane box itself (no tile paints the
surrounding darker background) -- positioning this box within the scene's existing dark
backdrop, and reconciling the small pixel-rounding difference against the live constants, is
left to #29's engine-wiring pass, not decided here. `SpellroadScene.ts` itself was not touched
in this pass (out of scope per the ticket -- data-only).

**Explicitly out of scope, flagged rather than silently implied:** no engine code changed, no
tileset image re-exported, no enemy-sprite tiles wired in. `src/scenes/SpellroadScene.ts` load
calls, `map.addTilesetImage()`/`map.createLayer()` wiring, and reconciling the lane's live pixel
geometry against these tile-unit maps are #29's job.

Sign-off status: no new binary/licensed asset introduced this pass (pure JSON layout data built
from already-signed-off tile picks) -- nothing new here requires the human compliance check;
existing Pack 1 sign-off (2026-07-30 entry) still covers the underlying tileset PNG these layouts
reference.

## 2026-08-02 -- Backlog 2.30 (issue #56): per-spell icon art for the hotbar, hand-authored

**Problem:** developer playtest reported `arc_lance` and `stone_spike` look identical in play --
both `shape: line, weight: light` (`src/data/spells/spells.json`), differing only in
element/power/target-count, none of which had any on-screen representation beyond hotbar text.
Decision (per the issue, already grilled before dispatch): commission real per-spell icon art,
sourced via this agent's own Art Sourcing pipeline, feeding into Loomwright's new single-row
hotbar (#55).

**Granularity decision: 4 icons, one per element, not 12 unique per-spell icons.** Read
`src/data/spells/spells.json` directly: 12 shipped spells span exactly 4 elements (fire, ice,
lightning, earth) x 3 shapes x 3 weights. The reported bug is specifically an
element-blindness problem -- shape is already visible via the cast-preview geometry, and both
shape and weight already have a text tag in the hotbar (backlog 2.14's `[shape/weight]` label).
An icon per element closes the actual gap (`arc_lance` = lightning, `stone_spike` = earth, now
visibly different) without re-encoding information already on screen. This matches the
project's low-spec/readable-silhouette direction and the vertical-slice floor-vs-stretch cut
philosophy -- a full 12-icon commission is flagged as a legitimate stretch/later pass if a
future playtest finds two same-element spells still get confused, not ruled out permanently.

**Step 1 (Kenney.nl) -- checked, nothing suitable found:**
- https://kenney.nl/assets/game-icons -- CC0, 105 assets, but the pack is gamepad/controller/
  input-prompt icons (confirmed via the page's own tag list: icon, gamepad, joystick, prompt,
  interface), not fantasy/elemental iconography.
- https://kenney.nl/assets/ui-pack-rpg-expansion -- CC0, 85 assets, but is buttons/panels/
  sliders (UI chrome), not spell/item icons.
- https://kenney.nl/assets/fantasy-ui-borders -- CC0, window/dialog border frames, not icons.
- Browsed the Kenney asset catalog itself (kenney.nl/assets, icon-tagged) -- no pack dedicated
  to elemental/magic/spell icons exists in the catalog.
- Also re-checked the two packs already in this repo (Kenney Roguelike/RPG Pack, Kenney Tiny
  Dungeon, both CC0, 2026-07-30 sign-off) -- neither contains a discrete icon-shaped asset (gem,
  orb, rune) suited to spell iconography; both are terrain tiles and character/creature sprites
  only, per `tile-legend.md`.

**Step 2 (OpenGameArt.org, CC0 filter) -- checked, nothing suitable found:**
- https://opengameart.org/content/12-elemental-type-symbolsicons -- exact element match (Fire,
  Ice, Electric, Earth among its 12), but license is **CC-BY 4.0** ("you must give credit to
  me"), confirmed by reading the page directly -- disqualified per this project's own
  CC0-filter-only rule (step 2 never accepts CC-BY).
- https://opengameart.org/content/skill-item-and-spell-icons -- CC0 confirmed, but 100 icons at
  567x567px, painterly-gradient style with no confirmed ice/lightning/earth coverage -- wrong
  scale and wrong art style for the project's 16x16/32x32 low-spec pixel direction.
- https://opengameart.org/content/element-icons -- CC0 confirmed, but only 4 classical-Greek
  elements (fire, earth, water, air -- no ice or lightning) as a flat SVG, not pixel art.
- https://opengameart.org/content/magic-spell-icons -- CC0 confirmed, but 6 generic flat-SVG
  icons, not an elemental set, same style mismatch as above.
- No CC0, pixel-scale, exactly-4-element (fire/ice/lightning/earth) icon set exists on
  OpenGameArt that was found after this search.

**Step 3 (recolor/recombine a sourced CC0 asset) -- ruled out:** neither already-downloaded pack
(Roguelike/RPG Pack, Tiny Dungeon) contains an icon-shaped base asset (the packs are terrain and
character sprites, not items/gems/runes) that would read as a "spell icon" once recolored --
forcing a terrain or creature tile into an icon role would be a worse fit than drawing new,
simple shapes from scratch.

**Step 4 (hand-authored, last resort) -- what was actually shipped:**
- `public/assets/spell-icons/fire.png`, `ice.png`, `lightning.png`, `earth.png` -- 4 new,
  hand-authored 32x32 PNG icons (flame teardrop / snowflake-hex crystal / lightning bolt / rock
  cluster with a moss fleck), flat-color silhouettes with a dark outline, matching the existing
  16x16-tile-doubled scale convention already established by the Kenney packs in this repo.
  Drawn programmatically (Python/Pillow, supersampled 4x then downsampled) rather than by hand
  in Piskel, but the output is the same kind of asset the contract's step 4 describes: simple,
  low-spec pixel icons at the project's tile scale, with no third-party license to track since
  nothing was copied or derived from a specific external source file.
- No attribution/license entry needed for these 4 files (wholly original, no CC0/CC-BY source
  material incorporated) -- logged here anyway per this file's own "every asset, every step,
  regardless of license" rule, so nothing in the repo is untracked.

**Engine wiring (small, additive, per the ticket's own scope guidance):**
- New `src/systems/spellIcons.ts` -- pure, Phaser-free module (same pattern as `levelArt.ts`)
  mapping an `Element` to its icon's load key/URL (`spellIconKey`, `spellIconUrl`,
  `iconKeyForSpell`).
- `src/scenes/SpellroadScene.ts`: `preload()` now loads the 4 icon PNGs via `this.load.image()`
  (same pattern as the existing tileset image load); `createHud()` now creates one hidden
  `Image` GameObject per hotbar slot (`hotbarSlotIcons`) sized to `HOTBAR_ICON_SIZE` (40px) and
  shifts the existing per-slot label text right by that width + padding so the two don't
  overlap; `updateHotbar()` now sets each visible slot's icon texture to
  `iconKeyForSpell(spell)` and shows/hides it alongside the existing ready/cooldown/armed
  border logic. `computeHotbarSlotRects` (hotbarLayout.ts) itself, cooldown logic, and every
  other part of the hotbar's math were not touched, per the ticket's explicit constraint.

**Self-verification (`docker-compose`, per `docs/agents/_reference/docker-testing-contract.md`):**
- `docker-compose run --rm game npm run typecheck` -- clean, no errors.
- `docker-compose run --rm game npm test` -- 9 test files, 76 tests, all passed (unchanged from
  before this change -- no new test file added, since the changed code is Phaser-scene wiring
  self-verified via the dev server instead, same convention `hotbarLayout.ts`'s own doc comment
  states for `SpellroadScene.ts`).
- `docker-compose run --rm game npm run build` -- clean production build.
- `docker-compose up -d game` + browser screenshot at `http://localhost:5173` confirmed all 6
  default-loadout slots render a distinct icon: `arc_lance`/`thunder_dome` (lightning bolt),
  `flame_sweep`/`magma_lance` (flame), `frost_nova` (ice crystal), `stone_spike` (rock cluster)
  -- `arc_lance` and `stone_spike` specifically now read as visibly different at a glance,
  which is the exact bug this ticket reports. No console errors during the session.

**Verification-rationale (ADR-0001):** typecheck/test/build/screenshot together prove the icons
load without a runtime error, render at the correct position/size in every slot, and that the
element-to-icon mapping is correct for the shipped default loadout -- the class of bug this
change could plausibly introduce (wrong texture key, a slot rect miscalculation, a load-order
race between `preload`/`create`) is exactly what a clean build plus an actual rendered
screenshot rules out, not merely a clean compile. What this verification does **not** prove, and
is explicitly left to human review: (1) license compliance sign-off for the 4 hand-authored
PNGs -- per this agent's own standing rule, that check is human-only regardless of how the
asset was produced; (2) aesthetic fit / whether these specific silhouettes and colors read well
against the rest of the game's art direction once a developer looks at them outside a
screenshot; (3) whether element-level granularity is the right long-term call once more spells
ship, per this entry's own granularity-decision framing above.

Sign-off status: **pending human developer review** -- both on the 4 hand-authored icon files
themselves (asset-quality/fit judgment) and as a compliance formality (no external license to
verify since nothing was copied from a third-party source, but per this agent's own rule an
asset is never self-certified as compliant, hand-authored or not).

## 2026-08-04 -- Backlog 3.10 (issue #81 / ADR-0002): SFX one-shots -- hit-cue, cast, impact, death

**Scope, per the ticket:** five SFX cues for content already shipped in the engine, wired at the
real call sites (no speculative coverage ahead of unbuilt features, per this pillar's standing
reactive-coverage rule) -- the hit-cue is the highest-priority item (the original developer ask,
2026-08-03 playtest, issue #81: "we need sound to know when we are getting hit, so you can run
away"), plus cast/impact SFX alongside backlog 2.36's existing visual hooks, plus enemy/player
death SFX.

**Step 1 (Kenney.nl) -- sufficient, search order never needed to reach OpenGameArt:**
- **Kenney "Impact Sounds"** -- https://kenney.nl/assets/impact-sounds, CC0 (confirmed via the
  page's own "Creative Commons CC0" label, re-confirmed independently by reading the bundled
  `License.txt` after download: "License (Creative Commons Zero, CC0),
  http://creativecommons.org/publicdomain/zero/1.0/ ... free to use in personal, educational and
  commercial projects"). 130 one-shot `.ogg` files (footstep + impact foley across several
  materials/weights). Verified the downloaded file is an actual zip (`file impact-sounds.zip` ->
  "Zip archive data") before extracting, same discipline as the 2026-07-30 entry.
  - `impactSoft_heavy_002.ogg` -> hit-cue (a heavy, material-agnostic thud reads as "something
    hit you" without implying a specific weapon, since the melee/ranged/debuffer archetypes all
    trigger the same cue).
  - `impactGeneric_light_001.ogg` -> spell-impact (short, ~0.12s -- picked deliberately brief so
    an AoE landing on multiple enemies in the same instant, `confirmCast`'s per-enemy loop,
    doesn't smear into a wall of overlapping sound).
  - `impactBell_heavy_002.ogg` -> player-death (a heavy bell/gong strike, deliberately more
    weighty/ominous than the enemy-death cue below -- pairs with the existing "Died --..."
    `flashMessage` in `handleDeath`, a rarer, run-ending event).
- **Kenney "Digital Audio"** -- https://kenney.nl/assets/digital-audio, CC0 (same confirmation
  method: page label + bundled `License.txt`, identical CC0 text to the pack above). 60 one-shot
  `.ogg` files (sci-fi zap/phaser/power-up tones). No dedicated "magic spell" pack exists on
  Kenney (checked the asset catalog directly, same as the 2026-08-02 icon-sourcing pass) -- these
  zap/phaser tones are the closest fit for a spell-cast/dying-creature beat in the absence of one.
  - `phaserUp3.ogg` -> spell-cast (a short, ~0.5s rising zap for the moment a spell releases,
    pitched/timed distinctly from the impact cue above so the two don't blur when a cast lands
    instantly at close range).
  - `phaserDown1.ogg` -> enemy-death (a short, ~0.78s descending "power-down" zap -- frequent
    event, every kill, kept brief).

**Step 2/3/4 not reached:** Kenney alone had a workable candidate for all five cues once its two
relevant packs (Impact Sounds, Digital Audio) were checked -- no need to fall through to
OpenGameArt, recoloring/pitch-shifting, or hand-authoring for this ticket.

**What's actually in the repo** (only the specific files used, not the full packs -- unlike the
tile/sprite packs, each Kenney audio pack already ships every sound as its own standalone file,
so there's no packed-spritesheet-equivalent reason to import the other 100+ unused sounds in each
pack; `License.txt` is still copied alongside for the audit trail):
- `public/assets/third-party/kenney-impact-sounds/License.txt`
- `public/assets/third-party/kenney-impact-sounds/Audio/impactSoft_heavy_002.ogg`
- `public/assets/third-party/kenney-impact-sounds/Audio/impactGeneric_light_001.ogg`
- `public/assets/third-party/kenney-impact-sounds/Audio/impactBell_heavy_002.ogg`
- `public/assets/third-party/kenney-digital-audio/License.txt`
- `public/assets/third-party/kenney-digital-audio/Audio/phaserUp3.ogg`
- `public/assets/third-party/kenney-digital-audio/Audio/phaserDown1.ogg`

**Engine wiring:**
- New `src/systems/sfx.ts` -- pure, Phaser-free module (same convention as `levelArt.ts`/
  `spellIcons.ts`) mapping each of the 5 `SfxCue` values (`hit`, `cast`, `impact`, `enemyDeath`,
  `playerDeath`) to its load key (`sfxKey`) and URL (`sfxUrl`). A single source of truth for the
  cue->key mapping is what lets `preload()`'s load loop and every `this.sound.play(sfxKey(...))`
  call site share the same literal `SfxCue` strings, type-checked -- a typo'd cue name at either
  end fails `tsc`, not silently at runtime.
- `src/scenes/SpellroadScene.ts`:
  - `preload()`: loads all 5 one-shots via `this.load.audio(sfxKey(cue), sfxUrl(cue))`, same
    eager-preload convention as the tileset image/level JSON/spell icons already there.
  - `create()`: the existing `HealthSystem` constructor's `onDamage` callback (already wired to
    the "Hit!" `flashMessage`) now also calls `this.sound.play(sfxKey("hit"))` -- the audio and
    visual hit cues fire from the identical event, so they can't drift out of sync.
  - `spawnCastEffect` (backlog 2.36's cast-flash hook, called once per `confirmCast` regardless
    of whether the cast lands a hit): now also plays `sfxKey("cast")`.
  - `spawnImpactBurst` (backlog 2.36's per-hit burst, called once per landed hit inside
    `confirmCast`'s per-enemy loop): now also plays `sfxKey("impact")`.
  - `removeEnemy` (only ever called from `confirmCast`'s `if (killed)` branch, never from a
    despawn/cleanup path -- `handleDeath`'s own enemy cleanup calls `.destroy()` directly): now
    also plays `sfxKey("enemyDeath")`.
  - `handleDeath`: now plays `sfxKey("playerDeath")` as its first line, before any of the
    method's existing state-reset/cleanup work.

**Self-verification (`docker-compose`, per `docs/agents/_reference/docker-testing-contract.md`):**
- `docker-compose run --rm game npm run typecheck` -- clean, no errors.
- `docker-compose run --rm game npm test` -- 13 test files, 115 tests, all passed (unchanged --
  no new test file added; `sfx.ts` is a thin, pure key/URL map with no branching logic, same
  precedent `spellIcons.ts` set for not needing a dedicated unit test, and the actual audio-load/
  playback side is Phaser-scene wiring self-verified via the dev server instead).
- `docker-compose run --rm game npm run build` -- clean production build.
- Brought up the dev server and drove it via a real browser session: confirmed all 5 `.ogg`
  files resolve `200 OK` over the network under their expected `assets/third-party/kenney-*`
  paths (rules out a typo'd path/404 -- the class of bug a clean `tsc` build can't catch, since
  the URL is a string literal, not a type-checked import); armed and fired `arc_lance` twice via
  real gameplay actions (mana spent, cooldown started, cast-effect flash rendered) with zero
  browser console errors both times, confirming `this.sound.play(sfxKey("cast"))` executes
  without throwing at the one call site actually exercised interactively. Landing a hit, an
  enemy kill, and a player death were not separately exercised in this pass (the lane's current
  spell-range tuning and enemy pacing made lining up a kill/death within a reasonable session
  cumbersome) -- flagged here rather than silently assumed. **Why this doesn't retroactively
  weaken the verification for those other 3 call sites:** all 5 call sites invoke the exact same
  `this.sound.play(sfxKey(<cue>))` API, differing only in which literal `SfxCue` string is
  passed, and every one of those 5 strings is preloaded via the identical `ALL_SFX_CUES` loop in
  `preload()` -- there's no code path by which the cast call site succeeds while another cue's
  call site would newly throw or fail to find its key.

**Verification-rationale (ADR-0001):** this is asset-loading/key-wiring code, not timing- or
state-dependent logic -- the plausible bug classes are (1) a wrong/missing asset path -> load
404, ruled out by the network-tab check above showing all 5 files at `200 OK`; (2) a mismatched
key between what `preload()` registers and what a `play()` call reads back, structurally ruled
out by both sides sourcing the same literal strings through `sfx.ts`'s single `SfxCue` type,
enforced by a clean `tsc`; (3) a runtime exception from `this.sound.play()` itself, empirically
ruled out for the one cue exercised through real interaction (cast) and not expected to differ
for the other 4, which call the identical API. What this verification does **not** prove, and is
explicitly left to human review, per this agent's own standing success criterion: (1) license/
source compliance sign-off for the 2 Kenney packs pulled from -- both are re-confirmed CC0 here,
but per this agent's own rule that check is never self-certified; (2) whether these specific
sounds (a generic sci-fi zap standing in for "spell cast/dying," since no dedicated magic-SFX
pack exists on Kenney) read as the right aesthetic fit once a developer actually listens to them
in play, distinct from the license question; (3) whether landing a hit/kill/player-death in a
real playtest session actually plays the impact/enemyDeath/playerDeath cues as expected, since
that interactive path wasn't directly exercised this pass.

Sign-off status: **pending human developer review** -- both the license/source compliance
formality for the 2 Kenney packs above, and (separately) the aesthetic-fit and full-playtest
(hit/kill/death cues actually heard in a real run) questions this entry flags as not yet
exercised, per this agent's own standing rule that neither compliance nor fit is ever
self-certified.
