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

## 2026-08-06 — Backlog 3.11 (issue #94): SFX fatigue direction chosen, implementation handed to Loomwright

That full-playtest gate above surfaced exactly the fatigue risk it was flagged for: the developer's 2026-08-05 session reported the cast/attack cues "bothering" them over extended play, reopening this row's own disclosed sci-fi-stand-in tradeoff rather than confirming it. Asked the developer for a direction rather than guessing between re-sourcing, variation, or accepting the limitation (all three carry real cost/risk tradeoffs a one-shot cue swap can't absorb blind).

**Developer's call (2026-08-06):** try pitch/volume variation on the existing cues first — cheaper than a re-source and doesn't touch the license/compliance work already signed off above — with an explicit fallback to re-searching Kenney/OpenGameArt if variation doesn't actually fix the fatigue. Since this doesn't touch asset sourcing or licensing (no new files, no new `License.txt` to verify), it's pure engine wiring — handed to Loomwright rather than kept here. See `loomwright/log.md`, 2026-08-06, for the implementation.

## 2026-08-07 — Issue #111: re-sourcing per-element cast SFX (the fallback 3.11 flagged)

Developer's follow-up (2026-08-06), after 3.11/#94's pitch-variation pass: "i still doesnt like the audio of the atacks... best to investigate and source more files and test different audio settings for each spell." This is the re-source fallback that same row's own note flagged as the next step if variation alone didn't land — it hadn't.

**Search, per the Art Sourcing Contract's order:** Kenney.nl first — checked "RPG Audio" (50 files, CC0) directly; it's foley/footstep/weapon-tagged, no dedicated magic-cast content, consistent with the original 3.10 pass's finding that Kenney has no magic-SFX pack. Moved to OpenGameArt.org, CC0 filter only, one candidate per element (12 shipped spells, 4 elements — same granularity `spellIcons.ts` used for backlog 2.30's icon work, and for the same reason: no per-spell asset exists to draw a finer distinction from):

- **Fire — "Fireball"** (`opengameart.org/content/fireball-1`). Author Julien Matthey (submitted by diligentcircle). `105016__julien-matthey__jm-fx-fireball-01.wav`, 340KB. **CC0**, individually confirmed on the asset's own page.
- **Ice — "Freeze Spell"** (`opengameart.org/content/freeze-spell-0`). Author artisticdude. `freeze.wav`, 600KB, originally made for the FOSS RPG "Summoning Wars." **CC0**, individually confirmed.
- **Earth — "Earth Element Magic Spell"** (`opengameart.org/content/earth-element-magic-spell`). Author qubodup. Took the `.ogg` variant (28KB) over the page's larger `.flac`, to stay closer to this project's existing tiny-one-shot sizing; renamed from the page's space-containing filename to `earth-element-magic-spell.ogg` to match this repo's no-spaces asset convention. **CC0**, individually confirmed.
- **Lightning — no clean CC0 match found.** The obvious candidate, `electricspell.ogg`/`electricspell2.ogg` on OpenGameArt's "Spell Sounds" page, was **checked and disqualified**: that page states its license as "OGA-BY 3.0 and CC0" — a mix across the page's several files with no way to confirm from the page itself which specific license applies to the electric files — and this project's search order only accepts an asset that's individually, unambiguously CC0 (same bar a CC-BY 4.0 icon pack failed for backlog 2.30). Fell back to **"Electricity Game Sound Pack"** (`opengameart.org/content/electricity-game-sound-pack`, author faxcorp, single-license CC0 confirmed for the whole 16-file pack) — took `groundhit.wav` (52KB), the smallest file that reads as a discrete hit/spell moment rather than a looping texture. **Disclosed, not silently treated as a clean match:** this pack's own character is a generic sci-fi electric-game effect, not a fantasy lightning-spell sound — same handling as 3.10's original sci-fi zap stand-ins for cast/enemy-death. Flagged for a future re-source pass if a better-fitting CC0 lightning spell turns up.

All 4 files placed under `public/assets/third-party/opengameart-<slug>/`, each with its own `License.txt` (source URL, author, license, and — for the lightning file — the disclosed fit tradeoff), same per-asset logging convention this file has used since 3.6. Not whole-pack pulls (unlike the Kenney tile/sprite packs) since each OpenGameArt submission here is already a single standalone file, not a spritesheet needing visual cross-reference.

Wiring (`sfx.ts`'s `ELEMENT_CAST_URL`, replacing the old single shared `"cast"` cue entirely; `SpellroadScene.ts`'s preload loop and `spawnCastEffect`) done by Loomwright this same session — see `loomwright/log.md`, 2026-08-07 (3).

**Downloaded with the developer's explicit go-ahead** (asked before pulling any file in, per this session's own action-category rule on downloads) — confirmed via `curl`, all 4 files landed at the exact sizes quoted above, and `npm run build`'s `dist/` output re-checked directly to confirm Vite actually copies `public/assets/third-party/opengameart-*` through to the production bundle (it does — all 4 files present at their expected paths).

