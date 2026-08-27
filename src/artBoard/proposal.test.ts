import { describe, expect, it } from "vitest";
import type {
  ArtBrief,
  ArtDecision,
  AssetCapability,
  AssetKind,
  AssetRecord,
  AssetSemanticClass,
  LevelNumber
} from "./domain";
import {
  PRODUCTION_TARGET_INDEX,
  compileProposal,
  type ProposalTargetIndex
} from "./proposal";

function asset(id: string, kind: AssetKind, overrides: Partial<AssetRecord> = {}): AssetRecord {
  const semantics: Record<
    AssetKind,
    { semanticClass: AssetSemanticClass; capabilities: AssetCapability[] }
  > = {
    image: { semanticClass: "prop", capabilities: ["level-placement"] },
    audio: { semanticClass: "playable-audio", capabilities: ["audio-binding", "audio-preview"] },
    map: { semanticClass: "map", capabilities: ["preview"] },
    provenance: { semanticClass: "provenance", capabilities: [] },
    source: { semanticClass: "source", capabilities: [] }
  };
  return {
    id,
    path: `public/assets/${id.replace(/:/g, "/")}`,
    kind,
    dimensions: null,
    contentHash: "sha256:test",
    source: {
      name: "Test asset pack",
      license: "CC0",
      evidencePath: "public/assets/test/License.txt"
    },
    tags: [],
    tagOrigin: "generated",
    enrichmentState: "pending",
    ...semantics[kind],
    ...overrides
  };
}

const tile = asset("image:third-party:kenney-tiny-dungeon:tiles:tile-0084", "image");
const audio = asset("audio:audio:music:boss-1-invigilator-trial-theme:ogg", "audio");
const spellIcon = asset("image:spell-icons:fire", "image", {
  semanticClass: "icon",
  capabilities: ["visual-binding"]
});
const iceIcon = asset("image:spell-icons:ice", "image", {
  semanticClass: "icon",
  capabilities: ["visual-binding"]
});

function decision(overrides: Partial<ArtDecision> = {}): ArtDecision {
  return {
    id: "decision:level-1:entry-torch",
    target: { kind: "level", level: 1, zone: "entrance", anchor: "leftEdge" },
    action: "use",
    assetId: tile.id,
    intent: "Warm landmark; leave the combat lane clear.",
    status: "draft",
    ...overrides
  };
}

function brief(decisions: ArtDecision[]): ArtBrief {
  return { schemaVersion: 1, id: "brief:level-1", decisions };
}

