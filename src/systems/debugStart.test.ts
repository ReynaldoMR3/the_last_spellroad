import { describe, expect, it } from "vitest";
import { resolveDebugStartWave } from "./debugStart";
import type { WaveDefinition } from "../data/types";

function wave(level: number, wave_index: number): WaveDefinition {
  return {
    level,
    wave_index,
    enemies: [],
    hp_modifier: 1,
    damage_modifier: 1
  } as WaveDefinition;
}

describe("resolveDebugStartWave", () => {
  const waves = [
    wave(1, 0),
    wave(1, 1),
    wave(1, 2),
    wave(2, 0),
    wave(2, 1),
    wave(5, 0),
    wave(5, 1)
  ];

  it("returns wave index 0 when no ?debugLevel= param is present", () => {
    expect(resolveDebugStartWave(waves, "")).toBe(0);
  });

  it("returns the index of the requested level's first wave", () => {
    expect(resolveDebugStartWave(waves, "?debugLevel=2")).toBe(3);
  });

  it("resolves the boss level (5) to its first phase", () => {
    expect(resolveDebugStartWave(waves, "?debugLevel=5")).toBe(5);
  });

  it("falls back to wave index 0 for a level with no matching wave", () => {
    expect(resolveDebugStartWave(waves, "?debugLevel=99")).toBe(0);
  });

  it("falls back to wave index 0 for a non-numeric value", () => {
    expect(resolveDebugStartWave(waves, "?debugLevel=abc")).toBe(0);
  });

  it("rejects a numeric prefix with trailing junk instead of partially parsing it", () => {
    expect(resolveDebugStartWave(waves, "?debugLevel=2oops")).toBe(0);
  });

  it("rejects fractional levels instead of truncating them", () => {
    expect(resolveDebugStartWave(waves, "?debugLevel=2.5")).toBe(0);
  });

  it("rejects exponent and hexadecimal spellings instead of treating them as decimal levels", () => {
    expect(resolveDebugStartWave(waves, "?debugLevel=2e0")).toBe(0);
    expect(resolveDebugStartWave(waves, "?debugLevel=0x2")).toBe(0);
  });

  it("ignores unrelated query params", () => {
    expect(resolveDebugStartWave(waves, "?foo=bar&debugLevel=2")).toBe(3);
  });
});
