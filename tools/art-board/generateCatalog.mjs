import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const IMAGE_EXTENSIONS = new Set([".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const AUDIO_EXTENSIONS = new Set([".aac", ".flac", ".m4a", ".mid", ".midi", ".mp3", ".ogg", ".wav"]);
const MAP_EXTENSIONS = new Set([".tmj", ".tmx"]);
const SOURCE_EXTENSIONS = new Set([".md", ".tsj", ".tsx", ".txt"]);
const PNG_SIGNATURE = "89504e470d0a1a0a";

const CONSERVATIVE_TAGS = new Map([
  ["image:spell-icons:earth", ["spell", "earth"]],
  ["image:spell-icons:fire", ["spell", "fire"]],
  ["image:spell-icons:ice", ["spell", "ice"]],
  ["image:spell-icons:lightning", ["spell", "lightning"]],
  ["map:levels:level-1", ["level", "level-1"]],
  ["map:levels:level-2", ["level", "level-2"]],
  ["map:levels:level-3", ["level", "level-3"]],
  ["map:levels:level-4", ["level", "level-4"]],
  ["map:levels:level-5", ["level", "level-5"]],
  ["image:vfx:opening-magic-cc0-remix:cast-flame-sweep", ["opening-vfx", "fire", "cast"]],
  ["image:vfx:opening-magic-cc0-remix:impact-flame-sweep", ["opening-vfx", "fire", "impact"]],
  ["image:vfx:opening-magic-cc0-remix:trail-fire", ["opening-vfx", "fire", "trail"]],
  ["image:third-party:kenney-tiny-dungeon:tiles:tile-0084", ["character", "mage", "player"]],
  ["image:third-party:tiny-creatures:tiles:tile-0128", ["creature", "enemy", "melee"]],
  ["image:third-party:tiny-creatures:tiles:tile-0033", ["creature", "enemy", "ranged"]],
  ["image:third-party:tiny-creatures:tiles:tile-0067", ["creature", "enemy", "debuffer"]],
  ["audio:audio:music:boss-1-invigilator-trial-theme:ogg", ["music", "loop", "boss"]],
  ["audio:audio:music:combat-encounter-loop:ogg", ["music", "loop", "combat"]],
  ["audio:audio:music:exploration-loop-original:ogg", ["music", "loop", "exploration"]],
  ["audio:audio:music:exploration-loop-variation-a:ogg", ["music", "loop", "exploration"]],
  ["audio:audio:music:exploration-loop-variation-b:ogg", ["music", "loop", "exploration"]]
]);

function canonicalPath(assetRoot, filePath) {
  return `public/assets/${relative(assetRoot, filePath).split(sep).join("/")}`;
}

function identifierSegment(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function assetId(kind, canonicalAssetPath) {
  const withoutPrefix = canonicalAssetPath.replace(/^public\/assets\//, "");
  const extension = extname(withoutPrefix);
  const withoutExtension = withoutPrefix.slice(0, -extension.length);
  const segments = withoutExtension.split("/").map(identifierSegment).filter(Boolean);
  // Audio masters commonly share a stem across delivery formats (for example
  // OGG and MIDI); retain that format in their stable path-derived identity.
  if (kind === "audio") segments.push(identifierSegment(extension));
  return `${kind}:${segments.join(":")}`;
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

function isProvenance(filePath) {
  return /^provenance(?:[-_.].*)?\.json$/i.test(filePath.split(sep).at(-1));
}

async function isJsonMap(filePath) {
  if (extname(filePath).toLowerCase() !== ".json" || isProvenance(filePath)) return false;
  try {
    const content = JSON.parse(await readFile(filePath, "utf8"));
    return Array.isArray(content.layers) || Array.isArray(content.tilesets) || content.type === "map";
  } catch {
    return false;
  }
}

async function classify(filePath) {
  const extension = extname(filePath).toLowerCase();
  if (/^licen[cs]e(?:\..*)?$/i.test(filePath.split(sep).at(-1))) return "source";
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (AUDIO_EXTENSIONS.has(extension)) return "audio";
  if (MAP_EXTENSIONS.has(extension) || await isJsonMap(filePath)) return "map";
  if (isProvenance(filePath)) return "provenance";
  if (SOURCE_EXTENSIONS.has(extension)) return "source";
  return null;
}

function pngDimensions(content) {
  if (content.length < 24 || content.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) return null;
  if (content.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: content.readUInt32BE(16), height: content.readUInt32BE(20) };
}

function parseLicense(content) {
  const lines = content.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
  const licenseLine = lines.find((line) => /^license\s*:/i.test(line) || /^license\s*\(/i.test(line));
  const name = lines.find((line) =>
    line !== licenseLine &&
    !/^https?:/i.test(line) &&
    !/^(created|creation date|copyright)\b/i.test(line) &&
    !/^[#*=\-]/.test(line)
  )?.replace(/\s*\([\d.]+\)$/, "") ?? null;
  const license = licenseLine
    ? (licenseLine.match(/\b(CC0|CC-BY(?:-SA)?(?:-\d\.\d)?|MIT|GPL(?:-\d\.\d)?|Apache-\d\.\d)\b/i)?.[1] ?? licenseLine.replace(/^license\s*[:(]?\s*/i, "").replace(/[)]$/, "").trim())
    : null;
  return { name, license };
}

function parseProvenance(content) {
  try {
    const provenance = JSON.parse(content);
    const source = Array.isArray(provenance.sources) ? provenance.sources[0] : undefined;
    return {
      name: source?.title ?? source?.creator ?? null,
      license: source?.license?.spdx ?? source?.license?.name ?? null
    };
  } catch {
    return { name: null, license: null };
  }
}

async function sourceEvidence(assetRoot, filePath) {
  let current = dirname(filePath);
  const root = resolve(assetRoot);
  while (current === root || current.startsWith(`${root}${sep}`)) {
    const entries = await readdir(current, { withFileTypes: true });
    const license = entries.find((entry) => entry.isFile() && /^licen[cs]e(?:\..*)?$/i.test(entry.name));
    const provenance = entries.find((entry) => entry.isFile() && /^provenance(?:[-_.].*)?\.json$/i.test(entry.name));
    const evidence = license ?? provenance;
    if (evidence) {
      const evidenceFile = join(current, evidence.name);
      const evidencePath = canonicalPath(root, evidenceFile);
      if (license) {
        const metadata = parseLicense(await readFile(evidenceFile, "utf8"));
        return { ...metadata, evidencePath };
      }
      return { ...parseProvenance(await readFile(evidenceFile, "utf8")), evidencePath };
    }
    if (current === root) break;
    current = dirname(current);
  }
  return { name: null, license: null, evidencePath: null };
}

function classifySemantics(kind, catalogPath, extension, metadata) {
  const path = catalogPath.toLowerCase();
  if (kind === "audio") {
    if (extension === ".mid" || extension === ".midi") return { semanticClass: "audio-source", capabilities: [] };
    return { semanticClass: "playable-audio", capabilities: ["audio-binding", "audio-preview"] };
  }
  if (kind === "map") return { semanticClass: "map", capabilities: ["preview"] };
  if (kind === "provenance") return { semanticClass: "provenance", capabilities: [] };
  if (kind === "source") return { semanticClass: "source", capabilities: [] };
  if (/(^|\/)(preview|sample)/.test(path) || /\/(preview|sample)[^/]*\.(png|jpg|jpeg|gif|webp)$/i.test(catalogPath)) {
    return { semanticClass: "preview", capabilities: ["preview"] };
  }
  if (path.includes("/vfx/") || metadata?.source === "provenance") {
    return { semanticClass: "vfx", capabilities: ["visual-binding", ...(metadata ? ["sprite-regions"] : [])] };
  }
  if (path.includes("spell-icons")) return { semanticClass: "icon", capabilities: ["visual-binding"] };
  if (path.includes("tiny-creatures") || path.includes("creatures")) {
    return { semanticClass: "creature", capabilities: ["visual-binding", ...(metadata ? ["sprite-regions"] : [])] };
  }
  if (path.includes("/tiles/") || path.includes("/tilemap/")) {
    return { semanticClass: "tile", capabilities: ["level-placement", ...(metadata ? ["sprite-regions"] : [])] };
  }
  return { semanticClass: "prop", capabilities: ["level-placement", ...(metadata ? ["sprite-regions"] : [])] };
}

function gridRegions(id, grid) {
  const count = grid.columns * grid.rows;
  return Array.from({ length: count }, (_, index) => {
    const column = index % grid.columns;
    const row = Math.floor(index / grid.columns);
    return {
      id: `${id}:region=frame-${index}`,
      x: column * (grid.cellWidth + grid.spacing),
      y: row * (grid.cellHeight + grid.spacing),
      width: grid.cellWidth,
      height: grid.cellHeight
    };
  });
}

function catalogRecord({ kind, path, content, assetRoot, source, metadata }) {
  const extension = extname(path).toLowerCase();
  const catalogPath = canonicalPath(assetRoot, path);
  const id = assetId(kind, catalogPath);
  const semantics = classifySemantics(kind, catalogPath, extension, metadata);
  const tags = [...(CONSERVATIVE_TAGS.get(id) ?? [])];
  return {
    id,
    path: catalogPath,
    kind,
    dimensions: extension === ".png" ? pngDimensions(content) : null,
    contentHash: `sha256:${createHash("sha256").update(content).digest("hex")}`,
    source,
    tags,
    tagOrigin: tags.length > 0 ? "suggested" : "generated",
    enrichmentState: tags.length > 0 ? "complete" : "pending",
    semanticClass: semantics.semanticClass,
    capabilities: semantics.capabilities,
    ...(metadata ? { grid: metadata.grid, regions: gridRegions(id, metadata.grid) } : {})
  };
}

function xmlAttribute(text, name) {
  return text.match(new RegExp(`\\b${name}="([^"]+)"`, "i"))?.[1] ?? null;
}

function numericAttribute(text, name) {
  const value = xmlAttribute(text, name);
  return value === null ? null : Number(value);
}

function gridFromValues({ cellWidth, cellHeight, columns, count, spacing = 0, source }) {
  if (![cellWidth, cellHeight, columns, count].every((value) => Number.isInteger(value) && value > 0)) return null;
  return {
    grid: {
      cellWidth,
      cellHeight,
      columns,
      rows: Math.ceil(count / columns),
      spacing: Number.isInteger(spacing) && spacing >= 0 ? spacing : 0
    },
    source
  };
}

async function collectGridMetadata(files, assetRoot) {
  const metadata = new Map();
  for (const filePath of files) {
    const extension = extname(filePath).toLowerCase();
    if (extension === ".tsx") {
      const content = await readFile(filePath, "utf8");
      const imageSource = xmlAttribute(content, "source");
      const grid = gridFromValues({
        cellWidth: numericAttribute(content, "tilewidth"),
        cellHeight: numericAttribute(content, "tileheight"),
        columns: numericAttribute(content, "columns"),
        count: numericAttribute(content, "tilecount"),
        spacing: numericAttribute(content, "spacing") ?? 0,
        source: "tsx"
      });
      if (imageSource && grid) metadata.set(canonicalPath(assetRoot, resolve(dirname(filePath), imageSource)), grid);
    }
    if (isProvenance(filePath)) {
      let provenance;
      try {
        provenance = JSON.parse(await readFile(filePath, "utf8"));
      } catch {
        continue;
      }
      for (const derivative of Array.isArray(provenance.derivatives) ? provenance.derivatives : []) {
        const cellWidth = derivative.frameWidthPx;
        const cellHeight = derivative.frameHeightPx;
        const count = derivative.frameCount;
        const columns = Number.isInteger(derivative.widthPx) && cellWidth > 0
          ? Math.floor(derivative.widthPx / cellWidth)
          : count;
        const grid = gridFromValues({ cellWidth, cellHeight, columns, count, source: "provenance" });
        if (typeof derivative.projectPath === "string" && grid) {
          metadata.set(derivative.projectPath.replace(/\\/g, "/"), grid);
        }
      }
    }
  }
  return metadata;
}

async function previousCatalog(outputPath) {
  try {
    const catalog = JSON.parse(await readFile(outputPath, "utf8"));
    return Array.isArray(catalog.assets) ? catalog : null;
  } catch {
    return null;
  }
}

function collectAssetReferences(value, references = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectAssetReferences(item, references));
  } else if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if ((key === "assetId" || key === "currentAssetId") && typeof nested === "string") references.add(nested);
      collectAssetReferences(nested, references);
    }
  }
  return references;
}

async function referencedAssetIds(outputPath) {
  const boardsPath = join(dirname(outputPath), "boards");
  try {
    const files = await walk(boardsPath);
    const ids = new Set();
    for (const filePath of files.filter((path) => extname(path).toLowerCase() === ".json")) {
      collectAssetReferences(JSON.parse(await readFile(filePath, "utf8")), ids);
    }
    return ids;
  } catch {
    return new Set();
  }
}

export async function generateCatalog({ assetRoot, outputPath, preserveAssetIds = [] }) {
  const root = resolve(assetRoot);
  const oldCatalog = await previousCatalog(outputPath);
  const oldAssetsById = new Map((oldCatalog?.assets ?? []).map((asset) => [asset.id, asset]));
  const preservedIds = new Set([...preserveAssetIds, ...await referencedAssetIds(outputPath)]);
  const files = await walk(root);
  const metadataByPath = await collectGridMetadata(files, root);
  const records = [];
  const ids = new Set();

  for (const filePath of files) {
    const kind = await classify(filePath);
    if (!kind) continue;
    const content = await readFile(filePath);
    const record = catalogRecord({
      kind,
      path: filePath,
      content,
      assetRoot: root,
      source: await sourceEvidence(root, filePath),
      metadata: metadataByPath.get(canonicalPath(root, filePath))
    });
    if (ids.has(record.id)) throw new Error(`Duplicate catalog ID: ${record.id}`);
    const oldRecord = oldAssetsById.get(record.id);
    if (oldRecord && oldRecord.contentHash !== record.contentHash) record.fileStatus = "changed";
    ids.add(record.id);
    records.push(record);
  }

  for (const id of preservedIds) {
    const oldRecord = oldAssetsById.get(id);
    if (oldRecord && !ids.has(id)) records.push({ ...oldRecord, fileStatus: "missing" });
  }

  records.sort((left, right) => left.id.localeCompare(right.id));
  const catalog = { schemaVersion: 1, assets: records };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
  return catalog;
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  await generateCatalog({
    assetRoot: join(repositoryRoot, "public", "assets"),
    outputPath: join(repositoryRoot, "art-direction", "catalog.json")
  });
}
