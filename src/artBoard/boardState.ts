import {
  LEVEL_ANCHORS,
  LEVEL_ZONES,
  type LevelAnchor,
  type LevelZone,
  type ArtBrief,
  type ArtDecision,
  type ArtDecisionConfidence,
  type ArtTarget,
  type BindingCompatibility,
  type LevelNumber
} from "./domain";
import type { DisplayAsset } from "./catalog";
import type { ProposalTargetIndex } from "./proposal";

export interface BoardState {
  briefId: string;
  title?: string;
  decisions: ArtDecision[];
}

export interface ArtBoardPanel {
  id: "asset-catalogue" | "context-canvas" | "selection-review";
  role: "region";
  label: string;
}

export interface ArtBoardViewState {
  panels: ArtBoardPanel[];
  selectedAsset: DisplayAsset | null;
  canExportBrief: boolean;
  canExportProposal: boolean;
  applyToGameAvailable: false;
}

export interface ArtBoardViewStateInput {
  board: BoardState;
  assets: readonly DisplayAsset[];
  selectedAssetId: string | null;
  issues: readonly { severity: "error" | "warning"; message: string }[];
  reviewConfirmed: boolean;
  context?: ArtBoardContext;
}

export type ArtBoardContext =
  | { kind: "level"; level: LevelNumber }
  | { kind: "binding"; bindingKey: string };

export type ArtBoardFocusTarget =
  | { kind: "asset"; assetId: string }
  | { kind: "placement"; zone: string; anchor: string }
  | { kind: "id"; id: string }
  | { kind: "control"; name: string; value: string };

export interface ArtBoardFocusable {
  readonly id: string;
  readonly dataset: Readonly<Record<string, string | undefined>>;
  readonly name?: string;
  readonly value?: string;
  getAttribute?(name: string): string | null;
  focus(): void;
}

export interface BindingContextCard {
  bindingKey: string;
  targetFile: string;
  currentAssetId: string;
  currentAsset: DisplayAsset | null;
  currentAssetMissing: boolean;
  candidates: DisplayAsset[];
  draftDecision: ArtDecision | null;
  draftDecisions: ArtDecision[];
  mediaKind: "image" | "audio";
}

export interface AudioPreviewMetadata {
  sourceUrl: string;
  format: string;
  mimeType: string | null;
  canPreview: boolean;
  fallbackText: string;
}

function artBoardPanels(context: ArtBoardContext): readonly ArtBoardPanel[] {
  return [
    { id: "asset-catalogue", role: "region", label: "Asset catalogue" },
    {
      id: "context-canvas",
      role: "region",
      label: context.kind === "level"
        ? `Level ${context.level} scene canvas`
        : `${context.bindingKey} binding context`
    },
    { id: "selection-review", role: "region", label: "Selected asset and proposal review" }
  ];
}

/** Row-major targets for the three anchor rows drawn across the five zone columns. */
export function levelOnePlacementTargets(): Array<{ zone: LevelZone; anchor: LevelAnchor }> {
  return levelPlacementTargets(1).map(({ zone, anchor }) => ({ zone, anchor }));
}

/** Row-major semantic targets shared by each of the five repository level maps. */
export function levelPlacementTargets(
  level: LevelNumber
): Array<{ level: LevelNumber; zone: LevelZone; anchor: LevelAnchor }> {
  return LEVEL_ANCHORS.flatMap((anchor) =>
    LEVEL_ZONES.map((zone) => ({ level, zone, anchor }))
  );
}

/**
 * Projects the exact production target index into browser cards. Candidate
 * choices satisfy the complete kind, semantic-class, and capability contract;
 * a missing current file remains visible as a repairable binding instead of
 * causing its associated draft to disappear.
 */
