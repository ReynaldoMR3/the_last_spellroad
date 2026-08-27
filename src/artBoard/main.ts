import overridesDocument from "../../art-direction/overrides.json";
import {
  captureArtBoardFocus,
  deriveArtBoardViewState,
  exportBrief,
  levelOnePlacementTargets,
  reduceBoard,
  restoreArtBoardFocus,
  type ArtBoardFocusTarget,
  type BoardState
} from "./boardState";
import { filterAssets, mergeCatalogue, type DisplayAsset } from "./catalog";
import {
  LEVEL_ANCHORS,
  LEVEL_ZONES,
  validateArtBrief,
  type ArtAction,
  type ArtBrief,
  type ArtDecision,
  type AssetKind,
  type AssetOverride,
  type AssetRecord,
  type LevelAnchor,
  type LevelZone,
  type ValidationIssue
} from "./domain";
import { compileProposal, type CompileProposalResult } from "./proposal";
import "./styles.css";

const LEVEL = 1 as const;
const MAP_URL = "/assets/levels/level-1.json";
const ALL_KINDS: readonly (AssetKind | "all")[] = [
  "all",
  "image",
  "audio",
  "map",
  "provenance",
  "source"
];

interface CatalogueDocument {
  schemaVersion: 1;
  assets: AssetRecord[];
}

interface CatalogueResponse {
  ok: true;
  catalog: CatalogueDocument;
}

interface TargetResponse {
  ok: true;
  targets: Record<string, unknown>;
}

interface WriteResponse {
  ok: boolean;
  path?: string;
  issues?: ValidationIssue[];
}

interface TiledLayer {
  type: string;
  data?: number[];
}

interface TiledTileset {
  firstgid: number;
  columns: number;
  tilewidth: number;
  tileheight: number;
  image: string;
}

interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  tilesets: TiledTileset[];
}

interface AppState {
  rawAssets: AssetRecord[];
  assets: DisplayAsset[];
  targetCount: number;
  board: BoardState;
  selectedAssetId: string | null;
  query: string;
  kind: AssetKind | "all";
  action: ArtAction;
  note: string;
  reviewConfirmed: boolean;
  briefPath: string | null;
  proposalPath: string | null;
  busy: boolean;
  message: string;
}

const root = artBoardRoot();

const initialBoard: BoardState = {
  briefId: "brief:level-1",
  title: "Level 1 art direction",
  decisions: []
};

let app: AppState = {
  rawAssets: [],
  assets: [],
  targetCount: 0,
  board: initialBoard,
  selectedAssetId: null,
  query: "",
  kind: "all",
  action: "use",
  note: "",
  reviewConfirmed: false,
  briefPath: null,
  proposalPath: null,
  busy: false,
  message: "Loading the repository catalogue…"
};

let mapPromise: Promise<TiledMap> | null = null;
let retainedFocus: ArtBoardFocusTarget | null = null;

void loadBoard();

async function loadBoard(): Promise<void> {
  try {
    const [catalogueResponse, targetResponse] = await Promise.all([
      getJson<CatalogueResponse>("/api/art-board/catalog"),
      getJson<TargetResponse>("/api/art-board/targets")
    ]);
    const rawAssets = catalogueResponse.catalog.assets;
    app = {
      ...app,
      rawAssets,
      assets: mergeCatalogue(
        rawAssets,
        overridesDocument.overrides as AssetOverride[]
      ),
      targetCount: Object.keys(targetResponse.targets).length,
      message: "Select an asset, choose an action, then activate a Level 1 placement target."
    };
  } catch (error) {
    app = { ...app, message: readableError(error) };
  }
  render();
}

