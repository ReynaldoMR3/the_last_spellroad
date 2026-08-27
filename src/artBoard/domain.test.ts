import { describe, expect, it } from "vitest";
import {
  catalogAssetId,
  validateArtBrief,
  type ArtBrief,
  type ArtDecision,
  type AssetCapability,
  type AssetKind,
  type AssetRecord,
  type AssetSemanticClass,
  type BindingCompatibilityIndex,
  type LevelAnchor,
  type LevelNumber,
  type LevelZone
} from "./domain";

function asset(id: string, kind: AssetKind, overrides: Partial<AssetRecord> = {}): AssetRecord {
  const semantics: Record<AssetKind, { semanticClass: AssetSemanticClass; capabilities: AssetCapability[] }> = {
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

function decision(overrides: Partial<ArtDecision> = {}): ArtDecision {
  return {
    id: "decision:level-1:entrance",
    target: { kind: "level", level: 1, zone: "entrance", anchor: "leftEdge" },
    action: "use",
    assetId: "image:spell-icons:fire",
    intent: "Warm landmark; keep the combat lane clear.",
    status: "draft",
    ...overrides
  };
}

function brief(decisions: ArtDecision[]): ArtBrief {
  return {
    schemaVersion: 1,
    id: "brief:level-1",
    decisions
  };
}

const assets = [
  asset("image:spell-icons:fire", "image"),
  asset("image:spell-icons:ice", "image"),
  asset("audio:music:boss", "audio")
];

describe("catalogAssetId", () => {
  it("derives the kind and stable identity from a canonical asset path", () => {
    expect(catalogAssetId("public/assets/spell-icons/fire.png")).toBe("image:spell-icons:fire");
  });

  it("normalizes platform separators, case, spaces, and a leading relative marker", () => {
    expect(catalogAssetId("./public\\assets\\Spell Icons\\Fire.PNG")).toBe("image:spell-icons:fire");
  });

  it("keeps a sprite region distinct from a file path segment", () => {
    const regionId = catalogAssetId("public/assets/actors/mage.png", "Idle 0");

    expect(regionId).toBe("image:actors:mage:region=idle-0");
    expect(regionId).not.toBe(catalogAssetId("public/assets/actors/mage/region/idle-0.png"));
  });

  it("keeps paired playable audio and authored MIDI source identities distinct", () => {
    expect(catalogAssetId("public/assets/audio/music/boss.ogg")).toBe("audio:audio:music:boss:ogg");
    expect(catalogAssetId("public/assets/audio/music/boss.mid")).toBe("audio:audio:music:boss:mid");
  });

  it("uses the scanner's supported extension families", () => {
    expect(catalogAssetId("public/assets/atlas.webp")).toBe("image:atlas");
    expect(catalogAssetId("public/assets/vector.svg")).toBe("image:vector");
    expect(catalogAssetId("public/assets/audio/hit.flac")).toBe("audio:audio:hit:flac");
    expect(catalogAssetId("public/assets/audio/hit.m4a")).toBe("audio:audio:hit:m4a");
    expect(catalogAssetId("public/assets/maps/arena.tmj")).toBe("map:maps:arena");
    expect(catalogAssetId("public/assets/tiles/dungeon.tsj")).toBe("source:tiles:dungeon");
    expect(catalogAssetId("public/assets/notes.md")).toBe("source:notes");
    expect(catalogAssetId("public/assets/pack/License.txt")).toBe("source:pack:license");
    expect(catalogAssetId("public/assets/vfx/provenance-remix.json")).toBe(
      "provenance:vfx:provenance-remix"
    );
    expect(() => catalogAssetId("public/assets/archive.zip")).toThrow(/unsupported asset/i);
  });

  it("accepts scanner content classification for a JSON map outside a conventional map directory", () => {
    expect(catalogAssetId("public/assets/custom/arena.json", undefined, "map")).toBe("map:custom:arena");
  });

  it("drops punctuation-only normalized path components like the scanner", () => {
    expect(catalogAssetId("public/assets/pack/!!!/hero.png")).toBe("image:pack:hero");
    expect(catalogAssetId("public/assets/pack/!!!.png")).toBe("image:pack");
  });

  it("derives addressable region IDs from JSON-safe sprite grid metadata", () => {
    const sheet = asset("image:vfx:cast", "image", {
      path: "public/assets/vfx/cast.png",
      semanticClass: "vfx",
      capabilities: ["visual-binding", "sprite-regions"],
      grid: {
        cellWidth: 64,
        cellHeight: 64,
        columns: 4,
        rows: 1,
        spacing: 0
      },
      regions: [
        { id: "image:vfx:cast:region=frame-0", x: 0, y: 0, width: 64, height: 64 },
        { id: "image:vfx:cast:region=frame-1", x: 64, y: 0, width: 64, height: 64 }
      ]
    });

    expect(sheet.regions?.[1].id).toBe(catalogAssetId(sheet.path, "frame-1"));
  });
});

describe("validateArtBrief", () => {
  it("accepts a valid image placement in Levels 1 through 5", () => {
    expect(validateArtBrief(brief([decision()]), assets)).toEqual([]);
    expect(
      validateArtBrief(
        brief([
          decision({
            id: "decision:level-5:threshold",
            target: { kind: "level", level: 5, zone: "threshold", anchor: "rightEdge" }
          })
        ]),
        assets
      )
    ).toEqual([]);
  });

  it("reports an asset ID that is absent from the catalogue", () => {
    const issues = validateArtBrief(
      brief([decision({ assetId: "image:missing:torch" })]),
      assets
    );

    expect(issues.map((issue) => issue.code)).toEqual(["unknown-asset"]);
    expect(issues[0].decisionId).toBe("decision:level-1:entrance");
  });

  it("rejects a level outside the supported Level 1 through 5 range", () => {
    const issues = validateArtBrief(
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
      assets
    );

    expect(issues.map((issue) => issue.code)).toEqual(["invalid-level"]);
  });

  it("rejects missing, blank, and non-string level zone or anchor values", () => {
    const malformed = decision({
      target: {
        kind: "level",
        level: 1,
        zone: "   " as unknown as LevelZone,
        anchor: 42 as unknown as LevelAnchor
      }
    });

    const issues = validateArtBrief(brief([malformed]), assets);

    expect(issues.map((issue) => issue.code)).toEqual(["invalid-zone", "invalid-anchor"]);
    expect(issues.map((issue) => issue.message)).toEqual([
      expect.stringMatching(/zone/),
      expect.stringMatching(/anchor/)
    ]);

    const missingIssues = validateArtBrief(
      brief([
        decision({
          target: { kind: "level", level: 1 } as unknown as ArtDecision["target"]
        })
      ]),
      assets
    );
    expect(missingIssues.map((issue) => issue.code)).toEqual(["invalid-zone", "invalid-anchor"]);
  });

  it("restricts every level context to the board's named zones and anchors", () => {
    const validTargets: ArtDecision["target"][] = [
      { kind: "level", level: 1, zone: "entrance", anchor: "leftEdge" },
      { kind: "level", level: 2, zone: "lane", anchor: "center" },
      { kind: "level", level: 3, zone: "leftEdge", anchor: "rightEdge" },
      { kind: "level", level: 4, zone: "rightEdge", anchor: "leftEdge" },
      { kind: "level", level: 5, zone: "threshold", anchor: "center" }
    ];

    for (const [index, target] of validTargets.entries()) {
      expect(
        validateArtBrief(
          brief([decision({ id: `decision:valid-context:${index}`, target })]),
          assets
        )
      ).toEqual([]);
    }

    const issues = validateArtBrief(
      brief([
        decision({
          target: {
            kind: "level",
            level: 1,
            zone: "bossRoom" as unknown as LevelZone,
            anchor: "topEdge" as unknown as LevelAnchor
          }
        })
      ]),
      assets
    );
    expect(issues.map((issue) => issue.code)).toEqual(["invalid-zone", "invalid-anchor"]);
  });

  it("rejects audio as a level placement", () => {
    const issues = validateArtBrief(
      brief([decision({ assetId: "audio:music:boss" })]),
      assets
    );

    expect(issues[0].code).toBe("asset-kind-mismatch");
  });

  it("allows only tiles and props with level-placement capability on a level board", () => {
    const cases: Array<{ candidate: AssetRecord; expectedIssues: string[] }> = [
      {
        candidate: asset("image:tiles:floor", "image", {
          semanticClass: "tile",
          capabilities: ["level-placement"]
        }),
        expectedIssues: []
      },
      {
        candidate: asset("image:props:torch", "image", {
          semanticClass: "prop",
          capabilities: ["level-placement"]
        }),
        expectedIssues: []
      },
      {
        candidate: asset("image:spell-icons:fire", "image", {
          semanticClass: "icon",
          capabilities: ["visual-binding"]
        }),
        expectedIssues: ["asset-kind-mismatch"]
      },
      {
        candidate: asset("image:vfx:cast", "image", {
          semanticClass: "vfx",
          capabilities: ["visual-binding", "sprite-regions"]
        }),
        expectedIssues: ["asset-kind-mismatch"]
      },
      {
        candidate: asset("image:creatures:golem", "image", {
          semanticClass: "creature",
          capabilities: ["visual-binding"]
        }),
        expectedIssues: ["asset-kind-mismatch"]
      },
      {
        candidate: asset("image:pack:preview", "image", {
          semanticClass: "preview",
          capabilities: ["preview"]
        }),
        expectedIssues: ["asset-kind-mismatch"]
      },
      {
        candidate: asset("image:props:uncatalogued-capability", "image", {
          semanticClass: "prop",
          capabilities: ["preview"]
        }),
        expectedIssues: ["asset-kind-mismatch"]
      }
    ];

    for (const { candidate, expectedIssues } of cases) {
      const issues = validateArtBrief(
        brief([decision({ assetId: candidate.id })]),
        [candidate]
      );
      expect(issues.map((issue) => issue.code), candidate.id).toEqual(expectedIssues);
    }
  });

  it("resolves a sprite region with its parent asset's level-placement semantics", () => {
    const regionId = "image:tiles:dungeon:region=frame-3";
    const sheet = asset("image:tiles:dungeon", "image", {
      semanticClass: "tile",
      capabilities: ["level-placement", "sprite-regions"],
      regions: [{ id: regionId, x: 48, y: 0, width: 16, height: 16 }]
    });

    const issues = validateArtBrief(
      brief([decision({ assetId: regionId })]),
      [sheet]
    );

    expect(issues).toEqual([]);
  });

  it("reports a sprite region using its missing or changed parent file status", () => {
    const regionId = "image:tiles:dungeon:region=frame-3";
    const issuesFor = (fileStatus: "missing" | "changed") => {
      const sheet = asset("image:tiles:dungeon", "image", {
        semanticClass: "tile",
        capabilities: ["level-placement", "sprite-regions"],
        fileStatus,
        regions: [{ id: regionId, x: 48, y: 0, width: 16, height: 16 }]
      });
      return validateArtBrief(
        brief([decision({ assetId: regionId })]),
        [sheet]
      );
    };

    const missingIssues = issuesFor("missing");
    const changedIssues = issuesFor("changed");

    expect(missingIssues.map((issue) => issue.code)).toEqual(["missing-file"]);
    expect(missingIssues[0].assetId).toBe(regionId);
    expect(changedIssues.map((issue) => issue.code)).toEqual(["changed-file"]);
    expect(changedIssues[0].assetId).toBe(regionId);
  });

  it("reports missing source evidence through a sprite region ID", () => {
    const regionId = "image:tiles:dungeon:region=frame-3";
    const sheet = asset("image:tiles:dungeon", "image", {
      semanticClass: "tile",
      capabilities: ["level-placement", "sprite-regions"],
      source: { name: null, license: null, evidencePath: null },
      regions: [{ id: regionId, x: 48, y: 0, width: 16, height: 16 }]
    });

    const issues = validateArtBrief(
      brief([decision({ assetId: regionId })]),
      [sheet]
    );

    expect(issues.map((issue) => issue.code)).toEqual(["missing-source"]);
    expect(issues[0].assetId).toBe(regionId);
  });

  it("reports a binding key absent from the supplied target index", () => {
    const issues = validateArtBrief(
      brief([
        decision({
          target: { kind: "binding", bindingKey: "not-a-real-binding" }
        })
      ]),
      assets,
      {}
    );

    expect(issues.map((issue) => issue.code)).toEqual(["unknown-binding"]);
  });

  it("rejects blank or non-string binding target keys as malformed targets", () => {
    const blank = decision({ target: { kind: "binding", bindingKey: "   " } });
    const nonString = decision({
      target: {
        kind: "binding",
        bindingKey: 42 as unknown as string
      }
    });

    expect(validateArtBrief(brief([blank]), assets).map((issue) => issue.code)).toEqual([
      "invalid-target"
    ]);
    expect(validateArtBrief(brief([nonString]), assets).map((issue) => issue.code)).toEqual([
      "invalid-target"
    ]);
  });

  it("uses the target index to enforce a binding's compatible asset kinds", () => {
    const bindings: BindingCompatibilityIndex = { "sfx-hit": { assetKinds: ["audio"] } };
    const bindingDecision = decision({
      target: { kind: "binding", bindingKey: "sfx-hit" },
      assetId: "image:spell-icons:fire"
    });

    expect(validateArtBrief(brief([bindingDecision]), assets, bindings).map((issue) => issue.code)).toEqual([
      "asset-kind-mismatch"
    ]);
    expect(
      validateArtBrief(
        brief([{ ...bindingDecision, assetId: "audio:music:boss" }]),
        assets,
        bindings
      )
    ).toEqual([]);
  });

  it("enforces semantic class and capability requirements for visual and audio bindings", () => {
    const bindings: BindingCompatibilityIndex = {
      "spell-icon-fire": {
        assetKinds: ["image"],
        semanticClasses: ["icon"],
        requiredCapabilities: ["visual-binding"]
      },
      "enemy-melee": {
        assetKinds: ["image"],
        semanticClasses: ["creature"],
        requiredCapabilities: ["visual-binding"]
      },
      "sfx-hit": {
        assetKinds: ["audio"],
        semanticClasses: ["playable-audio"],
        requiredCapabilities: ["audio-binding", "audio-preview"]
      }
    };
    const icon = asset("image:spell-icons:fire", "image", {
      semanticClass: "icon",
      capabilities: ["visual-binding"]
    });
    const vfx = asset("image:vfx:fire-cast", "image", {
      semanticClass: "vfx",
      capabilities: ["visual-binding", "sprite-regions"]
    });
    const creature = asset("image:creatures:golem", "image", {
      semanticClass: "creature",
      capabilities: ["visual-binding"]
    });
    const playableAudio = asset("audio:sfx:hit:ogg", "audio", {
      semanticClass: "playable-audio",
      capabilities: ["audio-binding", "audio-preview"]
    });
    const midiSource = asset("audio:sfx:hit:mid", "audio", {
      semanticClass: "audio-source",
      capabilities: []
    });

    const issuesFor = (bindingKey: string, candidate: AssetRecord) =>
      validateArtBrief(
        brief([
          decision({
            target: { kind: "binding", bindingKey },
            assetId: candidate.id
          })
        ]),
        [candidate],
        bindings
      ).map((issue) => issue.code);

    expect(issuesFor("spell-icon-fire", icon)).toEqual([]);
    expect(issuesFor("spell-icon-fire", vfx)).toEqual(["asset-kind-mismatch"]);
    expect(issuesFor("enemy-melee", creature)).toEqual([]);
    expect(issuesFor("enemy-melee", icon)).toEqual(["asset-kind-mismatch"]);
    expect(issuesFor("sfx-hit", playableAudio)).toEqual([]);
    expect(issuesFor("sfx-hit", midiSource)).toEqual(["asset-kind-mismatch"]);
  });

  it("reports a missing proposed asset ID before compilation", () => {
    const issues = validateArtBrief(brief([decision({ assetId: undefined })]), assets);

    expect(issues.map((issue) => issue.code)).toEqual(["missing-asset"]);
  });

  it("requires replace/remove decisions to identify their current asset", () => {
    const replaceIssues = validateArtBrief(
      brief([decision({ action: "replace", assetId: "image:spell-icons:ice" })]),
      assets
    );
    const removeIssues = validateArtBrief(
      brief([decision({ action: "remove", assetId: undefined })]),
      assets
    );

    expect(replaceIssues.map((issue) => issue.code)).toEqual(["missing-asset"]);
    expect(removeIssues.map((issue) => issue.code)).toEqual(["missing-asset"]);
  });

  it("validates currentAssetId references as well as proposed assets", () => {
    const issues = validateArtBrief(
      brief([
        decision({
          action: "replace",
          currentAssetId: "image:missing:current",
          assetId: "image:spell-icons:ice"
        })
      ]),
      assets
    );

    expect(issues.map((issue) => issue.code)).toEqual(["unknown-asset"]);
    expect(issues[0].assetId).toBe("image:missing:current");
  });

  it("rejects runtime action and target values outside the TypeScript contract", () => {
    const invalidAction = decision({ action: "move" as ArtDecision["action"] });
    const invalidTarget = decision({ target: null as unknown as ArtDecision["target"] });

    expect(validateArtBrief(brief([invalidAction]), assets).map((issue) => issue.code)).toEqual([
      "invalid-action"
    ]);
    expect(validateArtBrief(brief([invalidTarget]), assets).map((issue) => issue.code)).toEqual([
      "invalid-target"
    ]);
  });

  it("rejects a runtime status outside draft, approved, or superseded", () => {
    const issues = validateArtBrief(
      brief([
        decision({ status: "archived" as ArtDecision["status"] })
      ]),
      assets
    );

    expect(issues.map((issue) => issue.code)).toEqual(["invalid-status"]);
  });

  it("reports missing or changed files for every referenced catalogue asset", () => {
    const unavailableAssets = [
      asset("image:spell-icons:fire", "image", { fileStatus: "missing" }),
      asset("image:spell-icons:ice", "image", { fileStatus: "changed" })
    ];
    const issues = validateArtBrief(
      brief([
        decision({
          action: "replace",
          currentAssetId: "image:spell-icons:fire",
          assetId: "image:spell-icons:ice"
        })
      ]),
      unavailableAssets
    );

    expect(issues.map((issue) => issue.code)).toEqual(["changed-file", "missing-file"]);
  });

  it("requires license evidence when a new asset is proposed", () => {
    const unsourcedAssets = [
      asset("image:spell-icons:fire", "image", {
        source: { name: "Unknown pack", license: null, evidencePath: null }
      })
    ];

    const issues = validateArtBrief(brief([decision()]), unsourcedAssets);

    expect(issues.map((issue) => issue.code)).toEqual(["missing-source"]);
    expect(issues[0].severity).toBe("error");
  });

  it("treats entirely absent source metadata as missing source evidence", () => {
    const issues = validateArtBrief(
      brief([decision()]),
      [
        {
          id: "image:spell-icons:fire",
          kind: "image",
          semanticClass: "prop",
          capabilities: ["level-placement"]
        }
      ]
    );

    expect(issues.map((issue) => issue.code)).toEqual(["missing-source"]);
  });

  it("rejects two active decisions for the same binding", () => {
    const bindings: BindingCompatibilityIndex = {
      "spell-icon-fire": { assetKinds: ["image"] }
    };
    const first = decision({
      id: "decision:spell-icon-fire:first",
      target: { kind: "binding", bindingKey: "spell-icon-fire" }
    });
    const second = decision({
      id: "decision:spell-icon-fire:second",
      target: { kind: "binding", bindingKey: "spell-icon-fire" },
      assetId: "image:spell-icons:ice"
    });

    const issues = validateArtBrief(brief([first, second]), assets, bindings);

    expect(issues.map((issue) => issue.code)).toEqual(["conflicting-binding-decisions"]);
    expect(issues[0].decisionIds).toEqual([
      "decision:spell-icon-fire:first",
      "decision:spell-icon-fire:second"
    ]);
  });

  it("allows a superseded binding decision alongside its active replacement", () => {
    const bindings: BindingCompatibilityIndex = {
      "spell-icon-fire": { assetKinds: ["image"] }
    };
    const oldDecision = decision({
      id: "decision:spell-icon-fire:old",
      target: { kind: "binding", bindingKey: "spell-icon-fire" },
      status: "superseded"
    });
    const replacement = decision({
      id: "decision:spell-icon-fire:new",
      target: { kind: "binding", bindingKey: "spell-icon-fire" },
      action: "replace",
      currentAssetId: "image:spell-icons:fire",
      assetId: "image:spell-icons:ice"
    });

    expect(validateArtBrief(brief([oldDecision, replacement]), assets, bindings)).toEqual([]);
  });
});
