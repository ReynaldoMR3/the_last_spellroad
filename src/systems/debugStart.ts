import type { WaveDefinition } from "../data/types";

/**
 * Dev-only: jump straight to a level's first wave via `?debugLevel=<n>` instead of playing
 * through every prior level first. Resolves against the real flattened wave array so the
 * shortcut cannot drift when earlier levels gain or lose waves.
 */
export function resolveDebugStartWave(
  waves: readonly WaveDefinition[],
  search: string = typeof window !== "undefined" ? window.location.search : ""
): number {
  const raw = new URLSearchParams(search).get("debugLevel");
  if (raw === null) {
    return 0;
  }
  if (!/^[1-9]\d*$/.test(raw)) {
    return 0;
  }
  const level = Number(raw);
  if (!Number.isInteger(level)) {
    return 0;
  }
  const index = waves.findIndex((wave) => wave.level === level);
  return index === -1 ? 0 : index;
}
