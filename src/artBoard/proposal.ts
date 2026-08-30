import {
  catalogAssetId,
  validateArtBrief,
  type ArtBrief,
  type AssetRecord,
  type BindingCompatibility,
  type BindingCompatibilityIndex,
  type Proposal,
  type ProposalChange,
  type ValidationIssue
} from "./domain";
import {
  ALL_ENEMY_ARCHETYPES,
  MAGE_SPRITE_KEY,
  MAGE_SPRITE_URL,
  enemySpriteKey,
  enemySpriteUrl
} from "../systems/characterArt";
import {
  SPELL_ICON_ELEMENTS,
  spellIconKey,
  spellIconUrl
} from "../systems/spellIcons";
import {
  OPENING_VFX_CAST_KEY,
  OPENING_VFX_CAST_URL,
  OPENING_VFX_IMPACT_KEY,
  OPENING_VFX_IMPACT_URL,
  OPENING_VFX_TRAIL_KEY,
  OPENING_VFX_TRAIL_URL
} from "../systems/openingVfx";
import {
  ALL_CAST_ELEMENTS,
  ALL_SFX_CUES,
  elementCastSfxKey,
  elementCastSfxUrl,
  sfxKey,
  sfxUrl
} from "../systems/sfx";
import {
  BOSS_THEME_KEY,
  BOSS_THEME_URL,
  COMBAT_CUE_KEY,
  COMBAT_CUE_URL,
  EXPLORATION_LOOP_KEYS,
  EXPLORATION_LOOP_URLS
} from "../systems/bgm";

export interface ProposalTarget {
  targetFile: string;
  currentAssetId: string;
  compatibility: BindingCompatibility;
}

export type ProposalTargetIndex = Readonly<Record<string, Readonly<ProposalTarget>>>;

export interface CompileProposalResult {
  proposal: Proposal | null;
  issues: CompileProposalIssue[];
}

export interface BindingCurrentMismatchIssue {
  code: "binding-current-mismatch";
  severity: "error";
  message: string;
  decisionId: string;
  bindingKey: string;
  expectedAssetId: string;
  actualAssetId: string;
}

export interface InvalidBriefShapeIssue {
  code: "invalid-brief-shape";
  severity: "error";
  message: string;
  decisionId?: string;
}

export type CompileProposalIssue =
  | ValidationIssue
  | BindingCurrentMismatchIssue
  | InvalidBriefShapeIssue;

const MAGE_CHARACTER_BINDING = freezeCompatibility({
  assetKinds: ["image"],
  semanticClasses: ["tile", "creature"],
  requiredCapabilities: ["visual-binding"]
});
const ENEMY_CHARACTER_BINDING = freezeCompatibility({
  assetKinds: ["image"],
  semanticClasses: ["creature"],
  requiredCapabilities: ["visual-binding"]
});
const ICON_BINDING = freezeCompatibility({
  assetKinds: ["image"],
  semanticClasses: ["icon"],
  requiredCapabilities: ["visual-binding"]
});
const VFX_BINDING = freezeCompatibility({
  assetKinds: ["image"],
  semanticClasses: ["vfx"],
  requiredCapabilities: ["visual-binding"]
});
const AUDIO_BINDING = freezeCompatibility({
  assetKinds: ["audio"],
  semanticClasses: ["playable-audio"],
  requiredCapabilities: ["audio-binding"]
});

/**
 * Read-only binding inventory derived from the production systems' exported
 * cache keys and asset URLs. The compiler reads this data but never mutates the
 * systems or their files.
 */
export const PRODUCTION_TARGET_INDEX: ProposalTargetIndex = buildProductionTargetIndex();

/**
 * Validates a brief and returns review data only. It performs no I/O and never
 * applies the resulting changes to a map or production binding module.
 */
