import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { generateCatalog } from "./generateCatalog.mjs";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function png(width, height) {
  const header = Buffer.alloc(25);
  PNG_SIGNATURE.copy(header, 0);
  header.writeUInt32BE(13, 8);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "art-board-catalog-"));
  const assets = join(root, "public", "assets");
  const output = join(root, "art-direction", "catalog.json");
  await mkdir(join(assets, "nested", "pack"), { recursive: true });
  await mkdir(join(assets, "metadata"), { recursive: true });
  await mkdir(join(assets, "levels"), { recursive: true });
  await mkdir(join(assets, "vfx", "flare"), { recursive: true });
  await mkdir(join(assets, "tiles", "Tiled"), { recursive: true });
  await mkdir(join(assets, "tiles", "Tilemap"), { recursive: true });
  await writeFile(join(assets, "nested", "License.txt"), "# decorative separator\nNested art\nLicense: CC0\n");
  await writeFile(join(assets, "nested", "pack", "hero.png"), png(13, 29));
  await writeFile(join(assets, "nested", "pack", "vector.svg"), "<svg />");
  await writeFile(join(assets, "nested", "pack", "theme.ogg"), "audio");
  await writeFile(join(assets, "nested", "pack", "voice.m4a"), "audio");
  await writeFile(join(assets, "levels", "level-1.json"), '{"layers": []}');
  await writeFile(join(assets, "metadata", "provenance.json"), '{"kind": "sourced"}');
  await writeFile(join(assets, "metadata", "derived.png"), png(2, 3));
  await writeFile(join(assets, "nested", "pack", "sheet.tsx"), "<tileset />");
  await writeFile(join(assets, "nested", "pack", "notes.md"), "source notes");
  await writeFile(join(assets, "vfx", "flare", "cast.png"), png(8, 4));
  await writeFile(join(assets, "vfx", "flare", "provenance.json"), JSON.stringify({
    sources: [{ title: "Flare pack", creator: "Example Artist", license: { spdx: "CC0-1.0" } }],
    derivatives: [{
      projectPath: "public/assets/vfx/flare/cast.png",
      frameWidthPx: 2,
      frameHeightPx: 4,
      frameCount: 4
    }]
  }));
  await writeFile(join(assets, "tiles", "Tilemap", "sheet.png"), png(5, 3));
  await writeFile(join(assets, "tiles", "Tiled", "sheet.tsx"), '<tileset tilewidth="2" tileheight="1" spacing="1" tilecount="2" columns="2"><image source="../Tilemap/sheet.png" width="5" height="3"/></tileset>');
  return { root, assets, output };
}

test("generateCatalog recursively classifies records, reads PNG dimensions, and attaches nearby evidence", async (t) => {
  const paths = await fixture();
  t.after(() => rm(paths.root, { recursive: true, force: true }));

  const catalog = await generateCatalog({ assetRoot: paths.assets, outputPath: paths.output });

  assert.deepEqual(catalog.assets.map((asset) => asset.id), [...catalog.assets.map((asset) => asset.id)].sort());
  const hero = catalog.assets.find((asset) => asset.id === "image:nested:pack:hero");
  assert.deepEqual(hero.dimensions, { width: 13, height: 29 });
  assert.equal(hero.source.name, "Nested art");
  assert.equal(hero.source.license, "CC0");
  assert.equal(hero.source.evidencePath, "public/assets/nested/License.txt");
  assert.deepEqual(hero.capabilities, ["level-placement"]);
  assert.equal(hero.semanticClass, "prop");
  assert.equal(catalog.assets.find((asset) => asset.id === "audio:nested:pack:theme:ogg").capabilities.includes("audio-preview"), true);
  assert.deepEqual(catalog.assets.find((asset) => asset.id === "audio:nested:pack:theme:ogg").semanticClass, "playable-audio");
  assert.deepEqual(catalog.assets.find((asset) => asset.id === "image:vfx:flare:cast").grid, { cellWidth: 2, cellHeight: 4, columns: 4, rows: 1, spacing: 0 });
  assert.equal(catalog.assets.find((asset) => asset.id === "image:vfx:flare:cast").regions.at(-1).id, "image:vfx:flare:cast:region=frame-3");
  assert.equal(catalog.assets.find((asset) => asset.id === "image:tiles:tilemap:sheet").regions.length, 2);
  assert.deepEqual(catalog.assets.find((asset) => asset.id === "provenance:vfx:flare:provenance").source, {
    name: "Flare pack",
    license: "CC0-1.0",
    evidencePath: "public/assets/vfx/flare/provenance.json"
  });
  assert.equal(catalog.assets.find((asset) => asset.id === "source:nested:license").semanticClass, "source");
  assert.equal(catalog.assets.find((asset) => asset.id === "image:metadata:derived").source.evidencePath, "public/assets/metadata/provenance.json");
  assert.deepEqual(JSON.parse(await readFile(paths.output, "utf8")), catalog);
});

test("generateCatalog retains referenced missing assets and flags changed content after a refresh", async (t) => {
  const paths = await fixture();
  t.after(() => rm(paths.root, { recursive: true, force: true }));
  await generateCatalog({ assetRoot: paths.assets, outputPath: paths.output });

  await writeFile(join(paths.assets, "nested", "pack", "hero.png"), png(20, 30));
  await rm(join(paths.assets, "nested", "pack", "theme.ogg"));
  await mkdir(join(paths.root, "art-direction", "boards"), { recursive: true });
  await writeFile(join(paths.root, "art-direction", "boards", "level-1.json"), JSON.stringify({
    decisions: [{ assetId: "audio:nested:pack:theme:ogg" }]
  }));
  const catalog = await generateCatalog({
    assetRoot: paths.assets,
    outputPath: paths.output
  });

  assert.equal(catalog.assets.find((asset) => asset.id === "image:nested:pack:hero").fileStatus, "changed");
  assert.equal(catalog.assets.find((asset) => asset.id === "audio:nested:pack:theme:ogg").fileStatus, "missing");
});

