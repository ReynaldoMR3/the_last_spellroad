import type { WaveDefinition } from "../data/types";

/**
 * Dev-only: jump straight to a level's first wave via `?debugLevel=<n>` instead of playing
 * through every prior level first. Requested directly by the developer (2026-08-07) after
 * reviewing #135's Level 5 boss-banner/SFX fixes needed an actual Level 5 playtest, not a
 * Level 1 one, and this game has no other way to skip ahead. Pure aside from reading
 * `location.search`, same convention as `dev/prototypeHarness.ts`'s `resolveBootScenes` --
 * pass `search` explicitly in tests instead of relying on the global.
 *
 * Resolves against the real flattened `waves` array (each entry's own `level` field) rather
 * than a hardcoded wave-index constant, so it stays correct if a level's wave count ever
 * changes. Silently falls back to a normal wave-0 start for a missing/malformed/unknown
 * `debugLevel` -- this is a convenience shortcut, not a feature surface that needs to reject
 * bad input loudly.
 */
export function resolveDebugStartWave(
  waves: readonly WaveDefinition[],
  search: string = typeof window !== "undefined" ? window.location.search : ""
): number {
  const raw = new URLSearchParams(search).get("debugLevel");
  if (raw === null) {
    return 0;
  }
  const level = Number.parseInt(raw, 10);
  if (!Number.isFinite(level)) {
    return 0;
  }
  const index = waves.findIndex((w) => w.level === level);
  return index === -1 ? 0 : index;
}
