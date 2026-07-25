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
