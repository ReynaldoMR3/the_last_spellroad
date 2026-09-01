import type { AoEShape, Element, SpellDefinition, WaveDefinition, Weight } from "./types";
import type { MonsterRegistryEntry } from "./monsterRegistry";
import { getElementalMultiplier } from "../systems/elementalDamage";

/**
 * Pure, Phaser-free content schema/build gate (issue #71's decision) — structural validation
 * of `spells.json`/`waves/*.json` against the TS types, plus the two cross-reference checks
 * Warden/Frieren's and Pato's comments on the ticket asked for.
 *
 * The audit (`docs/audits/2026-08-02-json-content-architecture.md`, finding #10) found
 * "validated JSON" was a process assertion, not an enforced gate: the scene casts Phaser's
 * cache values directly (`this.cache.json.get("spells") as SpellDefinition[]`), and TypeScript
 * interfaces disappear at runtime, so malformed or drifted JSON can pass a cast silently. No
 * new dependency (Zod, JSON Schema, etc.) — this hand-rolled check runs both in
 * `validateContent.test.ts` against the real shipped files and in `SpellroadScene.create`
 * before cached content becomes live runtime state.
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
export interface ValidateSpellOptions {
  /** Runtime/shipped-content gate: the fixed hotbar must occupy every visible slot exactly once. */
  requireFixedDefaultLoadout?: boolean;
}

export function validateSpells(spells: SpellDefinition[], options: ValidateSpellOptions = {}): string[] {
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
    } else if (!Number.isFinite(spell.base_power) || spell.base_power <= 0) {
      errors.push(`Spell ${label}: base_power must be a finite positive number`);
    }
    if (typeof spell.base_targets !== "number") {
      errors.push(`Spell ${label}: base_targets must be a number`);
    } else if (!Number.isInteger(spell.base_targets) || spell.base_targets <= 0) {
      errors.push(`Spell ${label}: base_targets must be a positive integer`);
    }
    if (!MASTERY_DISCOUNTS.includes(spell.master_discount)) {
      errors.push(`Spell ${label}: unknown master_discount "${spell.master_discount}"`);
    }
    if (ELEMENTS.includes(spell.element)) validateSpellEffect(spell, label, errors);
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
  if (options.requireFixedDefaultLoadout) {
    const slots = [...seenSlots.keys()].sort((a, b) => a - b);
    const expected = Array.from({ length: MAX_LOADOUT_SLOTS }, (_, index) => index + 1);
    if (slots.length !== expected.length || slots.some((slot, index) => slot !== expected[index])) {
      errors.push(`Default loadout slots must be exactly ${expected.join(", ")}; found ${slots.join(", ") || "none"}`);
    }
  }

  return errors;
}

function validateSpellEffect(spell: SpellDefinition, label: string, errors: string[]): void {
  const effect = spell.effect;
  if (effect === undefined) {
    errors.push(`Spell ${label}: effect is required`);
    return;
  }
  if (typeof effect !== "object" || effect === null || Array.isArray(effect)) {
    errors.push(`Spell ${label}: effect must be an object`);
    return;
  }

  const expectedKind: Record<Element, string> = {
    fire: "adjacent_pressure",
    ice: "weaken",
    earth: "single_target_burst",
    lightning: "stun"
  };
  if (effect.kind !== expectedKind[spell.element]) {
    errors.push(`Spell ${label}: effect kind "${effect.kind}" does not match element "${spell.element}"`);
    return;
  }

  const expectedKeys: Record<typeof effect.kind, readonly string[]> = {
    adjacent_pressure: ["kind", "range_tiles", "bonus_damage", "max_applications_per_target"],
    weaken: ["kind", "outgoing_damage_multiplier", "duration_ms", "max_stacks"],
    stun: ["kind", "duration_ms", "reapply_lockout_ms", "max_stacks"],
    single_target_burst: ["kind", "bonus_damage", "max_targets"]
  };
  for (const key of Object.keys(effect)) {
    if (!expectedKeys[effect.kind].includes(key)) {
      errors.push(`Spell ${label}: ${spell.element} effect has unknown key "${key}"`);
      return;
    }
  }

  if (effect.kind === "adjacent_pressure" && (effect.range_tiles !== 1 || effect.bonus_damage !== 2 || effect.max_applications_per_target !== 1)) {
    if (effect.range_tiles !== 1) errors.push(`Spell ${label}: fire effect range_tiles must be 1`);
    else errors.push(`Spell ${label}: fire effect payload is invalid`);
  }
  if (effect.kind === "weaken" && (effect.outgoing_damage_multiplier !== 0.8 || effect.duration_ms !== 3000 || effect.max_stacks !== 1)) {
    errors.push(`Spell ${label}: ice effect payload is invalid`);
  }
  if (effect.kind === "stun" && (effect.duration_ms !== 500 || effect.reapply_lockout_ms !== 1500 || effect.max_stacks !== 1)) {
    errors.push(`Spell ${label}: lightning effect payload is invalid`);
  }
  if (effect.kind === "single_target_burst" && (effect.bonus_damage !== 3 || effect.max_targets !== 1)) {
    errors.push(`Spell ${label}: earth effect payload is invalid`);
  }
}

