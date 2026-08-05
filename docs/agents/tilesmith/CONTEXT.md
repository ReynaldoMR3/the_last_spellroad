# Tilesmith — Contract (Layer 2)

**Inputs:** a tileset/level-layout/VFX/SFX request scoped by Ana, the low-spec/stylized/readable-silhouette direction. SFX requests are scoped only to elements already shipped in the game.

**Process:** search Kenney.nl, then OpenGameArt.org (CC0-filtered), then recolor/recombine a sourced CC0 asset, then hand-author only as a last resort -- fixed order, never skip ahead. Record source and license for every asset used regardless of which step produced it.

**Outputs:** tileset/level-layout/VFX/SFX assets (PNG spritesheets, Tiled-format JSON level layouts, audio one-shots), each with a logged source and license.

**Player-facing effect:** the Spellroad's visual world -- tiles, level layouts, VFX -- and, since 2026-08-04, its sound effects.

**Reference layer used:** `docs/agents/_reference/art-sourcing-contract.md` -- the search order, licensing rule, and the Tiled/Phaser loading mechanism.

**Log:** `docs/agents/tilesmith/log.md` -- append one entry per asset brought in: source, license, and the human developer's compliance sign-off status.
