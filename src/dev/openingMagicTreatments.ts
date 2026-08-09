/**
 * Issue #128 ("Prototype 1: audition Arcane Momentum treatments in Level 1") — pure mapping
 * from an opening-magic treatment key to the asset paths/keys `PrototypeOpeningMagicScene.ts`
 * needs to load. Deliberately Phaser-free (same convention as `levelArt.ts`/`sfx.ts`/`bgm.ts`)
 * so this is unit-testable without a running Scene.
 *
 * Paths are hardcoded here rather than parsed from the source JSON at build time (Vite's
 * `resolveJsonModule` would bundle each provenance/manifest file as a JS module, which is a
 * reasonable alternative, but importing files that live under `public/` — served as static
 * passthrough, not part of the module graph elsewhere in this repo — would be a new, unusual
 * pattern for a single throwaway prototype). Instead the paths below are transcribed by hand
 * from each treatment's own source of truth, and `allReferencedAssetUrls()` is smoke-tested
 * (`openingMagicTreatments.test.ts`) against the real files on disk so a future rename/move
 * under `public/assets/prototypes/opening-magic/` can't silently drift out of sync with this
 * file without a failing test:
 *
 * - public/assets/prototypes/opening-magic/cc0-remix/provenance.json
 * - public/assets/prototypes/opening-magic/deterministic-original/provenance.json
 * - public/assets/prototypes/opening-magic/hybrid/hybrid-treatment.json
 *
 * Per the hybrid manifest ("Hybrid ... reused as-is, not regenerated"), Hybrid's glyphs/VFX/
 * music are literally Deterministic Original's own files — `resolveOpeningMagicTreatmentAssets`
 * returns the *same* keys/urls for both, so Phaser's loader only fetches each file once
 * regardless of how many treatments reference it, and switching from Deterministic Original to
 * Hybrid (or back) never re-downloads or re-decodes anything.
 *
 * Terrain (the Kenney CC0 stone/forest tileset) is deliberately NOT part of this module: per
 * the design spec, all three treatments share the exact same production Level 1 tilemap/canvas
 * (`src/systems/levelArt.ts`) as their common ground — only the glyph/VFX/music/ambience
 * presentation layer varies by treatment.
 */

export type OpeningMagicTreatment = "cc0-remix" | "deterministic-original" | "hybrid";

/** Order matches the ticket's own `1`/`2`/`3` key binding and the design spec's own treatment
 * numbering (CC0 Remix, Deterministic Original, Hybrid). */
export const OPENING_MAGIC_TREATMENTS: readonly OpeningMagicTreatment[] = [
  "cc0-remix",
  "deterministic-original",
  "hybrid"
];

export type RuneColor = "cyan" | "gold" | "violet" | "ember";
const RUNE_COLORS: readonly RuneColor[] = ["cyan", "gold", "violet", "ember"];

export interface ImageAsset {
  key: string;
  url: string;
}

