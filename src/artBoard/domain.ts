/** Repository asset classes understood by the deterministic Art Board catalogue. */
export type AssetKind = "image" | "audio" | "map" | "provenance" | "source";

export interface AssetDimensions {
  width: number;
  height: number;
}

export interface AssetSource {
  name: string | null;
  license: string | null;
  evidencePath: string | null;
}

export interface AssetGridMetadata {
  cellWidth: number;
  cellHeight: number;
  columns: number;
  rows: number;
  spacing: number;
}

export interface AssetRegionMetadata {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AssetTagOrigin = "generated" | "suggested" | "corrected";
export type AssetEnrichmentState = "pending" | "complete" | "skipped" | "failed";
export type AssetFileStatus = "present" | "missing" | "changed";
export type AssetSemanticClass =
  | "tile"
  | "prop"
  | "creature"
  | "icon"
  | "vfx"
  | "preview"
  | "map"
  | "playable-audio"
  | "audio-source"
  | "provenance"
  | "source";
export type AssetCapability =
  | "level-placement"
  | "visual-binding"
  | "audio-binding"
  | "preview"
  | "audio-preview"
  | "sprite-regions";

/** JSON-serializable record emitted by the asset scanner. */
export interface AssetRecord {
  id: string;
  path: string;
  kind: AssetKind;
  dimensions: AssetDimensions | null;
  contentHash: string;
  source: AssetSource;
  tags: string[];
  tagOrigin: AssetTagOrigin;
  enrichmentState: AssetEnrichmentState;
  semanticClass: AssetSemanticClass;
  capabilities: AssetCapability[];
  grid?: AssetGridMetadata | null;
  regions?: AssetRegionMetadata[];
  /** Omitted by fresh scans (`present`); retained records use this to report drift. */
  fileStatus?: AssetFileStatus;
}

/** Durable, human-authored corrections layered over a generated AssetRecord. */
export interface AssetOverride {
  id: string;
  displayName?: string | null;
  description?: string | null;
  tags?: string[];
  excluded?: boolean;
  source?: Partial<AssetSource>;
  semanticClass?: AssetSemanticClass;
  capabilities?: AssetCapability[];
}

export type LevelNumber = 1 | 2 | 3 | 4 | 5;
export const LEVEL_ZONES = ["entrance", "lane", "leftEdge", "rightEdge", "threshold"] as const;
export const LEVEL_ANCHORS = ["leftEdge", "center", "rightEdge"] as const;
export type LevelZone = (typeof LEVEL_ZONES)[number];
export type LevelAnchor = (typeof LEVEL_ANCHORS)[number];

export interface LevelContextDefinition {
  zones: readonly LevelZone[];
  anchors: readonly LevelAnchor[];
}

/** Semantic placement coordinates shared by the five current combat-lane maps. */
export const LEVEL_CONTEXT_INDEX: Readonly<Record<LevelNumber, LevelContextDefinition>> = {
  1: { zones: LEVEL_ZONES, anchors: LEVEL_ANCHORS },
  2: { zones: LEVEL_ZONES, anchors: LEVEL_ANCHORS },
  3: { zones: LEVEL_ZONES, anchors: LEVEL_ANCHORS },
  4: { zones: LEVEL_ZONES, anchors: LEVEL_ANCHORS },
  5: { zones: LEVEL_ZONES, anchors: LEVEL_ANCHORS }
};

export interface LevelArtTarget {
  kind: "level";
  level: LevelNumber;
  zone: LevelZone;
  anchor: LevelAnchor;
}

export interface BindingArtTarget {
  kind: "binding";
  bindingKey: string;
}

export type ArtTarget = LevelArtTarget | BindingArtTarget;
export type ArtAction = "use" | "replace" | "remove";
export type ArtDecisionStatus = "draft" | "approved" | "superseded";
export type ArtDecisionConfidence = "low" | "medium" | "high";

/**
 * One intent-first choice. `assetId` is the proposed use/replacement, while
 * `currentAssetId` identifies the existing use for replace/remove decisions.
 */
export interface ArtDecision {
  id: string;
  target: ArtTarget;
  action: ArtAction;
  assetId?: string;
  currentAssetId?: string;
  intent?: string;
  status: ArtDecisionStatus;
  confidence?: ArtDecisionConfidence;
}

/** Versioned document written to art-direction/boards/. */
export interface ArtBrief {
  schemaVersion: 1;
  id: string;
  title?: string;
  decisions: ArtDecision[];
}

export type ValidationIssueCode =
  | "unknown-asset"
  | "invalid-level"
  | "asset-kind-mismatch"
  | "unknown-binding"
  | "conflicting-binding-decisions"
  | "missing-asset"
  | "invalid-action"
  | "invalid-status"
  | "invalid-target"
  | "invalid-zone"
  | "invalid-anchor"
  | "missing-source"
  | "missing-file"
  | "changed-file";

export interface ValidationIssue {
  code: ValidationIssueCode;
  severity: "error" | "warning";
  message: string;
  decisionId?: string;
  decisionIds?: string[];
  assetId?: string;
  bindingKey?: string;
}

export interface ProposalChange {
  decisionId: string;
  targetFile: string;
  target: ArtTarget;
  beforeAssetId: string | null;
  afterAssetId: string | null;
}

/** Review-only compiler output. Its presence never applies a production change. */
export interface Proposal {
  schemaVersion: 1;
  id: string;
  sourceBriefIds: string[];
  status: "review";
  targetFiles: string[];
  changes: ProposalChange[];
  diagnostics: ValidationIssue[];
  previewPaths: string[];
}

export interface BindingCompatibility {
  assetKinds: readonly AssetKind[];
  semanticClasses?: readonly AssetSemanticClass[];
  requiredCapabilities?: readonly AssetCapability[];
}

/** Compatible catalogue media keyed by an exact production binding key. */
export type BindingCompatibilityIndex = Readonly<Record<string, BindingCompatibility>>;
export type BindingKindIndex = BindingCompatibilityIndex;

export type ValidatableAsset = Pick<AssetRecord, "id" | "kind"> &
  Partial<
    Pick<AssetRecord, "source" | "fileStatus" | "semanticClass" | "capabilities" | "regions">
  >;

const IMAGE_EXTENSIONS = new Set(["gif", "jpeg", "jpg", "png", "svg", "webp"]);
const AUDIO_EXTENSIONS = new Set(["aac", "flac", "m4a", "mid", "midi", "mp3", "ogg", "wav"]);
const MAP_EXTENSIONS = new Set(["tmx", "tmj"]);
const SOURCE_EXTENSIONS = new Set(["md", "tsj", "tsx", "txt"]);

/**
 * Produces a human-readable identity from a canonical repository path. File
 * contents, display names, tags, and overrides deliberately cannot affect it.
 * The scanner supplies `classifiedKind` for JSON maps, whose kind is derived
 * from parsed Tiled fields rather than from their extension alone.
 */
export function catalogAssetId(path: string, region?: string, classifiedKind?: AssetKind): string {
  const canonicalPath = path
    .trim()
    .replace(/\\/g, "/")
    .replace(/[?#].*$/, "")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
  const pathParts = canonicalPath.split("/").filter(Boolean);
  const assetsIndex = pathParts.findIndex(
    (part, index) => part.toLowerCase() === "assets" && pathParts[index - 1]?.toLowerCase() === "public"
  );
  const relativeParts = assetsIndex >= 0 ? pathParts.slice(assetsIndex + 1) : pathParts;
  const fileName = relativeParts[relativeParts.length - 1] ?? "";
  const extensionMatch = fileName.match(/\.([^.]+)$/);
  const extension = extensionMatch?.[1].toLowerCase() ?? "";
  const kind = classifyAssetKind(relativeParts, extension, classifiedKind);

  if (relativeParts.length === 0 || fileName.length === 0) {
    throw new Error("Asset path must name a file");
  }
  if (!kind) {
    throw new Error(`Unsupported asset path: ${path}`);
  }

  const identityParts = relativeParts
    .map((part, index) => {
      const isFile = index === relativeParts.length - 1;
      const withoutExtension = isFile && extensionMatch ? part.slice(0, -extensionMatch[0].length) : part;
      return normalizeIdPart(withoutExtension);
    })
    .filter(Boolean);

  if (kind === "audio" && extension.length > 0) {
    identityParts.push(normalizeIdPart(extension));
  }

  let id = [kind, ...identityParts].join(":");
  if (region !== undefined) {
    const normalizedRegion = normalizeIdPart(region);
    if (normalizedRegion.length === 0) {
      throw new Error("Asset region must contain at least one letter or number");
    }
    id += `:region=${normalizedRegion}`;
  }
  return id;
}

/**
 * Validates references and target compatibility without reading files or game
 * modules. Callers that support binding decisions supply their current target
 * index; omitting it keeps unknown bindings closed by default.
 */
export function validateArtBrief(
  brief: ArtBrief,
  assets: readonly ValidatableAsset[],
  bindingKinds: BindingCompatibilityIndex = {}
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const assetsById = indexAssetsAndRegions(assets);
  const activeBindings = new Map<string, string[]>();

  for (const decision of brief.decisions) {
    const validStatus = isArtDecisionStatus(decision.status);
    if (!validStatus) {
      issues.push({
        code: "invalid-status",
        severity: "error",
        message: `Decision ${decision.id} has unsupported status "${String(decision.status)}".`,
        decisionId: decision.id
      });
    }
    const target: unknown = decision.target;
    const targetKind = isRecord(target) ? target.kind : undefined;
    let compatibility: BindingCompatibility | undefined;

    if (targetKind === "level") {
      const levelTarget = target as unknown as LevelArtTarget;
      const validLevel = isLevelNumber(levelTarget.level);
      if (!validLevel) {
        issues.push({
          code: "invalid-level",
          severity: "error",
          message: `Decision ${decision.id} targets Level ${String(levelTarget.level)}; supported levels are 1 through 5.`,
          decisionId: decision.id
        });
      }
      const context = validLevel ? LEVEL_CONTEXT_INDEX[levelTarget.level] : undefined;
      if (
        !isNonEmptyString(levelTarget.zone) ||
        (context !== undefined && !context.zones.includes(levelTarget.zone as LevelZone))
      ) {
        issues.push({
          code: "invalid-zone",
          severity: "error",
          message: `Decision ${decision.id} targets invalid zone "${String(levelTarget.zone)}".`,
          decisionId: decision.id
        });
      }
      if (
        !isNonEmptyString(levelTarget.anchor) ||
        (context !== undefined && !context.anchors.includes(levelTarget.anchor as LevelAnchor))
      ) {
        issues.push({
          code: "invalid-anchor",
          severity: "error",
          message: `Decision ${decision.id} targets invalid anchor "${String(levelTarget.anchor)}".`,
          decisionId: decision.id
        });
      }
      compatibility = {
        assetKinds: ["image"],
        semanticClasses: ["tile", "prop"],
        requiredCapabilities: ["level-placement"]
      };
    } else if (targetKind === "binding") {
      const bindingTarget = target as unknown as BindingArtTarget;
      if (!isNonEmptyString(bindingTarget.bindingKey)) {
        issues.push({
          code: "invalid-target",
          severity: "error",
          message: `Decision ${decision.id} must target a non-empty binding key.`,
          decisionId: decision.id
        });
      } else {
        if (!Object.prototype.hasOwnProperty.call(bindingKinds, bindingTarget.bindingKey)) {
          issues.push({
            code: "unknown-binding",
            severity: "error",
            message: `Decision ${decision.id} references unknown binding "${bindingTarget.bindingKey}".`,
            decisionId: decision.id,
            bindingKey: bindingTarget.bindingKey
          });
        } else {
          compatibility = bindingKinds[bindingTarget.bindingKey];
        }

        if (decision.status === "draft" || decision.status === "approved") {
          const ids = activeBindings.get(bindingTarget.bindingKey) ?? [];
          ids.push(decision.id);
          activeBindings.set(bindingTarget.bindingKey, ids);
        }
      }
    } else {
      issues.push({
        code: "invalid-target",
        severity: "error",
        message: `Decision ${decision.id} has an unsupported target kind.`,
        decisionId: decision.id
      });
    }

    if (!isArtAction(decision.action)) {
      issues.push({
        code: "invalid-action",
        severity: "error",
        message: `Decision ${decision.id} has unsupported action "${String(decision.action)}".`,
        decisionId: decision.id
      });
      continue;
    }

    const proposedAssetId = decision.action === "remove" ? undefined : decision.assetId;
    if (decision.action !== "remove" && !proposedAssetId) {
      issues.push({
        code: "missing-asset",
        severity: "error",
        message: `Decision ${decision.id} must name an asset to ${decision.action}.`,
        decisionId: decision.id
      });
    }

    if ((decision.action === "replace" || decision.action === "remove") && !decision.currentAssetId) {
      issues.push({
        code: "missing-asset",
        severity: "error",
        message: `Decision ${decision.id} must identify the current asset to ${decision.action}.`,
        decisionId: decision.id
      });
    }

    const referencedIds = new Set(
      [proposedAssetId, decision.action === "replace" || decision.action === "remove" ? decision.currentAssetId : undefined]
        .filter((assetId): assetId is string => Boolean(assetId))
    );
    for (const assetId of referencedIds) {
      const referencedAsset = assetsById.get(assetId);
      if (!referencedAsset) {
        issues.push({
          code: "unknown-asset",
          severity: "error",
          message: `Decision ${decision.id} references unknown asset "${assetId}".`,
          decisionId: decision.id,
          assetId
        });
      } else if (referencedAsset.fileStatus === "missing" || referencedAsset.fileStatus === "changed") {
        const missing = referencedAsset.fileStatus === "missing";
        issues.push({
          code: missing ? "missing-file" : "changed-file",
          severity: "error",
          message: missing
            ? `Decision ${decision.id} references asset "${assetId}", but its source file is missing.`
            : `Decision ${decision.id} references asset "${assetId}", but its source file changed after cataloguing.`,
          decisionId: decision.id,
          assetId
        });
      }
    }

    if (proposedAssetId && compatibility) {
      const proposedAsset = assetsById.get(proposedAssetId);
      if (proposedAsset && !isAssetCompatible(proposedAsset, compatibility)) {
        issues.push({
          code: "asset-kind-mismatch",
          severity: "error",
          message: `Decision ${decision.id} cannot use ${describeAsset(proposedAsset)} asset "${proposedAssetId}" for this target.`,
          decisionId: decision.id,
          assetId: proposedAssetId,
          ...(targetKind === "binding"
            ? { bindingKey: (target as unknown as BindingArtTarget).bindingKey }
            : {})
        });
      }
    }

    if (proposedAssetId) {
      const proposedAsset = assetsById.get(proposedAssetId);
      if (proposedAsset && (!proposedAsset.source || !hasLicenseEvidence(proposedAsset.source))) {
        issues.push({
          code: "missing-source",
          severity: "error",
          message: `Decision ${decision.id} proposes asset "${proposedAssetId}" without both license and evidence-path metadata.`,
          decisionId: decision.id,
          assetId: proposedAssetId
        });
      }
    }
  }

  for (const [bindingKey, decisionIds] of activeBindings) {
    if (decisionIds.length > 1) {
      issues.push({
        code: "conflicting-binding-decisions",
        severity: "error",
        message: `Binding "${bindingKey}" has multiple active decisions: ${decisionIds.join(", ")}.`,
        decisionIds,
        bindingKey
      });
    }
  }

  return issues;
}

function classifyAssetKind(
  pathParts: readonly string[],
  extension: string,
  classifiedKind?: AssetKind
): AssetKind | null {
  const fileName = pathParts[pathParts.length - 1]?.toLowerCase() ?? "";
  if (IMAGE_EXTENSIONS.has(extension)) {
    return classifiedKind === undefined || classifiedKind === "image" ? "image" : null;
  }
  if (AUDIO_EXTENSIONS.has(extension)) {
    return classifiedKind === undefined || classifiedKind === "audio" ? "audio" : null;
  }
  if (/^provenance(?:[._-]|$)/.test(fileName) && extension === "json") {
    return classifiedKind === undefined || classifiedKind === "provenance" ? "provenance" : null;
  }
  if (
    MAP_EXTENSIONS.has(extension) ||
    (extension === "json" && classifiedKind === "map")
  ) {
    return classifiedKind === undefined || classifiedKind === "map" ? "map" : null;
  }
  if (SOURCE_EXTENSIONS.has(extension)) {
    return classifiedKind === undefined || classifiedKind === "source" ? "source" : null;
  }
  return null;
}

function normalizeIdPart(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isLevelNumber(level: number): level is LevelNumber {
  return Number.isInteger(level) && level >= 1 && level <= 5;
}

function isArtAction(action: string): action is ArtAction {
  return action === "use" || action === "replace" || action === "remove";
}

function isArtDecisionStatus(status: string): status is ArtDecisionStatus {
  return status === "draft" || status === "approved" || status === "superseded";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasLicenseEvidence(source: AssetSource): boolean {
  return isNonEmptyString(source.license) && isNonEmptyString(source.evidencePath);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAssetCompatible(asset: ValidatableAsset, compatibility: BindingCompatibility): boolean {
  if (!compatibility.assetKinds.includes(asset.kind)) {
    return false;
  }
  if (
    compatibility.semanticClasses &&
    (!asset.semanticClass || !compatibility.semanticClasses.includes(asset.semanticClass))
  ) {
    return false;
  }
  if (
    compatibility.requiredCapabilities?.some(
      (capability) => !asset.capabilities?.includes(capability)
    )
  ) {
    return false;
  }
  return true;
}

function describeAsset(asset: ValidatableAsset): string {
  return asset.semanticClass ? `${asset.semanticClass} (${asset.kind})` : asset.kind;
}

function indexAssetsAndRegions(assets: readonly ValidatableAsset[]): Map<string, ValidatableAsset> {
  const indexed = new Map(assets.map((asset) => [asset.id, asset]));
  for (const parent of assets) {
    for (const region of parent.regions ?? []) {
      if (!indexed.has(region.id)) {
        indexed.set(region.id, { ...parent, id: region.id });
      }
    }
  }
  return indexed;
}
