# Art Sourcing Contract (Tilesmith's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Art Sourcing And Origination Pipeline" and "Agent Role Definitions — Tilesmith"; `docs/adr/0002-unblock-audio-scope-add-composer-agent.md` for the 2026-08-04 SFX scope extension.

Tilesmith owns sourcing or originating the Spellroad's tileset, level layouts, VFX, and (since 2026-08-04) sound-effect one-shots within the low-spec constraint. It never touches numeric templates, gameplay data, or engine code. Composer, not Tilesmith, owns composed music tracks — the split is one-shot SFX (Tilesmith) vs. composed score (Composer), the same way art and music are different disciplines with different sourcing rules (curate-or-hand-author vs. brief-and-generate).

**Search order — always try in this sequence, never skip ahead to originating without exhausting 1-3. Applies identically to art and SFX:**

1. **Kenney.nl.** Site-wide CC0 (public domain equivalent) — no attribution required, commercial use and modification unrestricted. Default source. Relevant packs: "Roguelike/RPG Pack" (~1,700 assets), "RPG Base" for art; Kenney's audio packs (e.g. "Impact Sounds," "UI Audio," "RPG Audio") for SFX. Covers tileset, base enemy sprites (reskin target for Frieren/Warden's element and archetype choices), simple VFX placeholders, and one-shot SFX.
2. **OpenGameArt.org, CC0 filter only.** Never CC-BY or share-alike — every sourced asset stays at the same no-attribution-required bar as Kenney, so the license log never has to track two different compliance requirements. Applies to its audio section the same as its art section.
3. **Recolor or recombine an already-sourced CC0 asset.** CC0 permits unrestricted derivatives, so this is the default "originate new" mechanism — new VFX palettes or SFX variants (e.g. pitch/tempo-shifting an existing CC0 hit sound for a different weight class), built from an existing CC0 base at the same pixel scale or audio format.
4. **Hand-author new pixel art or SFX.** Only when no CC0 base exists to start from. For art, use a free, cross-platform tool (e.g. Piskel), matching the tile scale (16x16 or 32x32) of whichever Kenney pack anchors the tileset. For SFX, this step should be rare given Kenney/OpenGameArt's audio coverage — flag to the developer before hand-authoring audio from scratch, since that's a genuinely different skill than curating.

**SFX scope discipline:** only source a sound effect for a game element that already exists and is shipped — a spell, an enemy attack, a UI action. Never source SFX speculatively ahead of unbuilt features. This mirrors the reactive-coverage rule the whole audio pillar runs under (see the ADR).

**Getting art into Phaser:** author/edit level layouts in the free Tiled map editor, export as Tiled-format JSON. Load with `this.load.image()` (tileset spritesheet) and `this.load.tilemapTiledJSON()` (layout), then `this.make.tilemap()` / `map.addTilesetImage()` / `map.createLayer()` to build the scene. Same "Phaser loads JSON natively" principle as Warden/Frieren/Lorena's content pipeline (Engine Integration) — not a special case.

**Getting SFX into Phaser:** load one-shots with `this.load.audio()`, play with `this.sound.play()` (or a pooled `Phaser.Sound.BaseSound` for frequently-repeated cues like the hit-cue). Same dev-time-authored, static-asset principle as art — no runtime generation.

**Logging — every asset, every step, regardless of license:** one entry per asset in `docs/agents/tilesmith/log.md`: source URL, license, which of the four steps above produced it, and the human developer's compliance sign-off status. An untracked asset is a constraint violation regardless of how good it looks or sounds, or how permissive its license actually is.

Only Tilesmith edits this file. No other agent needs it — art/SFX sourcing doesn't feed Warden's, Frieren's, Pato's, or Composer's work.