**Sign-off status:** license/source compliance for the 3 clean CC0 picks (fire/ice/earth) — per this agent's own rule, still not self-certified even though each was individually re-confirmed above; the lightning stand-in's *aesthetic* fit is additionally and explicitly flagged as compromised, not just pending. **Pending human developer review**, same as every prior SFX row in this log — both the compliance formality and whether the 4 per-element casts (three real recordings, one disclosed stand-in) actually read as "each spell sounds different" in a real extended-play session, the exact complaint this ticket exists to resolve.

## 2026-08-07 — Issue #126: Deterministic Original rune/glyph + spell-VFX generator

Scoped to this agent's slice of issue #126 (part of epic #124's opening-magic audition, per `docs/superpowers/specs/2026-08-07-opening-art-music-prototypes-design.md`): the "Deterministic Original" treatment's **visual** half only — container-generated glyphs/VFX. The Composer-authored `music21` loop half of the same treatment, and the separate CC0 Remix treatment, are parallel agents' work, not touched here; assembling the Hybrid treatment is #128's job, not this one's.

Built `tools/pixel-gen/` — a checked-in `Dockerfile` + pinned `requirements.txt` + `generate_opening_magic.py` — a deterministic Pillow pixel-art generator, mirroring `content-pipeline/Dockerfile`'s pattern (`python:3.11-slim` base, pinned `requirements.txt`, script baked into the image) per ADR-0003: every generator runs in Docker, never on the host.

**Scale check before drawing anything:** `public/assets/third-party/kenney-roguelike-rpg-pack/Spritesheet/spritesheetInfo.txt` confirms this repo's production tiles are 16x16 with a 1px margin. The existing hand-authored `public/assets/spell-icons/*.png` (from backlog 2.30/issue #56, logged 2026-08-02) are 32x32 — 2x that tile scale. Every glyph and VFX frame generated here uses the same 2x pixel-scale convention (drawn natively small, upscaled with `Image.NEAREST`), so it drops into the same visual family rather than introducing a third scale.

**Showcase spell:** neither `docs/agents/_reference/opening-experience-brief.md` nor the design spec names Prototype 1's "one identical showcase spell," so this agent picked one: `flame_sweep` (`src/data/spells/spells.json` — element `fire`, shape `cone`, `default_loadout_slot: 2`, already in the default hotbar rather than a hidden spell). Fire is the one element whose existing in-engine tint (`SpellroadScene.ts`'s `ELEMENT_EFFECT_COLOR.fire = 0xff6b3d`) already equals the brief's "ember-orange" almost exactly — the new VFX reuses that tint instead of inventing a second, competing fire color.