function render(): void {
  const activeElement = document.activeElement;
  retainedFocus = captureArtBoardFocus(
    activeElement instanceof HTMLElement ? activeElement : null
  ) ?? retainedFocus;
  const issues = validationIssues();
  const view = deriveArtBoardViewState({
    board: app.board,
    assets: app.assets,
    selectedAssetId: app.selectedAssetId,
    issues,
    reviewConfirmed: app.reviewConfirmed
  });
  const filteredAssets = filterAssets(app.assets, app.query, app.kind);
  const compiled = compiledProposal();
  const proposalReady = view.canExportProposal && app.briefPath !== null;

  root.innerHTML = `
    <header class="masthead">
      <div>
        <p class="eyebrow">The Last Spellroad · human review companion</p>
        <h1>Level 1 Art Board</h1>
        <p class="lede">Draft semantic art intent against the real Level 1 lane. Files produced here remain review artifacts.</p>
      </div>
      <div class="level-lock" aria-label="Current board context">
        <span>Context locked</span>
        <strong>Level 1</strong>
      </div>
    </header>

    <main class="board-layout">
      <section id="${view.panels[0].id}" class="panel catalogue-panel" role="${view.panels[0].role}" aria-label="${view.panels[0].label}">
        <div class="panel-heading">
          <div><p class="panel-kicker">Library</p><h2>Asset catalogue</h2></div>
          <span class="count">${filteredAssets.length} / ${app.assets.length}</span>
        </div>
        <div class="catalogue-tools">
          <label for="asset-search">Search assets</label>
          <input id="asset-search" type="search" value="${escapeAttribute(app.query)}" placeholder="Try fire, tile, music…" autocomplete="off" />
          <label for="asset-kind">Asset type</label>
          <select id="asset-kind">
            ${ALL_KINDS.map((kind) => `<option value="${kind}"${app.kind === kind ? " selected" : ""}>${titleCase(kind)}</option>`).join("")}
          </select>
        </div>
        <div class="asset-grid" aria-live="polite">
          ${filteredAssets.length === 0 ? `<p class="empty-state">No catalogue assets match this search.</p>` : filteredAssets.map((asset) => assetCard(asset, asset.id === app.selectedAssetId)).join("")}
        </div>
      </section>

      <section id="${view.panels[1].id}" class="panel scene-panel" role="${view.panels[1].role}" aria-label="${view.panels[1].label}">
        <div class="panel-heading scene-heading">
          <div><p class="panel-kicker">Semantic placement</p><h2>Level 1 scene canvas</h2></div>
          <span class="map-source">Live map · 960 × 288</span>
        </div>
        <p class="guidance">The amber corridor marks the combat lane. Targets describe intent by named zone and anchor; they do not edit map cells.</p>
        <div class="scene-frame">
          <canvas id="level-map" width="960" height="288" role="img" aria-label="Rendered preview of the repository Level 1 tile map"></canvas>
          <div class="combat-lane" aria-hidden="true"><span>combat lane guidance</span></div>
          <div class="placement-grid" aria-label="Level 1 placement targets">
            ${levelOnePlacementTargets().map(({ zone, anchor }) => placementButton(zone, anchor, view.selectedAsset)).join("")}
          </div>
        </div>
        <div class="zone-legend" aria-label="Named Level 1 zones">
          ${LEVEL_ZONES.map((zone) => `<span>${zoneLabel(zone)}</span>`).join("")}
        </div>
        <div class="decision-list">
          <div class="subheading"><h3>Draft placements</h3><span>${activeDecisions().length}</span></div>
          ${activeDecisions().length === 0 ? `<p class="empty-state">No placements yet. Select a catalogue card and activate a target above.</p>` : activeDecisions().map(decisionRow).join("")}
        </div>
      </section>

      <section id="${view.panels[2].id}" class="panel inspector-panel" role="${view.panels[2].role}" aria-label="${view.panels[2].label}">
        <div class="panel-heading">
          <div><p class="panel-kicker">Selection</p><h2>Inspector & review</h2></div>
          <span class="target-count">${app.targetCount} binding targets indexed</span>
        </div>
        ${selectedInspector(view.selectedAsset)}
        <fieldset class="action-picker">
          <legend>Placement action</legend>
          ${(["use", "replace", "remove"] as ArtAction[]).map((action) => `
            <label><input type="radio" name="placement-action" value="${action}"${app.action === action ? " checked" : ""} /> ${titleCase(action)}</label>
          `).join("")}
        </fieldset>
        <label for="placement-note">Art-direction note</label>
        <textarea id="placement-note" rows="3" placeholder="Describe the visual intent…">${escapeHtml(app.note)}</textarea>

        <div class="validation-block" aria-live="polite">
          <div class="subheading"><h3>Validation</h3><span class="${issues.some((issue) => issue.severity === "error") ? "error-chip" : "ready-chip"}">${issues.length === 0 ? "Ready" : `${issues.length} issue${issues.length === 1 ? "" : "s"}`}</span></div>
          ${issues.length === 0 ? `<p>Draft decisions match the Level 1 contract.</p>` : `<ul>${issues.map((issue) => `<li class="${issue.severity}">${escapeHtml(issue.message)}</li>`).join("")}</ul>`}
        </div>

        <div class="export-flow">
          <div class="review-step">
            <span class="step-number">1</span>
            <div><h3>Export Level 1 brief</h3><p>Validate and save the draft under art-direction/boards.</p></div>
          </div>
          <button id="export-brief" class="primary-button" type="button"${view.canExportBrief && !app.busy ? "" : " disabled"}>Export brief</button>
          ${app.briefPath ? `<p class="path-result">Saved: <code>${escapeHtml(app.briefPath)}</code></p>` : ""}

          <div class="review-step">
            <span class="step-number">2</span>
            <div><h3>Review proposal</h3><p>Inspect the exact review-only change summary before export.</p></div>
          </div>
          ${proposalReview(compiled)}
          <label class="review-check"><input id="review-confirmed" type="checkbox"${app.reviewConfirmed ? " checked" : ""}${view.canExportBrief ? "" : " disabled"} /> I reviewed the proposal summary.</label>
          <button id="export-proposal" class="secondary-button" type="button"${proposalReady && !app.busy ? "" : " disabled"}>Export reviewed proposal</button>
          ${app.proposalPath ? `<p class="path-result">Saved: <code>${escapeHtml(app.proposalPath)}</code></p>` : ""}
        </div>
        <p id="board-status" class="board-status" role="status">${escapeHtml(app.message)}</p>
      </section>
    </main>
  `;

  bindEvents();
  restoreArtBoardFocus(
    retainedFocus,
    [...root.querySelectorAll<HTMLElement>("button, input, select, textarea, summary")]
  );
  void drawLevelMap();
}

