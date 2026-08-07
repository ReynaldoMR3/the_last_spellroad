import { describe, expect, it } from "vitest";
import { computeStrafeDirection } from "./rangedStrafe";

const LANE_TOP = 130;
const LANE_BOTTOM = 410;
const MARGIN = 50;

describe("computeStrafeDirection", () => {
  it("keeps drifting downward when nowhere near the bottom margin", () => {
    expect(computeStrafeDirection(270, LANE_TOP, LANE_BOTTOM, MARGIN, 1)).toBe(1);
  });

  it("keeps drifting upward when nowhere near the top margin", () => {
    expect(computeStrafeDirection(270, LANE_TOP, LANE_BOTTOM, MARGIN, -1)).toBe(-1);
  });

  it("flips to upward once drifting downward crosses into the bottom margin", () => {
    expect(computeStrafeDirection(LANE_BOTTOM - MARGIN, LANE_TOP, LANE_BOTTOM, MARGIN, 1)).toBe(-1);
    expect(computeStrafeDirection(LANE_BOTTOM, LANE_TOP, LANE_BOTTOM, MARGIN, 1)).toBe(-1);
  });

  it("flips to downward once drifting upward crosses into the top margin", () => {
    expect(computeStrafeDirection(LANE_TOP + MARGIN, LANE_TOP, LANE_BOTTOM, MARGIN, -1)).toBe(1);
    expect(computeStrafeDirection(LANE_TOP, LANE_TOP, LANE_BOTTOM, MARGIN, -1)).toBe(1);
  });

  it("does not flip a downward drift just because it's near the top (only its own direction's margin matters)", () => {
    expect(computeStrafeDirection(LANE_TOP + 1, LANE_TOP, LANE_BOTTOM, MARGIN, 1)).toBe(1);
  });
});