export function compileProposal(
  brief: unknown,
  catalogue: readonly AssetRecord[],
  targetIndex: ProposalTargetIndex = PRODUCTION_TARGET_INDEX
): CompileProposalResult {
  const shapeIssues = runtimeBriefShapeIssues(brief);
  if (shapeIssues.length > 0) {
    return { proposal: null, issues: shapeIssues };
  }
  const validatedBrief = brief as ArtBrief;
  const compatibilityIndex = bindingCompatibilityIndex(targetIndex);
  const validationIssues = validateArtBrief(validatedBrief, catalogue, compatibilityIndex);
  const bindingIssues = bindingCurrentAssetIssues(validatedBrief, targetIndex);
  const issues: CompileProposalIssue[] = [...validationIssues, ...bindingIssues];
  if (issues.some((issue) => issue.severity === "error")) {
    return { proposal: null, issues };
  }

  const catalogueById = new Map(catalogue.map((asset) => [asset.id, asset]));
  const changes: ProposalChange[] = [];
  const previewPaths: string[] = [];

  for (const decision of validatedBrief.decisions) {
    if (decision.status === "superseded") continue;

    if (decision.target.kind === "level") {
      const beforeAssetId =
        decision.action === "replace" || decision.action === "remove"
          ? decision.currentAssetId ?? null
          : null;
      changes.push({
        decisionId: decision.id,
        targetFile: `public/assets/levels/level-${decision.target.level}.json`,
        target: { ...decision.target },
        beforeAssetId,
        afterAssetId: decision.action === "remove" ? null : decision.assetId ?? null
      });
      addPreviewPath(
        previewPaths,
        cataloguePathForId(beforeAssetId, catalogueById, catalogue)
      );
    } else {
      const indexedTarget = targetIndex[decision.target.bindingKey];
      changes.push({
        decisionId: decision.id,
        targetFile: indexedTarget.targetFile,
        target: { ...decision.target },
        beforeAssetId: indexedTarget.currentAssetId,
        afterAssetId: decision.action === "remove" ? null : decision.assetId ?? null
      });
      addPreviewPath(
        previewPaths,
        cataloguePathForId(indexedTarget.currentAssetId, catalogueById, catalogue)
      );
    }

    if (decision.action !== "remove") {
      addPreviewPath(
        previewPaths,
        cataloguePathForId(decision.assetId ?? null, catalogueById, catalogue)
      );
    }
  }

  const proposal: Proposal = {
    schemaVersion: 1,
    id: `proposal:${validatedBrief.id}`,
    sourceBriefIds: [validatedBrief.id],
    status: "review",
    targetFiles: unique(changes.map((change) => change.targetFile)),
    changes,
    diagnostics: validationIssues,
    previewPaths
  };
  return { proposal, issues };
}

function runtimeBriefShapeIssues(brief: unknown): CompileProposalIssue[] {
  if (!isRecord(brief)) {
    return [invalidBriefShape("Art brief must be a JSON object.")];
  }

  const issues: CompileProposalIssue[] = [];
  if (brief.schemaVersion !== 1) {
    issues.push(invalidBriefShape(`Art brief schemaVersion must be 1, received ${String(brief.schemaVersion)}.`));
  }
  if (!isNonEmptyString(brief.id)) {
    issues.push(invalidBriefShape("Art brief id must be a non-blank string."));
  }
  if (brief.title !== undefined && typeof brief.title !== "string") {
    issues.push(invalidBriefShape("Art brief title must be a string when provided."));
  }
  if (!Array.isArray(brief.decisions)) {
    issues.push(invalidBriefShape("Art brief decisions must be an array."));
    return issues;
  }

  const seenDecisionIds = new Set<string>();
  for (const candidate of brief.decisions) {
    if (!isRecord(candidate)) {
      issues.push(invalidBriefShape("Every art brief decision must be a JSON object."));
      continue;
    }
    const decisionId = isNonEmptyString(candidate.id) ? candidate.id : undefined;
    if (decisionId === undefined) {
      issues.push(invalidBriefShape("Every art brief decision must have a non-blank id."));
    } else if (seenDecisionIds.has(decisionId)) {
      issues.push({
        ...invalidBriefShape(`Art brief contains duplicate decision id "${decisionId}".`),
        decisionId
      });
    } else {
      seenDecisionIds.add(decisionId);
    }

    if (candidate.intent !== undefined && typeof candidate.intent !== "string") {
      issues.push({
        ...invalidBriefShape(`Decision ${decisionId ?? "<unknown>"} intent must be a string.`),
        ...(decisionId === undefined ? {} : { decisionId })
      });
    }
    if (
      candidate.confidence !== undefined &&
      candidate.confidence !== "low" &&
      candidate.confidence !== "medium" &&
      candidate.confidence !== "high"
    ) {
      issues.push({
        ...invalidBriefShape(
          `Decision ${decisionId ?? "<unknown>"} confidence must be low, medium, or high.`
        ),
        ...(decisionId === undefined ? {} : { decisionId })
      });
    }
    for (const field of ["assetId", "currentAssetId"] as const) {
      if (candidate[field] !== undefined && !isNonEmptyString(candidate[field])) {
        issues.push({
          ...invalidBriefShape(
            `Decision ${decisionId ?? "<unknown>"} ${field} must be a non-blank string when provided.`
          ),
          ...(decisionId === undefined ? {} : { decisionId })
        });
      }
    }

    if (candidate.action === "use" && candidate.currentAssetId !== undefined) {
      issues.push({
        code: "invalid-action",
        severity: "error",
        message: `Use decision ${decisionId ?? "<unknown>"} must not name a current asset.`,
        ...(decisionId === undefined ? {} : { decisionId })
      });
    }
    if (candidate.action === "remove" && candidate.assetId !== undefined) {
      issues.push({
        code: "invalid-action",
        severity: "error",
        message: `Remove decision ${decisionId ?? "<unknown>"} must not name a replacement asset.`,
        ...(decisionId === undefined ? {} : { decisionId })
      });
    }
  }
  return issues;
}