describe("compileProposal diagnostics", () => {
  it("returns diagnostics instead of throwing for missing, non-array, or non-object decisions", () => {
    const malformedBriefs = [
      { schemaVersion: 1, id: "brief:missing-decisions" },
      { schemaVersion: 1, id: "brief:object-decisions", decisions: {} },
      { schemaVersion: 1, id: "brief:null-decision", decisions: [null] }
    ];

    for (const malformed of malformedBriefs) {
      expect(() =>
        compileProposal(malformed as unknown as ArtBrief, [tile], PRODUCTION_TARGET_INDEX)
      ).not.toThrow();
      const result = compileProposal(
        malformed as unknown as ArtBrief,
        [tile],
        PRODUCTION_TARGET_INDEX
      );
      expect(result.proposal).toBeNull();
      expect(result.issues.map((issue) => issue.code)).toContain("invalid-brief-shape");
    }
  });

  it("rejects unsupported schema versions and blank or duplicate document IDs", () => {
    const unsupportedSchema = compileProposal(
      { ...brief([decision()]), schemaVersion: 2 } as unknown as ArtBrief,
      [tile],
      PRODUCTION_TARGET_INDEX
    );
    const blankBriefId = compileProposal(
      { ...brief([decision()]), id: "   " },
      [tile],
      PRODUCTION_TARGET_INDEX
    );
    const duplicateDecisionIds = compileProposal(
      brief([
        decision({ id: "decision:duplicate" }),
        decision({
          id: "decision:duplicate",
          target: { kind: "level", level: 1, zone: "threshold", anchor: "rightEdge" }
        })
      ]),
      [tile],
      PRODUCTION_TARGET_INDEX
    );
    const blankDecisionId = compileProposal(
      brief([decision({ id: " " })]),
      [tile],
      PRODUCTION_TARGET_INDEX
    );

    for (const result of [unsupportedSchema, blankBriefId, duplicateDecisionIds, blankDecisionId]) {
      expect(result.proposal).toBeNull();
      expect(result.issues.map((issue) => issue.code)).toContain("invalid-brief-shape");
    }
  });

  it("rejects runtime values that violate optional brief and decision fields", () => {
    const invalidDocuments = [
      { ...brief([decision()]), title: ["not", "text"] },
      brief([decision({ intent: { text: "not text" } as unknown as string })]),
      brief([decision({ confidence: "certain" as ArtDecision["confidence"] })])
    ];

    for (const document of invalidDocuments) {
      const result = compileProposal(document, [tile], PRODUCTION_TARGET_INDEX);
      expect(result.proposal).toBeNull();
      expect(result.issues.map((issue) => issue.code)).toContain("invalid-brief-shape");
    }
  });

  it("rejects contradictory action fields", () => {
    const useWithCurrent = compileProposal(
      brief([decision({ action: "use", currentAssetId: tile.id })]),
      [tile],
      PRODUCTION_TARGET_INDEX
    );
    const removeWithReplacement = compileProposal(
      brief([
        decision({
          action: "remove",
          currentAssetId: tile.id,
          assetId: tile.id
        })
      ]),
      [tile],
      PRODUCTION_TARGET_INDEX
    );

    expect(useWithCurrent.proposal).toBeNull();
    expect(removeWithReplacement.proposal).toBeNull();
    expect(useWithCurrent.issues.map((issue) => issue.code)).toContain("invalid-action");
    expect(removeWithReplacement.issues.map((issue) => issue.code)).toContain("invalid-action");
  });

  it("returns no proposal when a decision names an unknown asset", () => {
    const result = compileProposal(
      brief([decision({ assetId: "image:missing:torch" })]),
      [tile],
      PRODUCTION_TARGET_INDEX
    );

    expect(result.proposal).toBeNull();
    expect(result.issues.map((issue) => issue.code)).toEqual(["unknown-asset"]);
  });

  it("returns no proposal for a level outside the supported range", () => {
    const result = compileProposal(
      brief([
        decision({
          target: {
            kind: "level",
            level: 6 as unknown as LevelNumber,
            zone: "entrance",
            anchor: "leftEdge"
          }
        })
      ]),
      [tile],
      PRODUCTION_TARGET_INDEX
    );

    expect(result.proposal).toBeNull();
    expect(result.issues.map((issue) => issue.code)).toEqual(["invalid-level"]);
  });

  it("returns no proposal when playable audio is used as a level placement", () => {
    const result = compileProposal(
      brief([decision({ assetId: audio.id })]),
      [audio],
      PRODUCTION_TARGET_INDEX
    );

    expect(result.proposal).toBeNull();
    expect(result.issues.map((issue) => issue.code)).toEqual(["asset-kind-mismatch"]);
  });

  it("returns no proposal for a binding absent from the exact production target index", () => {
    const result = compileProposal(
      brief([
        decision({
          target: { kind: "binding", bindingKey: "spell-icon-water" },
          action: "replace",
          currentAssetId: spellIcon.id,
          assetId: spellIcon.id
        })
      ]),
      [spellIcon],
      PRODUCTION_TARGET_INDEX
    );

    expect(result.proposal).toBeNull();
    expect(result.issues.map((issue) => issue.code)).toEqual(["unknown-binding"]);
  });

  it("rejects a binding decision whose claimed current asset is stale", () => {
    const actualCurrent = PRODUCTION_TARGET_INDEX["spell-icon-fire"].currentAssetId;
    const result = compileProposal(
      brief([
        decision({
          id: "decision:spell-icon-fire:stale",
          target: { kind: "binding", bindingKey: "spell-icon-fire" },
          action: "replace",
          currentAssetId: iceIcon.id,
          assetId: actualCurrent
        })
      ]),
      [spellIcon, iceIcon],
      PRODUCTION_TARGET_INDEX
    );

    expect(result.proposal).toBeNull();
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "binding-current-mismatch",
        severity: "error",
        decisionId: "decision:spell-icon-fire:stale",
        bindingKey: "spell-icon-fire",
        expectedAssetId: iceIcon.id,
        actualAssetId: actualCurrent,
        message: expect.stringMatching(
          new RegExp(`${iceIcon.id}.*${actualCurrent}|${actualCurrent}.*${iceIcon.id}`)
        )
      })
    ]);
  });

  it("reports both the stale binding and missing claimed asset with structured current metadata", () => {
    const actualCurrent = PRODUCTION_TARGET_INDEX["spell-icon-fire"].currentAssetId;
    const missingExpected = "image:spell-icons:removed-old-fire";
    const result = compileProposal(
      brief([
        decision({
          id: "decision:spell-icon-fire:missing-stale",
          target: { kind: "binding", bindingKey: "spell-icon-fire" },
          action: "remove",
          currentAssetId: missingExpected,
          assetId: undefined
        })
      ]),
      [spellIcon],
      PRODUCTION_TARGET_INDEX
    );

    expect(result.proposal).toBeNull();
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "unknown-asset",
      "binding-current-mismatch"
    ]);
    expect(result.issues[1]).toMatchObject({
      expectedAssetId: missingExpected,
      actualAssetId: actualCurrent
    });
  });

  it("rejects icon or VFX candidates for character bindings", () => {
    const enemyCurrent = PRODUCTION_TARGET_INDEX["enemy-melee"].currentAssetId;
    const mageCurrent = PRODUCTION_TARGET_INDEX["mage-sprite"].currentAssetId;
    const enemy = asset(enemyCurrent, "image", {
      semanticClass: "creature",
      capabilities: ["visual-binding"]
    });
    const mage = asset(mageCurrent, "image", {
      semanticClass: "tile",
      capabilities: ["level-placement"]
    });
    const vfx = asset("image:vfx:replacement", "image", {
      semanticClass: "vfx",
      capabilities: ["visual-binding"]
    });
    const environmentTile = asset("image:tiles:floor", "image", {
      semanticClass: "tile",
      capabilities: ["level-placement"]
    });

    const enemyResult = compileProposal(
      brief([
        decision({
          id: "decision:enemy-melee:icon",
          target: { kind: "binding", bindingKey: "enemy-melee" },
          action: "replace",
          currentAssetId: enemy.id,
          assetId: spellIcon.id
        })
      ]),
      [enemy, spellIcon],
      PRODUCTION_TARGET_INDEX
    );
    const mageResult = compileProposal(
      brief([
        decision({
          id: "decision:mage-sprite:vfx",
          target: { kind: "binding", bindingKey: "mage-sprite" },
          action: "replace",
          currentAssetId: mage.id,
          assetId: vfx.id
        })
      ]),
      [mage, vfx],
      PRODUCTION_TARGET_INDEX
    );
    const environmentTileResult = compileProposal(
      brief([
        decision({
          id: "decision:mage-sprite:floor",
          target: { kind: "binding", bindingKey: "mage-sprite" },
          action: "replace",
          currentAssetId: mage.id,
          assetId: environmentTile.id
        })
      ]),
      [mage, environmentTile],
      PRODUCTION_TARGET_INDEX
    );

    expect(enemyResult.issues.map((issue) => issue.code)).toEqual(["asset-kind-mismatch"]);
    expect(mageResult.issues.map((issue) => issue.code)).toEqual(["asset-kind-mismatch"]);
    expect(environmentTileResult.issues.map((issue) => issue.code)).toEqual([
      "asset-kind-mismatch"
    ]);
  });
});

