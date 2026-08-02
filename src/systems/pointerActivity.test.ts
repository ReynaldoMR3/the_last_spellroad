import { describe, expect, it } from "vitest";
import { POINTER_ACTIVE_WINDOW_MS, hasRecentPointerActivity } from "./pointerActivity";

describe("hasRecentPointerActivity", () => {
  it("returns false when the pointer has never moved this session (null lastMovedAt)", () => {
    expect(hasRecentPointerActivity(null, 100_000)).toBe(false);
  });

  it("returns true when the pointer moved just now", () => {
    expect(hasRecentPointerActivity(1000, 1000)).toBe(true);
  });

  it("returns true when the pointer moved within the active window", () => {
    expect(hasRecentPointerActivity(1000, 1000 + POINTER_ACTIVE_WINDOW_MS - 1)).toBe(true);
  });

  it("treats the window boundary as inclusive", () => {
    expect(hasRecentPointerActivity(1000, 1000 + POINTER_ACTIVE_WINDOW_MS)).toBe(true);
  });

  it("returns false just past the active window", () => {
    expect(hasRecentPointerActivity(1000, 1000 + POINTER_ACTIVE_WINDOW_MS + 1)).toBe(false);
  });

  it("returns false long after the pointer went idle -- issue #49's exact bug", () => {
    // The original bug: a one-way boolean, tripped once, never released. This must NOT
    // still read as "active" minutes after the last real pointer movement.
    expect(hasRecentPointerActivity(1000, 1000 + 5 * 60 * 1000)).toBe(false);
  });

  it("accepts a caller-supplied window instead of the default", () => {
    expect(hasRecentPointerActivity(1000, 1500, 1000)).toBe(true);
    expect(hasRecentPointerActivity(1000, 2500, 1000)).toBe(false);
  });
});
