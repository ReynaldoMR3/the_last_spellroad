import { describe, expect, it } from "vitest";
import {
  computeCooldownDisplay,
  computeHotbarSlotRects,
  formatShapeWeightTag,
  hotbarSlotIndexAtPoint,
  nextHotbarIndex
} from "./hotbarLayout";
import type { AoEShape, Weight } from "../data/types";

describe("computeHotbarSlotRects", () => {
  it("lays out 6 slots (the shipped loadout size) fully within a 960-wide canvas", () => {
    const rects = computeHotbarSlotRects({ canvasWidth: 960, top: 424, slotHeight: 96, slotCount: 6, gapPx: 8 });
    expect(rects).toHaveLength(6);
    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(960);
      expect(rect.y).toBe(424);
      expect(rect.height).toBe(96);
    }
  });

  it("gives every slot the same width and leaves an equal gap between adjacent slots", () => {
    const rects = computeHotbarSlotRects({ canvasWidth: 960, top: 0, slotHeight: 96, slotCount: 6, gapPx: 8 });
    const width = rects[0].width;
    for (const rect of rects) {
      expect(rect.width).toBeCloseTo(width, 5);
    }
    for (let i = 1; i < rects.length; i++) {
      const gap = rects[i].x - (rects[i - 1].x + rects[i - 1].width);
      expect(gap).toBeCloseTo(8, 5);
    }
    // Outer margins match the inter-slot gap too, not just the first/last slot's inner edge.
    expect(rects[0].x).toBeCloseTo(8, 5);
    expect(960 - (rects[5].x + rects[5].width)).toBeCloseTo(8, 5);
  });

  it("assigns each slot its own 0-based index in order, left to right", () => {
    const rects = computeHotbarSlotRects({ canvasWidth: 960, top: 0, slotHeight: 96, slotCount: 6, gapPx: 8 });
    expect(rects.map((r) => r.index)).toEqual([0, 1, 2, 3, 4, 5]);
    for (let i = 1; i < rects.length; i++) {
      expect(rects[i].x).toBeGreaterThan(rects[i - 1].x);
    }
  });

  it("returns an empty array for a zero (or negative) slot count instead of dividing by it", () => {
    expect(computeHotbarSlotRects({ canvasWidth: 960, top: 0, slotHeight: 96, slotCount: 0, gapPx: 8 })).toEqual([]);
    expect(computeHotbarSlotRects({ canvasWidth: 960, top: 0, slotHeight: 96, slotCount: -1, gapPx: 8 })).toEqual([]);
  });

  it("still fits fully within the canvas for a slot count that doesn't evenly divide it", () => {
    const rects = computeHotbarSlotRects({ canvasWidth: 960, top: 0, slotHeight: 96, slotCount: 5, gapPx: 8 });
    expect(rects).toHaveLength(5);
    const last = rects[rects.length - 1];
    expect(last.x + last.width).toBeLessThanOrEqual(960);
  });
});

describe("computeCooldownDisplay", () => {
  it("reports ready with a full fraction when there's no remaining cooldown", () => {
    expect(computeCooldownDisplay(0, 2000)).toEqual({ isReady: true, fractionReady: 1, label: "ready" });
  });

  it("reports ready when totalMs is non-positive, regardless of remainingMs (defensive, shouldn't happen in practice)", () => {
    expect(computeCooldownDisplay(500, 0)).toEqual({ isReady: true, fractionReady: 1, label: "ready" });
  });

  it("reports the remaining time as a one-decimal seconds label while on cooldown", () => {
    const display = computeCooldownDisplay(1234, 2000);
    expect(display.isReady).toBe(false);
    expect(display.label).toBe("1.2s");
  });

  it("computes fractionReady as elapsed-over-total, 0 right after casting and approaching 1 near expiry", () => {
    expect(computeCooldownDisplay(2000, 2000).fractionReady).toBeCloseTo(0, 5);
    expect(computeCooldownDisplay(500, 2000).fractionReady).toBeCloseTo(0.75, 5);
    expect(computeCooldownDisplay(1, 2000).fractionReady).toBeCloseTo(0.9995, 4);
  });

  it("clamps remainingMs above totalMs rather than reporting a fraction below 0", () => {
    const display = computeCooldownDisplay(5000, 2000);
    expect(display.fractionReady).toBe(0);
    expect(display.label).toBe("2.0s");
  });
});

