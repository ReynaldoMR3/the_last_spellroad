import type {
  AssetCapability,
  AssetDimensions,
  AssetFileStatus,
  AssetGridMetadata,
  AssetKind,
  AssetOverride,
  AssetRecord,
  AssetRegionMetadata,
  AssetSemanticClass,
  AssetSource,
  AssetTagOrigin
} from "./domain";

export type AssetSourceStatus = "documented" | "incomplete" | "missing";

/** Scanner data projected into the stable, browser-facing catalogue contract. */
export interface DisplayAsset {
  id: string;
  url: string;
  kind: AssetKind;
  dimensions: AssetDimensions | null;
  source: AssetSource;
  sourceStatus: AssetSourceStatus;
  displayName: string;
  description: string | null;
  tags: string[];
  tagOrigin: AssetTagOrigin;
  semanticClass: AssetSemanticClass;
  capabilities: AssetCapability[];
  grid: AssetGridMetadata | null;
  regions: AssetRegionMetadata[];
  fileStatus: AssetFileStatus;
}

/** Reports whether all source facts needed for an actionable provenance card exist. */
export function assetSourceStatus(asset: AssetSource | Pick<AssetRecord, "source">): AssetSourceStatus {
  const source = "source" in asset ? asset.source : asset;
  const values = [source.name, source.license, source.evidencePath];
  if (values.every((value) => value === null || value.trim().length === 0)) return "missing";
  if (values.some((value) => value === null || value.trim().length === 0)) return "incomplete";
  return "documented";
}

/**
 * Applies durable human corrections without allowing display metadata to alter
 * path-derived identity. Excluded assets are removed from the browser view.
 */
export function mergeCatalogue(
  catalogue: readonly AssetRecord[],
  overrides: readonly AssetOverride[]
): DisplayAsset[] {
  const overridesById = new Map(overrides.map((override) => [override.id, override]));

  return catalogue.flatMap((record) => {
    const correction = overridesById.get(record.id);
    if (correction?.excluded) return [];

    const source: AssetSource = {
      ...record.source,
      ...correction?.source
    };
    const tags = correction?.tags !== undefined ? [...correction.tags] : [...record.tags];
    const displayAsset: DisplayAsset = {
      id: record.id,
      url: browserAssetUrl(record.path),
      kind: record.kind,
      dimensions: record.dimensions ? { ...record.dimensions } : null,
      source,
      sourceStatus: assetSourceStatus(source),
      displayName: correctedDisplayName(correction?.displayName, record.path),
      description: correction?.description ?? null,
      tags,
      tagOrigin: correction?.tags !== undefined ? "corrected" : record.tagOrigin,
      semanticClass: correction?.semanticClass ?? record.semanticClass,
      capabilities: correction?.capabilities !== undefined
        ? [...correction.capabilities]
        : [...record.capabilities],
      grid: record.grid ? { ...record.grid } : null,
      regions: (record.regions ?? []).map((region) => ({ ...region })),
      fileStatus: record.fileStatus ?? "present"
    };
    return [displayAsset];
  });
}

/** Case-insensitive catalogue search over stable ID, display name, and tags. */
export function filterAssets(
  records: readonly DisplayAsset[],
  query: string,
  kind: AssetKind | "all" = "all"
): DisplayAsset[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return records.filter((asset) => {
    if (kind !== "all" && asset.kind !== kind) return false;
    if (normalizedQuery.length === 0) return true;
    return [asset.id, asset.displayName, ...asset.tags]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
}

function browserAssetUrl(path: string): string {
  const publicPath = path.replace(/\\/g, "/").replace(/^public\//, "");
  return publicPath.startsWith("/") ? publicPath : `/${publicPath}`;
}

function correctedDisplayName(correction: string | null | undefined, path: string): string {
  if (typeof correction === "string" && correction.trim().length > 0) return correction;
  const pathParts = path.replace(/\\/g, "/").split("/");
  const fileName = pathParts[pathParts.length - 1] ?? path;
  const stem = fileName.replace(/\.[^.]+$/, "");
  return stem
    .replace(/[_-]+/g, " ")
    .replace(/\b\p{L}/gu, (letter: string) => letter.toLocaleUpperCase());
}
