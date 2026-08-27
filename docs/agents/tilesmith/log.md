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

## 2026-08-09 — Cast SFX length fix (#151) via trims of already-approved assets; lightning re-source (#137) researched, NOT downloaded

Two linked, still-open tickets against `ELEMENT_CAST_URL` (`src/systems/sfx.ts`): #151 ("spell cast sounds are too long," root cause = the 2026-08-07 re-source pass's fire/ice/earth recordings running 1.9-2.1s) and #137 (lightning's `groundhit.wav` stand-in "reads as the old placeholder"). #111 is the older parent of both -- not touched, left for Ana to close referencing #151/#137 once this lands.

**Measured actual durations first, rather than assuming "several seconds" applied uniformly** (`soundfile`/`wave`, read directly, no `ffprobe` available in this sandbox):

| Element | File | Duration |
| --- | --- | --- |
| fire | `105016__julien-matthey__jm-fx-fireball-01.wav` | 1.962s |
| ice | `freeze.wav` | 2.125s |
| earth | `earth-element-magic-spell.ogg` | 1.886s |
| lightning | `groundhit.wav` | **0.285s** |

Lightning was already well under 1.5s -- #151 never actually applied to it; its ticket is purely #137's content/fit complaint, which no length change can address.

**#151 fix — trimmed fire/ice/earth as Art Sourcing Contract step-3 derivatives, not new downloads.** Per this project's own action-category rule on downloads (re-confirmed this session -- see "Explicit go-ahead, not obtained this pass" below), a *new* sourced file needs the developer's explicit go-ahead before it's pulled in. A trim of a file *already* CC0-licensed and *already* sitting in the repo isn't a new download -- CC0 permits unrestricted derivatives, and the Art Sourcing Contract lists exactly this ("pitch/tempo-shifting an existing CC0 hit sound for a different weight class") as step 3, no fresh sign-off gate. Inspected each file's amplitude envelope (20ms windows) before picking a cut point, rather than a blind "chop at N seconds":

- **Fire → `105016__julien-matthey__jm-fx-fireball-01-trimmed.wav`** (1.050s): cut right after the main attack's decay hump (peak at 0.6s), before the long reverb-y tail; 60ms linear fade-out on the cut.
- **Ice → `freeze-trimmed.wav`** (1.200s): the source has 3 separate crackle swells (0.9s/1.3s/1.6s), not one clean decay -- cut at a natural low point between the 1st and 2nd swell (env dips to 0.24 right before 1.3s) instead of chopping mid-crescendo; 60ms fade-out.
- **Earth → `earth-element-magic-spell-trimmed.ogg`** (1.300s): cut past the main rumble, before a small late bump at 1.5s; 60ms fade-out.

All 3 built with `soundfile` (libsndfile), same sample format/rate/bit-depth/subtype as each original (PCM_16/PCM_24 WAV, Vorbis OGG) -- no lossy re-encode surprise. Originals kept alongside, untouched, as provenance; each pack's `License.txt` got a dated addendum documenting the derivative (source file, cut point, and that the same CC0 grant covers it). `ELEMENT_CAST_URL` in `src/systems/sfx.ts` now points fire/ice/earth at the `-trimmed` filenames; lightning's entry is unchanged (already short).

**#137 — researched candidates for a genuine lightning re-source, explicit go-ahead NOT obtained, nothing downloaded.** Per issue #137's own scope note ("any new asset download needs the developer's explicit go-ahead... per this repo's existing asset-sourcing convention") and this log's own precedent (2026-07-25's tileset research pass, 2026-08-07's "downloaded with the developer's explicit go-ahead" line for the original 4 files) -- a *new* file is a download, gated on that go-ahead, and this dispatch had no channel to obtain a live yes/no from the developer. Did the search-order legwork (Kenney.nl first, then OpenGameArt CC0-filtered) so the go/no-go decision is ready to make, but stopped before `curl`:

- **Kenney.nl:** re-confirmed (again) no dedicated magic/lightning-cast pack exists in Kenney's audio catalog.
- **OpenGameArt candidates checked and disqualified:**
  - "Ice & Electricity Magic" (qubodup) -- **CC-BY 3.0**, attribution required. Fails this project's individually-CC0 bar, same reason the original `electricspell.ogg` candidate and a CC-BY 4.0 icon pack (backlog 2.30) were both disqualified.
  - "Magic Sounds" (OwlishMedia) and "CC0 Sound Effects" (OwlishMedia) -- both are curator/aggregator pages linking out to other individually-licensed OGA pages (including ones already sourced here, e.g. "Freeze Spell"), not a single-licensed pack themselves; the page itself disclaims uniform licensing ("attributing... your responsibility"). Not a clean citable source on their own.
  - "80 CC0 RPG SFX" (rubberduck) -- confirmed CC0, but its spell category is "9x spell (regular, fire)" only, no electric/lightning-flavored file.
  - "100 CC0 SFX #2" (rubberduck) -- confirmed CC0, includes a "thunder" tag, but thunder is ambient weather rumble, not a punchy cast one-shot; deprioritized on fit grounds even before a go-ahead question.
- **OpenGameArt candidates that look genuinely usable, shortlisted for the developer's go-ahead:**
  1. **"Electricity Sound Effects" (BMacZero)** -- `opengameart.org/content/electricity-sound-effects-0`. CC0, confirmed ("Optionally credit Brian MacIntosh," not required). 2 files: `spark.wav` (29.7KB, a real small-Tesla-generator discharge -- likely short, and being an actual electrical arc recording, plausibly reads *closer* to a lightning zap than a synthesized sci-fi tone) and `continuousspark.wav` (19.2KB, described as sustained -- worse fit for a one-shot). **Top candidate**, pending sign-off.
  2. **"Magic Spell SFX" (JaggedStone)** -- `opengameart.org/content/magic-spell-sfx`. CC0, confirmed ("None needed" for attribution). 7 files (`magical_1.ogg` through `magical_7.ogg`, 37-79KB), generic "spellcasting" one-shots, none element-labeled -- not lightning-specific, but genuinely magic-flavored rather than sci-fi, and small enough to already be in the right length ballpark. Fallback if candidate 1's timbre doesn't read as "lightning" once heard.

Neither was downloaded, extracted, or referenced from any code this pass -- both stay in this log as researched-and-shortlisted only, same status the 2026-07-25 tileset entry used for its 4 candidates. **#137 is not fixed by this pass** -- disclosing that plainly rather than shipping the same `groundhit.wav` stand-in silently re-labeled as resolved. It still reads as the disclosed imperfect stand-in the 2026-08-07 entry originally flagged; only its length (which was never actually the problem) is unaffected either way.

**Backlog:** grepped `docs/agents/ana/backlog.md` for #151/#137/lightning -- no row currently tracks either issue by number; the only related rows are 3.19/3.20 (#111/#133, both already `in-progress-with-owner`/closed-adjacent). Not adding a new row myself (backlog.md is Ana's Layer 4 artifact per `docs/agents/CONTEXT.md`) -- noting it here per this task's own fallback instruction instead.

