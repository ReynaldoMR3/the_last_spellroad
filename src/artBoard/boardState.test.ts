import { describe, expect, it } from "vitest";
import type { ArtDecision, BindingArtTarget, LevelArtTarget } from "./domain";
import type { DisplayAsset } from "./catalog";
import * as boardStateApi from "./boardState";
import { exportBrief, levelActionAvailable, reduceBoard, type BoardState } from "./boardState";

const levelTarget: LevelArtTarget = {
  kind: "level",
  level: 1,
  zone: "entrance",
  anchor: "leftEdge"
};

const spellIconTarget: BindingArtTarget = {
  kind: "binding",
  bindingKey: "spell-icon-fire"
};

function emptyBoard(): BoardState {
  return {
    briefId: "brief:level-1",
    title: "Level 1 art direction",
    decisions: []
  };
}

describe("reduceBoard", () => {
  it("allows a selected existing tile to be removed from a semantic level target without a prior draft", () => {
    expect(
      levelActionAvailable({
        action: "remove",
        selectedAssetId: "image:third-party:kenney-tiny-dungeon:tiles:tile-0028",
        currentDecision: undefined
      })
    ).toBe(true);
  });

  it("records a Level 1 Use as semantic zone and anchor intent without map cells", () => {
    const state = reduceBoard(emptyBoard(), {
      type: "use",
      id: "decision:level-1:entry-torch",
      target: levelTarget,
      assetId: "image:third-party:kenney-tiny-dungeon:tiles:tile-0084",
      intent: "Warm landmark; leave the combat lane clear.",
      confidence: "high"
    });

    expect(state.decisions).toEqual([
      {
        id: "decision:level-1:entry-torch",
        target: levelTarget,
        action: "use",
        assetId: "image:third-party:kenney-tiny-dungeon:tiles:tile-0084",
        intent: "Warm landmark; leave the combat lane clear.",
        status: "draft",
        confidence: "high"
      }
    ]);
    expect(JSON.stringify(state)).not.toMatch(/\b(?:cell|row|column|gid)\b/i);
  });

  it("records a binding Replace with both the existing and nominated asset", () => {
    const state = reduceBoard(emptyBoard(), {
      type: "replace",
      id: "decision:spell-icon-fire:new-icon",
      target: spellIconTarget,
      currentAssetId: "image:spell-icons:fire",
      assetId: "image:spell-icons:fire-remix"
    });

    expect(state.decisions[0]).toMatchObject({
      action: "replace",
      currentAssetId: "image:spell-icons:fire",
      assetId: "image:spell-icons:fire-remix",
      status: "draft"
    });
  });

  it("records a binding Remove without inventing a replacement asset", () => {
    const state = reduceBoard(emptyBoard(), {
      type: "remove",
      id: "decision:spell-icon-fire:remove",
      target: spellIconTarget,
      currentAssetId: "image:spell-icons:fire"
    });

    expect(state.decisions[0]).toEqual({
      id: "decision:spell-icon-fire:remove",
      target: spellIconTarget,
      action: "remove",
      currentAssetId: "image:spell-icons:fire",
      status: "draft"
    });
    expect(state.decisions[0]).not.toHaveProperty("assetId");
  });

  it("edits an existing decision note without mutating the prior state", () => {
    const before = reduceBoard(emptyBoard(), {
      type: "use",
      id: "decision:level-1:entry-torch",
      target: levelTarget,
      assetId: "image:third-party:kenney-tiny-dungeon:tiles:tile-0084"
    });

    const after = reduceBoard(before, {
      type: "edit-note",
      decisionId: "decision:level-1:entry-torch",
      intent: "Frame the entrance, but keep the lane readable."
    });

    expect(after.decisions[0].intent).toBe("Frame the entrance, but keep the lane readable.");
    expect(before.decisions[0].intent).toBeUndefined();
  });

  it("supersedes an earlier active binding action when the same binding receives another action", () => {
    const first = reduceBoard(emptyBoard(), {
      type: "replace",
      id: "decision:spell-icon-fire:first",
      target: spellIconTarget,
      currentAssetId: "image:spell-icons:fire",
      assetId: "image:spell-icons:fire-remix"
    });
    const second = reduceBoard(first, {
      type: "remove",
      id: "decision:spell-icon-fire:second",
      target: spellIconTarget,
      currentAssetId: "image:spell-icons:fire"
    });

    expect(second.decisions.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: "decision:spell-icon-fire:first", status: "superseded" },
      { id: "decision:spell-icon-fire:second", status: "draft" }
    ]);
    expect(
      second.decisions.filter(
        (decision) =>
          decision.target.kind === "binding" &&
          decision.target.bindingKey === "spell-icon-fire" &&
          decision.status !== "superseded"
      )
    ).toHaveLength(1);
  });

  it("detaches unchanged decisions and targets between reducer snapshots", () => {
    const first = reduceBoard(emptyBoard(), {
      type: "use",
      id: "decision:level-1:first",
      target: levelTarget,
      assetId: "image:tiles:first"
    });
    const before = reduceBoard(first, {
      type: "use",
      id: "decision:level-1:second",
      target: { ...levelTarget, zone: "threshold", anchor: "rightEdge" },
      assetId: "image:tiles:second"
    });

    const after = reduceBoard(before, {
      type: "edit-note",
      decisionId: "decision:level-1:first",
      intent: "Edit only the first decision."
    });

    expect(after.decisions[1]).not.toBe(before.decisions[1]);
    expect(after.decisions[1].target).not.toBe(before.decisions[1].target);
    after.decisions[1].intent = "Mutated through the later snapshot";
    if (after.decisions[1].target.kind === "level") {
      after.decisions[1].target.zone = "lane";
    }

    expect(before.decisions[1].intent).toBeUndefined();
    expect(before.decisions[1].target).toEqual({
      kind: "level",
      level: 1,
      zone: "threshold",
      anchor: "rightEdge"
    });
  });
});