**Generated (7 files, staged under `public/assets/prototypes/opening-magic/deterministic-original/` per ADR-0003's "candidates remain staged, none silently becomes production art" rule — not production `public/assets/`):**
- `glyphs/rune-{cyan,gold,violet,ember}.png` — 32x32 each, one per the brief's four named colors ("saturated cyan, gold, violet, and ember-orange"). Each is an outer ring plus a distinct inner mark (frost cross, lightning bolt, arcane eye, flame silhouette) so all four read apart by silhouette alone, before color is even considered, per the brief's "preserve clear silhouettes" rule.
- `vfx/cast-flame_sweep.png` — 4-frame horizontal spritesheet atlas (64x64/frame), a fading cone-wedge flash matching `SpellroadScene.ts`'s existing `spawnCastEffect` convention (fill+outline of the AoE shape, alpha fading to 0).
- `vfx/impact-flame_sweep.png` — 4-frame atlas (48x48/frame), an expanding-and-fading ring matching `spawnImpactBurst`.
- `vfx/trail-fire.png` — 4-frame atlas (64x24/frame), a traveling comet-with-tail generalizing `spawnRangedProjectile`'s dot-with-stroke convention. Kept element-scoped (not tied to `flame_sweep` specifically) so it's reusable for this element's line-shaped spells too (e.g. `magma_lance`) in the Hybrid treatment, per this ticket's "make sure your outputs are reusable" note.
- `provenance.json` — generator script path and its own sha256, the pinned Pillow version (read back from the installed `PIL.__version__` at run time, not just asserted from `requirements.txt`), Python version, the exact Docker base-image digest and built-image ID, the exact `docker run` command, and every output file's sha256 + pixel dimensions. Schema adapted from `docs/research/2026-08-07-creative-commons-art-audio.md`'s proposed provenance manifest, dropping the license/attribution fields (this is originated, not sourced, content) and keeping every reproducibility/toolchain field.

**Toolchain (exact, for reproduction):** base image `python:3.11-slim@sha256:db3ff2e1800a8581e2c48a27c3995339d47bdf046da21c7627accd3d51053a93`, `Pillow==10.4.0` pinned in `tools/pixel-gen/requirements.txt`, built and tagged `last-spellroad/pixel-gen:opening-magic-126` (image ID `sha256:0fda43a29881f0df9cf161396c40b730e7b1801aa5df9bb935d0d4ec2fcdcc5f`). Build: `docker build -t last-spellroad/pixel-gen:opening-magic-126 tools/pixel-gen`. Run:
```
docker run --rm -v "$PWD/public/assets/prototypes/opening-magic/deterministic-original":/out \
  last-spellroad/pixel-gen:opening-magic-126 --output /out \
  --docker-image-id sha256:0fda43a29881f0df9cf161396c40b730e7b1801aa5df9bb935d0d4ec2fcdcc5f \
  --command "<this exact command>"
```

**Self-verification, per this agent's standing rule that a Docker-only generator must actually be run in Docker, not merely written:**
- Ran the build and the command above for real; confirmed all 7 files land at the paths/sizes described.
- Visually inspected every PNG (nearest-neighbor-upscaled contact sheets) — the 4 glyphs render as clean, distinct pixel-art rune circles in the brief's exact 4 colors; the VFX atlases render as a fading orange cone wedge, an expanding/fading ring, and a moving dot-with-tail, all transparent-background RGBA with hard (non-anti-aliased) pixel edges — no soft-edge artifacts that would fight nearest-neighbor scaling later.
- **Determinism, proven rather than assumed:** ran the container twice more against two fresh, independently bind-mounted host directories, then `diff -rq` the two output trees and separately `shasum -a 256` every file in both — all 8 files (7 assets + `provenance.json`) hashed byte-identical across the two independent runs, and those hashes match the ones recorded in the real output's `provenance.json`. Worth disclosing: the first attempt at this check used a scratch path outside the repo that Docker Desktop's file-sharing silently failed to mount, producing two *empty* directories that trivially "matched" — caught by checking the run had actually produced files before trusting the diff, then re-run against a real bind-mounted path under the repo before treating the result as evidence.
- Did not touch any `.ts` file and did not run `docker-compose run --rm game ...` — this task's deliverable is prototype-only staging PNGs with no Phaser scene wiring yet (that Active Prototype wiring is #128's job per the design spec's ticket ordering), so the game's own typecheck/test/build gate is unaffected and out of scope here, matching this ticket's own instruction not to touch it.

**Verification-rationale (ADR-0001):** the plausible failure class behind a "deterministic generator" claim is silent non-determinism — float-rounding drift, dict/set iteration order, or PNG-encoder metadata varying run-to-run despite no visible `random` call — ruled out empirically above by diffing two independent container runs' output hashes, not by code inspection alone (code inspection can miss library-level non-determinism; a hash diff cannot). The plausible failure class behind "matches the approved direction" is a silhouette or color mismatch against the brief — addressed by the visual contact-sheet inspection above and by sourcing the palette's RGB values directly from the brief's four named colors rather than approximating them by eye.

**Sign-off status:** **shipped-and-validated** for the generator itself, its Docker toolchain, and the determinism/visual verification above. **Pending human developer review** for the same reason every prior row in this log carries that flag — aesthetic fit is never self-certified: whether these four glyphs and this one showcase spell's VFX actually read as "exciting" at real 960x540 canvas scale, alongside the CC0 terrain and the other two treatments, is a #128 prototype-scene playtest question this generator's file-existence and determinism checks cannot answer.

## 2026-08-07 (2) — Issue #126: "CC0 Remix" treatment (sourced runes/particles/ambience) + Hybrid pairing manifest

Scoped to this agent's slice of #126: the third of the three comparable resource treatments (the other two — Deterministic Original's visuals and its Composer music half — are the two entries directly above, both parallel agents' work from the same session). This entry covers **CC0 Remix** (new sourced-and-processed assets) and the **Hybrid** treatment's pairing manifest (no new assets, pure cross-reference) together, since neither needed independent verification depth to justify a separate entry.

**Developer-approved downloads (3, exactly as approved — nothing else pulled):**
1. **Kenney Rune Pack** — https://kenney.nl/assets/rune-pack
2. **Kenney Particle Pack** — https://kenney.nl/assets/particle-pack
3. **OGA "Forest Ambience"** by TinyWorlds — https://opengameart.org/content/forest-ambience

**Re-verified individually this session, per the Art Sourcing Contract's own standing rule** (a prior pass's research is never trusted wholesale) — re-fetched all 3 pages directly rather than relying on `docs/research/2026-08-07-creative-commons-art-audio.md`'s summary:
- Rune Pack: page states "Creative Commons CC0" linking `creativecommons.org/publicdomain/zero/1.0`; page's own v1.1 changelog notes "Fixed vector files."
- Particle Pack: page states "Creative Commons CC0" (same link), 80 files at 512x512.
- Forest Ambience: page shows the CC0 badge, author TinyWorlds, `Forest_Ambience.mp3` (716.7 KB), uploader's own note "It loops seamlessly and is ready to be used in your projects!" (an LD29 Ludum Dare entry).