test("generateCatalog rejects normalized path collisions instead of producing ambiguous IDs", async (t) => {
  const paths = await fixture();
  t.after(() => rm(paths.root, { recursive: true, force: true }));
  await writeFile(join(paths.assets, "same name.png"), png(1, 1));
  await writeFile(join(paths.assets, "same-name.png"), png(1, 1));

  await assert.rejects(
    () => generateCatalog({ assetRoot: paths.assets, outputPath: paths.output }),
    /Duplicate catalog ID: image:same-name/
  );
});

test("generateCatalog omits punctuation-only path segments to match catalogAssetId", async (t) => {
  const paths = await fixture();
  t.after(() => rm(paths.root, { recursive: true, force: true }));
  await mkdir(join(paths.assets, "!!!"));
  await writeFile(join(paths.assets, "!!!", "hero.png"), png(1, 1));

  const catalog = await generateCatalog({ assetRoot: paths.assets, outputPath: paths.output });

  assert.equal(catalog.assets.some((asset) => asset.id === "image:hero"), true);
});

test("generateCatalog seeds only conservative tags for exact known assets", async (t) => {
  const paths = await fixture();
  t.after(() => rm(paths.root, { recursive: true, force: true }));
  await mkdir(join(paths.assets, "spell-icons"), { recursive: true });
  await mkdir(join(paths.assets, "audio", "music"), { recursive: true });
  await mkdir(join(paths.assets, "third-party", "kenney-tiny-dungeon", "Tiles"), { recursive: true });
  await mkdir(join(paths.assets, "third-party", "tiny-creatures", "Tiles"), { recursive: true });
  await writeFile(join(paths.assets, "spell-icons", "fire.png"), png(32, 32));
  await writeFile(join(paths.assets, "levels", "level-5.json"), '{"type":"map","layers":[]}');
  for (const fileName of [
    "boss-1-invigilator-trial-theme.ogg",
    "combat-encounter-loop.ogg",
    "exploration-loop-original.ogg",
    "exploration-loop-variation-a.ogg",
    "exploration-loop-variation-b.ogg"
  ]) {
    await writeFile(join(paths.assets, "audio", "music", fileName), "audio");
  }
  await writeFile(join(paths.assets, "audio", "music", "unknown-sting.ogg"), "audio");
  await writeFile(join(paths.assets, "third-party", "kenney-tiny-dungeon", "Tiles", "tile_0084.png"), png(16, 16));
  await writeFile(join(paths.assets, "third-party", "tiny-creatures", "Tiles", "tile_0128.png"), png(16, 16));

  const catalog = await generateCatalog({ assetRoot: paths.assets, outputPath: paths.output });

  const expected = new Map([
    ["image:spell-icons:fire", ["spell", "fire"]],
    ["map:levels:level-5", ["level", "level-5"]],
    ["audio:audio:music:boss-1-invigilator-trial-theme:ogg", ["music", "loop", "boss"]],
    ["audio:audio:music:combat-encounter-loop:ogg", ["music", "loop", "combat"]],
    ["audio:audio:music:exploration-loop-original:ogg", ["music", "loop", "exploration"]],
    ["audio:audio:music:exploration-loop-variation-a:ogg", ["music", "loop", "exploration"]],
    ["audio:audio:music:exploration-loop-variation-b:ogg", ["music", "loop", "exploration"]],
    ["image:third-party:kenney-tiny-dungeon:tiles:tile-0084", ["character", "mage", "player"]],
    ["image:third-party:tiny-creatures:tiles:tile-0128", ["creature", "enemy", "melee"]]
  ]);
  for (const [id, tags] of expected) {
    const asset = catalog.assets.find((candidate) => candidate.id === id);
    assert.deepEqual(asset.tags, tags);
    assert.equal(asset.tagOrigin, "suggested");
    assert.equal(asset.enrichmentState, "complete");
  }
  const uncertain = catalog.assets.find((asset) => asset.id === "audio:audio:music:unknown-sting:ogg");
  assert.deepEqual(uncertain.tags, []);
  assert.equal(uncertain.tagOrigin, "generated");
});

test("generateCatalog refresh leaves the durable override document unchanged", async (t) => {
  const paths = await fixture();
  t.after(() => rm(paths.root, { recursive: true, force: true }));
  const overridePath = join(paths.root, "art-direction", "overrides.json");
  const corrections = {
    schemaVersion: 1,
    overrides: [{
      id: "image:third-party:kenney-tiny-dungeon:tiles:tile-0084",
      semanticClass: "creature",
      capabilities: ["visual-binding"]
    }]
  };
  await mkdir(join(paths.root, "art-direction"), { recursive: true });
  await writeFile(overridePath, `${JSON.stringify(corrections, null, 2)}\n`);

  await generateCatalog({ assetRoot: paths.assets, outputPath: paths.output });
  await writeFile(join(paths.assets, "nested", "pack", "hero.png"), png(20, 30));
  await generateCatalog({ assetRoot: paths.assets, outputPath: paths.output });

  assert.deepEqual(JSON.parse(await readFile(overridePath, "utf8")), corrections);
});
