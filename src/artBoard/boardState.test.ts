import { describe, expect, it } from "vitest";
import type { ArtDecision, BindingArtTarget, LevelArtTarget } from "./domain";
import { exportBrief, reduceBoard, type BoardState } from "./boardState";

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