No 4th file (OGA "2D Spell Effects" backup) was pulled — the Particle Pack alone had enough usable material (flame/circle/trace textures) once processed; not downloading it is a judgment call, flagged here rather than silently decided.

**Docker toolchain (per ADR-0003 — every download/inspect/process step below ran in a pinned container, no host `curl`/image tool touched any of this):**
New `tools/cc0-remix/` — `Dockerfile` (base `python:3.11-slim@sha256:90744cff8f32887f075c47d747a173ff333e9e98801667af93c357fa9f5e28ff`, `+ffmpeg` apt package for the audio probe, mirrors `tools/pixel-gen/Dockerfile`'s pattern), pinned `requirements.txt` (`Pillow==10.4.0`, `requests==2.32.3`), and `cc0_remix.py` (single script, 3 subcommands: `fetch`/`inspect`/`process`). Built and tagged `last-spellroad/cc0-remix:opening-magic-126`, image ID `sha256:f6be36df96b4a182c9b1098ee0dbb3de9bb003a55e74c9e98329f987c7a34d90`.

```
docker build -t last-spellroad/cc0-remix:opening-magic-126 tools/cc0-remix

docker run --rm -v "$PWD/tools/cc0-remix/.raw":/work/raw \
  last-spellroad/cc0-remix:opening-magic-126 fetch --raw-dir /work/raw

docker run --rm -v "$PWD/tools/cc0-remix/.raw":/work/raw \
  last-spellroad/cc0-remix:opening-magic-126 inspect --raw-dir /work/raw

docker run --rm -v "$PWD/tools/cc0-remix/.raw":/work/raw \
  -v "$PWD/public/assets/prototypes/opening-magic/cc0-remix":/out \
  last-spellroad/cc0-remix:opening-magic-126 process --raw-dir /work/raw --output /out \
  --docker-image-id sha256:f6be36df96b4a182c9b1098ee0dbb3de9bb003a55e74c9e98329f987c7a34d90 \
  --command "<this exact command>"
```

(`.raw/` is a git-ignored scratch download directory under `tools/cc0-remix/`, not committed — see "explicitly not done" below. A path outside the repo silently failed to bind-mount on this machine's Docker Desktop file-sharing config, same failure mode the Deterministic Original entry above disclosed for its own determinism check — worked around the same way, by using a path under the repo.)

**Archive contents actually inspected (not trusted from the landing page alone):**
- `kenney_rune-pack.zip` (1,917,678 bytes, sha256 `fbc69b70...c1b2d9`): 719 entries — `Spritesheet/` (3 pre-packed sheets: Black/Blue/Grey only), `Vector/` (7 raw vector sources), `PNG/` (670 individual rasters, **already PNG, no vector rasterization needed** — the "v1.1 fixed vector files" note on the landing page turned out to be about the separate `Vector/` folder, not a claim that PNGs are missing). `PNG/` splits into exactly 3 colors (Black/Blue/Grey — **not** the brief's cyan/gold/violet/ember) x 6 shapes (Rectangle, Rectangle-outline, Slab, Slab-outline, Tile, Tile-outline) x 36 designs = 648 files. Picked the `Tile` shape (native 50x56, most icon-like/near-square of the 6) from the `Grey` color family (best neutral base for tinting).
- `kenney_particle-pack.zip` (15,001,764 bytes, sha256 `b631d4b0...49ce5f1d8958`): 200 entries, 193 PNGs under `PNG (Transparent)/`, confirmed 512x512 native as the landing page stated. Sampled several files' actual pixel values (not just alpha) and confirmed every checked file is a grayscale alpha-mask texture (R==G==B at every sampled pixel) — i.e. built to be tinted by an engine at runtime, not pre-colored art.
- `Forest_Ambience.mp3` (716,670 bytes, sha256 `9850aa1d...621e8bed13b75`): `ffprobe` confirms MP3, 48kHz stereo, 128kbps, 44.76s — already browser-ready per the research doc's delivery guidance, no transcode needed.

**Confirmed the exact caveat the design research flagged in advance:** the Rune Pack's actual raster colors are Black/Blue/Grey — none of the brief's 4 named colors — so producing a cyan/gold/violet/ember set required a real tint pass, not a trivial pull. Built one.

**Produced, under `public/assets/prototypes/opening-magic/cc0-remix/`:**
- `glyphs/rune-{cyan,gold,violet,ember}.png` — 32x32 each (same convention as the hand-authored `public/assets/spell-icons/*.png` and Deterministic Original's glyphs). Source: 4 visually distinct designs hand-picked from the Grey/Tile family's 36 options via a contact-sheet visual pass (not the first 4 found) — an X-shaped rune (Gebo-like), a zigzag (Sowilo-like, reads as a lightning/storm mark), a hooked bracket (Perthro-like), and a bowtie/hourglass (Dagaz-like). Transform: extract from zip → recolor by lerping the palette's `edge`→`core` RGB across the source's own luminance (preserves the tile's existing bevel/shadow shading, just recolors it) → autocrop/pad-to-square → LANCZOS resize to 32x32. LANCZOS (not nearest-neighbor) was a deliberate choice: unlike Deterministic Original's native pixel art, this source is smooth vector-rasterized art, and nearest-neighbor would fabricate jagged edges never present in the source.
- `vfx/cast-flame_sweep.png`, `vfx/impact-flame_sweep.png`, `vfx/trail-fire.png` — 4-frame horizontal atlases at 64x64/48x48/64x24 per frame respectively, matching Deterministic Original's exact frame layout for direct side-by-side comparison. Built from `flame_06.png` (tall flame lick), `circle_03.png` (thin ring, highest peak alpha of the pack's 5 ring variants — checked `circle_01`'s alpha tops out at 172/255 vs `circle_03`'s 251/255, so `circle_03` was picked over the initially-assumed "thicker-looking" `circle_01`, which turned out dimmer once actually measured), and `trace_01.png` (vertical streak, rotated horizontal) respectively — all real Particle Pack textures, not synthesized shapes. Since the pack ships static stills, not animation sequences, each 4-frame "animation" is built from the *same* single source image: cast fades alpha down across 4 steps (mirrors Deterministic Original's cast ramp), impact scales the ring up across 4 steps while fading (mirrors its impact ramp), trail slides a crop window across a widened copy of the streak to fake motion (generalizes its dot-with-tail trail). Every frame is tinted toward the `ember` palette using a gamma-boosted (`v**0.55`) luminance curve before the base→core lerp — a flat luminance lerp (the same one used for the runes) read muddy/brown on these soft-glow textures, so particles get their own tint function. Ring and streak alpha are also `MaxFilter`-dilated before downscaling, since a hairline stroke at 512px native shrinks to near-invisible at this project's 48px/24px VFX frame sizes.
- `audio/forest-ambience.mp3` — byte-for-byte copy of the source (no transcode needed, already MP3/48kHz/stereo). `ffprobe` re-confirms format; a basic loop-boundary sanity check (RMS of the first/last 100ms, decoded independently via `ffmpeg`) found comparable non-zero amplitude at both edges (57.3 vs 52.9) — consistent with, but not proof of, the uploader's "loops seamlessly" claim. **Disclosed limitation:** this is an amplitude-continuity check only, not a real crossfade/seamless-loop verification — that needs actual browser playback, per the opening-experience-brief's own validation step, which is #128's job.
- `provenance.json` — `kind: "sourced"` (unlike Deterministic Original's `"originated"`), so license fields are populated, not null, per this ticket's explicit requirement: per-source title/creator/publisher/page URL/license/declared-on, the exact archive file used with sha256, every derivative's sha256+dimensions, every transform applied, and the Docker image/command that produced it.

**A real bug caught and fixed during this pass, not just a clean-run check:** the first version of the tint/compositing code used Pillow's `Image.paste(im, box, im)` idiom (passing an RGBA image as its own mask) to place a resized ring/glyph onto a transparent canvas and to assemble the 4-frame atlases. Empirically verified (via a tiny isolated repro, not just docs) that this **squares the alpha channel** when the destination is fully transparent (alpha 128 source → alpha 64 result, exactly 128²/255) — every ring/streak/glyph was silently rendering far more transparent than intended, and the *atlas-assembly* step doubled the damage by squaring again on top of each already-squared frame. Fixed by dropping the redundant mask argument (`canvas.paste(im, box)` — a plain paste onto an already-transparent destination copies raw RGBA with no blend math) at all 3 call sites. Re-ran and visually re-confirmed (zoomed contact sheets against a dark background) that all 3 VFX atlases and all 4 glyphs now render at full intended opacity before finalizing the picks/parameters above — the "circle_01 looks thicker" visual read that drove an earlier source pick was itself partly an artifact of this bug's uneven fade, corrected once the real alpha values were measured directly.

**Self-verification, same rigor as Deterministic Original's determinism check:**
- Ran `process` three independent times against three separate output directories (the real repo output plus two disposable verify dirs), then `shasum -a 256` every one of the 8 output files across all 3 runs — all matched byte-for-byte. Determinism holds despite this pipeline touching real network-fetched archives (the archives themselves are fetched once and reused from `--raw-dir`; only the deterministic PNG/audio processing step was repeated for this check).
- Visually inspected every glyph and VFX atlas at 3x zoom against a dark background (not just a mid-grey contact sheet, which had earlier hidden how transparent the pre-fix VFX actually were) — all 4 glyphs render as clean, distinct, fully-opaque tinted rune tiles in the brief's 4 colors; all 3 VFX atlases show a clear 4-step animation (fading flame lick, expanding ring, brightening streak) with no dead/invisible frames.
- `python3 -m json.tool` on both new JSON files (`cc0-remix/provenance.json`, `hybrid/hybrid-treatment.json`) confirms both parse cleanly.
- Did not touch any `.ts` file, did not run `docker-compose run --rm game ...` — same out-of-scope reasoning as the Deterministic Original entry (this is prototype-staging asset production, no Phaser wiring yet; that's #128's job).

**Honest quality/coverage flags, as the task asked for directly:**
- **Rune Pack palette fit:** confirmed the research doc's predicted caveat — Kenney's runes ship in Black/Blue/Grey only, not the brief's 4 colors, so every glyph needed a tint transform. The tint preserves the source art's own bevel shading (not a flat recolor), which reads reasonably clean at 32x32, but it is visibly a *tinted stone tile* rather than the Deterministic Original's *drawn glowing rune* — a real style difference between treatments, not a bug.
- **Particle Pack coverage:** workable but thinner than Deterministic Original's purpose-built VFX. The pack has no pre-animated sequences (everything here is a single still), so all 3 "4-frame" atlases are synthesized from one static texture each via fade/scale/slide tricks rather than genuine multi-frame source art. The tinted result reads as a softer, more pastel glow than Deterministic Original's saturated flat-color VFX — an expected texture-vs-drawn-shape difference given the source material, but real enough to flag rather than silently present as equivalent. Judged sufficient not to warrant the optional 4th download (OGA "2D Spell Effects"), but a developer/Heckler pass comparing this against Deterministic Original side-by-side may disagree.

**Hybrid treatment — no new assets, pairing manifest only, per the design spec's own framing** ("Hybrid — expected winner: CC0 stone/forest foundation plus deterministic original runes, spell effects, and Composer music"):
- New `public/assets/prototypes/opening-magic/hybrid/hybrid-treatment.json` — records, without duplicating any binary: the already-shipped production terrain (`public/assets/third-party/kenney-roguelike-rpg-pack/`, `kenney-tiny-dungeon/`, citing this same log's 2026-07-30 entry), Deterministic Original's 4 glyphs + 3 VFX atlases (citing this log's 2026-08-07 (1) entry), and Deterministic Original's `.mid`/`.ogg` music files (citing `composer/log.md`'s 2026-08-07 entry). Explicitly notes CC0 Remix's own assets are *not* part of Hybrid (a common confusion point given all 3 treatments live under the same `opening-magic/` parent) and that no engine/Phaser wiring happened this pass.

**Verification-rationale (ADR-0001):** the plausible failure class for a "sourced-and-tinted asset pipeline" claim is (1) a license misattribution — ruled out by re-verifying all 3 pages' CC0 status directly this session rather than trusting the prior research pass, and recording sha256 + exact page URLs in `provenance.json`; (2) silent non-determinism in the processing step — ruled out empirically by 3-way hash comparison across independent container runs, not by code inspection (which is exactly the class of check that failed to catch the alpha-squaring bug above until an actual pixel-level/visual check was run); (3) a transform that looks fine in a small preview but is actually broken (the real failure this session hit) — caught only because the zoomed dark-background visual check was performed *before* finalizing source picks, not skipped in favor of trusting the first render. What this verification does **not** prove, left to human review per this agent's standing rule: (1) license/compliance sign-off — never self-certified regardless of how many times re-verified; (2) whether the tinted-stone-tile rune look and the softer particle-derived VFX read as competitive against Deterministic Original and the CC0 terrain in an actual side-by-side playtest at 960x540 — a #128 prototype-scene question, not something a file-existence/hash/format check can answer; (3) the Forest Ambience loop's actual seamlessness in real playback, only amplitude-continuity-checked here.

**Sign-off status:** **pending human developer review** — both the license/compliance formality for the 3 newly-sourced packs (re-verified individually this session, never self-certified per this agent's standing rule) and the aesthetic-fit questions flagged above (tinted-stone-tile rune style, softer particle-derived VFX, unverified real-playback loop seamlessness) — same category of open question every prior row in this log carries forward to the developer, not resolved here.

## 2026-08-07 (3) — Fixing Heckler's 2026-08-07 (2) findings 3/4/5 against issue #126's three treatments

Fixes the three concrete, checkable defects Heckler's pre-#128 gate critique found against this agent's own prior output — not a re-litigation of that review, just closing the gaps it found. Did not touch anything Heckler's MAJOR/BLOCKING findings didn't name (Deterministic Original's `.ogg` loop tail, finding 1, and the CC0 Remix missing-music-role gap, finding 2, are both out of scope here — neither is this agent's slice to fix).

**Finding 4 fixed — Deterministic Original's `impact-flame_sweep.png` fading toward black instead of transparent, and it was NOT isolated to impact.** Read `tools/pixel-gen/generate_opening_magic.py`'s `_assemble_atlas` (the function that builds all 3 VFX atlases — cast, impact, trail — from their per-frame images) and found the exact anti-pattern the task asked to check for: `atlas.paste(frame, (i * frame_w, 0), frame)` — passing the RGBA frame as its own mask. Confirmed empirically (isolated repro, not just reading Pillow's docs) that this squares the alpha channel and premultiplies the RGB channels by the un-squared alpha fraction: a pixel drawn as `(255,107,61,100)` came out of `_assemble_atlas` as `(100,42,24,39)` — alpha 100→39 (`100²/255`), RGB darkened toward black in proportion to the original alpha. This is the *same* `Image.paste(im, box, im)` bug this log's 2026-08-07 (2) entry already found and fixed at 3 call sites in `tools/cc0-remix/cc0_remix.py` — confirmed by direct pixel sampling of the actual committed PNGs (not assumed from code inspection alone) that it also corrupted `cast-flame_sweep.png` and `trail-fire.png` identically (e.g. `trail-fire.png` frame 1's alpha=116 pixel read back as darkened `(172,72,41)` instead of the intended flat `(255,107,61)` base color at every alpha level) — **not isolated to impact**, so all 3 atlases needed regenerating, per this ticket's own "check, don't assume" instruction. Fixed by dropping the redundant mask argument (`atlas.paste(frame, (i * frame_w, 0))`) — destination is fully transparent and frames occupy non-overlapping slots, so a plain paste copies raw RGBA with no blend math, mirroring `cc0_remix.py`'s already-validated fix exactly. Glyphs (`glyph_cyan`/etc.) never call `_assemble_atlas` and are drawn directly by `ImageDraw` — confirmed unaffected: their sha256 hashes are byte-identical before and after this fix.

Regenerated via the existing Docker pipeline: rebuilt `last-spellroad/pixel-gen:opening-magic-126` (image ID `sha256:98f6b05b488b234da5fe86534bee221685486a7682f25a490cf444c262c89dfd`, base `python:3.11-slim@sha256:90744cff8f32887f075c47d747a173ff333e9e98801667af93c357fa9f5e28ff`) and re-ran the same `docker run` invocation logged in this log's 2026-08-07 (1) entry, writing directly back into `public/assets/prototypes/opening-magic/deterministic-original/`. Re-verified determinism the same way as the original entry: ran the container 2 more independent times against fresh bind-mounted directories, `shasum -a 256`'d all 7 output files across both runs plus the real output — all byte-identical.

**Verified by direct pixel inspection, not just re-reading the fixed code:** post-fix, `impact-flame_sweep.png`'s 4 frames now store `rgb=(255,107,61)` (the intended `ember.base` color, unchanged) at every alpha level (`235/170/100/40`) — the base color no longer drifts toward black as alpha drops. Composited both frames over a checkerboard and a near-black `(10,10,15)` background using standard straight-alpha `Image.alpha_composite` (the blend math a browser/Phaser texture actually uses): over the checkerboard, frame 3/4's composite mean (`~161,159,159`) now sits almost exactly on the checkerboard's own base tone, i.e. it reads as genuinely fading into whatever's behind it rather than holding a fixed dark color — the diagnostic signature of fading-to-transparent (background-dependent convergence) rather than fading-to-opaque-black (background-independent convergence). Before the fix, the same frames' *stored* pixel data held a squared, much-lower alpha paired with proportionally darkened RGB — objectively wrong regardless of the exact compositor used to view it, and the corrected values now match what `impact_frames()`'s own drawing code actually specifies.

**Finding 3 fixed — added `License.txt` to `public/assets/prototypes/opening-magic/cc0-remix/`.** Every other sourced-asset directory in this repo (`public/assets/third-party/*/License.txt`, 9 examples) carries this file; CC0 Remix's license *data* was already complete in `provenance.json` (Heckler's finding 3 explicitly credited that part as fine) but the human-readable, repo-convention file was missing. Added one combined `License.txt` (rather than 3 separate files, since 2 of the 3 sources are both Kenney and the third is a single OGA track — one file is enough to cover the "one entry per asset: source URL, license, author, retrieval context" logging bar without fragmenting a 3-source directory into 3 near-identical files) — one section per source pack (Kenney Rune Pack, Kenney Particle Pack, Forest Ambience), each naming the exact URL, license (CC0-1.0), author, and which output files it produced, mirroring the existing `public/assets/third-party/opengameart-fireball/License.txt`-style structured format for the OGA entry and the existing Kenney-pack-style informal format for the 2 Kenney entries. Also folded in this log's 2026-08-07 (2) MINOR finding 8 (the ID3-tag artist name "Rick Hoppmann" vs. the declared "TinyWorlds" credit) as a parenthetical note rather than silently dropping it.

**Finding 5 — CC0 Remix rune glyph saturation deficit: fixed the saturation half honestly, disclosing the silhouette half is a hard limit of this source material.**

*Saturation, fixed and re-measured:* `tools/cc0-remix/cc0_remix.py`'s `_colorize_by_luminance` lerps each source tile's luminance from `edge_rgb` to `core_rgb`. Root cause of the deficit: every `core_rgb` in `PALETTE` is a pale, near-white highlight tone (e.g. cyan's core `(200,246,255)` is only ~22% saturated on its own), and a large fraction of each source tile's luminance range sits close enough to that pale end to land in low-saturation territory — not a mixed bag, all 4 colors landed low for the same structural reason. Fixed by boosting saturation (`PIL.ImageEnhance.Color`, RGB bands only, alpha untouched) after the existing lerp rather than reshaping the lerp itself, since the lerp's own luminance-preserving bevel shading is worth keeping. Tuned the boost factor empirically against all 4 glyphs together (violet was the tightest constraint) and landed on **2.2x**. Re-measured average per-pixel HSV saturation (same method as Heckler's own audit — mean saturation over every pixel with alpha > 10, excluding transparent background):

| Glyph | Before | After | Deterministic Original (reference) |
| --- | --- | --- | --- |
| cyan | 32.0% | 60.6% | 61.2% |
| gold | 37.5% | 73.6% | 80.0% |
| violet | 34.9% | 57.6% | 58.0% |
| ember | 53.7% | 90.7% | 78.6% |

All 4 now clear the 55%+ target and sit in or above Deterministic Original's own 55–80% range (ember overshoots it, cyan/violet land almost exactly on it, gold sits between the two). Regenerated via the existing Docker pipeline: rebuilt `last-spellroad/cc0-remix:opening-magic-126` (image ID `sha256:6a9f8ead2ce6049666de19ffbd7eea6f8317c5b1d33dfaa3604dd26181dce988`), re-ran `fetch` against the same 3 approved URLs (all 3 re-downloaded files' sha256 matched the original `fetch-report.json` exactly — same source bytes, nothing re-sourced), then re-ran `process`. Only the 4 glyph PNGs and `provenance.json` changed (confirmed via `git diff --stat`); `vfx/*.png` and `audio/forest-ambience.mp3` are untouched, since the saturation boost only touches `_colorize_by_luminance` (runes), not `_colorize_particle` (VFX). Re-verified determinism: ran `process` 2 more independent times against fresh output directories, `shasum -a 256`'d all 8 files across both runs plus the real output — all byte-identical.

*Silhouette, disclosed honestly rather than forced:* checked whether the shared-silhouette half of finding 5 is fixable within this treatment's own approach (tinting existing Kenney tile PNGs) — it is not, and no amount of tint/saturation tuning changes that. Directly measured each glyph's alpha channel: all 4 have an identical bounding box (`(0,0,32,32)`) and an identical opaque-pixel count (**956**, exactly, both before and after the saturation fix) — the outer silhouette is pixel-for-pixel identical across all 4 colors, because the Kenney rune tile's alpha channel *is* the rounded-square tile boundary; the distinguishing rune mark is an in-bounds luminance/color engraving, not a transparency cutout, so no color-space transform (tint, saturation, gamma, anything operating on RGB) can touch the alpha-defined outer shape. Differentiating the outer silhouette for real would require either picking source tiles whose *cutout* shape differs (Kenney's Rune Pack ships this tile family as one uniform tile shape across all 36 designs, confirmed by re-checking the archive contents logged in this log's 2026-08-07 (2) entry) or hand-authoring new shapes per the Art Sourcing Contract's step 4 — both out of scope for a same-day fix-the-Heckler-findings pass. Saying so plainly rather than presenting the saturation fix as if it also solved silhouette distinguishability, which it does not and structurally cannot.

**Self-verification, same rigor as the original entries:** did not touch `cast-flame_sweep.png`/`trail-fire.png`'s *content* speculatively — confirmed via direct pixel sampling that the same bug affected them before regenerating, rather than assuming isolation or assuming universality. Did not touch any `.ts` file, did not run `docker-compose run --rm game ...` — same out-of-scope reasoning as every prior entry in this log (prototype-staging asset production only, no Phaser wiring). Updated both `provenance.json` files in place via the real Docker pipeline runs (not hand-edited) — `deterministic-original/provenance.json`'s `generatedFiles` now records the 3 new VFX sha256s (glyph hashes unchanged); `cc0-remix/provenance.json`'s `derivatives`/`transforms` now record the 4 new glyph sha256s and the added saturation-boost transform step (VFX/audio entries unchanged).

**Sign-off status:** **shipped-and-validated** for all 3 fixes at the pixel-data/determinism/hash level (the standard this log's file-existence and determinism checks can actually certify). **Pending human developer/Heckler re-review** for the same reason every prior row here carries that flag — whether the corrected impact VFX now reads as intended against real Level 1 terrain, and whether the boosted rune saturation now reads as "exciting" rather than over-saturated at real 960x540 canvas scale, are aesthetic-fit questions a re-critique or a #128 playtest answers, not this pass's pixel/hash checks.