function assetCard(asset: DisplayAsset, selected: boolean): string {
  const media = asset.kind === "image"
    ? `<img src="${escapeAttribute(asset.url)}" alt="" loading="lazy" />`
    : asset.kind === "audio" && asset.capabilities.includes("audio-preview")
      ? `<audio controls preload="metadata" src="${escapeAttribute(asset.url)}" aria-label="Preview ${escapeAttribute(asset.displayName)}"></audio>`
      : `<div class="asset-glyph" aria-hidden="true">${assetGlyph(asset.kind)}</div>`;

  return `
    <article class="asset-card${selected ? " selected" : ""}">
      <div class="asset-preview">${media}</div>
      <button class="asset-select" type="button" data-asset-id="${escapeAttribute(asset.id)}" aria-pressed="${selected}" aria-label="Select ${escapeAttribute(asset.displayName)}">
        <strong>${escapeHtml(asset.displayName)}</strong>
        <span>${escapeHtml(asset.semanticClass)} · ${escapeHtml(asset.kind)}</span>
      </button>
      <code title="${escapeAttribute(asset.id)}">${escapeHtml(asset.id)}</code>
      <span class="source-status ${asset.sourceStatus}">Source: ${escapeHtml(asset.sourceStatus)}</span>
    </article>
  `;
}

function placementButton(zone: LevelZone, anchor: LevelAnchor, selectedAsset: DisplayAsset | null): string {
  const current = decisionAt(zone, anchor);
  const needsSelected = app.action !== "remove";
  const needsCurrent = app.action !== "use";
  const disabled = (needsSelected && selectedAsset === null) || (needsCurrent && current === undefined);
  const label = `${titleCase(app.action)} ${selectedAsset?.displayName ?? "selected asset"} at ${zoneLabel(zone)}, ${anchorLabel(anchor)}`;
  return `<button class="placement-target${current ? " occupied" : ""}" type="button" data-zone="${zone}" data-anchor="${anchor}" aria-label="${escapeAttribute(label)}" title="${escapeAttribute(label)}"${disabled ? " disabled" : ""}><span>${anchorShort(anchor)}</span></button>`;
}