/** Structural validation of every shipped wave, plus the enemy-registry cross-reference
 * Warden/Frieren's and Pato's ticket comments asked for: an unregistered `type` string is
 * exactly the audit's finding #3 (soft-lock risk if the `waveEnemyCounts.ts` fix weren't also
 * in place) — catching it here means it never reaches promotion in the first place.
 * @returns a human-readable error per problem found; empty when every wave is valid. */
export interface ValidateWaveOptions {
  /** The real shipped campaign enables this; small unit fixtures may validate in isolation. */
  requireFinalBoss?: boolean;
}

export function validateWaves(
  waves: WaveDefinition[],
  registry: Record<string, MonsterRegistryEntry>,
  options: ValidateWaveOptions = {}
): string[] {
  const errors: string[] = [];
  const seenWaveIndicesByLevel = new Map<number, Set<number>>();
  const previousWaveIndexByLevel = new Map<number, number>();
  let bossInstances = 0;
  let levelFiveBossSuffixStarted = false;

  waves.forEach((wave, index) => {
    const label = `level ${wave.level} wave ${wave.wave_index} (file position ${index})`;

    if (typeof wave.level !== "number") {
      errors.push(`Wave ${label}: level must be a number`);
    } else if (!Number.isInteger(wave.level) || wave.level < 1 || !Number.isFinite(wave.level)) {
      errors.push(`Wave ${label}: level must be a finite positive integer`);
    }
    if (typeof wave.wave_index !== "number") {
      errors.push(`Wave ${label}: wave_index must be a number`);
    } else if (!Number.isInteger(wave.wave_index) || wave.wave_index < 0 || !Number.isFinite(wave.wave_index)) {
      errors.push(`Wave ${label}: wave_index must be a finite non-negative integer`);
    } else if (typeof wave.level === "number") {
      const seenWaveIndices = seenWaveIndicesByLevel.get(wave.level) ?? new Set<number>();
      const previousWaveIndex = previousWaveIndexByLevel.get(wave.level);
      if (seenWaveIndices.has(wave.wave_index)) {
        errors.push(`Wave ${label}: duplicate wave_index ${wave.wave_index} for level ${wave.level}`);
      } else if (previousWaveIndex !== undefined && wave.wave_index < previousWaveIndex) {
        errors.push(
          `Wave ${label}: wave_index must be strictly ordered within level ${wave.level}; previous index was ${previousWaveIndex}`
        );
      }
      seenWaveIndices.add(wave.wave_index);
      seenWaveIndicesByLevel.set(wave.level, seenWaveIndices);
      previousWaveIndexByLevel.set(wave.level, wave.wave_index);
    }
    if (typeof wave.hp_modifier !== "number") {
      errors.push(`Wave ${label}: hp_modifier must be a number`);
    } else if (!Number.isFinite(wave.hp_modifier) || wave.hp_modifier <= 0) {
      errors.push(`Wave ${label}: hp_modifier must be a finite positive number`);
    }
    if (typeof wave.damage_modifier !== "number") {
      errors.push(`Wave ${label}: damage_modifier must be a number`);
    } else if (!Number.isFinite(wave.damage_modifier) || wave.damage_modifier <= 0) {
      errors.push(`Wave ${label}: damage_modifier must be a finite positive number`);
    }
    if (wave.is_boss !== undefined && typeof wave.is_boss !== "boolean") {
      errors.push(`Wave ${label}: is_boss must be a boolean when defined`);
    }
    if (wave.is_boss === true) {
      if (wave.level !== 5) {
        errors.push(`Wave ${label}: is_boss phases may appear only in Level 5`);
      } else {
        levelFiveBossSuffixStarted = true;
      }
    } else if (wave.level === 5 && levelFiveBossSuffixStarted) {
      errors.push(`Wave ${label}: ordinary waves cannot follow the Level 5 boss-phase suffix`);
    }
    if (!Array.isArray(wave.enemies) || wave.enemies.length === 0) {
      errors.push(`Wave ${label}: enemies must be a non-empty array`);
      return;
    }

    for (const entry of wave.enemies) {
      const enemyLabel = typeof entry.type === "string" && entry.type.length > 0 ? entry.type : "<missing type>";
      const monster = registry[entry.type];
      if (typeof entry.type !== "string" || entry.type.length === 0) {
        errors.push(`Wave ${label}: enemy entry has an invalid type`);
      } else if (!monster) {
        errors.push(
          `Wave ${label}: enemy type "${entry.type}" is not in MONSTER_REGISTRY — every instance will be silently skipped at spawn`
        );
      }
      if (!ELEMENTS.includes(entry.element)) {
        errors.push(`Wave ${label}: enemy "${enemyLabel}" must have exactly one valid element`);
      }
      if (monster && entry.archetype !== monster.archetype) {
        errors.push(
          `Wave ${label}: enemy "${enemyLabel}" archetype "${entry.archetype}" does not match registry archetype "${monster.archetype}"`
        );
      }
      if (["name", "display_name", "label"].some((key) => key in (entry as unknown as Record<string, unknown>))) {
        errors.push(`Wave ${label}: enemy "${enemyLabel}" must not author a player-facing name field`);
      }
      if (entry.type === "monster_boss_01") {
        bossInstances += typeof entry.count === "number" && entry.count > 0 ? entry.count : 0;
        if (wave.level !== 5) {
          errors.push(`Wave ${label}: monster_boss_01 may appear only in Level 5's final wave`);
        } else if (index !== waves.length - 1) {
          errors.push(`Wave ${label}: monster_boss_01 must appear in the final campaign array position`);
        }
        if (wave.is_boss !== true) {
          errors.push(`Wave ${label}: monster_boss_01 must be contained by an is_boss wave`);
        }
        const resistance = entry.resistant_elements;
        if (
          entry.element !== "fire" ||
          !Array.isArray(resistance) ||
          resistance.length !== 2 ||
          !resistance.includes("ice") ||
          !resistance.includes("lightning")
        ) {
          errors.push(`Wave ${label}: monster_boss_01 must be active fire with resistant_elements ["ice","lightning"]`);
        }
      } else if (entry.resistant_elements !== undefined) {
        errors.push(`Wave ${label}: enemy "${enemyLabel}" cannot declare resistant_elements`);
      }
      if (!Number.isInteger(entry.count) || entry.count <= 0 || !Number.isFinite(entry.count)) {
        errors.push(`Wave ${label}: enemy "${enemyLabel}" count must be a finite positive integer`);
      }
      if (typeof entry.spawn_delay_ms !== "number" || !Number.isFinite(entry.spawn_delay_ms) || entry.spawn_delay_ms < 0) {
        errors.push(`Wave ${label}: enemy "${enemyLabel}" spawn_delay_ms must be a finite non-negative number`);
      }
    }
  });

  if ((options.requireFinalBoss && bossInstances !== 1) || (!options.requireFinalBoss && bossInstances > 1)) {
    errors.push(`Shipped waves must contain exactly one monster_boss_01 instance; found ${bossInstances}`);
  }

  return errors;
}