describe("compileProposal", () => {
  it("compiles a valid Level 1 brief into a review-only exact-file proposal", () => {
    const result = compileProposal(brief([decision()]), [tile], PRODUCTION_TARGET_INDEX);

    expect(result.issues).toEqual([]);
    expect(result.proposal).toEqual({
      schemaVersion: 1,
      id: "proposal:brief:level-1",
      sourceBriefIds: ["brief:level-1"],
      status: "review",
      targetFiles: ["public/assets/levels/level-1.json"],
      changes: [
        {
          decisionId: "decision:level-1:entry-torch",
          target: { kind: "level", level: 1, zone: "entrance", anchor: "leftEdge" },
          targetFile: "public/assets/levels/level-1.json",
          beforeAssetId: null,
          afterAssetId: tile.id
        }
      ],
      diagnostics: [],
      previewPaths: [tile.path]
    });
  });

  it("maps representative character, spell, VFX, SFX, and BGM keys to their exact modules", () => {
    expect(
      [
        "mage-sprite",
        "spell-icon-fire",
        "openingvfx-fire-cast",
        "sfx-hit",
        "bgm-boss-1-invigilator-trial-theme"
      ].map((bindingKey) => PRODUCTION_TARGET_INDEX[bindingKey]?.targetFile)
    ).toEqual([
      "src/systems/characterArt.ts",
      "src/systems/spellIcons.ts",
      "src/systems/openingVfx.ts",
      "src/systems/sfx.ts",
      "src/systems/bgm.ts"
    ]);
  });

  it("compiles a binding removal against the index's exact current asset", () => {
    const current = PRODUCTION_TARGET_INDEX["spell-icon-fire"].currentAssetId;
    const catalogue = [asset(current, "image", {
      semanticClass: "icon",
      capabilities: ["visual-binding"]
    })];
    const result = compileProposal(
      brief([
        decision({
          id: "decision:spell-icon-fire:remove",
          target: { kind: "binding", bindingKey: "spell-icon-fire" },
          action: "remove",
          assetId: undefined,
          currentAssetId: current
        })
      ]),
      catalogue,
      PRODUCTION_TARGET_INDEX
    );

    expect(result.issues).toEqual([]);
    expect(result.proposal?.changes).toEqual([
      {
        decisionId: "decision:spell-icon-fire:remove",
        target: { kind: "binding", bindingKey: "spell-icon-fire" },
        targetFile: "src/systems/spellIcons.ts",
        beforeAssetId: current,
        afterAssetId: null
      }
    ]);
  });

  it("preserves the current level asset and both previews for Replace", () => {
    const replacement = asset("image:tiles:replacement", "image");
    const result = compileProposal(
      brief([
        decision({
          id: "decision:level-1:replace-torch",
          action: "replace",
          currentAssetId: tile.id,
          assetId: replacement.id
        })
      ]),
      [tile, replacement],
      PRODUCTION_TARGET_INDEX
    );

    expect(result.issues).toEqual([]);
    expect(result.proposal?.changes[0]).toMatchObject({
      beforeAssetId: tile.id,
      afterAssetId: replacement.id
    });
    expect(result.proposal?.previewPaths).toEqual([tile.path, replacement.path]);
  });

  it("preserves the current level asset and its preview for Remove", () => {
    const result = compileProposal(
      brief([
        decision({
          id: "decision:level-1:remove-torch",
          action: "remove",
          currentAssetId: tile.id,
          assetId: undefined
        })
      ]),
      [tile],
      PRODUCTION_TARGET_INDEX
    );

    expect(result.issues).toEqual([]);
    expect(result.proposal?.changes[0]).toMatchObject({
      beforeAssetId: tile.id,
      afterAssetId: null
    });
    expect(result.proposal?.previewPaths).toEqual([tile.path]);
  });

  it("resolves a sprite-region preview through its parent catalogue asset", () => {
    const regionId = "image:tiles:sheet:region=frame-2";
    const sheet = asset("image:tiles:sheet", "image", {
      capabilities: ["level-placement", "sprite-regions"],
      regions: [{ id: regionId, x: 32, y: 0, width: 16, height: 16 }]
    });
    const result = compileProposal(
      brief([decision({ assetId: regionId })]),
      [sheet],
      PRODUCTION_TARGET_INDEX
    );

    expect(result.issues).toEqual([]);
    expect(result.proposal?.previewPaths).toEqual([sheet.path]);
  });

  it("accepts only creature candidates for enemies and tile or creature candidates for the mage", () => {
    const enemyCurrent = PRODUCTION_TARGET_INDEX["enemy-melee"].currentAssetId;
    const mageCurrent = PRODUCTION_TARGET_INDEX["mage-sprite"].currentAssetId;
    const currentEnemy = asset(enemyCurrent, "image", {
      semanticClass: "creature",
      capabilities: ["visual-binding"]
    });
    const currentMage = asset(mageCurrent, "image", {
      semanticClass: "tile",
      capabilities: ["level-placement"]
    });
    const replacementCreature = asset("image:creatures:new-golem", "image", {
      semanticClass: "creature",
      capabilities: ["visual-binding"]
    });
    const replacementMageTile = asset("image:tiles:new-mage", "image", {
      semanticClass: "tile",
      capabilities: ["visual-binding"]
    });

    const enemyResult = compileProposal(
      brief([
        decision({
          id: "decision:enemy-melee:creature",
          target: { kind: "binding", bindingKey: "enemy-melee" },
          action: "replace",
          currentAssetId: currentEnemy.id,
          assetId: replacementCreature.id
        })
      ]),
      [currentEnemy, replacementCreature],
      PRODUCTION_TARGET_INDEX
    );
    const mageResult = compileProposal(
      brief([
        decision({
          id: "decision:mage-sprite:tile",
          target: { kind: "binding", bindingKey: "mage-sprite" },
          action: "replace",
          currentAssetId: currentMage.id,
          assetId: replacementMageTile.id
        })
      ]),
      [currentMage, replacementMageTile],
      PRODUCTION_TARGET_INDEX
    );

    expect(enemyResult.issues).toEqual([]);
    expect(mageResult.issues).toEqual([]);
    expect(PRODUCTION_TARGET_INDEX["enemy-melee"].compatibility.semanticClasses).toEqual([
      "creature"
    ]);
    expect(PRODUCTION_TARGET_INDEX["mage-sprite"].compatibility.semanticClasses).toEqual([
      "tile",
      "creature"
    ]);
  });

  it("accepts an injected read-only target index without writing to it", () => {
    const targetIndex: ProposalTargetIndex = Object.freeze({
      "custom-audio": Object.freeze({
        targetFile: "src/customAudio.ts",
        currentAssetId: audio.id,
        compatibility: Object.freeze({
          assetKinds: Object.freeze(["audio"] as const),
          semanticClasses: Object.freeze(["playable-audio"] as const),
          requiredCapabilities: Object.freeze(["audio-binding"] as const)
        })
      })
    });
    const before = JSON.stringify(targetIndex);
    const result = compileProposal(
      brief([
        decision({
          id: "decision:custom-audio:remove",
          target: { kind: "binding", bindingKey: "custom-audio" },
          action: "remove",
          assetId: undefined,
          currentAssetId: audio.id
        })
      ]),
      [audio],
      targetIndex
    );

    expect(result.proposal?.targetFiles).toEqual(["src/customAudio.ts"]);
    expect(JSON.stringify(targetIndex)).toBe(before);
  });
});