function selectedInspector(asset: DisplayAsset | null): string {
  if (!asset) return `<div class="selected-empty"><div class="selection-mark">◇</div><p>Select a catalogue asset to inspect it and prepare a placement.</p></div>`;
  return `
    <article class="selected-asset">
      ${asset.kind === "image" ? `<img src="${escapeAttribute(asset.url)}" alt="Preview of ${escapeAttribute(asset.displayName)}" />` : `<div class="selection-mark">${assetGlyph(asset.kind)}</div>`}
      <div><h3>${escapeHtml(asset.displayName)}</h3><code>${escapeHtml(asset.id)}</code></div>
      <dl>
        <div><dt>Type</dt><dd>${escapeHtml(asset.semanticClass)}</dd></div>
        <div><dt>Capabilities</dt><dd>${escapeHtml(asset.capabilities.join(", ") || "None")}</dd></div>
        <div><dt>Source</dt><dd>${escapeHtml(asset.source.name ?? "Not documented")} · ${escapeHtml(asset.source.license ?? "No license recorded")}</dd></div>
        <div><dt>File</dt><dd>${escapeHtml(asset.fileStatus)}</dd></div>
      </dl>
    </article>
  `;
}

function decisionRow(decision: ArtDecision): string {
  if (decision.target.kind !== "level") return "";
  const assetId = decision.assetId ?? decision.currentAssetId ?? "none";
  const asset = app.assets.find((candidate) => candidate.id === assetId);
  return `
    <article class="decision-row">
      <span class="action-badge">${titleCase(decision.action)}</span>
      <div><strong>${zoneLabel(decision.target.zone)} · ${anchorLabel(decision.target.anchor)}</strong><p>${escapeHtml(asset?.displayName ?? assetId)}</p>${decision.intent ? `<small>${escapeHtml(decision.intent)}</small>` : ""}</div>
    </article>
  `;
}

function proposalReview(result: CompileProposalResult): string {
  if (result.proposal === null) return `<div class="proposal-summary unavailable"><p>Add a valid placement to generate a proposal summary.</p></div>`;
  return `
    <div class="proposal-summary">
      <div><span>Status</span><strong>${escapeHtml(result.proposal.status)}</strong></div>
      <div><span>Target file</span><code>${escapeHtml(result.proposal.targetFiles.join(", "))}</code></div>
      <div><span>Changes</span><strong>${result.proposal.changes.length}</strong></div>
      <details><summary>Inspect change JSON</summary><pre>${escapeHtml(JSON.stringify(result.proposal.changes, null, 2))}</pre></details>
    </div>
  `;
}

function bindEvents(): void {
  document.querySelector<HTMLInputElement>("#asset-search")?.addEventListener("input", (event) => {
    app = { ...app, query: (event.currentTarget as HTMLInputElement).value };
    render();
    requestAnimationFrame(() => {
      const search = document.querySelector<HTMLInputElement>("#asset-search");
      search?.focus();
      search?.setSelectionRange(app.query.length, app.query.length);
    });
  });
  document.querySelector<HTMLSelectElement>("#asset-kind")?.addEventListener("change", (event) => {
    app = { ...app, kind: (event.currentTarget as HTMLSelectElement).value as AssetKind | "all" };
    render();
  });
  document.querySelectorAll<HTMLButtonElement>("[data-asset-id]").forEach((button) => {
    button.addEventListener("click", () => {
      app = {
        ...app,
        selectedAssetId: button.dataset.assetId ?? null,
        message: "Asset selected. Choose an action, then activate a scene target."
      };
      render();
    });
  });
  document.querySelectorAll<HTMLInputElement>("input[name='placement-action']").forEach((input) => {
    input.addEventListener("change", () => {
      app = { ...app, action: input.value as ArtAction };
      render();
    });
  });
  document.querySelector<HTMLTextAreaElement>("#placement-note")?.addEventListener("input", (event) => {
    app.note = (event.currentTarget as HTMLTextAreaElement).value;
  });
  document.querySelectorAll<HTMLButtonElement>("[data-zone][data-anchor]").forEach((button) => {
    button.addEventListener("click", () => placeAt(button.dataset.zone as LevelZone, button.dataset.anchor as LevelAnchor));
  });
  document.querySelector<HTMLInputElement>("#review-confirmed")?.addEventListener("change", (event) => {
    app = { ...app, reviewConfirmed: (event.currentTarget as HTMLInputElement).checked };
    render();
  });
  document.querySelector<HTMLButtonElement>("#export-brief")?.addEventListener("click", () => void exportDraft());
  document.querySelector<HTMLButtonElement>("#export-proposal")?.addEventListener("click", () => void exportReviewedProposal());
}