export interface FrameAtlasAsset extends ImageAsset {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

export interface AudioAsset {
  key: string;
  url: string;
  loop: boolean;
}

export interface TreatmentAssets {
  treatment: OpeningMagicTreatment;
  glyphs: Record<RuneColor, ImageAsset>;
  vfx: {
    cast: FrameAtlasAsset;
    impact: FrameAtlasAsset;
    trail: FrameAtlasAsset;
  };
  /** Looping music track for this treatment, or `null` if it has none. CC0 Remix ships no
   * dedicated music/temp-reference track (a known, deliberately still-open gap — see
   * `docs/agents/ana/log.md`'s 2026-08-09 entry) — the scene must handle this gracefully, not
   * treat it as a loading error. */
  music: AudioAsset | null;
  /** Looping ambience bed. Only CC0 Remix ships one. */
  ambience: AudioAsset | null;
}

const ASSET_ROOT = "assets/prototypes/opening-magic";

/** Both sourced treatments' spell-VFX atlases happen to share identical frame layouts — see
 * each provenance.json's `generatedFiles`/`derivatives` entries. Recorded once here rather
 * than duplicated per treatment; if a future asset regeneration changes one treatment's atlas
 * dimensions without the other, the two treatments' `vfx.*` objects will simply stop matching
 * bit-for-bit, which is a visible, comparable diff rather than a silent mismatch — there is no
 * plausible way for a *dimension* mismatch to hide here since the geometry each frame is drawn
 * into ignores frame count/size beyond the loader's own atlas slicing. */
const CAST_ATLAS_DIMS = { frameWidth: 64, frameHeight: 64, frameCount: 4 } as const;
const IMPACT_ATLAS_DIMS = { frameWidth: 48, frameHeight: 48, frameCount: 4 } as const;
const TRAIL_ATLAS_DIMS = { frameWidth: 64, frameHeight: 24, frameCount: 4 } as const;

function glyphAssets(assetDir: string, keyPrefix: string): Record<RuneColor, ImageAsset> {
  const out = {} as Record<RuneColor, ImageAsset>;
  for (const color of RUNE_COLORS) {
    out[color] = {
      key: `openingmagic-${keyPrefix}-rune-${color}`,
      url: `${ASSET_ROOT}/${assetDir}/glyphs/rune-${color}.png`
    };
  }
  return out;
}

function vfxAssets(assetDir: string, keyPrefix: string): TreatmentAssets["vfx"] {
  return {
    cast: {
      key: `openingmagic-${keyPrefix}-vfx-cast`,
      url: `${ASSET_ROOT}/${assetDir}/vfx/cast-flame_sweep.png`,
      ...CAST_ATLAS_DIMS
    },
    impact: {
      key: `openingmagic-${keyPrefix}-vfx-impact`,
      url: `${ASSET_ROOT}/${assetDir}/vfx/impact-flame_sweep.png`,
      ...IMPACT_ATLAS_DIMS
    },
    trail: {
      key: `openingmagic-${keyPrefix}-vfx-trail`,
      url: `${ASSET_ROOT}/${assetDir}/vfx/trail-fire.png`,
      ...TRAIL_ATLAS_DIMS
    }
  };
}

const DETERMINISTIC_ORIGINAL_GLYPHS = glyphAssets("deterministic-original", "deterministic-original");
const DETERMINISTIC_ORIGINAL_VFX = vfxAssets("deterministic-original", "deterministic-original");
const DETERMINISTIC_ORIGINAL_MUSIC: AudioAsset = {
  key: "openingmagic-deterministic-original-music",
  url: `${ASSET_ROOT}/deterministic-original/opening-magic-deterministic-original.ogg`,
  loop: true
};

const CC0_REMIX_AMBIENCE: AudioAsset = {
  key: "openingmagic-cc0-remix-ambience",
  url: `${ASSET_ROOT}/cc0-remix/audio/forest-ambience.mp3`,
  loop: true
};

/** Pure lookup — given a treatment key, returns every asset path/key
 * `PrototypeOpeningMagicScene.ts` needs to preload and swap to for that treatment. */
export function resolveOpeningMagicTreatmentAssets(treatment: OpeningMagicTreatment): TreatmentAssets {
  switch (treatment) {
    case "cc0-remix":
      return {
        treatment,
        glyphs: glyphAssets("cc0-remix", "cc0-remix"),
        vfx: vfxAssets("cc0-remix", "cc0-remix"),
        music: null,
        ambience: CC0_REMIX_AMBIENCE
      };
    case "deterministic-original":
      return {
        treatment,
        glyphs: DETERMINISTIC_ORIGINAL_GLYPHS,
        vfx: DETERMINISTIC_ORIGINAL_VFX,
        music: DETERMINISTIC_ORIGINAL_MUSIC,
        ambience: null
      };
    case "hybrid":
      // Per hybrid-treatment.json: no new binaries, reuses Deterministic Original's own
      // glyphs/VFX/music verbatim — same key/url objects, not copies, so the loader treats
      // them as the exact same cache entries.
      return {
        treatment,
        glyphs: DETERMINISTIC_ORIGINAL_GLYPHS,
        vfx: DETERMINISTIC_ORIGINAL_VFX,
        music: DETERMINISTIC_ORIGINAL_MUSIC,
        ambience: null
      };
  }
}

/** Every on-disk asset path (relative to `public/`) any treatment references, de-duplicated.
 * Smoke-tested against the real filesystem in `openingMagicTreatments.test.ts` — the guard
 * this file's own module comment and issue #128 both ask for against a future asset rename/
 * move silently drifting out of sync with the hardcoded paths above. */
export function allReferencedAssetUrls(): string[] {
  const urls = new Set<string>();
  for (const treatment of OPENING_MAGIC_TREATMENTS) {
    const assets = resolveOpeningMagicTreatmentAssets(treatment);
    for (const glyph of Object.values(assets.glyphs)) urls.add(glyph.url);
    urls.add(assets.vfx.cast.url);
    urls.add(assets.vfx.impact.url);
    urls.add(assets.vfx.trail.url);
    if (assets.music) urls.add(assets.music.url);
    if (assets.ambience) urls.add(assets.ambience.url);
  }
  return [...urls];
}
