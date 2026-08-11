/**
 * Issue #157 — the four Side-Pocket Lore Encounters, one per regular level (1-4), none for
 * the Level 5 Invigilator trial. Code-owned by design (ticket's Implementation Decisions:
 * "Keep this catalog code-owned... must not create a new lore JSON architecture" — the
 * earlier JSON-extensibility decision already deferred a general lore-ingestion seam, same
 * precedent `spells.json`/`waves/*.json` don't apply to hand-authored, closed-vocabulary
 * content like this).
 *
 * Lore sentences are reused verbatim from Lorena's authored item lore
 * (`docs/agents/lorena/log.md`) — this ticket explicitly forbids a new prose batch.
 *
 * `marker`/`presentation` are Loomwright's own placement/rendering call (per the ticket:
 * "reachable, visibly off the direct route" within the existing playable lane), not new
 * design authority — they only affect where/how `SpellroadScene` draws the reactive rune,
 * never movement bounds, collision, spawning, targeting, or spell-preview clipping.
 */

export interface SidePocketMarkerPlacement {
  /** World-space position within the mage's walkable lane (`LANE_RECT` in `SpellroadScene`). */
  x: number;
  y: number;
  /** Radius (px) within which the mage's proximity triggers the reactive glow. */
  proximityRadiusPx: number;
}

export interface SidePocketPresentation {
  /** Tint applied to the rune marker's glow while undiscovered/reactive. */
  runeColor: number;
  /** Tint applied once discovered — dimmer, "quiet" per issue #157 story 23. */
  quietColor: number;
}

export interface SidePocketEncounter {
  /** Stable identity — never reused/renumbered once shipped (persisted indirectly via `loreFlag`). */
  id: string;
  /** The regular level (1-4) this encounter is offered after. */
  level: number;
  /** Persisted in `PersistentMetadata.loreFlags` (existing save field — no schema change). */
  loreFlag: string;
  objectName: string;
  /** Verbatim from Lorena's authored item lore — never edited here. */
  loreSentence: string;
  /** Fixed at 2 per the resolved #160 reward decision; 4 encounters x 2 = 8 total. */
  rewardHexcoin: number;
  marker: SidePocketMarkerPlacement;
  presentation: SidePocketPresentation;
}

const PROXIMITY_RADIUS_PX = 70;

export const SIDE_POCKET_ENCOUNTERS: readonly SidePocketEncounter[] = [
  {
    id: "level-1-blank-waymark",
    level: 1,
    loreFlag: "side-pocket:level-1:blank-waymark",
    objectName: "Blank Waymark",
    loreSentence:
      "A page that means to be a map. Every time you look away, it forgets your steps and starts again.",
    rewardHexcoin: 2,
    marker: { x: 260, y: 180, proximityRadiusPx: PROXIMITY_RADIUS_PX },
    presentation: { runeColor: 0xdff2ff, quietColor: 0x5a6675 }
  },
  {
    id: "level-2-murmur-glass-vial",
    level: 2,
    loreFlag: "side-pocket:level-2:murmur-glass-vial",
    objectName: "Murmur-Glass Vial",
    loreSentence:
      "Sealed glass that once held a wisp's murmuring drain. Hold it to your ear and you can still hear it trying to hum.",
    rewardHexcoin: 2,
    marker: { x: 420, y: 372, proximityRadiusPx: PROXIMITY_RADIUS_PX },
    presentation: { runeColor: 0xb7f2d0, quietColor: 0x557064 }
  },
  {
    id: "level-3-root-cellar-key",
    level: 3,
    loreFlag: "side-pocket:level-3:root-cellar-key",
    objectName: "Root-Cellar Key",
    loreSentence:
      "Opens nothing on this stretch of road. Someone still carries it anyway, the way you'd carry a door you weren't ready to walk back through.",
    rewardHexcoin: 2,
    marker: { x: 600, y: 178, proximityRadiusPx: PROXIMITY_RADIUS_PX },
    presentation: { runeColor: 0xf2d9b7, quietColor: 0x726456 }
  },
  {
    id: "level-4-chalked-ledger-scrap",
    level: 4,
    loreFlag: "side-pocket:level-4:chalked-ledger-scrap",
    objectName: "Chalked Ledger Scrap",
    loreSentence:
      "A torn corner of the Director's endless tally, one column of Hexcoin sums cut off mid-row. Whatever debt it was totaling, it isn't finished totaling it.",
    rewardHexcoin: 2,
    marker: { x: 760, y: 368, proximityRadiusPx: PROXIMITY_RADIUS_PX },
    presentation: { runeColor: 0xe8c2f2, quietColor: 0x6c5a72 }
  }
];

/** One encounter per level by construction (see the catalog invariants test) — `Array.find`
 * is sufficient, no need for a Map keyed by level. */
export function findSidePocketEncounter(level: number): SidePocketEncounter | undefined {
  return SIDE_POCKET_ENCOUNTERS.find((encounter) => encounter.level === level);
}