function placeAt(zone: LevelZone, anchor: LevelAnchor): void {
  const current = decisionAt(zone, anchor);
  const selected = app.assets.find((asset) => asset.id === app.selectedAssetId);
  const common = {
    id: `decision:level-1:${zone}:${anchor}`,
    target: { kind: "level" as const, level: LEVEL, zone, anchor },
    ...(app.note.trim() ? { intent: app.note.trim() } : {})
  };

  if (app.action === "use" && selected) {
    app.board = reduceBoard(app.board, { type: "use", ...common, assetId: selected.id });
  } else if (app.action === "replace" && current && selected) {
    const currentAssetId = current.assetId ?? current.currentAssetId;
    if (!currentAssetId) return;
    app.board = reduceBoard(app.board, { type: "replace", ...common, currentAssetId, assetId: selected.id });
  } else if (app.action === "remove" && current) {
    const currentAssetId = current.assetId ?? current.currentAssetId;
    if (!currentAssetId) return;
    app.board = reduceBoard(app.board, { type: "remove", ...common, currentAssetId });
  } else {
    return;
  }

  app = {
    ...app,
    note: "",
    reviewConfirmed: false,
    briefPath: null,
    proposalPath: null,
    message: `${titleCase(app.action)} decision recorded for ${zoneLabel(zone)}, ${anchorLabel(anchor)}.`
  };
  render();
}

async function exportDraft(): Promise<void> {
  const brief = exportBrief(app.board);
  app = { ...app, busy: true, message: "Saving the Level 1 brief…" };
  render();
  const response = await postJson("/api/art-board/briefs", brief);
  app = response.ok
    ? { ...app, busy: false, briefPath: response.path ?? null, proposalPath: null, message: "Level 1 brief saved. Review the proposal summary before the next export." }
    : { ...app, busy: false, message: issueMessage(response) };
  render();
}

async function exportReviewedProposal(): Promise<void> {
  const brief = exportBrief(app.board);
  app = { ...app, busy: true, message: "Saving the reviewed proposal…" };
  render();
  const response = await postJson("/api/art-board/proposals", { brief });
  app = response.ok
    ? { ...app, busy: false, proposalPath: response.path ?? null, message: "Reviewed proposal saved for human handoff." }
    : { ...app, busy: false, message: issueMessage(response) };
  render();
}

function validationIssues(): ValidationIssue[] {
  if (app.board.decisions.length === 0) return [];
  return validateArtBrief(exportBrief(app.board), app.rawAssets);
}

function compiledProposal(): CompileProposalResult {
  if (app.board.decisions.length === 0) return { proposal: null, issues: [] };
  return compileProposal(exportBrief(app.board), app.rawAssets);
}

function activeDecisions(): ArtDecision[] {
  return app.board.decisions.filter((decision) => decision.status !== "superseded");
}

function decisionAt(zone: LevelZone, anchor: LevelAnchor): ArtDecision | undefined {
  return [...activeDecisions()].reverse().find((decision) =>
    decision.target.kind === "level" && decision.target.zone === zone && decision.target.anchor === anchor
  );
}