describe("exportBrief", () => {
  it("exports a detached versioned brief and preserves semantic notes", () => {
    const decision: ArtDecision = {
      id: "decision:level-1:entry-torch",
      target: levelTarget,
      action: "use",
      assetId: "image:third-party:kenney-tiny-dungeon:tiles:tile-0084",
      intent: "Warm landmark.",
      status: "draft"
    };
    const state: BoardState = {
      briefId: "brief:level-1",
      title: "Level 1 art direction",
      decisions: [decision]
    };

    const brief = exportBrief(state);
    state.decisions[0].intent = "Changed after export";

    expect(brief).toEqual({
      schemaVersion: 1,
      id: "brief:level-1",
      title: "Level 1 art direction",
      decisions: [{ ...decision, intent: "Warm landmark." }]
    });
  });
});

describe("deriveArtBoardViewState", () => {
  const fireIcon: DisplayAsset = {
    id: "image:spell-icons:fire",
    url: "/assets/spell-icons/fire.png",
    kind: "image",
    dimensions: { width: 32, height: 32 },
    source: { name: null, license: null, evidencePath: null },
    sourceStatus: "missing",
    displayName: "Fire",
    description: null,
    tags: ["spell", "fire"],
    tagOrigin: "suggested",
    semanticClass: "icon",
    capabilities: ["visual-binding"],
    grid: null,
    regions: [],
    fileStatus: "present"
  };

  type DeriveViewState = (input: {
    board: BoardState;
    assets: readonly DisplayAsset[];
    selectedAssetId: string | null;
    issues: readonly { severity: "error" | "warning"; message: string }[];
    reviewConfirmed: boolean;
    context?:
      | { kind: "level"; level: 1 | 2 | 3 | 4 | 5 }
      | { kind: "binding"; bindingKey: string };
  }) => {
    panels: { id: string; role: string; label: string }[];
    selectedAsset: DisplayAsset | null;
    canExportBrief: boolean;
    canExportProposal: boolean;
    applyToGameAvailable: boolean;
  };

  const deriveViewState = (): DeriveViewState =>
    (boardStateApi as unknown as { deriveArtBoardViewState: DeriveViewState })
      .deriveArtBoardViewState;

  it("resolves the selected asset and exposes three labelled region panels", () => {
    const state = reduceBoard(emptyBoard(), {
      type: "use",
      id: "decision:level-1:entrance:leftEdge",
      target: levelTarget,
      assetId: fireIcon.id
    });

    const view = deriveViewState()({
      board: state,
      assets: [fireIcon],
      selectedAssetId: fireIcon.id,
      issues: [],
      reviewConfirmed: false
    });

    expect(view.selectedAsset).toBe(fireIcon);
    expect(view.panels).toEqual([
      { id: "asset-catalogue", role: "region", label: "Asset catalogue" },
      { id: "context-canvas", role: "region", label: "Level 1 scene canvas" },
      { id: "selection-review", role: "region", label: "Selected asset and proposal review" }
    ]);
    expect(view.applyToGameAvailable).toBe(false);
  });

  it("keeps proposal export behind review confirmation", () => {
    const board = reduceBoard(emptyBoard(), {
      type: "use",
      id: "decision:level-1:entrance:leftEdge",
      target: levelTarget,
      assetId: fireIcon.id
    });

    const beforeReview = deriveViewState()({
      board,
      assets: [fireIcon],
      selectedAssetId: fireIcon.id,
      issues: [],
      reviewConfirmed: false
    });
    const afterReview = deriveViewState()({
      board,
      assets: [fireIcon],
      selectedAssetId: fireIcon.id,
      issues: [],
      reviewConfirmed: true
    });

    expect(beforeReview.canExportBrief).toBe(true);
    expect(beforeReview.canExportProposal).toBe(false);
    expect(afterReview.canExportProposal).toBe(true);
  });

  it("disables both exports when validation has an error", () => {
    const board = reduceBoard(emptyBoard(), {
      type: "use",
      id: "decision:level-1:entrance:leftEdge",
      target: levelTarget,
      assetId: fireIcon.id
    });

    const view = deriveViewState()({
      board,
      assets: [fireIcon],
      selectedAssetId: fireIcon.id,
      issues: [{ severity: "error", message: "The selected icon cannot be placed on the level." }],
      reviewConfirmed: true
    });

    expect(view.canExportBrief).toBe(false);
    expect(view.canExportProposal).toBe(false);
  });

  it("labels the scene region from the active level or binding context", () => {
    const input = {
      board: emptyBoard(),
      assets: [fireIcon],
      selectedAssetId: null,
      issues: [],
      reviewConfirmed: false
    };

    const levelView = deriveViewState()({
      ...input,
      context: { kind: "level", level: 5 }
    });
    const bindingView = deriveViewState()({
      ...input,
      context: { kind: "binding", bindingKey: "spell-icon-fire" }
    });

    expect(levelView.panels[1]).toEqual({
      id: "context-canvas",
      role: "region",
      label: "Level 5 scene canvas"
    });
    expect(bindingView.panels[1]).toEqual({
      id: "context-canvas",
      role: "region",
      label: "spell-icon-fire binding context"
    });
  });

  it("keeps binding and mixed drafts behind the same explicit proposal review gate", () => {
    const bindingDecision: ArtDecision = {
      id: "decision:spell-icon-fire:remove",
      target: spellIconTarget,
      action: "remove",
      currentAssetId: fireIcon.id,
      status: "draft"
    };
    const boards: BoardState[] = [
      { ...emptyBoard(), decisions: [bindingDecision] },
      {
        ...emptyBoard(),
        decisions: [
          {
            id: "decision:level-1:entrance:leftEdge",
            target: levelTarget,
            action: "use",
            assetId: fireIcon.id,
            status: "draft"
          },
          bindingDecision
        ]
      }
    ];

    for (const board of boards) {
      const beforeReview = deriveViewState()({
        board,
        assets: [fireIcon],
        selectedAssetId: null,
        issues: [],
        reviewConfirmed: false,
        context: { kind: "binding", bindingKey: "spell-icon-fire" }
      });
      const afterReview = deriveViewState()({
        board,
        assets: [fireIcon],
        selectedAssetId: null,
        issues: [],
        reviewConfirmed: true,
        context: { kind: "binding", bindingKey: "spell-icon-fire" }
      });

      expect(beforeReview.canExportBrief).toBe(true);
      expect(beforeReview.canExportProposal).toBe(false);
      expect(afterReview.canExportProposal).toBe(true);
      expect(afterReview.applyToGameAvailable).toBe(false);
    }
  });
});

