import {
  LEVEL_ANCHORS,
  LEVEL_ZONES,
  type LevelAnchor,
  type LevelZone,
  type ArtBrief,
  type ArtDecision,
  type ArtDecisionConfidence,
  type ArtTarget
} from "./domain";
import type { DisplayAsset } from "./catalog";

export interface BoardState {
  briefId: string;
  title?: string;
  decisions: ArtDecision[];
}

export interface ArtBoardPanel {
  id: "asset-catalogue" | "level-1-scene" | "selection-review";
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
}

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

const ART_BOARD_PANELS: readonly ArtBoardPanel[] = [
  { id: "asset-catalogue", role: "region", label: "Asset catalogue" },
  { id: "level-1-scene", role: "region", label: "Level 1 scene canvas" },
  { id: "selection-review", role: "region", label: "Selected asset and proposal review" }
];

/** Row-major targets for the three anchor rows drawn across the five zone columns. */
export function levelOnePlacementTargets(): Array<{ zone: LevelZone; anchor: LevelAnchor }> {
  return LEVEL_ANCHORS.flatMap((anchor) =>
    LEVEL_ZONES.map((zone) => ({ zone, anchor }))
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
    panels: ART_BOARD_PANELS.map((panel) => ({ ...panel })),
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
