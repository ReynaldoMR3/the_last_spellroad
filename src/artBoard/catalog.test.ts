import { describe, expect, it } from "vitest";

import {
  assetSourceStatus,
  filterAssets,
  mergeCatalogue,
  type DisplayAsset
} from "./catalog";
import * as catalogApi from "./catalog";
import type { AssetOverride, AssetRecord } from "./domain";
import seededOverrides from "../../art-direction/overrides.json";

function record(overrides: Partial<AssetRecord> = {}): AssetRecord {
  return {
    id: "image:spell-icons:fire",
    path: "public/assets/spell-icons/fire.png",
    kind: "image",
    dimensions: { width: 32, height: 32 },
    contentHash: "sha256:scanner-only",
    source: {
      name: "Spellroad originals",
      license: "MIT",
      evidencePath: "public/assets/spell-icons/License.txt"
    },
    tags: ["spell", "fire"],
    tagOrigin: "suggested",
    enrichmentState: "complete",
    semanticClass: "icon",
    capabilities: ["visual-binding"],
    ...overrides
  };
}

function display(overrides: Partial<DisplayAsset> = {}): DisplayAsset {
  return {
    id: "image:spell-icons:fire",
    url: "/assets/spell-icons/fire.png",
    kind: "image",
    dimensions: { width: 32, height: 32 },
    source: {
      name: "Spellroad originals",
      license: "MIT",
      evidencePath: "public/assets/spell-icons/License.txt"
    },
    sourceStatus: "documented",
    displayName: "Fire",
    description: null,
    tags: ["spell", "fire"],
    tagOrigin: "suggested",
    semanticClass: "icon",
    capabilities: ["visual-binding"],
    grid: null,
    regions: [],
    fileStatus: "present",
    ...overrides
  };
}

describe("mergeCatalogue", () => {
  it("lets durable corrections replace suggestions and scanner facts they explicitly override", () => {
    const scannerRecord = record();
    const correction: AssetOverride = {
      id: scannerRecord.id,
      displayName: "Ember Sigil",
      description: "The approved fire spell icon.",
      tags: ["spell", "ember"],
      source: { name: "Internal art pass" },
      semanticClass: "vfx",
      capabilities: ["preview"]
    };

    const [asset] = mergeCatalogue([scannerRecord], [correction]);

    expect(asset).toMatchObject({
      id: "image:spell-icons:fire",
      displayName: "Ember Sigil",
      description: "The approved fire spell icon.",
      tags: ["spell", "ember"],
      tagOrigin: "corrected",
      source: {
        name: "Internal art pass",
        license: "MIT",
        evidencePath: "public/assets/spell-icons/License.txt"
      },
      semanticClass: "vfx",
      capabilities: ["preview"]
    });
  });

  it("keeps the path-derived ID stable when a correction renames an asset", () => {
    const [asset] = mergeCatalogue(
      [record()],
      [{ id: "image:spell-icons:fire", displayName: "Renamed by a human" }]
    );

    expect(asset.id).toBe("image:spell-icons:fire");
    expect(asset.displayName).toBe("Renamed by a human");
  });

  it("projects records into browser-safe display assets and omits excluded records", () => {
    const input = record({
      grid: { cellWidth: 16, cellHeight: 16, columns: 2, rows: 1, spacing: 0 },
      regions: [{ id: "image:spell-icons:fire:region=frame-0", x: 0, y: 0, width: 16, height: 16 }]
    });

    const [asset] = mergeCatalogue([input], []);
    expect(asset).toEqual(display({
      grid: { cellWidth: 16, cellHeight: 16, columns: 2, rows: 1, spacing: 0 },
      regions: [{ id: "image:spell-icons:fire:region=frame-0", x: 0, y: 0, width: 16, height: 16 }]
    }));
    expect(asset).not.toHaveProperty("path");
    expect(asset).not.toHaveProperty("contentHash");
    expect(asset).not.toHaveProperty("enrichmentState");
    expect(mergeCatalogue([input], [{ id: input.id, excluded: true }])).toEqual([]);
  });

  it("does not mutate scanner records or corrections while merging", () => {
    const scannerRecord = record();
    const correction: AssetOverride = {
      id: scannerRecord.id,
      tags: ["corrected"],
      source: { license: "CC0" }
    };
    const beforeRecord = structuredClone(scannerRecord);
    const beforeCorrection = structuredClone(correction);

    const [asset] = mergeCatalogue([scannerRecord], [correction]);
    asset.tags.push("browser-only-change");
    asset.source.name = "browser-only-change";

    expect(scannerRecord).toEqual(beforeRecord);
    expect(correction).toEqual(beforeCorrection);
  });

  it("applies the committed mage binding correction to the scanner classification", () => {
    const mage = record({
      id: "image:third-party:kenney-tiny-dungeon:tiles:tile-0084",
      path: "public/assets/third-party/kenney-tiny-dungeon/Tiles/tile_0084.png",
      tags: ["character", "mage", "player"],
      semanticClass: "tile",
      capabilities: ["level-placement"]
    });

    const [asset] = mergeCatalogue(
      [mage],
      seededOverrides.overrides as AssetOverride[]
    );

    expect(asset.semanticClass).toBe("creature");
    expect(asset.capabilities).toEqual(["visual-binding"]);
  });

  it("projects overrides into detached validation records as well as display cards", () => {
    const mage = record({
      id: "image:third-party:kenney-tiny-dungeon:tiles:tile-0084",
      path: "public/assets/third-party/kenney-tiny-dungeon/Tiles/tile_0084.png",
      tags: ["character", "mage", "player"],
      semanticClass: "tile",
      capabilities: ["level-placement"]
    });
    type CorrectCatalogue = (
      records: readonly AssetRecord[],
      overrides: readonly AssetOverride[]
    ) => AssetRecord[];
    const correctCatalogue = (
      catalogApi as unknown as { applyCatalogueOverrides: CorrectCatalogue }
    ).applyCatalogueOverrides;

    const [corrected] = correctCatalogue(
      [mage],
      seededOverrides.overrides as AssetOverride[]
    );

    expect(corrected).toMatchObject({
      id: mage.id,
      path: mage.path,
      semanticClass: "creature",
      capabilities: ["visual-binding"]
    });
    expect(mage).toMatchObject({
      semanticClass: "tile",
      capabilities: ["level-placement"]
    });
  });
});