describe("levelOnePlacementTargets", () => {
  it("orders one complete anchor row across all named zones before the next row", () => {
    type PlacementTarget = { zone: string; anchor: string };
    const placementTargets = (
      boardStateApi as unknown as { levelOnePlacementTargets: () => PlacementTarget[] }
    ).levelOnePlacementTargets;

    expect(placementTargets()).toHaveLength(15);
    expect(placementTargets().slice(0, 5)).toEqual([
      { zone: "entrance", anchor: "leftEdge" },
      { zone: "lane", anchor: "leftEdge" },
      { zone: "leftEdge", anchor: "leftEdge" },
      { zone: "rightEdge", anchor: "leftEdge" },
      { zone: "threshold", anchor: "leftEdge" }
    ]);
  });
});

describe("logical Art Board focus", () => {
  type FocusToken =
    | { kind: "asset"; assetId: string }
    | { kind: "placement"; zone: string; anchor: string }
    | { kind: "id"; id: string }
    | { kind: "control"; name: string; value: string };
  type Focusable = {
    id: string;
    dataset: Record<string, string | undefined>;
    name: string;
    value: string;
    focus(): void;
  };
  type FocusApi = {
    captureArtBoardFocus(element: Focusable | null): FocusToken | null;
    restoreArtBoardFocus(token: FocusToken | null, candidates: readonly Focusable[]): boolean;
  };
  const focusApi = (): FocusApi => boardStateApi as unknown as FocusApi;

  function focusable(overrides: Partial<Focusable> = {}): Focusable {
    return {
      id: "",
      dataset: {},
      name: "",
      value: "",
      focus() {},
      ...overrides
    };
  }

  it("restores the selected asset button after its old DOM node is replaced", () => {
    const oldButton = focusable({
      dataset: { assetId: "image:spell-icons:fire" }
    });
    const token = focusApi().captureArtBoardFocus(oldButton);
    let focused = false;
    const replacementButton = focusable({
      dataset: { assetId: "image:spell-icons:fire" },
      focus() { focused = true; }
    });

    const restored = focusApi().restoreArtBoardFocus(token, [
      focusable({ dataset: { assetId: "image:spell-icons:earth" } }),
      replacementButton
    ]);

    expect(restored).toBe(true);
    expect(focused).toBe(true);
  });

  it("restores the same placement target so keyboard selection can continue after render", () => {
    const token = focusApi().captureArtBoardFocus(focusable({
      dataset: { zone: "entrance", anchor: "leftEdge" }
    }));
    let focusedTarget = "";
    const replacementTarget = focusable({
      dataset: { zone: "entrance", anchor: "leftEdge" },
      focus() { focusedTarget = "entrance:leftEdge"; }
    });

    expect(focusApi().restoreArtBoardFocus(token, [replacementTarget])).toBe(true);
    expect(focusedTarget).toBe("entrance:leftEdge");
  });
});