export function bindingContextCards(
  assets: readonly DisplayAsset[],
  decisions: readonly ArtDecision[],
  targetIndex: ProposalTargetIndex
): BindingContextCard[] {
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  return Object.entries(targetIndex).map(([bindingKey, target]) => {
    const currentAsset = assetsById.get(target.currentAssetId) ?? null;
    const draftDecisions = decisions.filter(
      (decision) =>
        decision.status !== "superseded" &&
        decision.target.kind === "binding" &&
        decision.target.bindingKey === bindingKey
    );
    const draftDecision = draftDecisions[draftDecisions.length - 1] ?? null;
    return {
      bindingKey,
      targetFile: target.targetFile,
      currentAssetId: target.currentAssetId,
      currentAsset,
      currentAssetMissing: currentAsset === null || currentAsset.fileStatus === "missing",
      candidates: assets.filter((asset) => isCompatibleCandidate(asset, target.compatibility)),
      draftDecision,
      draftDecisions: draftDecisions.map(cloneDecision),
      mediaKind: target.compatibility.assetKinds.includes("audio") ? "audio" : "image"
    };
  });
}

/** File-derived metadata for a native audio control and its safe failure copy. */
export function audioPreviewMetadata(asset: DisplayAsset): AudioPreviewMetadata {
  const cleanUrl = asset.url.replace(/[?#].*$/, "");
  const extension = cleanUrl.match(/\.([^.\/]+)$/)?.[1].toLowerCase() ?? "audio";
  const mimeTypes: Readonly<Record<string, string>> = {
    aac: "audio/aac",
    flac: "audio/flac",
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav"
  };
  const format = extension.toUpperCase();
  return {
    sourceUrl: asset.url,
    format,
    mimeType: mimeTypes[extension] ?? null,
    canPreview:
      asset.kind === "audio" &&
      asset.fileStatus !== "missing" &&
      asset.capabilities.includes("audio-preview"),
    fallbackText: `This browser cannot preview ${format} audio. The draft remains available.`
  };
}

function isCompatibleCandidate(
  asset: DisplayAsset,
  compatibility: BindingCompatibility
): boolean {
  if (!compatibility.assetKinds.includes(asset.kind)) return false;
  if (
    compatibility.semanticClasses !== undefined &&
    !compatibility.semanticClasses.includes(asset.semanticClass)
  ) {
    return false;
  }
  return (
    compatibility.requiredCapabilities === undefined ||
    compatibility.requiredCapabilities.every((capability) =>
      asset.capabilities.includes(capability)
    )
  );
}

/** Captures a stable control identity before the Art Board replaces its DOM tree. */
export function captureArtBoardFocus(
  element: ArtBoardFocusable | null
): ArtBoardFocusTarget | null {
  if (element === null) return null;
  if (element.dataset.assetId) {
    return { kind: "asset", assetId: element.dataset.assetId };
  }
  if (element.dataset.zone && element.dataset.anchor) {
    return {
      kind: "placement",
      zone: element.dataset.zone,
      anchor: element.dataset.anchor
    };
  }
  if (element.id) return { kind: "id", id: element.id };
  const name = element.getAttribute?.("name") ?? element.name ?? "";
  const value = element.getAttribute?.("value") ?? element.value ?? "";
  return name && value ? { kind: "control", name, value } : null;
}

/** Focuses the replacement node that represents the same logical Art Board control. */
export function restoreArtBoardFocus(
  target: ArtBoardFocusTarget | null,
  candidates: readonly ArtBoardFocusable[]
): boolean {
  if (target === null) return false;
  const candidate = candidates.find((element) => {
    if (target.kind === "asset") return element.dataset.assetId === target.assetId;
    if (target.kind === "placement") {
      return element.dataset.zone === target.zone && element.dataset.anchor === target.anchor;
    }
    if (target.kind === "id") return element.id === target.id;
    const name = element.getAttribute?.("name") ?? element.name ?? "";
    const value = element.getAttribute?.("value") ?? element.value ?? "";
    return name === target.name && value === target.value;
  });
  if (!candidate) return false;
  candidate.focus();
  return true;
}

/** Derives UI affordances without giving the browser an apply-to-game path. */
export function deriveArtBoardViewState(input: ArtBoardViewStateInput): ArtBoardViewState {
  const hasError = input.issues.some((issue) => issue.severity === "error");
  const canExportBrief = input.board.decisions.length > 0 && !hasError;

  return {
    panels: artBoardPanels(input.context ?? { kind: "level", level: 1 }).map((panel) => ({ ...panel })),
    selectedAsset:
      input.assets.find((asset) => asset.id === input.selectedAssetId) ?? null,
    canExportBrief,
    canExportProposal: canExportBrief && input.reviewConfirmed,
    applyToGameAvailable: false
  };
}

interface DecisionEventBase {
  id: string;
  target: ArtTarget;
  intent?: string;
  confidence?: ArtDecisionConfidence;
}

export type BoardEvent =
  | (DecisionEventBase & {
      type: "use";
      assetId: string;
    })
  | (DecisionEventBase & {
      type: "replace";
      currentAssetId: string;
      assetId: string;
    })
  | (DecisionEventBase & {
      type: "remove";
      currentAssetId: string;
    })
  | {
      type: "edit-note";
      decisionId: string;
      intent: string;
    };

/**
 * Records board intent without resolving semantic level placement into Tiled
 * cells. A new action for a binding supersedes its previous active action so
 * the draft retains history without exporting conflicting active decisions.
 */
export function reduceBoard(state: BoardState, event: BoardEvent): BoardState {
  if (event.type === "edit-note") {
    let changed = false;
    const decisions = state.decisions.map((decision) => {
      if (decision.id !== event.decisionId || decision.intent === event.intent) {
        return cloneDecision(decision);
      }
      changed = true;
      return { ...cloneDecision(decision), intent: event.intent };
    });
    return changed ? { ...state, decisions } : state;
  }

  const nextDecision = decisionFromEvent(event);
  const decisions = state.decisions
    .filter((decision) => decision.id !== nextDecision.id)
    .map((decision) =>
      isCompetingActiveBinding(decision, nextDecision)
        ? { ...cloneDecision(decision), status: "superseded" as const }
        : cloneDecision(decision)
    );

  return {
    ...state,
    decisions: [...decisions, nextDecision]
  };
}

/** Returns a detached JSON-safe brief suitable for validation or persistence. */
export function exportBrief(state: BoardState): ArtBrief {
  return {
    schemaVersion: 1,
    id: state.briefId,
    ...(state.title === undefined ? {} : { title: state.title }),
    decisions: state.decisions.map(cloneDecision)
  };
}

function decisionFromEvent(event: Exclude<BoardEvent, { type: "edit-note" }>): ArtDecision {
  const common = {
    id: event.id,
    target: cloneTarget(event.target),
    ...(event.intent === undefined ? {} : { intent: event.intent }),
    status: "draft" as const,
    ...(event.confidence === undefined ? {} : { confidence: event.confidence })
  };

  if (event.type === "use") {
    return { ...common, action: "use", assetId: event.assetId };
  }
  if (event.type === "replace") {
    return {
      ...common,
      action: "replace",
      assetId: event.assetId,
      currentAssetId: event.currentAssetId
    };
  }
  return {
    ...common,
    action: "remove",
    currentAssetId: event.currentAssetId
  };
}

function isCompetingActiveBinding(current: ArtDecision, next: ArtDecision): boolean {
  return (
    current.status !== "superseded" &&
    current.target.kind === "binding" &&
    next.target.kind === "binding" &&
    current.target.bindingKey === next.target.bindingKey
  );
}

function cloneDecision(decision: ArtDecision): ArtDecision {
  return {
    ...decision,
    target: cloneTarget(decision.target)
  };
}

function cloneTarget(target: ArtTarget): ArtTarget {
  return target.kind === "level" ? { ...target } : { ...target };
}