describe("filterAssets", () => {
  const records = [
    display(),
    display({
      id: "audio:audio:music:combat-encounter-loop:ogg",
      url: "/assets/audio/music/combat-encounter-loop.ogg",
      kind: "audio",
      dimensions: null,
      displayName: "Combat Encounter Loop",
      tags: ["music", "battle"],
      semanticClass: "playable-audio",
      capabilities: ["audio-binding", "audio-preview"]
    }),
    display({
      id: "map:levels:level-1",
      url: "/assets/levels/level-1.json",
      kind: "map",
      dimensions: null,
      displayName: "Level One",
      tags: ["castle", "entry"],
      semanticClass: "map",
      capabilities: ["preview"]
    })
  ];

  it.each([
    ["combat-encounter", "audio:audio:music:combat-encounter-loop:ogg"],
    ["LEVEL ONE", "map:levels:level-1"],
    ["castle", "map:levels:level-1"]
  ])("matches %s across stable IDs, display names, and tags", (query, expectedId) => {
    expect(filterAssets(records, query, "all").map((asset) => asset.id)).toEqual([expectedId]);
  });

  it("filters by asset kind while retaining text matches", () => {
    expect(filterAssets(records, "", "audio").map((asset) => asset.id)).toEqual([
      "audio:audio:music:combat-encounter-loop:ogg"
    ]);
    expect(filterAssets(records, "spell", "map")).toEqual([]);
  });

  it("returns a new array without mutating the catalogue", () => {
    const before = [...records];
    const filtered = filterAssets(records, "", "all");

    expect(filtered).not.toBe(records);
    expect(records).toEqual(before);
  });
});

describe("assetSourceStatus", () => {
  it("warns when an asset has no source evidence", () => {
    expect(assetSourceStatus({ name: null, license: null, evidencePath: null })).toBe("missing");
  });

  it("accepts a catalogue asset as named by the public interface", () => {
    expect(assetSourceStatus(record({
      source: { name: null, license: null, evidencePath: null }
    }))).toBe("missing");
  });

  it("distinguishes incomplete evidence from a documented source", () => {
    expect(assetSourceStatus({ name: "Known pack", license: null, evidencePath: null })).toBe("incomplete");
    expect(assetSourceStatus({
      name: "Known pack",
      license: "CC0",
      evidencePath: "public/assets/known/License.txt"
    })).toBe("documented");
  });
});
