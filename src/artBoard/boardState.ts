import type {
  ArtBrief,
  ArtDecision,
  ArtDecisionConfidence,
  ArtTarget
} from "./domain";

export interface BoardState {
  briefId: string;
  title?: string;
  decisions: ArtDecision[];
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
