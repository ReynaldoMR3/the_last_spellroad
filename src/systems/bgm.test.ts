import { describe, expect, it } from "vitest";
import {
  BOSS_THEME_KEY,
  BOSS_THEME_URL,
  BOSS_THEME_VOLUME,
  COMBAT_CUE_KEY,
  COMBAT_CUE_URL,
  COMBAT_CUE_VOLUME,
  shouldPlayCombatCueForWave
} from "./bgm";
import wavesLevel1Data from "../data/waves/level-1.json";
import wavesBoss1Data from "../data/waves/boss-1.json";
import type { WaveDefinition } from "../data/types";

function wave(overrides: Partial<WaveDefinition> = {}): WaveDefinition {
  return { level: 1, wave_index: 0, enemies: [], hp_modifier: 1, damage_modifier: 1, ...overrides };
}

describe("shouldPlayCombatCueForWave", () => {
  it("claims an ordinary wave — the case issue #142 exists for", () => {
    expect(shouldPlayCombatCueForWave(wave())).toBe(true);
  });

  it("does not claim a boss wave, so the Director trial theme is never doubled up with it", () => {
    expect(shouldPlayCombatCueForWave(wave({ level: 5, is_boss: true }))).toBe(false);
  });

  it("does not claim a boss wave at any phase index, not just Phase 1", () => {
    expect(shouldPlayCombatCueForWave(wave({ level: 5, wave_index: 2, is_boss: true }))).toBe(false);
  });

  it("treats an explicit is_boss:false the same as an absent flag (regular levels omit it)", () => {
    expect(shouldPlayCombatCueForWave(wave({ is_boss: false }))).toBe(true);
  });

  it("returns false for a missing wave, so a past-the-end index never starts music", () => {
    expect(shouldPlayCombatCueForWave(undefined)).toBe(false);
  });

  // Against the real shipped wave data, not only hand-built fixtures: the predicate has to
  // partition the actual campaign the way the brief assumes (every Level 1-4 wave is combat-cue
  // territory; every Level 5 phase belongs to the trial theme).
  it("claims every authored Level 1 wave", () => {
    const waves = wavesLevel1Data as WaveDefinition[];
    expect(waves.length).toBeGreaterThan(0);
    expect(waves.every((w) => shouldPlayCombatCueForWave(w))).toBe(true);
  });

  it("claims no authored boss-1 phase", () => {
    const waves = wavesBoss1Data as WaveDefinition[];
    expect(waves.length).toBeGreaterThan(0);
    expect(waves.some((w) => shouldPlayCombatCueForWave(w))).toBe(false);
  });
});

describe("bgm asset identity", () => {
  it("keeps the two tracks on distinct cache keys and distinct files", () => {
    expect(COMBAT_CUE_KEY).not.toBe(BOSS_THEME_KEY);
    expect(COMBAT_CUE_URL).not.toBe(BOSS_THEME_URL);
  });

  it("points the combat cue at the asset Composer shipped for issue #142", () => {
    expect(COMBAT_CUE_URL).toBe("assets/audio/music/combat-encounter-loop.ogg");
  });

  it("keeps both tracks below the one-shot SFX, with the busier combat cue no louder", () => {
    expect(COMBAT_CUE_VOLUME).toBeGreaterThan(0);
    expect(COMBAT_CUE_VOLUME).toBeLessThanOrEqual(BOSS_THEME_VOLUME);
    expect(BOSS_THEME_VOLUME).toBeLessThan(1);
  });
});