describe("formatShapeWeightTag", () => {
  // Heckler 2026-08-02 (7), BLOCKING — the un-abbreviated `[shape/weight]` tag ranged from 12
  // characters (`[line/light]`) to 17 (`[circle/standard]`, `thunder_dome`'s tag, the one that
  // actually overflowed its slot in the default loadout) depending on which of the 3 shapes x 3
  // weights = 9 combinations a spell had, and nobody re-checked the worst case against the
  // narrower post-icon text budget. Enumerating all 9 combinations here (not just the one
  // Heckler happened to catch) is the actual regression guard: if a future weight/shape name
  // change ever makes one combination longer than the rest again, this test's fixed-length
  // assertion catches it immediately, rather than relying on someone noticing a live overlap.
  const SHAPES: AoEShape[] = ["line", "cone", "circle"];
  const WEIGHTS: Weight[] = ["light", "standard", "heavy"];
  const ALL_COMBINATIONS: Array<[AoEShape, Weight]> = SHAPES.flatMap((shape) =>
    WEIGHTS.map((weight): [AoEShape, Weight] => [shape, weight])
  );

  it("covers all 3 shapes x 3 weights = 9 combinations (not just the one that overflowed)", () => {
    expect(ALL_COMBINATIONS).toHaveLength(9);
  });

  it("formats every one of the 9 combinations to the exact same 9-character length", () => {
    for (const [shape, weight] of ALL_COMBINATIONS) {
      expect(formatShapeWeightTag(shape, weight)).toHaveLength(9);
    }
  });

  it("formats the specific combination that overflowed (thunder_dome, circle/standard) to a short, bracketed tag", () => {
    expect(formatShapeWeightTag("circle", "standard")).toBe("[cir/std]");
  });

  it("formats the shortest un-abbreviated combination (line/light) consistently with the rest", () => {
    expect(formatShapeWeightTag("line", "light")).toBe("[lin/lgt]");
  });

  it("never produces two different combinations with the same abbreviation (no ambiguity introduced by shortening)", () => {
    const tags = ALL_COMBINATIONS.map(([shape, weight]) => formatShapeWeightTag(shape, weight));
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe("hotbarSlotIndexAtPoint", () => {
  // Issue #198 — click-to-arm. Same rects `SpellroadScene.ts` renders from, so this test's
  // fixture doubles as a regression guard for the real 6-slot row layout.
  const rects = computeHotbarSlotRects({ canvasWidth: 960, top: 424, slotHeight: 96, slotCount: 6, gapPx: 8 });

  it("returns the index of the slot a point falls inside", () => {
    const slot2 = rects[2];
    const midX = slot2.x + slot2.width / 2;
    const midY = slot2.y + slot2.height / 2;
    expect(hotbarSlotIndexAtPoint(rects, midX, midY)).toBe(2);
  });

  it("is inclusive at a slot's exact edges", () => {
    const slot0 = rects[0];
    expect(hotbarSlotIndexAtPoint(rects, slot0.x, slot0.y)).toBe(0);
    expect(hotbarSlotIndexAtPoint(rects, slot0.x + slot0.width, slot0.y + slot0.height)).toBe(0);
  });

  it("returns null for a point in the inter-slot gap", () => {
    const slot0 = rects[0];
    const gapMidX = slot0.x + slot0.width + 4; // gapPx is 8, so +4 lands mid-gap
    expect(hotbarSlotIndexAtPoint(rects, gapMidX, slot0.y + 10)).toBeNull();
  });

  it("returns null for a point above or below the row entirely", () => {
    expect(hotbarSlotIndexAtPoint(rects, 100, 0)).toBeNull();
    expect(hotbarSlotIndexAtPoint(rects, 100, 1000)).toBeNull();
  });

  it("returns null for an empty rects array instead of throwing", () => {
    expect(hotbarSlotIndexAtPoint([], 100, 100)).toBeNull();
  });
});

describe("nextHotbarIndex", () => {
  it("steps forward by one within bounds", () => {
    expect(nextHotbarIndex(0, 6, 1)).toBe(1);
    expect(nextHotbarIndex(4, 6, 1)).toBe(5);
  });

  it("steps backward by one within bounds", () => {
    expect(nextHotbarIndex(5, 6, -1)).toBe(4);
    expect(nextHotbarIndex(1, 6, -1)).toBe(0);
  });

  it("wraps forward from the last slot to the first", () => {
    expect(nextHotbarIndex(5, 6, 1)).toBe(0);
  });

  it("wraps backward from the first slot to the last", () => {
    expect(nextHotbarIndex(0, 6, -1)).toBe(5);
  });

  it("starts at slot 0 going forward when nothing is currently armed", () => {
    expect(nextHotbarIndex(-1, 6, 1)).toBe(0);
  });

  it("starts at the last slot going backward when nothing is currently armed", () => {
    expect(nextHotbarIndex(-1, 6, -1)).toBe(5);
  });

  it("returns -1 for a non-positive slot count instead of dividing by it", () => {
    expect(nextHotbarIndex(0, 0, 1)).toBe(-1);
    expect(nextHotbarIndex(-1, -1, -1)).toBe(-1);
  });

  it("is a no-op cycle of one when there is exactly one slot", () => {
    expect(nextHotbarIndex(0, 1, 1)).toBe(0);
    expect(nextHotbarIndex(0, 1, -1)).toBe(0);
  });
});
