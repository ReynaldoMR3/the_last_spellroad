import { describe, expect, it } from "vitest";
import type { WaveDefinition } from "../data/types";
import { bossElementalAffordanceText, resolveBossWavePresentation } from "./bossElementalAffordance";

function phase(wave_index: number, withUniqueBoss = false): WaveDefinition {
  return {
    level: 5,
    wave_index,
    is_boss: true,
    hp_modifier: 1,
    damage_modifier: 1,
    enemies: withUniqueBoss
      ? [{
          type: "monster_boss_01",
          archetype: "melee",
          element: "fire",
          resistant_elements: ["ice", "lightning"],
          count: 1,
          spawn_delay_ms: 2000
        }]
      : [{ type: "monster_m01", archetype: "melee", element: "fire", count: 1, spawn_delay_ms: 0 }]
  };
}

describe("bossElementalAffordanceText", () => {
  it("persistently announces the boss element and both resistances through legend-linked motifs", () => {
    expect(bossElementalAffordanceText("fire", ["ice", "lightning"])).toBe(
      "⚔ Final Trial   ▲ Fire   ◎ Resists ◆ Ice + ϟ Lightning"
    );
  });

  it("does not expose authored monster IDs or archetype names", () => {
    expect(bossElementalAffordanceText("fire", ["ice", "lightning"]))
      .not.toMatch(/monster|melee|ranged|debuffer/i);
  });
});

describe("resolveBossWavePresentation", () => {
  const waves = [phase(3), phase(4), phase(5, true)];

  it("binds the resistance cue only to the active wave containing the unique boss", () => {
    expect(resolveBossWavePresentation(waves, 0)).toEqual({
      initializeTrial: true,
      phaseNumber: 1,
      affordanceText: undefined
    });
    expect(resolveBossWavePresentation(waves, 1)).toEqual({
      initializeTrial: false,
      phaseNumber: 2,
      affordanceText: undefined
    });
    expect(resolveBossWavePresentation(waves, 2)).toEqual({
      initializeTrial: false,
      phaseNumber: 3,
      affordanceText: "⚔ Final Trial   ▲ Fire   ◎ Resists ◆ Ice + ϟ Lightning"
    });
  });

  it("initializes the active final phase when reached through a direct debug entry", () => {
    expect(resolveBossWavePresentation(waves, 2, true)).toMatchObject({
      initializeTrial: true,
      phaseNumber: 3,
      affordanceText: "⚔ Final Trial   ▲ Fire   ◎ Resists ◆ Ice + ϟ Lightning"
    });
  });
});