function invalidBriefShape(message: string): InvalidBriefShapeIssue {
  return { code: "invalid-brief-shape", severity: "error", message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildProductionTargetIndex(): ProposalTargetIndex {
  const entries: Array<[string, ProposalTarget]> = [];
  const add = (
    bindingKey: string,
    assetUrl: string,
    targetFile: string,
    compatibility: BindingCompatibility
  ): void => {
    entries.push([
      bindingKey,
      Object.freeze({
        targetFile,
        currentAssetId: catalogAssetId(`public/${assetUrl}`),
        compatibility
      })
    ]);
  };

  add(
    MAGE_SPRITE_KEY,
    MAGE_SPRITE_URL,
    "src/systems/characterArt.ts",
    MAGE_CHARACTER_BINDING
  );
  for (const archetype of ALL_ENEMY_ARCHETYPES) {
    add(
      enemySpriteKey(archetype),
      enemySpriteUrl(archetype),
      "src/systems/characterArt.ts",
      ENEMY_CHARACTER_BINDING
    );
  }
  for (const element of SPELL_ICON_ELEMENTS) {
    add(spellIconKey(element), spellIconUrl(element), "src/systems/spellIcons.ts", ICON_BINDING);
  }
  add(OPENING_VFX_CAST_KEY, OPENING_VFX_CAST_URL, "src/systems/openingVfx.ts", VFX_BINDING);
  add(OPENING_VFX_IMPACT_KEY, OPENING_VFX_IMPACT_URL, "src/systems/openingVfx.ts", VFX_BINDING);
  add(OPENING_VFX_TRAIL_KEY, OPENING_VFX_TRAIL_URL, "src/systems/openingVfx.ts", VFX_BINDING);
  for (const cue of ALL_SFX_CUES) {
    add(sfxKey(cue), sfxUrl(cue), "src/systems/sfx.ts", AUDIO_BINDING);
  }
  for (const element of ALL_CAST_ELEMENTS) {
    add(
      elementCastSfxKey(element),
      elementCastSfxUrl(element),
      "src/systems/sfx.ts",
      AUDIO_BINDING
    );
  }
  add(BOSS_THEME_KEY, BOSS_THEME_URL, "src/systems/bgm.ts", AUDIO_BINDING);
  add(COMBAT_CUE_KEY, COMBAT_CUE_URL, "src/systems/bgm.ts", AUDIO_BINDING);
  for (const key of EXPLORATION_LOOP_KEYS) {
    add(key, EXPLORATION_LOOP_URLS[key], "src/systems/bgm.ts", AUDIO_BINDING);
  }

  return Object.freeze(Object.fromEntries(entries));
}

function bindingCurrentAssetIssues(
  brief: ArtBrief,
  targetIndex: ProposalTargetIndex
): BindingCurrentMismatchIssue[] {
  const issues: BindingCurrentMismatchIssue[] = [];
  for (const decision of brief.decisions) {
    const target: unknown = decision.target;
    if (
      decision.status === "superseded" ||
      !isRecord(target) ||
      target.kind !== "binding" ||
      !isNonEmptyString(target.bindingKey) ||
      (decision.action !== "replace" && decision.action !== "remove")
    ) {
      continue;
    }
    const indexedTarget = targetIndex[target.bindingKey];
    if (
      indexedTarget === undefined ||
      decision.currentAssetId === undefined ||
      decision.currentAssetId === indexedTarget.currentAssetId
    ) {
      continue;
    }
    issues.push({
      code: "binding-current-mismatch",
      severity: "error",
      message:
        `Decision ${decision.id} expects binding "${target.bindingKey}" to use ` +
        `"${decision.currentAssetId}", but production currently uses ` +
        `"${indexedTarget.currentAssetId}". Refresh the brief before replacing or removing it.`,
      decisionId: decision.id,
      bindingKey: target.bindingKey,
      expectedAssetId: decision.currentAssetId,
      actualAssetId: indexedTarget.currentAssetId
    });
  }
  return issues;
}

function freezeCompatibility(compatibility: BindingCompatibility): BindingCompatibility {
  return Object.freeze({
    assetKinds: Object.freeze([...compatibility.assetKinds]),
    ...(compatibility.semanticClasses === undefined
      ? {}
      : { semanticClasses: Object.freeze([...compatibility.semanticClasses]) }),
    ...(compatibility.requiredCapabilities === undefined
      ? {}
      : { requiredCapabilities: Object.freeze([...compatibility.requiredCapabilities]) })
  });
}

/** Detached compatibility contracts for validation and compatibility-filtered UI choices. */
export function bindingCompatibilityIndex(
  targetIndex: ProposalTargetIndex = PRODUCTION_TARGET_INDEX
): BindingCompatibilityIndex {
  return Object.fromEntries(
    Object.entries(targetIndex).map(([bindingKey, target]) => [bindingKey, target.compatibility])
  );
}

function addPreviewPath(paths: string[], path: string | undefined): void {
  if (path !== undefined && !paths.includes(path)) paths.push(path);
}

function cataloguePathForId(
  assetId: string | null,
  catalogueById: ReadonlyMap<string, AssetRecord>,
  catalogue: readonly AssetRecord[]
): string | undefined {
  if (assetId === null) return undefined;
  const directAsset = catalogueById.get(assetId);
  if (directAsset !== undefined) return directAsset.path;
  return catalogue.find((asset) => asset.regions?.some((region) => region.id === assetId))?.path;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
