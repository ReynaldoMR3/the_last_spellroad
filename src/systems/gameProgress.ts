import type { WaveDefinition } from "../data/types";
import type { HexcoinState } from "./HexcoinSystem";
import type { MasteryState } from "./MasterySystem";
import { SAVE_SCHEMA_VERSION, type SaveBlob, type SaveLoadResult } from "./SaveSystem";

export type SpellroadStartData =
  | { mode: "new" }
  | { mode: "continue"; load: SaveLoadResult };

export interface PersistentMetadata {
  hierarchyRank: number;
  loreFlags: string[];
}

export interface PreparedGameProgress {
  startWaveIndex: number;
  checkpointLevel: number;
  discoveredSpellIds: string[];
  masteryBySpell: Record<string, MasteryState>;
  hexcoin: HexcoinState;
  metadata: PersistentMetadata;
  resetNotice: string | null;
}

const NEW_GAME_HEXCOIN: HexcoinState = { balance: 0, levelStartBalance: 0 };

function newGameProgress(spellIds: string[], resetNotice: string | null = null): PreparedGameProgress {
  const masteryBySpell = Object.fromEntries(
    spellIds.map((spellId) => [spellId, { tier: "novice", landedCasts: 0 }])
  ) as Record<string, MasteryState>;

  return {
    startWaveIndex: 0,
    checkpointLevel: 1,
    discoveredSpellIds: [...spellIds],
    masteryBySpell,
    hexcoin: { ...NEW_GAME_HEXCOIN },
    metadata: { hierarchyRank: 0, loreFlags: [] },
    resetNotice
  };
}

function parseCheckpointLevel(checkpointId: string | null): number | null {
  if (checkpointId === null) {
    return null;
  }

  const match = /^level:([1-9]\d*)$/.exec(checkpointId);
  return match ? Number(match[1]) : null;
}

function resolveStartWave(checkpointId: string | null, waves: WaveDefinition[]): Pick<PreparedGameProgress, "startWaveIndex" | "checkpointLevel"> {
  const checkpointLevel = parseCheckpointLevel(checkpointId);
  if (checkpointLevel === null) {
    return { startWaveIndex: 0, checkpointLevel: 1 };
  }

  const startWaveIndex = waves.findIndex((wave) => wave.level === checkpointLevel);
  return startWaveIndex === -1
    ? { startWaveIndex: 0, checkpointLevel: 1 }
    : { startWaveIndex, checkpointLevel };
}

function resetNoticeFor(reason: Extract<SaveLoadResult, { kind: "reset" }> ["reason"]): string {
  return reason === "schema-mismatch" ? "incompatible save reset" : "unreadable save reset";
}

function reconcileMastery(
  savedMastery: Record<string, MasteryState>,
  currentSpellIds: Set<string>
): Record<string, MasteryState> {
  return Object.fromEntries(
    Object.entries(savedMastery)
      .filter(([spellId]) => currentSpellIds.has(spellId))
      .map(([spellId, mastery]) => [spellId, { ...mastery }])
  );
}

function prepareLoadedGameProgress(save: SaveBlob, spellIds: string[], waves: WaveDefinition[]): PreparedGameProgress {
  const currentSpellIds = new Set(spellIds);
  const { startWaveIndex, checkpointLevel } = resolveStartWave(save.checkpointId, waves);

  return {
    startWaveIndex,
    checkpointLevel,
    discoveredSpellIds: save.discoveredSpellIds.filter((spellId) => currentSpellIds.has(spellId)),
    masteryBySpell: reconcileMastery(save.masteryBySpell, currentSpellIds),
    hexcoin: {
      balance: save.hexcoinBalance,
      levelStartBalance: save.hexcoinLevelStartBalance
    },
    metadata: {
      hierarchyRank: save.hierarchyRank,
      loreFlags: [...save.loreFlags]
    },
    resetNotice: null
  };
}

export function prepareGameProgress(
  startData: SpellroadStartData,
  spellIds: string[],
  waves: WaveDefinition[]
): PreparedGameProgress {
  if (startData.mode === "new" || startData.load.kind === "missing") {
    return newGameProgress(spellIds);
  }

  if (startData.load.kind === "reset") {
    return newGameProgress(spellIds, resetNoticeFor(startData.load.reason));
  }

  return prepareLoadedGameProgress(startData.load.save, spellIds, waves);
}

/** Resolves the encounter checkpoint used after a death. Ordinary waves restart at the first
 * wave of their level. A death during a multi-phase boss trial restarts at that level's first
 * `is_boss` phase, so ordinary waves that precede the trial are not replayed. */
export function resolveDeathRestartWaveIndex(waves: WaveDefinition[], currentWaveIndex: number): number {
  const currentWave = waves[currentWaveIndex];
  if (!currentWave) return 0;

  const restartIndex = waves.findIndex((wave) =>
    wave.level === currentWave.level && (!currentWave.is_boss || wave.is_boss === true)
  );
  return restartIndex >= 0 ? restartIndex : 0;
}

export function buildSaveBlob(
  metadata: PersistentMetadata,
  discoveredSpellIds: string[],
  masteryBySpell: Record<string, MasteryState>,
  hexcoin: HexcoinState,
  checkpointLevel: number
): SaveBlob {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    discoveredSpellIds: [...discoveredSpellIds],
    masteryBySpell: Object.fromEntries(
      Object.entries(masteryBySpell).map(([spellId, mastery]) => [spellId, { ...mastery }])
    ),
    hierarchyRank: metadata.hierarchyRank,
    hexcoinBalance: hexcoin.balance,
    hexcoinLevelStartBalance: hexcoin.levelStartBalance,
    loreFlags: [...metadata.loreFlags],
    checkpointId: `level:${checkpointLevel}`
  };
}
