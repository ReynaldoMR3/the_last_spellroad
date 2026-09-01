import type { WaveDefinition } from "../data/types";

/**
 * Dev-only: jump to a level's first wave via `?debugLevel=<n>`, or an exact wave inside it
 * with `?debugLevel=<n>&debugWave=<zero-based-index>`. Resolves against the real flattened
 * wave array so the shortcut cannot drift when earlier levels gain or lose waves.
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
  const rawWave = new URLSearchParams(search).get("debugWave");
  if (rawWave !== null && !/^\d+$/.test(rawWave)) {
    return 0;
  }
  const requestedWave = rawWave === null ? undefined : Number(rawWave);
  const index = waves.findIndex((wave) =>
    wave.level === level && (requestedWave === undefined || wave.wave_index === requestedWave)
  );
  return index === -1 ? 0 : index;
}
