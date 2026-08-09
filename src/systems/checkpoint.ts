import type { WaveDefinition } from "../data/types";
import type { MasteryState } from "./MasterySystem";
import type { SaveBlob } from "./SaveSystem";

/**
 * Final branch review, 2026-08-09 (findings #1/#6 on the goal-oriented-agent's backlog-1.6
 * wiring pass) — extracted out of `SpellroadScene.ts`'s `writeCheckpoint()` so the blob
 * composition is a pure, colocated-tested function instead of inlined object-spread logic.
 *
 * `hexcoinBalance` is deliberately optional and omitted-by-default-behavior, not
 * defaulted-to-`base`'s-value: the Mastery tier-up call site can fire mid-level, at a balance
 * ABOVE that level's real floor (`HexcoinSystem.markLevelStart()`'s recorded value). Writing
 * that mid-level balance into the save would let `HexcoinSystem.restoreBalance()` (on a later
 * `Continue`) install it as the new floor, ratcheting the floor upward across quit/continue
 * cycles with no bound — undermining the Hexcoin fee economy. Passing `hexcoinBalance` only
 * from the level-start and post-death-rollback call sites (where the live balance genuinely
 * equals the floor) closes that: omitting it here leaves whatever `hexcoinBalance` `base`
 * already had (i.e. the last legitimate floor write) untouched.
 */
export function composeCheckpointBlob(
  base: SaveBlob,
  masteryBySpell: Record<string, MasteryState>,
  checkpointId: string | null,
  hexcoinBalance?: number
): SaveBlob {
  return {
    ...base,
    masteryBySpell,
    checkpointId,
    ...(hexcoinBalance !== undefined ? { hexcoinBalance } : {})
  };
}

/**
 * The exact "which wave does a `Continue` resume at" logic formerly inlined in
 * `SpellroadScene.create()`. `checkpointLevel === null` means a fresh game (no save consumed,
 * or a save with no checkpoint yet) — start at the very first wave. Otherwise, resume at the
 * first wave entry carrying that level number; `Math.max(0, ...)` guards against a checkpointed
 * level that no longer exists in `waves` (e.g. stale save data from a since-changed level list)
 * falling back to wave 0 instead of a `-1` index.
 */
export function resolveStartWaveIndex(waves: WaveDefinition[], checkpointLevel: number | null): number {
  if (checkpointLevel === null) {
    return 0;
  }
  return Math.max(0, waves.findIndex((wave) => wave.level === checkpointLevel));
}