interface FairnessTarget {
  element: Element;
  resistantElements: readonly Element[];
  isBoss: boolean;
}

function spellScalar(spell: SpellDefinition, target: FairnessTarget): number {
  if (target.isBoss && target.resistantElements.includes(spell.element)) return 0.5;
  return getElementalMultiplier(spell.element, target.element);
}

/** Elemental-template.md's default-loadout gate. It deliberately does not feed into the
 * authored enemy threat calculator; this only proves that a mixed composition has redundant
 * neutral-or-better answers and the ordinary counter for every represented element. */
export function validateWaveFairness(waves: WaveDefinition[], defaultLoadout: SpellDefinition[]): string[] {
  const errors: string[] = [];

  for (const wave of waves) {
    const activeElements = new Set(wave.enemies.map((entry) => entry.element));
    const hasBoss = wave.enemies.some((entry) => entry.type === "monster_boss_01");
    if (activeElements.size < 2 && !hasBoss) continue;

    const targetsByKey = new Map<string, FairnessTarget>();
    for (const entry of wave.enemies) {
      const isBoss = entry.type === "monster_boss_01";
      const target: FairnessTarget = {
        element: entry.element,
        resistantElements: isBoss ? entry.resistant_elements ?? [] : [],
        isBoss
      };
      targetsByKey.set(`${entry.element}:${isBoss ? "boss" : "regular"}`, target);
    }
    const targets = [...targetsByKey.values()];
    const label = `Wave level ${wave.level} wave ${wave.wave_index}`;

    for (const target of targets) {
      const viable = defaultLoadout.filter((spell) => spellScalar(spell, target) >= 1);
      if (viable.length < 2) {
        errors.push(`${label}: active ${target.element} has fewer than two neutral-or-better default spells`);
      }
      if (!target.isBoss && !defaultLoadout.some((spell) => spellScalar(spell, target) === 1.25)) {
        errors.push(`${label}: active ${target.element} has no 1.25 counter in the default loadout`);
      }
    }

    for (const removed of defaultLoadout) {
      const remaining = defaultLoadout.filter((spell) => spell.id !== removed.id);
      if (targets.some((target) => !remaining.some((spell) => spellScalar(spell, target) >= 1))) {
        errors.push(`${label}: default spell "${removed.id}" is mandatory for neutral-or-better coverage`);
      }
    }
  }

  return errors;
}
