import { describe, expect, it } from "vitest";
import { resolveWallSlideWantsNegativeY } from "./wallSlideDirection";

const CENTER_Y = 270;

describe("resolveWallSlideWantsNegativeY", () => {
  it("decides fresh from the current position when no lock is held yet", () => {
    expect(resolveWallSlideWantsNegativeY(300, CENTER_Y, null)).toBe(true);
    expect(resolveWallSlideWantsNegativeY(200, CENTER_Y, null)).toBe(false);
  });

  it("decides true (wants negative Y) when exactly at center with no lock, matching the >= convention", () => {
    expect(resolveWallSlideWantsNegativeY(CENTER_Y, CENTER_Y, null)).toBe(true);
  });

  it("keeps the locked value even after the position crosses to the other side of center", () => {
    // Locked true (wants up) while below center; position drifts to just above center —
    // a fresh decision would flip to false, but the lock must hold until cleared.
    expect(resolveWallSlideWantsNegativeY(CENTER_Y - 1, CENTER_Y, true)).toBe(true);
    expect(resolveWallSlideWantsNegativeY(CENTER_Y + 1, CENTER_Y, true)).toBe(true);
  });

  it("keeps a false lock regardless of position too", () => {
    expect(resolveWallSlideWantsNegativeY(CENTER_Y - 1, CENTER_Y, false)).toBe(false);
    expect(resolveWallSlideWantsNegativeY(CENTER_Y + 1, CENTER_Y, false)).toBe(false);
  });
});
