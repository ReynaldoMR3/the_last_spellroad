import type { SpellDefinition } from "../data/types";

/**
 * Pure, Phaser-free logic backing the default hotbar loadout (issue #71's decision) — same
 * seam convention as `waveEnemyCounts.ts`/`hotbarLayout.ts`: the actual selection lives here;
 * `SpellroadScene.create` just assigns the result to `equippedSpells`.
 *
 * Replaces the previous code-owned `DEFAULT_LOADOUT_IDS` array: the audit
 * (`docs/audits/2026-08-02-json-content-architecture.md`, finding #1) found half the shipped
 * spells were unreachable through the UI because that array was a hardcoded six-ID allowlist,
 * contradicting the already-locked "swap loadout freely between expeditions" design. Reachability
 * now comes from each spell's own `default_loadout_slot` in `spells.json`, so Frieren can curate
 * the default loadout without an engine change. Full player-facing loadout swapping is still
 * separate future work — this only moves *which six spells start equipped* into data.
 */
export function selectDefaultLoadout(spells: SpellDefinition[]): SpellDefinition[] {
  return spells
    .filter((spell): spell is SpellDefinition & { default_loadout_slot: number } => spell.default_loadout_slot !== undefined)
    .sort((a, b) => a.default_loadout_slot - b.default_loadout_slot);
}