async function drawLevelMap(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#level-map");
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;
  try {
    const map = await (mapPromise ??= getJson<TiledMap>(MAP_URL));
    const tileset = map.tilesets[0];
    if (!tileset) throw new Error("Level 1 map has no tileset.");
    const imageUrl = new URL(tileset.image, new URL(MAP_URL, window.location.href)).href;
    const image = await loadImage(imageUrl);
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const layer of map.layers) {
      if (layer.type !== "tilelayer" || !layer.data) continue;
      layer.data.forEach((gid, index) => {
        if (gid === 0) return;
        const tileIndex = gid - tileset.firstgid;
        const sourceX = (tileIndex % tileset.columns) * tileset.tilewidth;
        const sourceY = Math.floor(tileIndex / tileset.columns) * tileset.tileheight;
        const targetX = (index % map.width) * map.tilewidth;
        const targetY = Math.floor(index / map.width) * map.tileheight;
        context.drawImage(image, sourceX, sourceY, tileset.tilewidth, tileset.tileheight, targetX, targetY, map.tilewidth, map.tileheight);
      });
    }
    await drawDecisionPreviews(context, canvas);
  } catch (error) {
    context.fillStyle = "#141115";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f0d9aa";
    context.font = "20px sans-serif";
    context.fillText(`Map preview unavailable: ${readableError(error)}`, 24, 48);
  }
}

async function drawDecisionPreviews(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): Promise<void> {
  const placementImages = activeDecisions().map(async (decision) => {
    if (decision.target.kind !== "level" || decision.action === "remove" || !decision.assetId) return;
    const asset = app.assets.find((candidate) => candidate.id === decision.assetId);
    if (!asset || asset.kind !== "image") return;
    const image = await loadImage(asset.url);
    const point = placementPoint(decision.target.zone, decision.target.anchor, canvas);
    const size = 36;
    context.fillStyle = "rgba(11, 9, 12, .72)";
    context.fillRect(point.x - size / 2 - 3, point.y - size / 2 - 3, size + 6, size + 6);
    context.drawImage(image, point.x - size / 2, point.y - size / 2, size, size);
  });
  await Promise.all(placementImages);
}

function placementPoint(zone: LevelZone, anchor: LevelAnchor, canvas: HTMLCanvasElement): { x: number; y: number } {
  const zoneIndex = LEVEL_ZONES.indexOf(zone);
  const anchorIndex = LEVEL_ANCHORS.indexOf(anchor);
  return {
    x: ((zoneIndex + 0.5) / LEVEL_ZONES.length) * canvas.width,
    y: 78 + anchorIndex * 66
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json() as Promise<T>;
}

async function postJson(url: string, body: unknown): Promise<WriteResponse> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    });
    return await response.json() as WriteResponse;
  } catch (error) {
    return { ok: false, issues: [{ code: "invalid-target", severity: "error", message: readableError(error) }] };
  }
}

function issueMessage(response: WriteResponse): string {
  return response.issues?.map((issue) => issue.message).join(" ") || "The Art Board could not save this artifact.";
}

function assetGlyph(kind: AssetKind): string {
  return ({ audio: "♪", map: "▦", provenance: "§", source: "¶", image: "◇" })[kind];
}

function zoneLabel(zone: LevelZone): string {
  return ({ entrance: "Entrance", lane: "Lane", leftEdge: "Left edge", rightEdge: "Right edge", threshold: "Threshold" })[zone];
}

function anchorLabel(anchor: LevelAnchor): string {
  return ({ leftEdge: "left anchor", center: "center anchor", rightEdge: "right anchor" })[anchor];
}

function anchorShort(anchor: LevelAnchor): string {
  return ({ leftEdge: "L", center: "C", rightEdge: "R" })[anchor];
}

function titleCase(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1).replace(/([A-Z])/g, " $1");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function artBoardRoot(): HTMLDivElement {
  const element = document.querySelector<HTMLDivElement>("#art-board-root");
  if (!element) throw new Error("Art Board root is missing.");
  return element;
}
