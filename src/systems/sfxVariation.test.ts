import { describe, expect, it } from "vitest";
import { DETUNE_RANGE_CENTS, VOLUME_MAX, VOLUME_MIN, computeSfxVariation } from "./sfxVariation";

describe("computeSfxVariation", () => {
  it("centers detune at 0 cents when the random source returns 0.5", () => {
    const v = computeSfxVariation(() => 0.5);
    expect(v.detune).toBe(0);
  });

  it("spans the full +/-DETUNE_RANGE_CENTS range at the random source's extremes", () => {
    expect(computeSfxVariation(() => 0).detune).toBe(-DETUNE_RANGE_CENTS);
    expect(computeSfxVariation(() => 1).detune).toBe(DETUNE_RANGE_CENTS);
  });

  it("spans the full VOLUME_MIN..VOLUME_MAX range at the random source's extremes", () => {
    expect(computeSfxVariation(() => 0).volume).toBe(VOLUME_MIN);
    expect(computeSfxVariation(() => 1).volume).toBe(VOLUME_MAX);
  });

  it("uses independent random draws for detune and volume, not one shared value", () => {
    const calls: number[] = [];
    const v = computeSfxVariation(() => {
      calls.push(calls.length);
      return calls.length === 1 ? 0 : 1;
    });
    expect(v.detune).toBe(-DETUNE_RANGE_CENTS);
    expect(v.volume).toBe(VOLUME_MAX);
  });

  it("defaults to Math.random when no random source is given, producing values in range", () => {
    const v = computeSfxVariation();
    expect(v.detune).toBeGreaterThanOrEqual(-DETUNE_RANGE_CENTS);
    expect(v.detune).toBeLessThanOrEqual(DETUNE_RANGE_CENTS);
    expect(v.volume).toBeGreaterThanOrEqual(VOLUME_MIN);
    expect(v.volume).toBeLessThanOrEqual(VOLUME_MAX);
  });
});