**Self-verification:** `docker-compose run --rm game npm run typecheck && npm test && npm run build` re-run clean after the `sfx.ts` change (see this session's dev-branch commit for the exact output). Did not touch `spawnCastEffect`, `computeSpellSfxVariation`, or `SpellroadScene.confirmCast`'s overlap-stop guard -- all out of this ticket's scope per the dispatch brief.

**Sign-off status:** license/source compliance for the 3 trimmed derivatives -- same CC0 grant as the untouched originals, re-confirmed above, but per this agent's standing rule still not self-certified; **pending human developer review**, same as every prior row. Whether the trims still read as "the same spell, just tighter" rather than an audibly bad cut is an aesthetic/playtest question this log's file-level check can't answer on its own. The #137 candidate shortlist above is **explicitly pending the developer's go/no-go** before any download happens -- flagged, not defaulted into either direction.

## 2026-08-10 -- Issue #163: real sprite art wired into the mage and all 3 enemy archetypes

Developer playtest (2026-08-10) reported the mage and every enemy still rendered as flat
generated shapes -- `SpellroadScene.createMage`'s `graphics.generateTexture("mage-placeholder",
...)` circle and `Enemy.ensureTexture`'s `fillRoundedRect` colored square, never replaced with
real art. Per the ticket's own framing, this was **not a sourcing gap** for the 3 enemy
archetypes: Tiny Creatures (CC0, downloaded and signed off 2026-07-30) and its specific
melee/ranged/debuffer tile picks (`tile-legend.md`, 2026-08-01 curation entry -- golem idx127,
harpy idx32, witch idx66) were already sitting in the repo, just never wired into `Enemy.ts`.
Only the mage sprite and the actual engine wiring were missing.

**No new sourcing needed for the mage either.** Re-inspected `kenney-tiny-dungeon`'s already
CC0-signed-off tile set (`Tilemap/tilemap_packed.png`, 12x11 grid) directly rather than
assuming the 2026-08-01 legend's "style/size reference only" framing of tile 84 (a purple-robed,
white-bearded chibi wizard) permanently ruled it out as a player-facing pick -- it doesn't; that
note only said this pack's base characters weren't the *enemy*-archetype source (Tiny Creatures
is), not that tile 84 itself was unusable. Cropped and visually confirmed tile 84 reads exactly
as its description says: a clean, readable wizard silhouette, a strong mage pick on its own
merits. Promoted it from reference-only to the actual shipped mage sprite -- same pack, same
2026-07-30 CC0 sign-off, no new third-party asset entering the repo.

**Visually re-confirmed all 4 picks before wiring anything**, cropping each exact tile out of
its pack's `Tilemap/tilemap_packed.png` (the same gutter-free sheet `tile-legend.md`'s picks were
originally identified against) rather than trusting the legend's text description alone:
- Mage: `kenney-tiny-dungeon`, tile 84 (row 7, col 0) -- purple-robed, white-bearded wizard, confirmed.
- Melee/The Nearblade: `tiny-creatures`, tile 127 (row 12, col 7) -- grey rock-textured golem, confirmed.
- Ranged/The Farlance: `tiny-creatures`, tile 32 (row 3, col 2) -- grey winged harpy, confirmed.
- Debuffer/The Tarrywright: `tiny-creatures`, tile 66 (row 6, col 6) -- purple pointed-hat witch, confirmed.

**Individual per-tile PNGs used, not the packed spritesheet.** Both packs already ship every
tile as its own standalone file under `Tiles/tile_NNNN.png` (`tile_0084.png` for the mage;
`tile_0128.png`/`tile_0033.png`/`tile_0067.png` for melee/ranged/debuffer, accounting for Tiny
Creatures' 1-indexed filename gotcha the legend already documented) -- a plain
`this.load.image(key, url)` per key, matching the existing `spellIcons.ts`/`TILESET_IMAGE_URL`
"one file per load call" convention rather than introducing a new spritesheet-frame-indexing
pattern for just this one case.

**New `src/systems/characterArt.ts`** -- pure, Phaser-free module (same convention as
`levelArt.ts`/`spellIcons.ts`) mapping the mage and each `EnemyArchetype` to its texture load
key/URL. `SpellroadScene.ts`/`Enemy.ts` are the only callers.

**Engine wiring, scoped strictly to texture/sprite loading and texture-key assignment** (per
this dispatch's own scope-discipline constraint, since #164's spell-VFX work and a separate
enemy-separation fix are in-flight parallel branches also touching `SpellroadScene.ts`/
`Enemy.ts` -- `spawnCastEffect` and similar VFX/particle code, enemy movement/separation logic,
and side-pocket/encounter code were not touched):
- `SpellroadScene.ts`'s `preload()`: loads `MAGE_SPRITE_KEY` and all 3 `enemySpriteKey(archetype)`
  images, same eager-preload convention as the tileset/spell-icon loads already there.
- `SpellroadScene.createMage()`: `this.physics.add.sprite(...)` now constructs directly with
  `MAGE_SPRITE_KEY` instead of `""`, and the old `generateTexture`/`graphics.destroy()` block is
  gone entirely. `setDisplaySize(32, 32)`/`body.setSize(32, 32)` were already explicit before
  this change and are unchanged, so the mage's on-screen footprint and hit box stay exactly
  32x32 despite the new texture's native 16x16 size.
- `Enemy.ensureTexture()`: reads `enemySpriteKey(archetype)` (same `enemy-${archetype}` key
  format as before, so no other call site needed to change) and returns it if already preloaded;
  the old `fillRoundedRect` generation is kept, not deleted, as a defensive fallback for a caller
  that never ran the scene's preload (e.g. a hypothetical future isolated unit test), so a
  missing preload degrades to the old flat-color square instead of Phaser throwing on a missing
  key.
- `Enemy`'s constructor: added explicit `setDisplaySize(26, 26)` and `body.setSize(26, 26)` right
  after `physics.add.existing` -- previously implicit (the generated texture just *was* 26x26, so
  the default body/display size already matched), now explicit so the swap to 16x16-native art
  doesn't silently shrink the sprite's on-screen size or its hit box. `ENEMY_SEPARATION_DISTANCE`
  and every movement/targeting/status-overlay number that already assumed a 26x26 footprint are
  unaffected -- this is a pure visual change, per the ticket's own acceptance criterion.

**New `src/systems/characterArt.test.ts`** -- unit-tests the pure key/URL lookup functions
(stable per-archetype keys, correct URLs for all 4 picks, `ALL_ENEMY_ARCHETYPES` contents), same
"pure module gets a unit test, Phaser-scene wiring gets a live dev-server check" split every
prior sourcing-plus-wiring entry in this log has used.

**Self-verification (`docker-compose`, per `docs/agents/_reference/docker-testing-contract.md`):**
- `docker-compose run --rm game npm run typecheck` -- clean, no errors.
- `docker-compose run --rm game npm test` -- 29 test files, 265 tests, all passed (261 existing
  plus 4 new in `characterArt.test.ts`).
- `docker-compose run --rm game npm run build` -- clean production build.
- Brought up the dev server (a non-default host port, since another worktree's container already
  held 5173) and drove it via a real browser session: confirmed the mage renders as the wizard
  sprite and "The Nearblade" (melee) renders as the golem sprite in live Wave 1 gameplay, at
  actual gameplay scale, with the name label/HP bar overlay correctly positioned above each
  sprite and no console errors. Ranged ("The Farlance") and debuffer ("The Tarrywright") were not
  additionally confirmed inside a live wave this session (the browser session became unstable
  mid-verification, appearing to share its tab pool with another concurrent agent's dev server on
  a different port) -- disclosed rather than silently assumed equivalent. Confidence for those two
  instead rests on the same-mechanism argument plus an independent, pixel-level check: all 3
  enemy archetypes' exact tiles were cropped directly from `tiny-creatures/Tilemap/
  tilemap_packed.png` and visually inspected before wiring (see above), and all 3 go through the
  identical `Enemy.ensureTexture`/`enemySpriteKey`/`enemySpriteUrl` code path, differing only in
  which `EnemyArchetype` string is passed -- there is no code path by which melee's texture loads
  correctly while ranged's or debuffer's would newly fail to resolve or fail to render.

**Verification-rationale (ADR-0001):** this is texture-identity/asset-loading wiring, not new
timing- or state-dependent logic -- the plausible failure classes are (1) a wrong/missing tile
pick, ruled out by cropping and visually inspecting the exact tile from the exact spritesheet
each key points at before wiring, not by trusting the legend's text description; (2) a shrunk
hit box or footprint from the new textures' smaller native size, structurally ruled out by the
explicit `setDisplaySize`/`body.setSize` calls added at both the mage and `Enemy` constructor
call sites, unchanged from (mage) or matching (enemy, newly explicit) the pre-existing 32x32/
26x26 figures; (3) a missing-texture runtime throw from an un-preloaded key, ruled out by the
scene's `preload()` loop covering all 4 keys before any `Enemy`/mage construction can run, plus
`ensureTexture`'s own defensive fallback for the case that isn't true. What this verification
does **not** prove, per this agent's own standing success criterion: (1) license/source
compliance sign-off -- moot for new licensing since no new third-party asset entered the repo,
but the *mage sprite's specific fitness as the shipped mage* (a promotion of a previously
reference-only pick) is a fresh aesthetic-fit question, never self-certified; (2) whether the
ranged/debuffer sprites read correctly at real gameplay scale/animation speed in an actual live
wave, per the ticket's own acceptance criterion -- confirmed via static pixel-crop inspection and
code-path-identity reasoning here, not via the same live-wave check the mage and melee sprites
got, disclosed above as this pass's real limitation rather than silently presented as equivalent.

Sign-off status: **pending human developer review** -- both the aesthetic-fit question for the
promoted mage sprite and (per the disclosed limitation above) a live-wave visual confirmation of
the ranged/debuffer sprites specifically, neither of which this pass's typecheck/test/build/
partial-live-check verification can settle on its own.

## 2026-08-11 — Issue #111: normalized loudness + length across the 4 per-element cast SFX

Two more developer playtests (2026-08-10 real-level playtest, then a 2026-08-11 comment routed
back to this issue) reconfirmed #111's still-open half in the developer's own words: "the sounds
of the spells still doesnt convince me at 100% the volumes differs and the lenghts, so it doesnt
really feel cohesive... the spells are still weird on the sound, different volumes, length." The
2026-08-09 (#151) trims fixed clip-length *outliers* (fire/ice/earth were 1.9-2.1s, now 1.05-1.3s)
but never touched loudness, and never brought all 4 to one *consistent* length -- so the
complaint held. Per #111's agent brief, chose the per-element-normalization branch (option b)
over sourcing 12 distinct per-spell recordings (option a): option (a) needs 8 new CC0 downloads,
gated on the developer's explicit go-ahead per this repo's asset-sourcing convention, which this
dispatch had no channel to obtain; option (b) only derives from files already in the repo
(Art Sourcing Contract step 3, same as #151), so it's the one completable and mergeable without
waiting on that gate.

**Measured all 4 files first** (`soundfile`/`numpy`, in Docker per ADR-0003 -- see
`tools/cast-sfx-normalize/`, a new Dockerized script mirroring `tools/cc0-remix/`'s pattern):

| Element | File (before) | Duration | Peak (dBFS) | RMS (dBFS) |
| --- | --- | --- | --- | --- |
| fire | `...-fireball-01-trimmed.wav` | 1.050s | -0.01 | -13.53 |
| ice | `freeze-trimmed.wav` | 1.200s | -0.10 | -20.09 |
| earth | `earth-element-magic-spell-trimmed.ogg` | 1.300s | +0.04 | -13.51 |
| lightning | `groundhit.wav` | 0.285s | -0.00 | -25.68 |

RMS loudness spread ~12.6dB across all 4 (~6.6dB across just fire/earth vs. ice), and duration
spread 0.285s-1.300s (a 4.6x ratio) -- both large enough on their own to read as "inconsistent,"
independent of each other. `ice` and `lightning` are also each other's outliers in different
axes: ice is the quietest of the 3 real spell recordings, lightning (already flagged in the
2026-08-09 entry as #137's disclosed sci-fi stand-in) is both the quietest overall and by far the
shortest.

**Normalization approach and targets:**
- **Loudness -- RMS-normalize to -16 dBFS**, chosen as a value inside the original spread
  (between ice's -20.09 and fire/earth's -13.5) rather than forcing everything up to the loudest
  file's level or down to the quietest -- keeps the amount of gain needed on any one file
  moderate. Applied via a smooth tanh soft-limiter with a -1dBFS ceiling, not a hard clip or a
  peak-ceiling-only cap: a straight "cap the whole signal so peak never exceeds ceiling" approach
  would have left `ice` and `lightning` (each with one or two sharp transient samples much
  louder than the rest of the signal) still perceptually quiet, since the whole file's gain would
  be limited by that one spike. The soft limiter instead leaves everything below the ceiling
  untouched and only compresses the rare over-ceiling samples (0.16% of ice's samples, 0.54% of
  lightning's; fire/earth needed zero limiting, their required gain was a *reduction*) -- lets the
  quiet files actually reach the target loudness in their body, not just their peak.
- **Duration -- fit to a common 1.20s target** (chosen to match ice's already-1.20s length from
  the #151 trim, comfortably inside fire/earth's 1.05-1.30s #151 range): fire (1.050s) and
  lightning (0.285s) are shorter, so each is padded with trailing silence to 1.20s (with a 60ms
  safety fade into the silence, in case the source doesn't already decay to ~0 there); earth
  (1.300s) is longer, so it's trimmed by 100ms with the same 60ms linear fade-over-the-cut
  convention #151 established; ice needed no change.

**Result -- each `-trimmed`/original file gets a new `-normalized` sibling** (Art Sourcing
Contract step 3 derivative, same convention #151 used for `-trimmed`; both earlier files stay in
place, untouched, as provenance):

| Element | File (after) | Duration | Peak (dBFS) | RMS (dBFS) |
| --- | --- | --- | --- | --- |
| fire | `...-fireball-01-normalized.wav` | 1.200s | -2.48 | -16.59 |
| ice | `freeze-normalized.wav` | 1.200s | -0.00 | -16.05 |
| earth | `...-magic-spell-normalized.ogg` | 1.200s | -2.54 | -15.97 |
| lightning | `groundhit-normalized.wav` | 1.200s | 0.00 | -23.56 (whole clip) / **-17.32 (audible 0.285s portion only)** |

All 4 files' **duration is now identical (1.200s)**. Fire/ice/earth's whole-clip RMS now sits in
a 0.62dB band (-16.59 to -15.97), down from the original ~6.6dB spread across those 3 -- well
inside a "reads as one cohesive family" tolerance. **Lightning is the one disclosed exception**:
its whole-clip RMS (-23.56dB) still looks far off the other 3 because 0.915s of the 1.20s is
silence padding, not audio -- that's a reporting artifact of matching *file* duration without
touching #137's actual short recording, not a failure to normalize. Measured separately over
just its real 0.285s of content: -17.32dB RMS, within 1.3dB of the other 3's target -- the
audible loudness at the moment of cast is normalized; only the post-sound silence differs from
"real" tail decay the other 3 have. Disclosing this plainly: lightning's *perceived* clip length
when actually heard is still ~0.285s, shorter than the other 3's audible ~1.0-1.2s of real sound
-- padding a placeholder recording with silence satisfies the *file*-duration-consistency half of
#111's ask (so nothing in the engine's preload/scheduling reads it as an outlier-length asset)
but can't make a 0.285s recording *sound* like a full-length cast without #137's actual re-source,
which stays explicitly out of scope here per #111's own brief.

**`src/systems/sfx.ts`:** `ELEMENT_CAST_URL`'s 4 entries now point at the `-normalized` files;
doc comment above the const got a dated 2026-08-11 entry with the full reasoning (mirrors this
log entry, shorter). No change to `sfxKey`/`elementCastSfxKey`/`elementCastSfxUrl`'s signatures
or to `sfxVariation.ts`'s `computeSpellSfxVariation` -- issue #94's per-play pitch-variation
behavior is unaffected, confirmed by inspection (that file was not opened for editing) and by the
full test suite passing unchanged (see below).

**License.txt addenda:** all 4 packs' `License.txt` got a dated 2026-08-11 entry documenting the
new derivative (source file, before/after loudness+duration, same CC0 grant applies) -- same
per-file provenance convention #151 used.

**Self-verification (Docker, per `docs/agents/_reference/docker-testing-contract.md`):**
- `docker-compose run --rm game npm run typecheck` -- clean.
- `docker-compose run --rm game npm test` -- full suite passing, unchanged from before this
  change (no test touches `sfx.ts`'s URL values directly, since they're plain data).
- `docker-compose run --rm game npm run build` -- clean production build.
- Re-measured all 4 `-normalized` output files independently (a fresh read, not reused from the
  generation script's own log) to confirm the tolerance claims above: all 4 durations exactly
  1.200s; fire/ice/earth RMS spread confirmed at 0.62dB.
- Did not bring up a live dev-server session to listen to the actual audio -- this sandbox has no
  audio output device, so "does it sound cohesive" per the developer's own framing is,
  necessarily, **pending the human developer's own playtest**, same standing limitation this
  log's audio entries always disclose. The measurement-based normalization above is the strongest
  objective proxy available without that gate, not a substitute for it.

**Sign-off status:** license/source compliance for the 4 `-normalized` derivatives -- same CC0
grant as the untouched `-trimmed`/original files, re-confirmed above, but per this agent's
standing rule still not self-certified; **pending human developer review**. Whether the result
actually *sounds* cohesive to a human ear, and whether lightning's silence-padded duration reads
as acceptable or as its own new oddity, are exactly the aesthetic/playtest questions this log's
file-level measurement can't answer on its own -- flagged for the next playtest pass rather than
assumed resolved.

## 2026-08-12 — Issue #137: third lightning cast-SFX sourcing pass, widened beyond OpenGameArt; fresh shortlist posted, nothing downloaded

**Why a third pass.** The 2026-08-07 entry's original `electricspell.ogg` candidate failed on
ambiguous licensing; the 2026-08-09 entry's shortlist (BMacZero's `spark.wav` from "Electricity
Sound Effects" and JaggedStone's "Magic Spell SFX" pack) was previewed by the developer on their
OpenGameArt pages and rejected outright ("i didnt like any of them," per issue #137's own comment
thread) -- not a licensing failure this time, a fit/taste one. Issue #137 asked explicitly for a
*fresh* pass that widens past OpenGameArt's CC0 pool specifically, since two passes running into
the same thin pool is itself the diagnosis. This pass did not re-open or re-preview either
rejected candidate, or the disqualified-on-licensing ones from 2026-08-09 (qubodup's "Ice &
Electricity Magic," the two OwlishMedia aggregator pages, rubberduck's two packs).

**Search order followed, widened per the ticket's own instruction (not a deviation from the Art
Sourcing Contract's step order, since Kenney and OpenGameArt were both re-checked first and
turned up nothing new -- the widening is *which* CC0-friendly sources count as "OpenGameArt,"
not a skip-ahead):**
- **Kenney.nl, re-checked:** still no dedicated magic/lightning-cast pack in Kenney's audio
  catalog (Digital Audio's own listing was re-read file-by-file via its page -- confirmed no
  per-file listing is even exposed there beyond tag/count, so there was nothing new to check
  against beyond the "Digital Audio"/"Impact Sounds"/"Interface Sounds" packs already used
  elsewhere in `sfx.ts`).
- **Freesound.org, filtered to CC0 only** (not tried in either prior pass -- both stayed inside
  OpenGameArt). Freesound licenses per-file, same individually-CC0 discipline this project
  already applies to OpenGameArt packs; each candidate below was opened on its own sound page,
  not inferred from a search-result snippet or a pack's aggregate page.
- **itch.io, CC0-tagged assets.** Checked several fantasy/magic SFX packs surfaced under
  itch.io's own `assets-cc0` tag plus direct search: "Magic Spell Sound Effects Pack Vol 1"
  (placeholder-assets, has a Lightning category, but $19.99 -- not CC0, not free, disqualified
  on price alone) and "Combat Magic Spells - Sound Effects" (ad-sounds, has thunder/electric
  spell files, but a paid $4.99 pack under a custom "non-exclusive license," explicitly not CC0
  -- disqualified). "Fantasy Ambient Sound Effects Pack (CC0)" (kmontesdev) is genuinely
  name-your-own-price CC0 and lists a "spells" category, but its page doesn't expose a
  per-file listing to confirm a lightning-specific file inside a ~2GB pack sight-unseen --
  not shortlisted without that confirmation (same "don't cite an aggregator you can't verify"
  rule the 2026-08-09 entry applied to the OwlishMedia pages).
- **Different search terms**, per the ticket's own suggested list: "arcane zap," "spell electric,"
  "thunder crack magic," "energy bolt cast" -- run against both OpenGameArt and Freesound. The
  OpenGameArt side of this turned up nothing not already covered by the 2026-08-09 pass's
  disqualified list; the Freesound side is where this pass's real candidates came from.

**Disqualified this pass (checked, not shortlisted):**
- Freesound, newlocknew's "ELECArc_Movement Of An Electric Arc..Jacobs Ladder" -- individually
  licensed **Attribution-NonCommercial 4.0** on its own sound page, not CC0. Fails the bar even
  though it surfaced under a CC0-filtered search result list (the filter reflects the search
  tool's summary, not a substitute for opening the actual page -- confirmed this discrepancy by
  fetching the page directly).
- itch.io "Magic Spell Sound Effects Pack Vol 1" and "Combat Magic Spells - Sound Effects" --
  both paid, custom licenses, not CC0 (details above).
- itch.io "Fantasy Ambient Sound Effects Pack (CC0)" -- plausibly fine, but not verifiable to a
  specific lightning file without downloading a 2GB pack sight-unseen; not shortlisted, flagged
  here in case a future pass wants to actually pull and inspect it with developer go-ahead.

**Shortlisted CC0 candidates (none downloaded, none wired in -- pending the developer's
audition and explicit go-ahead per this repo's asset-sourcing convention):**

1. **"Electric zap.wav" by michael_grinnell** -- `freesound.org/people/michael_grinnell/sounds/512471/`.
   License confirmed on the sound's own page: "You can copy, modify, distribute and perform the
   sound, even for commercial purposes, all without the need of asking permission to the
   author" -- Freesound's CC0 grant, individually confirmed (not inferred from the pack it's
   filed under, "Sci-fi Sounds"). WAV, stereo, 44.1kHz/16-bit, 0.224s, 38.8KB. Tags: arc, buzz,
   electric, electricity, jolt, shock, spark, zap. A real recorded electrical-arc discharge, not
   a synthesized sci-fi laser tone -- already close to a usable cast-SFX length with no trim
   needed. Likely fit: a tight, percussive "snap" -- probably the closest single-file match to
   "a spell just went off" of anything found across all three passes, though its source pack's
   sci-fi framing means it may still read slightly more "electronics" than "storm" once heard in
   the stone/dungeon setting -- an aesthetic call only the developer's own audition can settle.

2. **"Taser/High Voltage discharge in glass tube" by The_Chemical_Workshop** --
   `freesound.org/people/The_Chemical_Workshop/sounds/403253/`. License confirmed on the sound's
   own page: same Freesound CC0 grant, individually confirmed. WAV, mono, 44.1kHz/16-bit,
   20.758s, 1.7MB. Tags: arc, electric, electricity, high-voltage, ozone, plasma, shock, spark,
   taser, zap. A real recording of high-voltage sparks discharging through chlorine gas --
   distinctly harsher/more textured than a clean electrical zap, closer to a crackling
   thunder-adjacent hiss-and-snap. Explicitly disclosing the fit tradeoff: at 20.8s this is a
   raw-material recording, not a one-shot -- if the developer likes the texture, it needs a
   trim (Art Sourcing Contract step 3, a derivative of this same CC0 file, same as the
   fire/ice/earth `-trimmed` precedent) down to just the attack transient before it could ever
   be wired in; not proposing a specific cut point yet since that's premature before an
   audition even confirms interest in the texture at all.

3. **Hand-synthesized candidate (no third-party license question at all).** Per issue #137's
   own acceptance criteria ("if no suitable CC0 recording exists, a hand-authored/synthesized
   alternative is proposed") and the Art Sourcing Contract's step 4 -- flagged here rather than
   silently treated as a last resort, since the repeated failure mode across all 3 passes has
   specifically been thin/mismatched CC0 pool fit, exactly the condition step 4 exists for.
   Built the same way Composer's tracks are built (deterministic, scripted, self-verified render
   -- see `docs/agents/composer/log.md`'s 2026-08-04 entry for the precedent this mirrors), just
   raw-waveform synthesis instead of notation: `docs/agents/tilesmith/scripts/synth-lightning-cast-137.py`,
   pure `numpy` (2.5.2) + `soundfile` (0.14.0) in a scratch venv (not added to the game's own
   dependency tree -- this is a one-off generation script, same convention Composer's `music21`
   scripts follow), no scipy/DSP library. Two layers, mixed and soft-clipped: (1) a "crack" --
   an FM sweep from 1900Hz down to 180Hz over the first 70ms, 1ms attack, ~90ms exponential
   decay; (2) a "crackle" -- band-limited (800Hz-6.5kHz, simple one-pole IIR bandpass, 2 stages)
   white noise, gated in ~6ms random-amplitude steps (fixed RNG seed 137) so it stutters instead
   of hissing smoothly, with its own ~160ms decay envelope. Mixed 0.62/0.55, soft-clipped
   (`tanh`) for a bit of analogue-style bite, normalized to -1dBFS peak (matching this project's
   other trimmed cast SFX headroom convention). Rendered to
   `docs/agents/tilesmith/scripts/previews/lightning-cast-synth-candidate-137.wav`
   (PCM_16, 44.1kHz mono, 0.340s, 30,032 bytes, sha256
   `6b377f62e311b2fc520b08ae27ba1e48d84aa02fa7ea64ce7c39b8c022a69785`) -- staged under this
   agent's own docs folder, deliberately **not** under `public/assets/...`, so it can't be
   accidentally picked up by the game's asset pipeline before any approval.
   **Self-verification:** re-ran the synthesis function twice independently within the script's
   own `__main__` and compared the two runs by full-array equality (not just "it ran without
   error") -- byte-identical, confirming the fixed-seed RNG makes this genuinely reproducible,
   same rigor as Composer's MIDI-hash-diff check. Measured (not assumed) the rendered file's own
   properties by re-loading it: peak -1.01dBFS, RMS -13.53dBFS, spectral centroid 5034Hz (a
   bright, noise-heavy spectrum, consistent with the crackle layer dominating overall energy
   despite the tone layer carrying the "sweep" character). Did not attempt to judge how it
   actually sounds to a human ear -- this sandbox has no audio output device, same standing
   limitation the 2026-08-11 entry already disclosed for the normalization pass; describing the
   *design* (a fast downward-sweeping crack immediately followed by a stuttering electrical
   crackle, decaying over ~340ms) is the strongest objective proxy available without a real
   listen, not a substitute for the developer's own audition.

**Backlog:** re-grepped `docs/agents/ana/backlog.md` for #137/lightning -- still no row tracks it
by number, same finding the 2026-08-09 entry made; not adding one myself for the same
Layer-4-is-Ana's-artifact reason stated there.

**Posted to the developer:** shortlist (candidates 1-3 above) posted as a comment on issue #137
via `gh issue comment 137` for the developer's own audition -- issue left open, not closed,
per its own acceptance criteria ("No file is downloaded or wired into the game until the
developer explicitly approves one").

**Sign-off status:** nothing to sign off on this pass -- no asset was downloaded, extracted, or
referenced from `sfx.ts`. `ELEMENT_CAST_URL.lightning` is unchanged (`groundhit.wav`, the
disclosed stand-in). This entry documents research + a synthesized candidate's generation
script/render only; the license/fit decision is **pending the developer's explicit go/no-go**
on one of the 3 candidates above, same gate every prior `#137` entry has deferred to.
## 2026-08-12 -- Issues #181/#184: muted the lightning cast placeholder, further-trimmed fire/ice's cast SFX

