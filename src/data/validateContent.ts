import type { AoEShape, Element, SpellDefinition, WaveDefinition, Weight } from "./types";
import type { EnemyRegistryEntry } from "./enemyRegistry";

/**
 * Pure, Phaser-free content schema/build gate (issue #71's decision) — structural validation
 * of `spells.json`/`waves/*.json` against the TS types, plus the two cross-reference checks
 * Warden/Frieren's and Pato's comments on the ticket asked for.
 *
 * The audit (`docs/audits/2026-08-02-json-content-architecture.md`, finding #10) found
 * "validated JSON" was a process assertion, not an enforced gate: the scene casts Phaser's
 * cache values directly (`this.cache.json.get("spells") as SpellDefinition[]`), and TypeScript
 * interfaces disappear at runtime, so malformed or drifted JSON can pass the cast silently. No
 * new dependency (Zod, JSON Schema, etc.) — this is a hand-rolled check run by
 * `validateContent.test.ts` against the real shipped files, wired into the existing
 * `npm test` gate that `npm run build`/CI already depend on.
 */

const ELEMENTS: Element[] = ["fire", "ice", "earth", "lightning"];
const SHAPES: AoEShape[] = ["line", "cone", "circle"];
const WEIGHTS: Weight[] = ["light", "standard", "heavy"];
const MASTERY_DISCOUNTS = ["cost", "cooldown"];

/** Must match `SpellroadScene.ts`'s `HOTBAR_KEYS.length` — the fixed number of hotbar slots
 * the default loadout (`systems/defaultLoadout.ts`) renders into. Not imported (that file pulls
 * in Phaser, which this module deliberately avoids) — kept in sync by hand, the same convention
 * `Enemy.ts`'s `WALL_SLIDE_MARGIN` / `SpellroadScene.ts`'s `ENEMY_SPAWN_X` already use for a
 * cross-file constant pair. */
const MAX_LOADOUT_SLOTS = 6;

/** Structural validation of every shipped spell, plus the `default_loadout_slot` invariants
 * the data-driven default loadout (issue #71) introduces: no two spells sharing a slot, and no
 * more slotted spells than the hotbar has room to render (either one would previously have
 * failed silently — a duplicate slot fighting for one hotbar position, or a spell past slot 6
 * simply never appearing — instead of surfacing here before the content ships).
 * @returns a human-readable error per problem found; empty when every spell is valid. */
export function validateSpells(spells: SpellDefinition[]): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenSlots = new Map<number, string>();

  for (const spell of spells) {
    const label = typeof spell.id === "string" && spell.id.length > 0 ? spell.id : "<missing id>";

    if (typeof spell.id !== "string" || spell.id.length === 0) {
      errors.push(`Spell ${label}: id must be a non-empty string`);
    } else if (seenIds.has(spell.id)) {
      errors.push(`Spell ${label}: duplicate id`);
    } else {
      seenIds.add(spell.id);
    }
    if (!ELEMENTS.includes(spell.element)) {
      errors.push(`Spell ${label}: unknown element "${spell.element}"`);
    }
    if (!SHAPES.includes(spell.shape)) {
      errors.push(`Spell ${label}: unknown shape "${spell.shape}"`);
    }
    if (!WEIGHTS.includes(spell.weight)) {
      errors.push(`Spell ${label}: unknown weight "${spell.weight}"`);
    }
    if (typeof spell.base_power !== "number") {
      errors.push(`Spell ${label}: base_power must be a number`);
    }
    if (typeof spell.base_targets !== "number") {
      errors.push(`Spell ${label}: base_targets must be a number`);
    }
    if (!MASTERY_DISCOUNTS.includes(spell.master_discount)) {
      errors.push(`Spell ${label}: unknown master_discount "${spell.master_discount}"`);
    }
    if (spell.default_loadout_slot !== undefined) {
      if (!Number.isInteger(spell.default_loadout_slot) || spell.default_loadout_slot < 1) {
        errors.push(`Spell ${label}: default_loadout_slot must be a positive integer`);
      } else if (seenSlots.has(spell.default_loadout_slot)) {
        errors.push(
          `Spell ${label}: default_loadout_slot ${spell.default_loadout_slot} duplicates ${seenSlots.get(spell.default_loadout_slot)}`
        );
      } else {
        seenSlots.set(spell.default_loadout_slot, spell.id);
      }
    }
  }

  if (seenSlots.size > MAX_LOADOUT_SLOTS) {
    errors.push(
      `${seenSlots.size} spells carry a default_loadout_slot, but only ${MAX_LOADOUT_SLOTS} hotbar slots exist — the rest would never render`
    );
  }

  return errors;
}

/** Structural validation of every shipped wave, plus the enemy-registry cross-reference
 * Warden/Frieren's and Pato's ticket comments asked for: an unregistered `type` string is
 * exactly the audit's finding #3 (soft-lock risk if the `waveEnemyCounts.ts` fix weren't also
 * in place) — catching it here means it never reaches promotion in the first place.
 * @returns a human-readable error per problem found; empty when every wave is valid. */
export function validateWaves(waves: WaveDefinition[], registry: Record<string, EnemyRegistryEntry>): string[] {
  const errors: string[] = [];

  waves.forEach((wave, index) => {
    const label = `level ${wave.level} wave ${wave.wave_index} (file position ${index})`;

    if (typeof wave.level !== "number") {
      errors.push(`Wave ${label}: level must be a number`);
    }
    if (typeof wave.wave_index !== "number") {
      errors.push(`Wave ${label}: wave_index must be a number`);
    }
    if (typeof wave.hp_modifier !== "number") {
      errors.push(`Wave ${label}: hp_modifier must be a number`);
    }
    if (typeof wave.damage_modifier !== "number") {
      errors.push(`Wave ${label}: damage_modifier must be a number`);
    }
    if (!Array.isArray(wave.enemies) || wave.enemies.length === 0) {
      errors.push(`Wave ${label}: enemies must be a non-empty array`);
      return;
    }

    for (const entry of wave.enemies) {
      const enemyLabel = typeof entry.type === "string" && entry.type.length > 0 ? entry.type : "<missing type>";
      if (typeof entry.type !== "string" || entry.type.length === 0) {
        errors.push(`Wave ${label}: enemy entry has an invalid type`);
      } else if (!registry[entry.type]) {
        errors.push(
          `Wave ${label}: enemy type "${entry.type}" is not in ENEMY_REGISTRY — every instance will be silently skipped at spawn`
        );
      }
      if (typeof entry.count !== "number" || entry.count <= 0) {
        errors.push(`Wave ${label}: enemy "${enemyLabel}" count must be a positive number`);
      }
      if (typeof entry.spawn_delay_ms !== "number" || entry.spawn_delay_ms < 0) {
        errors.push(`Wave ${label}: enemy "${enemyLabel}" spawn_delay_ms must be a non-negative number`);
      }
    }
  });

  return errors;
}
