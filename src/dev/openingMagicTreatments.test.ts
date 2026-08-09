import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPENING_MAGIC_TREATMENTS,
  allReferencedAssetUrls,
  resolveOpeningMagicTreatmentAssets
} from "./openingMagicTreatments";

describe("resolveOpeningMagicTreatmentAssets", () => {
  it("resolves 4 rune glyphs and 3 vfx atlases for every treatment", () => {
    for (const treatment of OPENING_MAGIC_TREATMENTS) {
      const assets = resolveOpeningMagicTreatmentAssets(treatment);
      expect(Object.keys(assets.glyphs).sort()).toEqual(["cyan", "ember", "gold", "violet"]);
      expect(assets.vfx.cast.frameCount).toBe(4);
      expect(assets.vfx.impact.frameCount).toBe(4);
      expect(assets.vfx.trail.frameCount).toBe(4);
    }
  });

  it("CC0 Remix has an ambience bed but no dedicated music track (known, deliberately open gap)", () => {
    const assets = resolveOpeningMagicTreatmentAssets("cc0-remix");
    expect(assets.music).toBeNull();
    expect(assets.ambience).not.toBeNull();
    expect(assets.ambience?.loop).toBe(true);
    expect(assets.glyphs.cyan.url).toContain("cc0-remix/glyphs/rune-cyan.png");
  });

  it("Deterministic Original has a looping music track and no ambience bed", () => {
    const assets = resolveOpeningMagicTreatmentAssets("deterministic-original");
    expect(assets.music).not.toBeNull();
    expect(assets.music?.loop).toBe(true);
    expect(assets.ambience).toBeNull();
    expect(assets.music?.url).toContain("opening-magic-deterministic-original.ogg");
  });

  it("Hybrid reuses Deterministic Original's glyph/vfx/music assets verbatim (no new binaries, per hybrid-treatment.json)", () => {
    const hybrid = resolveOpeningMagicTreatmentAssets("hybrid");
    const deterministic = resolveOpeningMagicTreatmentAssets("deterministic-original");
    expect(hybrid.glyphs).toEqual(deterministic.glyphs);
    expect(hybrid.vfx).toEqual(deterministic.vfx);
    expect(hybrid.music).toEqual(deterministic.music);
    expect(hybrid.ambience).toBeNull();
  });

  it("gives CC0 Remix and Deterministic Original distinct cache keys for the same logical asset", () => {
    const cc0 = resolveOpeningMagicTreatmentAssets("cc0-remix");
    const deterministic = resolveOpeningMagicTreatmentAssets("deterministic-original");
    expect(cc0.glyphs.cyan.key).not.toEqual(deterministic.glyphs.cyan.key);
    expect(cc0.vfx.cast.key).not.toEqual(deterministic.vfx.cast.key);
  });
});

describe("allReferencedAssetUrls (asset-drift guard)", () => {
  // Per issue #128's own instruction: hardcoded paths must be checked against real files on
  // disk so a future asset change/rename under public/assets/prototypes/opening-magic/ can't
  // silently drift out of sync with this resolver. Source of truth for these paths is each
  // treatment's own provenance.json / hybrid-treatment.json — see openingMagicTreatments.ts's
  // module comment for exact locations.
  it("every referenced asset path actually exists on disk under public/", () => {
    const urls = allReferencedAssetUrls();
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const diskPath = resolve(process.cwd(), "public", url);
      expect(existsSync(diskPath), `expected asset referenced by openingMagicTreatments.ts to exist on disk: public/${url}`).toBe(
        true
      );
    }
  });
});