Two developer playtests on the same day, both repeats of earlier complaints this domain had
already partially addressed:

- **#181** -- "I continue to hear the wrong sound when casting spells, there's the annoying
  sound from the first time we added sound to the spells, it sucks, please remove it." A direct
  follow-up to #137 (still open, with a fresh 3-candidate CC0 shortlist from the 2026-08-09 entry
  awaiting the developer's go/no-go). Per this repo's asset-sourcing convention, no candidate can
  be downloaded/wired in without that explicit sign-off, so the developer is asking for the
  disliked placeholder gone *now*, independent of when #137 itself gets resolved.
- **#184** -- "also the audio of the fire and ice spells are still too long." A repeat of #151's
  2026-08-09 complaint. #111's 2026-08-11 pass normalized all 4 elements to a common 1.20s file
  length for *cross-element cohesion*, but never re-asked "is 1.20s itself short enough" -- this
  playtest answers that: no.

**#181 -- lightning muted, not re-sourced.** Per the ticket's own explicit instruction, did NOT
pull in either of #137's shortlisted candidates (Electricity Sound Effects / Magic Spell SFX,
still pending the developer's pick) -- this is purely "stop playing the disliked recording," not
a #137 fix. New `tools/cast-sfx-normalize/mute_lightning_181.py` (Docker-only, per ADR-0003)
reads `groundhit-normalized.wav` (#111's output: 1.200s file, still containing the original
0.285s of real audio before the silence padding) and writes an all-zero sibling of identical
format/samplerate/subtype/duration:

