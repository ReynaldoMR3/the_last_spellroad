import { describe, expect, it } from "vitest";
import type { DisplayAsset } from "./catalog";
import {
  validateArtBrief,
  type ArtDecision,
  type AssetKind,
  type AssetSemanticClass
} from "./domain";
import * as boardStateApi from "./boardState";
import { PRODUCTION_TARGET_INDEX, bindingCompatibilityIndex } from "./proposal";

interface BindingContextCard {
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

interface AudioPreviewMetadata {
  sourceUrl: string;
  format: string;
  mimeType: string | null;
  canPreview: boolean;
  fallbackText: string;
}

type ContextApi = {
  levelPlacementTargets(level: 1 | 2 | 3 | 4 | 5): Array<{
    level: 1 | 2 | 3 | 4 | 5;
    zone: string;
    anchor: string;
  }>;
  bindingContextCards(
    assets: readonly DisplayAsset[],
    decisions: readonly ArtDecision[],
    targetIndex: typeof PRODUCTION_TARGET_INDEX
  ): BindingContextCard[];
  audioPreviewMetadata(asset: DisplayAsset): AudioPreviewMetadata;
};

const contextApi = (): ContextApi => boardStateApi as unknown as ContextApi;

function displayAsset(
  id: string,
  kind: AssetKind,
  semanticClass: AssetSemanticClass,
  capabilities: DisplayAsset["capabilities"],
  overrides: Partial<DisplayAsset> = {}
): DisplayAsset {
  const extension = kind === "audio" ? "ogg" : "png";
  return {
    id,
    url: `/assets/test/${id.replace(/:/g, "-")}.${extension}`,
    kind,
    dimensions: kind === "image" ? { width: 32, height: 32 } : null,
    source: { name: "Test pack", license: "CC0", evidencePath: "public/assets/test/License.txt" },
    sourceStatus: "documented",
    displayName: id,
    description: null,
    tags: [],
    tagOrigin: "generated",
    semanticClass,
    capabilities,
    grid: null,
    regions: [],
    fileStatus: "present",
    ...overrides
  };
}

function replacementDecision(bindingKey: string, currentAssetId: string, assetId: string): ArtDecision {
  return {
    id: `decision:${bindingKey}:replacement`,
    target: { kind: "binding", bindingKey },
    action: "replace",
    currentAssetId,
    assetId,
    status: "draft"
  };
}

describe("Art Board contexts", () => {
  it("builds all semantic placement targets for Level 5", () => {
    const targets = contextApi().levelPlacementTargets(5);

    expect(targets).toHaveLength(15);
    expect(targets[0]).toEqual({ level: 5, zone: "entrance", anchor: "leftEdge" });
    expect(targets[targets.length - 1]).toEqual({ level: 5, zone: "threshold", anchor: "rightEdge" });
  });

  it("shows an enemy replacement draft beside the exact production enemy binding", () => {
    const currentId = PRODUCTION_TARGET_INDEX["enemy-melee"].currentAssetId;
    const current = displayAsset(currentId, "image", "creature", ["visual-binding"]);
    const replacement = displayAsset("image:creatures:replacement-knight", "image", "creature", ["visual-binding"]);
    const decision = replacementDecision("enemy-melee", current.id, replacement.id);

    const card = contextApi().bindingContextCards(
      [current, replacement],
      [decision],
      PRODUCTION_TARGET_INDEX
    ).find((candidate) => candidate.bindingKey === "enemy-melee");

    expect(card).toMatchObject({
      targetFile: "src/systems/characterArt.ts",
      currentAssetId: current.id,
      currentAsset: current,
      currentAssetMissing: false,
      draftDecision: decision,
      mediaKind: "image"
    });
    expect(card?.candidates.map((candidate) => candidate.id)).toEqual([
      current.id,
      replacement.id
    ]);
  });

  it("offers only icon-compatible candidates for a spell-icon replacement", () => {
    const currentId = PRODUCTION_TARGET_INDEX["spell-icon-fire"].currentAssetId;
    const current = displayAsset(currentId, "image", "icon", ["visual-binding"]);
    const replacement = displayAsset("image:spell-icons:replacement", "image", "icon", ["visual-binding"]);
    const vfx = displayAsset("image:vfx:fire-cast", "image", "vfx", ["visual-binding"]);
    const audio = displayAsset("audio:sfx:hit:ogg", "audio", "playable-audio", ["audio-binding", "audio-preview"]);

    const card = contextApi().bindingContextCards(
      [current, replacement, vfx, audio],
      [],
      PRODUCTION_TARGET_INDEX
    ).find((candidate) => candidate.bindingKey === "spell-icon-fire");

    expect(card?.candidates.map((candidate) => candidate.id)).toEqual([
      current.id,
      replacement.id
    ]);
  });

  it("offers only VFX-compatible candidates for an opening effect binding", () => {
    const currentId = PRODUCTION_TARGET_INDEX["openingvfx-fire-cast"].currentAssetId;
    const current = displayAsset(currentId, "image", "vfx", ["visual-binding"]);
    const replacement = displayAsset("image:vfx:replacement-cast", "image", "vfx", ["visual-binding"]);
    const icon = displayAsset("image:spell-icons:fire", "image", "icon", ["visual-binding"]);

    const card = contextApi().bindingContextCards(
      [current, replacement, icon],
      [],
      PRODUCTION_TARGET_INDEX
    ).find((candidate) => candidate.bindingKey === "openingvfx-fire-cast");

    expect(card?.candidates.map((candidate) => candidate.id)).toEqual([
      current.id,
      replacement.id
    ]);
  });

  it("derives safe audio preview metadata and a non-blocking codec fallback", () => {
    const audio = displayAsset(
      "audio:audio:music:boss-theme:ogg",
      "audio",
      "playable-audio",
      ["audio-binding", "audio-preview"],
      { url: "/assets/audio/music/boss-theme.ogg", displayName: "Boss theme" }
    );

    expect(contextApi().audioPreviewMetadata(audio)).toEqual({
      sourceUrl: "/assets/audio/music/boss-theme.ogg",
      format: "OGG",
      mimeType: "audio/ogg",
      canPreview: true,
      fallbackText: "This browser cannot preview OGG audio. The draft remains available."
    });
  });

  it("keeps a saved binding and its draft visible when the current asset is missing", () => {
    const currentId = PRODUCTION_TARGET_INDEX["enemy-ranged"].currentAssetId;
    const missingCurrent = displayAsset(currentId, "image", "creature", ["visual-binding"], {
      fileStatus: "missing"
    });
    const replacement = displayAsset("image:creatures:replacement-archer", "image", "creature", ["visual-binding"]);
    const decision = replacementDecision("enemy-ranged", currentId, replacement.id);

    const card = contextApi().bindingContextCards(
      [missingCurrent, replacement],
      [decision],
      PRODUCTION_TARGET_INDEX
    ).find((candidate) => candidate.bindingKey === "enemy-ranged");

    expect(card).toMatchObject({
      currentAssetId: currentId,
      currentAsset: missingCurrent,
      currentAssetMissing: true,
      draftDecision: decision
    });
  });

  it("surfaces conflicting saved binding decisions without discarding either draft", () => {
    const currentId = PRODUCTION_TARGET_INDEX["spell-icon-fire"].currentAssetId;
    const current = displayAsset(currentId, "image", "icon", ["visual-binding"]);
    const first = replacementDecision("spell-icon-fire", currentId, current.id);
    const second = { ...first, id: "decision:spell-icon-fire:second" };

    const card = contextApi().bindingContextCards(
      [current],
      [first, second],
      PRODUCTION_TARGET_INDEX
    ).find((candidate) => candidate.bindingKey === "spell-icon-fire");
    const issues = validateArtBrief(
      { schemaVersion: 1, id: "brief:conflict", decisions: [first, second] },
      [current],
      bindingCompatibilityIndex(PRODUCTION_TARGET_INDEX)
    );

    expect(card?.draftDecision).toBe(second);
    expect(issues.map((issue) => issue.code)).toContain("conflicting-binding-decisions");
    expect(card?.draftDecisions.map((decision) => decision.id)).toEqual([
      first.id,
      second.id
    ]);
  });
});
