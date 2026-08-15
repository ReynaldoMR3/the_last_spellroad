/**
 * Issue #157 — the pure, Phaser-free post-level exploration controller for Side-Pocket Lore
 * Encounters. Same seam convention as `waveSession.ts`/`waveThreatBudget.ts`/etc: the rules
 * governing "does clearing this wave offer an encounter" and "what does Explore actually
 * change" are testable in isolation here; `SpellroadScene` only renders the marker/prompt,
 * binds `E`/`C`, and applies the effects this module returns (mutate `loreFlags`, call
 * `HexcoinSystem.awardPermanent`, call `persistProgress`) — the ticket's own "Phaser
 * responsibilities limited to rendering, proximity presentation, input binding, and applying
 * controller effects" decision.
 *
 * Deliberately two small pure functions rather than a stateful class: unlike `WaveSession`
 * (which owns a generation counter that has to persist across calls), this controller has no
 * state of its own to own — every decision is a function of the wave just cleared, the
 * catalog, and the current persistent lore flags, all supplied fresh by the caller each time.
 * The generation/phase guard that protects a stale callback still exists, but it lives on
 * `WaveSession` (`beginEncounterChoice`/`canResolveEncounterChoice`) exactly like the boss
 * phase-break's does, not duplicated here.
 */

import type { WaveDefinition } from "../data/types";
import type { WavePhase } from "./waveSession";
import { SIDE_POCKET_ENCOUNTERS, type SidePocketEncounter } from "../data/sidePocketEncounters";

export interface SidePocketOfferDecision {
  offer: boolean;
  encounter?: SidePocketEncounter;
}

/**
 * Decides whether clearing `wave` should pause progression and offer its level's Side-Pocket
 * Lore Encounter instead of auto-advancing to `next`.
 *
 * `next` mirrors `SpellroadScene.updateEnemies`'s own `this.waves[this.waveIndex + 1]` —
 * `undefined` at the very end of the flattened wave list is exactly equivalent to "the next
 * wave belongs to a different level" for this purpose.
 */
export function evaluateSidePocketOffer(
  wave: WaveDefinition,
  next: WaveDefinition | undefined,
  loreFlags: readonly string[],
  catalog: readonly SidePocketEncounter[] = SIDE_POCKET_ENCOUNTERS
): SidePocketOfferDecision {
  const isFinalWaveOfLevel = !next || next.level !== wave.level;
  if (wave.is_boss || !isFinalWaveOfLevel) {
    return { offer: false };
  }

  const encounter = catalog.find((entry) => entry.level === wave.level);
  if (!encounter || loreFlags.includes(encounter.loreFlag)) {
    return { offer: false };
  }

  return { offer: true, encounter };
}

export interface SidePocketExploreResult {
  /** False when the guard below caught an already-discovered flag — no flag/reward changed. */
  applied: boolean;
  encounter: SidePocketEncounter;
  /** 0 when `applied` is false. */
  rewardHexcoin: number;
  /** New array (input is never mutated) — the caller assigns this back to persistent state. */
  updatedLoreFlags: string[];
}

/**
 * Resolves an Explore action against `encounter`. Idempotent on the lore-flag itself (not
 * just on the scene's generation-token guard) — the ticket's "duplicate Explore actions...
 * cannot duplicate the lore flag or reward" requirement holds even if this function is ever
 * called twice with flags that already include the encounter's flag, independent of whether
 * the caller's own token guard (`canResolveEncounterChoice`) already should have prevented
 * the second call.
 */
export function resolveSidePocketExplore(
  encounter: SidePocketEncounter,
  loreFlags: readonly string[]
): SidePocketExploreResult {
  if (loreFlags.includes(encounter.loreFlag)) {
    return { applied: false, encounter, rewardHexcoin: 0, updatedLoreFlags: [...loreFlags] };
  }

  return {
    applied: true,
    encounter,
    rewardHexcoin: encounter.rewardHexcoin,
    updatedLoreFlags: [...loreFlags, encounter.loreFlag]
  };
}

/**
 * Issue #239 (replaces #210, closed) — playtesters found the reactive rune marker itself
 * ("the circle on the ground") confusing: it pulses on proximity from the very first wave of
 * its level, but the Explore/Continue prompt (`startSidePocketChoice`, above) doesn't actually
 * appear until that level's *final* wave clears — so a player who walks up to it mid-level and
 * presses E gets no response at all, with nothing on screen explaining why. Developer decision
 * (2026-08-13): add a short on-screen text hint on proximity that states the interaction in
 * plain terms, instead of leaving the marker's visual to be inferred. Deliberately narrow: this
 * governs only whether/what that hint reads — it never touches `evaluateSidePocketOffer`'s own
 * gate (still only the final wave of a level) or `resolveSidePocketExplore`'s reward/flag logic
 * (both already validated in #218), matching the ticket's explicit scope note.
 */
export const SIDE_POCKET_HINT_TEXT =
  "A faint rune glints underfoot. Clear the road ahead, then press [E] to explore.";

/**
 * The hint only makes sense while: the mage is actually in proximity (`inRange`), the marker's
 * lore hasn't already been revealed (an undiscovered-only affordance — a `discovered` marker
 * already shows its lore permanently via `startSidePocketChoice`'s own prompt, so a duplicate
 * "press E" hint over it would be redundant/stale), and no other keyboard-choice prompt is
 * currently occupying the screen (`phase !== "running"` means a boss phase-break or this same
 * encounter's own Explore/Continue prompt is already up — layering this hint on top of either
 * would visually collide with a prompt that's already telling the player what to do).
 */
export function shouldShowSidePocketHint(
  inRange: boolean,
  discovered: boolean,
  phase: WavePhase
): boolean {
  return inRange && !discovered && phase === "running";
}