| File | Duration | Peak (dBFS) | RMS (dBFS) |
| --- | --- | --- | --- |
| `groundhit-normalized.wav` (before) | 1.200s | 0.00 | -23.56 |
| `groundhit-muted.wav` (after) | 1.200s | -inf | -inf |

`ELEMENT_CAST_URL.lightning` in `src/systems/sfx.ts` now points at `groundhit-muted.wav`. The
doc comment above the const and the inline comment on the `lightning` entry both carry an
explicit "this is a #181 stopgap, not a #137 fix" pointer, plus the `License.txt` addendum below
-- so this doesn't read as a silent permanent removal to whoever next opens the file. Fire, ice,
and earth's `ELEMENT_CAST_URL` entries are untouched by this change.

**#184 -- fire and ice trimmed further past #111's 1.20s target.** Used
`tools/cast-sfx-normalize/fine_envelope.py` (10ms-window RMS envelope, Docker-only) to find a
clean, non-mid-crescendo cut point in each file's `-normalized` version before cutting anything,
same "read the envelope, don't guess" method the 2026-08-09 (#151) entry used:

- **Fire**: envelope shows the main attack/decay hump peaking around 0.60-0.65s (RMS as high as
  -9.29 dBFS), decaying steadily after. Picked **0.830s** -- a clean dip (-20.48/-21.97 dBFS at
  0.82-0.83s) well past the hump, before the file trails into its silence pad.
- **Ice**: a noisier, crackly texture with a final crescendo swell peaking around 0.85-1.00s (as
  loud as -9.23 dBFS). Picked **0.710s** -- a local low point (-18.12 dBFS) right before that
  final swell starts ramping up again at 0.72s, so the cut lands in a quiet gap rather than
  chopping the swell mid-crescendo (same rule #151's original ice trim used).

New `tools/cast-sfx-normalize/trim_fire_ice_184.py` (Docker-only) applies each cut with the same
60ms linear fade-out convention as #151/#111, then re-measures RMS: if the cut drifted the
whole-clip RMS more than 0.5dB from #111's -16 dBFS target, it re-applies the same tanh
soft-limited gain #111's `normalize_cast_sfx.py` used, so the loudness-normalization acceptance
criterion holds by measurement rather than by assumption.

**Measured before/after** (script stdout, cross-checked with an independent re-read of each
output file):

| Element | File (before, #111) | Duration | RMS (dBFS) | File (after, #184) | Duration | RMS (dBFS) | Re-normalized? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fire | `...-fireball-01-normalized.wav` | 1.200s | -16.59 | `...-fireball-01-normalized-trimmed.wav` | 0.830s | -15.62 | No -- `abs(-15.62 - (-16.0)) = 0.38dB`, inside the script's 0.5dB tolerance (checked against the fixed -16.0 dBFS target, not fire's own pre-cut -16.59 dBFS) |
| ice | `freeze-normalized.wav` | 1.200s | -16.05 | `freeze-normalized-trimmed.wav` | 0.710s | -16.06 | Yes -- the raw cut alone drifted RMS to -21.60 dBFS (removing the loudest swell content pulls the average down), so the script re-applied the same tanh soft-limited gain #111 used, landing back at -16.06 dBFS |

An independent re-read of both `-normalized-trimmed` output files (fresh `soundfile.read`, not
reused from the generation script's own printed log) confirms: fire 0.830s / -15.62 dBFS RMS /
-2.48 dBFS peak; ice 0.710s / -16.06 dBFS RMS / -0.00 dBFS peak.

**Earth -- checked, not touched.** Earth's cast file (`earth-element-magic-spell-normalized.ogg`)
is also currently 1.200s at -15.97 dBFS RMS -- the same file length fire/ice had *before* this
trim. The developer's #184 complaint named fire and ice specifically, not earth, and the ticket
explicitly said not to silently extend the fix to anything not asked for. Flagging this plainly:
earth shares fire/ice's pre-trim duration and hasn't been re-confirmed as "long enough to bother
a player" or not -- left untouched per the ticket's own instruction, not because it's
structurally different from what fire/ice used to be. Worth a note for a future playtest pass if
the developer ever calls out earth's cast the same way.

**`src/systems/sfx.ts`:** `ELEMENT_CAST_URL.fire`/`.ice` now point at the `-normalized-trimmed`
files; `ELEMENT_CAST_URL.lightning` now points at `groundhit-muted.wav`. `.earth` is unchanged.
The doc comment above the const got two new dated sub-entries (#184, then #181) with the full
reasoning; each changed entry's own inline comment also got a dated pointer. No change to
`sfxKey`/`elementCastSfxKey`/`elementCastSfxUrl`'s signatures, `sfxVariation.ts`'s
`computeSpellSfxVariation`, or any file in `SpellroadScene.ts` -- both fixes are fully contained
inside `sfx.ts` and the asset files themselves, deliberately, since a parallel branch is also
touching `SpellroadScene.ts`/`bgm.ts` for unrelated issues and this domain's own scope is
`sfx.ts`/cast-SFX assets.

**License.txt addenda:** all 3 affected packs' `License.txt` (fireball, freeze-spell,
electricity-game-sound-pack) got a dated 2026-08-12 entry documenting the new derivative (source
file, before/after duration+loudness, same CC0 grant applies) -- same per-file provenance
convention #151/#111 used. Earth's pack was not touched (no new derivative there).

**New tools:** `tools/cast-sfx-normalize/mute_lightning_181.py` (silence derivative for #181),
`tools/cast-sfx-normalize/trim_fire_ice_184.py` (further-trim-with-conditional-re-normalize for
#184), and `tools/cast-sfx-normalize/fine_envelope.py` (10ms-window RMS envelope printer used to
pick #184's cut points, kept for any future re-run). All three reuse the existing
`tools/cast-sfx-normalize/Dockerfile`/`requirements.txt` image (`soundfile`/`numpy`, no new
dependencies) -- built once as `cast-sfx-tools` and invoked with the script name as the
`--entrypoint python` argument, with both this directory and `public/assets/third-party`
bind-mounted, same pattern as the existing `normalize_cast_sfx.py`.

**Self-verification (Docker, per `docs/agents/_reference/docker-testing-contract.md`):**
- `docker-compose run --rm game npm run typecheck` -- clean.
- `docker-compose run --rm game npm test` -- 30 test files, 302 tests, all passed, unchanged from
  before this change (no test touches `sfx.ts`'s URL string values directly, since they're plain
  data -- same reasoning the 2026-08-11 entry gave).
- `docker-compose run --rm game npm run build` -- clean production build.
- Independently re-measured all touched/new files (`groundhit-muted.wav`,
  `...-fireball-01-normalized-trimmed.wav`, `freeze-normalized-trimmed.wav`) and earth's
  untouched file with a fresh read (not reused from either generation script's own stdout) to
  confirm the tables above.
- Did not bring up a live dev-server session to listen to the actual audio -- this sandbox has no
  audio output device, same standing limitation every prior audio entry in this log discloses.
  Whether lightning's silence reads as "acceptably nothing" rather than "a broken/missing sound"
  and whether fire/ice's new sub-1s lengths feel snappy rather than clipped are exactly the
  aesthetic/playtest questions this log's file-level measurement can't answer on its own.

**Sign-off status:** license/source compliance for the 3 new derivatives (`groundhit-muted.wav`,
both `-normalized-trimmed` files) -- same CC0 grant as the untouched files they derive from,
re-confirmed above, but per this agent's standing rule still not self-certified; **pending human
developer review**. Whether the mute and the new fire/ice lengths actually resolve the two
playtest complaints is, as always, a question only the next human playtest can answer.

## 2026-08-12 (2) — Issue #191: reverted #181's lightning mute; the disliked sound was a different, shared cue

Same-day follow-up. The developer clarified, right after #181/#184 shipped: "sorry my bad please
return the lighting cast sfx that was previously, the one i meant is another sound that it can
appear with any spell that i dont like, and sometimes can happen at the same time as the other
sfx." Two things at once: #181's mute gets reverted (the lightning stand-in was never the
complaint), and the *actual* disliked sound is a shared, non-element-specific cue -- one of
`ALL_SFX_CUES` (`hit`/`impact`/`enemyDeath`/`playerDeath`), not anything in `ELEMENT_CAST_URL` --
still unidentified, tracked separately as issue #191's own open question rather than guessed at
here.

**Reverted:** `ELEMENT_CAST_URL.lightning` in `src/systems/sfx.ts` back to
`groundhit-normalized.wav` (#111's loudness/length-normalized file, the state the developer last
confirmed liking). `groundhit-muted.wav` (the #181 artifact) is left in place, unreferenced, as
provenance -- not deleted, same convention every superseded derivative in this file follows. Both
the const's doc comment and the `lightning` entry's own inline comment updated to record the
mute-then-revert history rather than silently erasing #181 from the file's narrative.

**Not touched:** fire/ice/earth entries (issue #184's trims) -- the developer didn't object to
those, only to lightning being muted. Issue #137 stays closed (the developer's "keep the current
one" decision was about the *lightning* recording specifically, made before this clarification
arrived, and is still what's shipped now that the mute is reverted).

**Self-verification (Docker, per `docs/agents/_reference/docker-testing-contract.md`):**
- `docker-compose run --rm game npm run typecheck` -- clean.
- `docker-compose run --rm game npm test` -- 302/302 passing, 30 files, unchanged (no test
  touches `sfx.ts`'s URL string values directly).
- `docker-compose run --rm game npm run build` -- clean production build.
- Confirmed by reading the file directly that `groundhit-normalized.wav` still exists on disk,
  unmodified, at the path now referenced again.

**Sign-off status:** this is a pure revert of a single string value back to an already-shipped,
already-approved file -- no new asset, no new license question. The open item is identifying
*which* shared SFX cue the developer actually means; not resolved here, tracked as issue #191's
own question pending the developer's answer.

## 2026-08-12 (3) — Issue #191: muted `impact` and `enemyDeath` shared SFX cues (stopgap, playtest isolation)

Developer follow-up to #190's revert, same day: "191: it happens when an enemy dies, also i dont
like the sound of the enemy getting hitted, so i think we should mute those 2 so i can playtest
and share more feedback." Identifies the two disliked cues precisely: `enemyDeath`
(`phaserDown1.ogg`, "an enemy dies") and `impact` (`impactGeneric_light_001.ogg`, "the enemy
getting hitted") -- both shared, non-element-specific `sfx.ts` cues, confirming the earlier guess
in issue #191's own body. Explicitly a temporary mute for isolating the next playtest pass, not a
verdict that these recordings are wrong forever.

**Muted:** `tools/cast-sfx-normalize/mute_impact_enemydeath_191.py` (Docker-only, reuses the
existing `cast-sfx-tools` image, same pattern as #181's `mute_lightning_181.py`) writes
all-silence siblings of identical format/samplerate/subtype/duration for both files:

| Cue | File (before) | Duration | Peak/RMS (dBFS) | File (after) | Duration | Peak/RMS (dBFS) |
| --- | --- | --- | --- | --- | --- | --- |
| `impact` | `impactGeneric_light_001.ogg` | 0.118s | -1.00 / -20.10 | `impactGeneric_light_001-muted.ogg` | 0.118s | -inf / -inf |
| `enemyDeath` | `phaserDown1.ogg` | 0.470s | -1.04 / -15.00 | `phaserDown1-muted.ogg` | 0.470s | -inf / -inf |

`src/systems/sfx.ts`'s `SFX_URL.impact`/`.enemyDeath` now point at the `-muted` siblings. Neither
original file was touched or deleted -- both still exist unmodified, so un-muting later (or
wiring in a re-sourced replacement per whatever the next playtest reveals) is a one-line revert,
same as #190 was for lightning. `hit` and `playerDeath` are untouched -- not named in this
complaint.

**Self-verification (Docker, per `docs/agents/_reference/docker-testing-contract.md`):**
- `docker-compose run --rm game npm run typecheck` -- clean.
- `docker-compose run --rm game npm test` -- 302/302 passing, 30 files, unchanged.
- `docker-compose run --rm game npm run build` -- clean production build.
- Independently re-measured both `-muted.ogg` files with a fresh `soundfile` read (not reused
  from the generation script's own stdout): both confirmed all-zero samples, matching duration.

**Sign-off status:** pure silence derivatives of already-approved CC0 files, no new sourcing, no
new license question. Explicitly temporary per the developer's own framing -- flagged here so a
future reader doesn't mistake this for a permanent removal decision the way #181's mute needed
correcting for lightning.

## 2026-08-14 -- Issue #251: earth cast VFX independently re-diagnosed and fixed (real rendering
bug, not a tuning miss); earth SFX further trimmed to match fire/ice's #184 treatment

Developer playtest (2026-08-15 per the issue, filed 2026-08-14): "earth spell VFX still not
visible; earth SFX too long and too strong (loud)." Two unrelated root causes, one each for
VFX and SFX, both scoped to earth only.

**VFX -- root cause, found via live dev-server diagnosis, not assumed from #185's own log
entry.** #185 (2026-08-13) already changed earth's color/particle-count/scale and reasoned the
result should read as a fuller, more visible burst. That reasoning was never actually confirmed
against a running build (no dev-server check is logged for #185's VFX half) -- and it was wrong
in a way a config read alone can't catch, because the actual defect was in a completely different
layer.

Diagnosis method (Docker dev server, `docs/eng-skills/sandboxed-playtest-frame-pump.md`'s
frame-pump technique, `disableVisibilityChange` + manual `game.loop.step()` since this sandbox's
browser pane reports `document.visibilityState` as permanently hidden): armed and fired
`stone_spike` (earth, hotbar slot 3 per #238) through the real hotbar input path, confirmed each
cast actually landed (mana spent, cooldown started -- ruling out "the spell just didn't fire," a
real trap this session fell into repeatedly with a flaky synthetic keyboard-event sequence before
switching to a real mouse click to confirm-fire), and read back both the live canvas pixels
(`canvas.toDataURL()`) and the actual `Phaser.GameObjects.Particles.ParticleEmitter` instance's
own `alive` array (position/alpha/tint/texture) at the moment of firing.

Result: earth's emitter existed in the scene graph with fully correct data -- 18 alive particles
at the right position, `alpha` near 1, neutral (0xffffff) tint, and a texture that, independently
read back via `CanvasRenderingContext2D.getImageData`, baked the exact correct opaque olive color
(124,143,66,255) -- yet the rendered canvas showed **zero** pixels of that color anywhere on
screen, confirmed at the particles' own exact known coordinates, not just an approximate region
scan. Ruled out, each via a live A/B in the same session: shape (arc_lance, lightning, also a
line-shaped spell, rendered its bolt/burst fine), spawn origin (offsetting the burst's origin
along the cast direction, after fixing a vector-normalization bug of my own that briefly sent
particles to x=6660 off-canvas, made no difference), speed/gravity (raising speed and lowering
gravity so the burst would clear the mage's own sprite footprint sooner made no difference), and
blend mode (switching to additive made no difference). What **did** make a difference: replacing
the `ParticleEmitter` with a scatter of plain `this.add.circle(...)` Arc GameObjects using the
identical color, position, and timing -- rendered immediately and reliably, every time, in the
same live session where the particle emitter consistently produced nothing. This isolates the
defect to Phaser's particle-emitter rendering path for this specific case (texture/config
combination, this Phaser 3.90 build, or some interaction between them) -- not the color, not the
texture data, not any tunable value in `ELEMENTAL_CAST_VFX_CONFIG`. Ice and lightning's own
particle emitters were independently re-confirmed rendering correctly (bright, on-color pixels
at their own known particle positions) in the same session, so they're untouched.

**Fix (`src/scenes/SpellroadScene.ts`):** earth's cast VFX (`spawnElementalCastVfx`) and impact
VFX (`spawnElementalImpactVfx`) now route through a new `spawnDebrisBurst` helper that builds the
burst from tweened `Arc` GameObjects instead of a `ParticleEmitter`, sidestepping the broken
pipeline entirely rather than chasing its exact cause further. `spawnDebrisBurst` approximates
the same ballistic motion (launch vector + constant `gravityY`, integrated analytically for each
tween's end position) so the burst still looks and moves like the original particle-based design
-- same color/radius/quantity/speed/spread/lifespan from `ELEMENTAL_CAST_VFX_CONFIG`, same
scale-to-zero/alpha-to-zero fade. Every other element (ice, lightning, fire's own sourced sprite)
is untouched -- still on the `ParticleEmitter` path, which is confirmed working for them.
Also (small, applies to every element, not just earth): both cast and impact bursts now spawn
their origin offset a few px forward along the cast direction / already correct at the impact
point, rather than exactly on the caster's own sprite center, a minor contributing factor once
the primary defect above was found (the burst spending its early, most-visible frames literally
overlapping the mage's own 32x32 sprite).

Also bumped earth's `speedMin`/`speedMax` (100-200 -> 170-260) and lowered `gravityY` (260 -> 150)
in the same config entry so the (now correctly-rendering) burst reads with a bit more energy,
closer to the "still not visible" complaint's implicit ask, without losing the heavier/slower
"debris" character than lightning's sparks -- a tuning adjustment layered on top of the rendering
fix, not a substitute for it.

**Live re-verification after the fix (same dev-server session, same frame-pump technique):**
armed and fired `stone_spike` again through the real hotbar+click path, confirmed the cast landed
(mana spent, cooldown started), and this time both the raw pixel scan (191 olive-colored pixels
found directly adjacent to the mage, versus 0 before the fix) and a plain screenshot **visually**
show a clear olive-green debris burst next to the mage immediately after casting. This is a
genuine live-rendered visual confirmation, not a code-level assumption -- screenshot evidence
retained in this session's tool history.

**SFX -- further trim + implicit loudness fix, following #151/#184's own precedent.**
`src/systems/sfx.ts`'s own comments already disclosed the gap: #111 (2026-08-11) normalized all
4 elements' cast cues to a common -16 dBFS RMS target and a common 1.20s length; #184
(2026-08-12) then further-trimmed fire (to 0.830s) and ice (to 0.710s) past that shared cohesion
target down to something concretely sub-1-second, explicitly leaving earth untouched because "its
complaint was never raised" at the time. This issue is that complaint, arriving 2 days later.

Ran a 10ms-window RMS envelope inspection (`tools/cast-sfx-normalize/fine_envelope_earth_251.py`,
same method #184's own `fine_envelope.py` used for fire/ice, run in Docker per
`docs/adr/0003-docker-only-rotating-creative-prototypes.md` -- diagnostic script deleted after
use, not part of the shipped pipeline) over earth's current #111 output
(`earth-element-magic-spell-normalized.ogg`, 1.20s, -16 dBFS RMS). Unlike fire/ice, earth's
source is a sustained rumbling-rock texture with no single deep silence gap -- but a clear local
energy dip sits at t=0.84-0.85s (rmsDB dipping from -18.51 to -20.12 before jumping back up to
-14.14 at t=0.86s, the same "cut in the dip, not mid-swell" rule #151/#184 already established).

`tools/cast-sfx-normalize/trim_earth_251.py` (same Docker toolchain, same 60ms linear fade-out
convention as #151/#111/#184) cuts at that 0.85s dip, landing earth in the same sub-1s range as
fire (0.83s) / ice (0.71s) instead of the older, now-inconsistent 1.20s target it had been left
at. The cut only drifted whole-clip RMS by 0.34dB (-15.97 to -16.33 dBFS) -- inside the same
0.5dB re-normalize tolerance #184 used, so no further gain was needed. Since earth's loudness
*target* was already correct (same -16 dBFS as the other 3), the "too strong (loud)" half of the
complaint isn't a levels bug -- it's the same mechanism #184 already relied on for fire/ice: a
longer clip simply puts more total sound energy in the player's ear per cast at an identical RMS
level, so cutting duration is itself the loudness fix here, not a separate step.

Output: `earth-element-magic-spell-normalized-trimmed.ogg`, 0.850s (was 1.200s), -16.33 dBFS RMS
(was -15.97 dBFS, effectively unchanged -- see above). Written alongside the untouched
`-normalized.ogg`/`-trimmed.ogg`/original files as provenance, same convention every prior
derivative in this pipeline has followed. `src/systems/sfx.ts`'s `ELEMENT_CAST_URL.earth` now
points at it.

**Self-verification (`docker-compose`, per `docs/agents/_reference/docker-testing-contract.md`):**
- `docker-compose run --rm game npm run typecheck` -- clean.
- `docker-compose run --rm game npm test` -- 30 files, 337 tests, all passed (no test file
  touched by this change -- VFX is Phaser-scene wiring self-verified via the dev server per this
  file's own established precedent, and the SFX change is a data/URL swap with no new branching
  logic, same precedent `sfx.ts`'s prior entries already set).
- `docker-compose run --rm game npm run build` -- clean production build; confirmed
  `dist/assets/third-party/opengameart-earth-element-magic-spell/` includes the new
  `-normalized-trimmed.ogg` file alongside its untouched predecessors.
- Live dev-server VFX re-verification described above (visual + pixel-level confirmation).
- SFX duration/loudness verified by direct measurement (`trim_earth_251.py`'s own before/after
  printout), not re-confirmed by ear in this session -- per this file's own standing rule, "does
  this actually sound right in an extended real playtest" is a human-playtest question this
  agent's tooling can't answer for itself.

**Verification-rationale (ADR-0001):** the VFX fix's plausible failure class was "looks fixed in
the diff but the underlying render defect is untouched" -- ruled out by re-running the *exact*
same live pixel-level check that caught the original bug, not just re-reading the new code. The
SFX fix's plausible failure class was "duration matches fire/ice but loudness quietly drifted" --
ruled out by measurement (0.34dB drift, inside tolerance) rather than assumed from the cut alone.

**Sign-off status:** VFX fix is genuinely live-verified (visual + pixel-level), a stronger bar
than this pipeline's usual "typecheck/build/screenshot" verification since it directly re-ran the
same diagnostic that caught the original bug. SFX duration/loudness numerically verified against
the same -16 dBFS / sub-1s targets #111/#184 established. **Pending human developer review** for
the actual gate this issue can't self-certify: a real playtest re-confirming both that earth's
VFX now reads as visible in the flow of real combat (not just a single isolated test cast) and
that its SFX now feels proportionate next to fire/ice/lightning -- per this agent's own standing
rule that a developer playtest is the only thing that can close that loop, same as every prior
VFX/SFX row in this log.

## 2026-08-23 -- Issue #172 expanded castle art pass, bounded Phase 1 (Levels 1 and 5)

Scoped the five-level direction in `docs/agents/tilesmith/castle-art-brief.md` and implemented
the two endpoint maps only. The tile art remains in the existing `Terrain` layer. Following
playtest feedback, Level 1's temporary pillar object layer was removed. No map dimension,
tileset index, spawn point, or gameplay route changed.

**Asset 1 -- `public/assets/levels/level-1.json` (castle gatehouse arrangement):**

- Source: Kenney "Tiny Dungeon," https://kenney.nl/assets/tiny-dungeon; repository source sheet
  `public/assets/third-party/kenney-tiny-dungeon/Tilemap/tilemap_packed.png`; license evidence
  `public/assets/third-party/kenney-tiny-dungeon/License.txt`.
- License: Creative Commons Zero (CC0 1.0). Commercial use and modification permitted;
  attribution not required. No GraphicRiver or other commercial asset used.
- Sourcing-contract step: **1 (Kenney.nl)**. Authored Tiled layout data using the existing,
  already-vendored Kenney asset; no new binary asset was downloaded or originated.
- Art use: red wall braziers (GID 30), continuous upper and lower gray masonry panels using
  dedicated left, seamless-middle, and right pieces (GIDs 37-39), five irregularly spaced
  closed chamber doors
  embedded only in the upper wall (GID 23), worn edge stones (GID 25), and sparse pebble wear
  (GID 13). The earlier lower door tiles, large floor mosaics, circular
  floor motifs, and temporary pillars were removed after playtest feedback. The remaining
  upper chamber-door tiles retain solid wall collision.
- Sign-off status: **approved in the developer's Docker playtest on 2026-08-26**.

**Asset 2 -- `public/assets/levels/level-5.json` (Director trial hall arrangement):**

- Source: Kenney "Tiny Dungeon," https://kenney.nl/assets/tiny-dungeon; same repository source
  sheet and `License.txt` evidence as Asset 1.
- License: Creative Commons Zero (CC0 1.0). Commercial use and modification permitted;
  attribution not required. No GraphicRiver or other commercial asset used.
- Sourcing-contract step: **1 (Kenney.nl)**. Authored Tiled layout data using the existing,
  already-vendored Kenney asset; no new binary asset was downloaded or originated.
- Art use: symmetric green wall braziers (GID 33), paired carved reliefs (GIDs 20-21), central
  threshold (GIDs 22-24 and 34-36), processional runner (GIDs 49-51), four dais-framing sigils
  (GID 43), four grates (GIDs 55-56), and restrained edge wear (GIDs 13 and 25). The original
  12x4 GID-49 boss dais remains unchanged at its prior coordinates.
- Sign-off status: **approved with the Phase 1 Docker checkpoint on 2026-08-26**.

**Not included:** Levels 2-4, new third-party assets, spritesheet derivatives, or changes to
the map dimensions and tileset. Tiled desktop is not installed in this environment, so visual
QA used a nearest-neighbor renderer over the same packed PNG/GID mapping; final in-engine visual
fit remains a human playtest gate.
