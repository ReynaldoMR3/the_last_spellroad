import { describe, expect, it } from "vitest";
import {
  BOSS_THEME_KEY,
  BOSS_THEME_URL,
  BOSS_THEME_VOLUME,
  COMBAT_CUE_KEY,
  COMBAT_CUE_URL,
  COMBAT_CUE_VOLUME,
  EXPLORATION_LOOP_KEYS,
  EXPLORATION_LOOP_URLS,
  EXPLORATION_LOOP_VOLUME,
  pickExplorationTrack,
  shouldPlayCombatCueForWave,
  shouldPlayExplorationLoopBetweenWaves,
  type ExplorationLoopKey
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

// Issue #188 — the inverse boundary: the cue owns a wave being fought, this owns the gap after
// one clears. The two predicates must never both claim the same moment, which is what the
// mutual-exclusion cases below actually check.
describe("shouldPlayExplorationLoopBetweenWaves", () => {
  it("claims the gap between two ordinary waves — the silence the developer reported", () => {
    expect(shouldPlayExplorationLoopBetweenWaves(wave(), wave({ wave_index: 1 }))).toBe(true);
  });

  it("claims the gap the Side-Pocket Explore/Continue prompt sits in (a level's final wave)", () => {
    // Issue #157 offers the prompt at a level's last wave, so the next wave is the next level's
    // first — still an ordinary wave, so the interlude covers the whole prompt.
    const finalWaveOfLevel = wave({ level: 1, wave_index: 3 });
    const firstWaveOfNextLevel = wave({ level: 2, wave_index: 0 });
    expect(shouldPlayExplorationLoopBetweenWaves(finalWaveOfLevel, firstWaveOfNextLevel)).toBe(true);
  });

  it("does not claim a boss phase-break — the Director trial theme owns that space entirely", () => {
    const phase1 = wave({ level: 5, wave_index: 0, is_boss: true });
    const phase2 = wave({ level: 5, wave_index: 1, is_boss: true });
    expect(shouldPlayExplorationLoopBetweenWaves(phase1, phase2)).toBe(false);
  });

  it("does not claim the Level 4 -> Level 5 handoff, so nothing plays under the boss intro", () => {
    const lastOrdinaryWave = wave({ level: 4, wave_index: 3 });
    const bossPhase1 = wave({ level: 5, wave_index: 0, is_boss: true });
    expect(shouldPlayExplorationLoopBetweenWaves(lastOrdinaryWave, bossPhase1)).toBe(false);
  });

  it("does not claim the end of the slice, where there is no next wave to interlude into", () => {
    expect(shouldPlayExplorationLoopBetweenWaves(wave(), undefined)).toBe(false);
  });

  it("returns false for a missing cleared wave, mirroring the combat cue's own guard", () => {
    expect(shouldPlayExplorationLoopBetweenWaves(undefined, wave())).toBe(false);
  });

  it("never claims a moment the combat cue also claims, for any boss/non-boss combination", () => {
    // The cue is evaluated against the wave being fought; the interlude against the pair around
    // a clear. The overlap that must not exist is "the interlude plays into a wave whose first
    // spawn will start the cue" — the scene resolves that by stopping this on that spawn, so what
    // is checked here is the other direction: the interlude never claims a boss-owned moment.
    for (const clearedIsBoss of [true, false]) {
      for (const nextIsBoss of [true, false]) {
        const cleared = wave({ is_boss: clearedIsBoss });
        const next = wave({ wave_index: 1, is_boss: nextIsBoss });
        if (clearedIsBoss || nextIsBoss) {
          expect(shouldPlayExplorationLoopBetweenWaves(cleared, next)).toBe(false);
        }
      }
    }
  });
});

describe("pickExplorationTrack", () => {
  // A stub sequence rather than a real RNG: the point of injecting `random` is that the rotation
  // is checkable without stubbing globals or accepting a flaky test.
  function sequence(values: number[]): () => number {
    let i = 0;
    return () => values[i++ % values.length];
  }

  it("never repeats the track that played immediately before, over every previous/roll pair", () => {
    for (const previous of EXPLORATION_LOOP_KEYS) {
      // 0 / 0.5 / 0.999 land on each slot of the two-candidate pool, plus its exact edges.
      for (const roll of [0, 0.4999, 0.5, 0.999, 1]) {
        const picked = pickExplorationTrack(previous, EXPLORATION_LOOP_KEYS, () => roll);
        expect(picked).not.toBe(previous);
        expect(EXPLORATION_LOOP_KEYS).toContain(picked);
      }
    }
  });

  it("picks among all three over enough calls, chaining each pick into the next as the scene does", () => {
    const seen = new Set<ExplorationLoopKey>();
    let previous: ExplorationLoopKey | undefined;
    const roll = sequence([0.1, 0.9, 0.6, 0.2, 0.8, 0.4]);
    for (let i = 0; i < 60; i += 1) {
      const picked = pickExplorationTrack(previous, EXPLORATION_LOOP_KEYS, roll);
      expect(picked).toBeDefined();
      expect(picked).not.toBe(previous);
      seen.add(picked as ExplorationLoopKey);
      previous = picked;
    }
    expect(seen.size).toBe(EXPLORATION_LOOP_KEYS.length);
  });

  it("treats no previous track (the first interlude of a session) as every track being eligible", () => {
    expect(pickExplorationTrack(undefined, EXPLORATION_LOOP_KEYS, () => 0)).toBe(
      EXPLORATION_LOOP_KEYS[0]
    );
    expect(pickExplorationTrack(undefined, EXPLORATION_LOOP_KEYS, () => 0.99)).toBe(
      EXPLORATION_LOOP_KEYS[EXPLORATION_LOOP_KEYS.length - 1]
    );
  });

  it("is uniform across the two candidates rather than favouring one", () => {
    const previous = EXPLORATION_LOOP_KEYS[0];
    const counts = new Map<string, number>();
    for (let i = 0; i < 1000; i += 1) {
      const picked = pickExplorationTrack(previous, EXPLORATION_LOOP_KEYS, () => i / 1000);
      counts.set(picked as string, (counts.get(picked as string) ?? 0) + 1);
    }
    expect(counts.size).toBe(2);
    for (const count of counts.values()) {
      expect(count).toBe(500);
    }
  });

  it("falls back to a repeat rather than nothing when there is only one track to choose from", () => {
    const only = [EXPLORATION_LOOP_KEYS[0]];
    expect(pickExplorationTrack(EXPLORATION_LOOP_KEYS[0], only, () => 0.5)).toBe(
      EXPLORATION_LOOP_KEYS[0]
    );
  });

  it("returns undefined for an empty track list, so the scene skips playback instead of crashing", () => {
    expect(pickExplorationTrack(undefined, [], () => 0.5)).toBeUndefined();
  });
});

describe("bgm asset identity", () => {
  it("keeps the two tracks on distinct cache keys and distinct files", () => {
    expect(COMBAT_CUE_KEY).not.toBe(BOSS_THEME_KEY);
    expect(COMBAT_CUE_URL).not.toBe(BOSS_THEME_URL);
  });

  it("ships three interlude variants, all on distinct cache keys and distinct files", () => {
    expect(EXPLORATION_LOOP_KEYS).toHaveLength(3);
    expect(new Set(EXPLORATION_LOOP_KEYS).size).toBe(3);
    const urls = EXPLORATION_LOOP_KEYS.map((key) => EXPLORATION_LOOP_URLS[key]);
    expect(new Set(urls).size).toBe(3);
  });

  it("keeps the interlude keys distinct from the boss theme's and the combat cue's", () => {
    for (const key of EXPLORATION_LOOP_KEYS) {
      expect(key).not.toBe(BOSS_THEME_KEY);
      expect(key).not.toBe(COMBAT_CUE_KEY);
    }
  });

  it("points the first interlude variant at the original track issue #125 removed", () => {
    expect(EXPLORATION_LOOP_URLS[EXPLORATION_LOOP_KEYS[0]]).toBe(
      "assets/audio/music/exploration-loop-original.ogg"
    );
  });

  it("keeps the interlude at the combat cue's level so the handoff isn't a volume change", () => {
    expect(EXPLORATION_LOOP_VOLUME).toBe(COMBAT_CUE_VOLUME);
    expect(EXPLORATION_LOOP_VOLUME).toBeLessThan(1);
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
