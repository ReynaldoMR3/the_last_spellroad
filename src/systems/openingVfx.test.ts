import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  OPENING_VFX_CAST_ANIM_KEY,
  OPENING_VFX_CAST_FRAME,
  OPENING_VFX_CAST_KEY,
  OPENING_VFX_CAST_URL,
  OPENING_VFX_IMPACT_ANIM_KEY,
  OPENING_VFX_IMPACT_FRAME,
  OPENING_VFX_IMPACT_KEY,
  OPENING_VFX_IMPACT_URL,
  OPENING_VFX_TRAIL_ANIM_KEY,
  OPENING_VFX_TRAIL_FRAME,
  OPENING_VFX_TRAIL_KEY,
  OPENING_VFX_TRAIL_URL
} from "./openingVfx";

describe("opening-magic fire VFX asset identity (issue #125)", () => {
  it("gives each atlas a distinct cache key and a matching -play animation key", () => {
    const keys = [OPENING_VFX_CAST_KEY, OPENING_VFX_IMPACT_KEY, OPENING_VFX_TRAIL_KEY];
    expect(new Set(keys).size).toBe(keys.length);
    expect(OPENING_VFX_CAST_ANIM_KEY).toBe(`${OPENING_VFX_CAST_KEY}-play`);
    expect(OPENING_VFX_IMPACT_ANIM_KEY).toBe(`${OPENING_VFX_IMPACT_KEY}-play`);
    expect(OPENING_VFX_TRAIL_ANIM_KEY).toBe(`${OPENING_VFX_TRAIL_KEY}-play`);
  });

  it("declares 4-frame atlases matching provenance.json's derivative dimensions", () => {
    expect(OPENING_VFX_CAST_FRAME).toEqual({ frameWidth: 64, frameHeight: 64, frameCount: 4 });
    expect(OPENING_VFX_IMPACT_FRAME).toEqual({ frameWidth: 48, frameHeight: 48, frameCount: 4 });
    expect(OPENING_VFX_TRAIL_FRAME).toEqual({ frameWidth: 64, frameHeight: 24, frameCount: 4 });
  });

  // Asset-drift guard, same convention the removed openingMagicTreatments.test.ts used against
  // the throwaway prototype's assets -- a future rename/move of these production files under
  // public/assets/vfx/opening-magic-cc0-remix/ fails a test instead of silently 404-ing at
  // runtime.
  it("every referenced asset path actually exists on disk under public/", () => {
    for (const url of [OPENING_VFX_CAST_URL, OPENING_VFX_IMPACT_URL, OPENING_VFX_TRAIL_URL]) {
      const diskPath = resolve(process.cwd(), "public", url);
      expect(existsSync(diskPath), `expected asset referenced by openingVfx.ts to exist on disk: public/${url}`).toBe(true);
    }
  });
});
