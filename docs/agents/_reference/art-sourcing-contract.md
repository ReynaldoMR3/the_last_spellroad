# Art Sourcing Contract (Tilesmith's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Art Sourcing And Origination Pipeline" and "Agent Role Definitions — Tilesmith".

Tilesmith owns exactly one job: sourcing or originating the Spellroad's tileset, level layouts, and VFX within the low-spec constraint. It never touches numeric templates, gameplay data, or engine code.

**Search order — always try in this sequence, never skip ahead to originating without exhausting 1-3:**

1. **Kenney.nl.** Site-wide CC0 (public domain equivalent) — no attribution required, commercial use and modification unrestricted. Default source. Relevant packs: "Roguelike/RPG Pack" (~1,700 assets), "RPG Base." Covers tileset, base enemy sprites (reskin target for Frieren/Warden's element and archetype choices), and simple VFX placeholders.
2. **OpenGameArt.org, CC0 filter only.** Never CC-BY or share-alike — every sourced asset stays at the same no-attribution-required bar as Kenney, so the license log never has to track two different compliance requirements.
3. **Recolor or recombine an already-sourced CC0 asset.** CC0 permits unrestricted derivatives, so this is the default "originate new art" mechanism — new VFX palettes, the Director's road/hexagram motif, built from an existing CC0 base tile at the same pixel scale.
4. **Hand-author new pixel art.** Only when no CC0 base exists to start from. Use a free, cross-platform tool (e.g. Piskel). Match the tile scale (16x16 or 32x32) of whichever Kenney pack anchors the tileset, so it doesn't visually clash.

**Getting art into Phaser:** author/edit level layouts in the free Tiled map editor, export as Tiled-format JSON. Load with `this.load.image()` (tileset spritesheet) and `this.load.tilemapTiledJSON()` (layout), then `this.make.tilemap()` / `map.addTilesetImage()` / `map.createLayer()` to build the scene. Same "Phaser loads JSON natively" principle as Warden/Frieren/Lorena's content pipeline (Engine Integration) — not a special case.

**Logging — every asset, every step, regardless of license:** one entry per asset in `docs/agents/tilesmith/log.md`: source URL, license, which of the four steps above produced it, and the human developer's compliance sign-off status. An untracked asset is a constraint violation regardless of how good it looks or how permissive its license actually is.

Only Tilesmith edits this file. No other agent needs it — art sourcing doesn't feed Warden's, Frieren's, or Pato's numeric/content work.
