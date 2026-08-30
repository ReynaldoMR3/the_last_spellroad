import overridesDocument from "../../art-direction/overrides.json";
import {
  audioPreviewMetadata,
  bindingContextCards,
  captureArtBoardFocus,
  deriveArtBoardViewState,
  exportBrief,
  levelActionAvailable,
  levelPlacementTargets,
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
  type LevelNumber,
  type LevelZone,
  type ValidationIssue
} from "./domain";
import {
  PRODUCTION_TARGET_INDEX,
  bindingCompatibilityIndex,
  compileProposal,
  type CompileProposalResult
} from "./proposal";
import "./styles.css";

type BoardContext =
  | { kind: "level"; level: LevelNumber }
  | { kind: "binding"; bindingKey: string };

const INITIAL_CONTEXT: BoardContext = { kind: "level", level: 1 };
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
  context: BoardContext;
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
  briefId: "brief:art-board-draft",
  title: "Art Board direction draft",
  decisions: []
};

let app: AppState = {
  rawAssets: [],
  assets: [],
  targetCount: 0,
  context: INITIAL_CONTEXT,
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

const mapPromises = new Map<LevelNumber, Promise<TiledMap>>();
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
      message: "Choose a level or production binding, then select a compatible candidate."
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
    reviewConfirmed: app.reviewConfirmed,
    context: app.context
  });
  const contextAssets = contextCandidateAssets();
  const filteredAssets = filterAssets(contextAssets, app.query, app.kind);
  const compiled = compiledProposal();
  const proposalReady = view.canExportProposal && app.briefPath !== null;

  root.innerHTML = `
    <header class="masthead">
      <div>
        <p class="eyebrow">The Last Spellroad · human review companion</p>
        <h1>Art Board</h1>
        <p class="lede">Compare repository assets against real level and game bindings. Every file produced here remains a review artifact.</p>
      </div>
      <div class="level-lock" aria-label="Current board context">
        <span>Current context</span>
        <strong>${escapeHtml(contextLabel(app.context))}</strong>
      </div>
    </header>

    <nav class="context-nav" aria-label="Art Board contexts">
      <div class="level-contexts" aria-label="Level previews">
        ${([1, 2, 3, 4, 5] as LevelNumber[]).map((level) => `<button type="button" data-context-level="${level}" aria-pressed="${app.context.kind === "level" && app.context.level === level}">Level ${level}</button>`).join("")}
      </div>
      <div class="binding-contexts" aria-label="Production bindings">
        ${bindingCards().map((card) => `<button type="button" data-context-binding="${escapeAttribute(card.bindingKey)}" aria-pressed="${app.context.kind === "binding" && app.context.bindingKey === card.bindingKey}"><span>${escapeHtml(bindingGroup(card.bindingKey))}</span>${escapeHtml(bindingLabel(card.bindingKey))}</button>`).join("")}
      </div>
    </nav>

    <main class="board-layout">
      <section id="${view.panels[0].id}" class="panel catalogue-panel" role="${view.panels[0].role}" aria-label="${view.panels[0].label}">
        <div class="panel-heading">
          <div><p class="panel-kicker">Library</p><h2>Asset catalogue</h2></div>
          <span class="count">${filteredAssets.length} / ${contextAssets.length} compatible</span>
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
          ${filteredAssets.length === 0 ? `<p class="empty-state">No compatible catalogue assets match this search.</p>` : filteredAssets.map((asset) => assetCard(asset, asset.id === app.selectedAssetId)).join("")}
        </div>
      </section>

      <section id="${view.panels[1].id}" class="panel scene-panel" role="${view.panels[1].role}" aria-label="${view.panels[1].label}">
        ${contextCanvas(view.selectedAsset)}
      </section>

      <section id="${view.panels[2].id}" class="panel inspector-panel" role="${view.panels[2].role}" aria-label="${view.panels[2].label}">
        <div class="panel-heading">
          <div><p class="panel-kicker">Selection</p><h2>Inspector & review</h2></div>
          <span class="target-count">${app.targetCount} binding targets indexed</span>
        </div>
        ${selectedInspector(view.selectedAsset)}
        <fieldset class="action-picker">
          <legend>Decision action</legend>
          ${(["use", "replace", "remove"] as ArtAction[]).map((action) => `
            <label><input type="radio" name="placement-action" value="${action}"${app.action === action ? " checked" : ""} /> ${titleCase(action)}</label>
          `).join("")}
        </fieldset>
        <label for="placement-note">Art-direction note</label>
        <textarea id="placement-note" rows="3" placeholder="Describe the visual intent…">${escapeHtml(app.note)}</textarea>
        ${app.context.kind === "binding" ? `<button id="record-binding" class="primary-button" type="button"${bindingActionAvailable(view.selectedAsset) ? "" : " disabled"}>Record ${escapeHtml(bindingLabel(app.context.bindingKey))} decision</button>` : ""}

        <div class="validation-block" aria-live="polite">
          <div class="subheading"><h3>Validation</h3><span class="${issues.some((issue) => issue.severity === "error") ? "error-chip" : "ready-chip"}">${issues.length === 0 ? "Ready" : `${issues.length} issue${issues.length === 1 ? "" : "s"}`}</span></div>
          ${issues.length === 0 ? `<p>Draft decisions match the selected level and production-binding contracts.</p>` : `<ul>${issues.map((issue) => `<li class="${issue.severity}">${escapeHtml(issue.message)}</li>`).join("")}</ul>`}
          ${issues.length > 0 ? `<p class="draft-retained">Diagnostics never clear the draft; repair the highlighted reference and export again.</p>` : ""}
        </div>

        <div class="export-flow">
          <div class="review-step">
            <span class="step-number">1</span>
            <div><h3>Export art brief</h3><p>Validate and save the current cross-context draft under art-direction/boards.</p></div>
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
  if (app.context.kind === "level") void drawLevelMap(app.context.level);
}

function contextCanvas(selectedAsset: DisplayAsset | null): string {
  if (app.context.kind === "binding") return bindingCanvas(app.context.bindingKey);
  const level = app.context.level;
  const decisions = activeDecisions().filter(
    (decision) => decision.target.kind === "level" && decision.target.level === level
  );
  return `
    <div class="panel-heading scene-heading">
      <div><p class="panel-kicker">Semantic placement</p><h2>Level ${level} scene canvas</h2></div>
      <span class="map-source">Live map · level-${level}.json</span>
    </div>
    <p class="guidance">The amber corridor marks the combat lane. Targets describe intent by named zone and anchor; they do not edit map cells.</p>
    <div class="scene-frame">
      <canvas id="level-map" width="960" height="288" role="img" aria-label="Rendered preview of the repository Level ${level} tile map"></canvas>
      <div class="combat-lane" aria-hidden="true"><span>combat lane guidance</span></div>
      <div class="placement-grid" aria-label="Level ${level} placement targets">
        ${levelPlacementTargets(level).map(({ zone, anchor }) => placementButton(zone, anchor, selectedAsset)).join("")}
      </div>
    </div>
    <div class="zone-legend" aria-label="Named Level ${level} zones">
      ${LEVEL_ZONES.map((zone) => `<span>${zoneLabel(zone)}</span>`).join("")}
    </div>
    <div class="decision-list">
      <div class="subheading"><h3>Level ${level} draft placements</h3><span>${decisions.length}</span></div>
      ${decisions.length === 0 ? `<p class="empty-state">No placements yet. Select a compatible asset and activate a target above.</p>` : decisions.map(decisionRow).join("")}
    </div>
  `;
}

function bindingCanvas(bindingKey: string): string {
  const card = bindingCards().find((candidate) => candidate.bindingKey === bindingKey);
  if (!card) return `<p class="empty-state">The production binding is no longer indexed.</p>`;
  const currentPreview = card.currentAsset && !card.currentAssetMissing
    ? bindingMedia(card.currentAsset, `Current ${bindingLabel(bindingKey)}`)
    : `<div class="missing-binding"><strong>Saved asset unavailable</strong><code>${escapeHtml(card.currentAssetId)}</code><p>Refresh or repair the catalogue. Any draft decision remains intact.</p></div>`;
  const draft = card.draftDecision;
  return `
    <div class="panel-heading scene-heading">
      <div><p class="panel-kicker">${escapeHtml(bindingGroup(bindingKey))}</p><h2>${escapeHtml(bindingLabel(bindingKey))}</h2></div>
      <span class="map-source">${card.candidates.length} compatible candidates</span>
    </div>
    <p class="guidance">This card reflects the exact cache key and asset URL derived from the production system. Recording a decision creates review data only.</p>
    <div class="binding-card${card.currentAssetMissing ? " missing" : ""}">
      <div class="binding-current">
        <p class="panel-kicker">Current production asset</p>
        ${currentPreview}
        <code>${escapeHtml(card.currentAssetId)}</code>
      </div>
      <dl>
        <div><dt>Binding key</dt><dd><code>${escapeHtml(card.bindingKey)}</code></dd></div>
        <div><dt>Production module</dt><dd><code>${escapeHtml(card.targetFile)}</code></dd></div>
        <div><dt>Media</dt><dd>${card.mediaKind}</dd></div>
      </dl>
    </div>
    <div class="decision-list">
      <div class="subheading"><h3>Binding draft</h3><span>${draft ? "1 active" : "None"}</span></div>
      ${draft ? decisionRow(draft) : `<p class="empty-state">Select a compatible candidate, choose Replace or Remove, then record the decision.</p>`}
    </div>
  `;
}

function bindingMedia(asset: DisplayAsset, label: string): string {
  if (asset.kind === "image") {
    return `<img class="binding-preview-image" src="${escapeAttribute(asset.url)}" alt="${escapeAttribute(label)}" />`;
  }
  if (asset.kind === "audio") return audioPreview(asset, label);
  return `<div class="asset-glyph" aria-hidden="true">${assetGlyph(asset.kind)}</div>`;
}

function audioPreview(asset: DisplayAsset, label: string): string {
  const metadata = audioPreviewMetadata(asset);
  if (!metadata.canPreview) {
    return `<p class="audio-fallback">${escapeHtml(metadata.fallbackText)}</p>`;
  }
  return `<div class="audio-preview">
    <audio controls preload="metadata" data-audio-preview>
      <source src="${escapeAttribute(metadata.sourceUrl)}"${metadata.mimeType ? ` type="${escapeAttribute(metadata.mimeType)}"` : ""} />
    </audio>
    <span>${escapeHtml(metadata.format)} · ${escapeHtml(label)}</span>
    <p class="audio-fallback" data-audio-fallback hidden>${escapeHtml(metadata.fallbackText)}</p>
  </div>`;
}

function assetCard(asset: DisplayAsset, selected: boolean): string {
  const media = asset.kind === "image"
    ? `<img src="${escapeAttribute(asset.url)}" alt="" loading="lazy" />`
    : asset.kind === "audio" && asset.capabilities.includes("audio-preview")
      ? audioPreview(asset, `Preview ${asset.displayName}`)
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
  const disabled = !levelActionAvailable({
    action: app.action,
    selectedAssetId: selectedAsset?.id ?? null,
    currentDecision: current
  });
  const label = `${titleCase(app.action)} ${selectedAsset?.displayName ?? "selected asset"} at ${zoneLabel(zone)}, ${anchorLabel(anchor)}`;
  return `<button class="placement-target${current ? " occupied" : ""}" type="button" data-zone="${zone}" data-anchor="${anchor}" aria-label="${escapeAttribute(label)}" title="${escapeAttribute(label)}"${disabled ? " disabled" : ""}><span>${anchorShort(anchor)}</span></button>`;
}

function selectedInspector(asset: DisplayAsset | null): string {
  if (!asset) return `<div class="selected-empty"><div class="selection-mark">◇</div><p>Select a catalogue asset to inspect it and prepare a placement.</p></div>`;
  return `
    <article class="selected-asset">
      ${asset.kind === "image" ? `<img src="${escapeAttribute(asset.url)}" alt="Preview of ${escapeAttribute(asset.displayName)}" />` : asset.kind === "audio" ? audioPreview(asset, `Preview ${asset.displayName}`) : `<div class="selection-mark">${assetGlyph(asset.kind)}</div>`}
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
  const assetId = decision.assetId ?? decision.currentAssetId ?? "none";
  const asset = app.assets.find((candidate) => candidate.id === assetId);
  const targetLabel = decision.target.kind === "level"
    ? `${zoneLabel(decision.target.zone)} · ${anchorLabel(decision.target.anchor)}`
    : bindingLabel(decision.target.bindingKey);
  return `
    <article class="decision-row">
      <span class="action-badge">${titleCase(decision.action)}</span>
      <div><strong>${escapeHtml(targetLabel)}</strong><p>${escapeHtml(asset?.displayName ?? assetId)}</p>${decision.intent ? `<small>${escapeHtml(decision.intent)}</small>` : ""}</div>
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
  document.querySelectorAll<HTMLButtonElement>("[data-context-level]").forEach((button) => {
    button.addEventListener("click", () => {
      setContext({ kind: "level", level: Number(button.dataset.contextLevel) as LevelNumber });
    });
  });
  document.querySelectorAll<HTMLButtonElement>("[data-context-binding]").forEach((button) => {
    button.addEventListener("click", () => {
      const bindingKey = button.dataset.contextBinding;
      if (bindingKey) setContext({ kind: "binding", bindingKey });
    });
  });
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
  document.querySelector<HTMLButtonElement>("#record-binding")?.addEventListener("click", recordBindingDecision);
  document.querySelectorAll<HTMLAudioElement>("[data-audio-preview]").forEach((audio) => {
    audio.addEventListener("error", () => {
      audio.hidden = true;
      const fallback = audio.parentElement?.querySelector<HTMLElement>("[data-audio-fallback]");
      if (fallback) fallback.hidden = false;
    });
  });
}

function setContext(context: BoardContext): void {
  app = {
    ...app,
    context,
    selectedAssetId: null,
    action: context.kind === "binding" ? "replace" : "use",
    message: `${contextLabel(context)} selected. Choose a compatible candidate.`
  };
  retainedFocus = null;
  render();
}

function placeAt(zone: LevelZone, anchor: LevelAnchor): void {
  if (app.context.kind !== "level") return;
  const level = app.context.level;
  const current = decisionAt(zone, anchor);
  const selected = app.assets.find((asset) => asset.id === app.selectedAssetId);
  const common = {
    id: `decision:level-${level}:${zone}:${anchor}`,
    target: { kind: "level" as const, level, zone, anchor },
    ...(app.note.trim() ? { intent: app.note.trim() } : {})
  };

  if (app.action === "use" && selected) {
    app.board = reduceBoard(app.board, { type: "use", ...common, assetId: selected.id });
  } else if (app.action === "replace" && current && selected) {
    const currentAssetId = current.assetId ?? current.currentAssetId;
    if (!currentAssetId) return;
    app.board = reduceBoard(app.board, { type: "replace", ...common, currentAssetId, assetId: selected.id });
  } else if (app.action === "remove" && selected) {
    app.board = reduceBoard(app.board, { type: "remove", ...common, currentAssetId: selected.id });
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

function recordBindingDecision(): void {
  if (app.context.kind !== "binding") return;
  const bindingKey = app.context.bindingKey;
  const target = PRODUCTION_TARGET_INDEX[bindingKey];
  if (!target) return;
  const selected = app.assets.find((asset) => asset.id === app.selectedAssetId);
  const common = {
    id: `decision:${bindingKey}`,
    target: { kind: "binding" as const, bindingKey },
    ...(app.note.trim() ? { intent: app.note.trim() } : {})
  };

  if (app.action === "remove") {
    app.board = reduceBoard(app.board, {
      type: "remove",
      ...common,
      currentAssetId: target.currentAssetId
    });
  } else if (selected && app.action === "replace") {
    app.board = reduceBoard(app.board, {
      type: "replace",
      ...common,
      currentAssetId: target.currentAssetId,
      assetId: selected.id
    });
  } else if (selected && app.action === "use") {
    app.board = reduceBoard(app.board, { type: "use", ...common, assetId: selected.id });
  } else {
    return;
  }

  app = {
    ...app,
    note: "",
    reviewConfirmed: false,
    briefPath: null,
    proposalPath: null,
    message: `${titleCase(app.action)} decision recorded for ${bindingLabel(bindingKey)}.`
  };
  render();
}

async function exportDraft(): Promise<void> {
  const brief = exportBrief(app.board);
  app = { ...app, busy: true, message: "Saving the art brief…" };
  render();
  const response = await postJson("/api/art-board/briefs", brief);
  app = response.ok
    ? { ...app, busy: false, briefPath: response.path ?? null, proposalPath: null, message: "Art brief saved. Review the proposal summary before the next export." }
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
  return validateArtBrief(
    exportBrief(app.board),
    app.assets,
    bindingCompatibilityIndex(PRODUCTION_TARGET_INDEX)
  );
}

function compiledProposal(): CompileProposalResult {
  if (app.board.decisions.length === 0) return { proposal: null, issues: [] };
  return compileProposal(exportBrief(app.board), app.rawAssets, PRODUCTION_TARGET_INDEX);
}

function activeDecisions(): ArtDecision[] {
  return app.board.decisions.filter((decision) => decision.status !== "superseded");
}

function decisionAt(zone: LevelZone, anchor: LevelAnchor): ArtDecision | undefined {
  if (app.context.kind !== "level") return undefined;
  const level = app.context.level;
  return [...activeDecisions()].reverse().find((decision) =>
    decision.target.kind === "level" &&
    decision.target.level === level &&
    decision.target.zone === zone &&
    decision.target.anchor === anchor
  );
}

async function drawLevelMap(level: LevelNumber): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#level-map");
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;
  const mapUrl = `/assets/levels/level-${level}.json`;
  try {
    let mapPromise = mapPromises.get(level);
    if (!mapPromise) {
      mapPromise = getJson<TiledMap>(mapUrl);
      mapPromises.set(level, mapPromise);
    }
    const map = await mapPromise;
    const tileset = map.tilesets[0];
    if (!tileset) throw new Error(`Level ${level} map has no tileset.`);
    const imageUrl = new URL(tileset.image, new URL(mapUrl, window.location.href)).href;
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
    await drawDecisionPreviews(context, canvas, level);
  } catch (error) {
    context.fillStyle = "#141115";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f0d9aa";
    context.font = "20px sans-serif";
    context.fillText(`Map preview unavailable: ${readableError(error)}`, 24, 48);
  }
}

async function drawDecisionPreviews(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  level: LevelNumber
): Promise<void> {
  const placementImages = activeDecisions().map(async (decision) => {
    if (
      decision.target.kind !== "level" ||
      decision.target.level !== level ||
      decision.action === "remove" ||
      !decision.assetId
    ) return;
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

function bindingCards() {
  return bindingContextCards(app.assets, app.board.decisions, PRODUCTION_TARGET_INDEX);
}

function contextCandidateAssets(): DisplayAsset[] {
  if (app.context.kind === "binding") {
    const bindingKey = app.context.bindingKey;
    return bindingCards().find((card) => card.bindingKey === bindingKey)?.candidates ?? [];
  }
  return app.assets.filter(
    (asset) =>
      asset.kind === "image" &&
      (asset.semanticClass === "tile" || asset.semanticClass === "prop") &&
      asset.capabilities.includes("level-placement")
  );
}

function bindingActionAvailable(selectedAsset: DisplayAsset | null): boolean {
  if (app.context.kind !== "binding") return false;
  return app.action === "remove" || selectedAsset !== null;
}

function contextLabel(context: BoardContext): string {
  return context.kind === "level" ? `Level ${context.level}` : bindingLabel(context.bindingKey);
}

function bindingGroup(bindingKey: string): string {
  if (bindingKey === "mage-sprite" || bindingKey.startsWith("enemy-")) return "Characters";
  if (bindingKey.startsWith("spell-icon-")) return "Spell icons";
  if (bindingKey.startsWith("openingvfx-")) return "Opening VFX";
  if (bindingKey.startsWith("sfx-")) return "SFX";
  if (bindingKey.startsWith("bgm-")) return "Music";
  return "Binding";
}

function bindingLabel(bindingKey: string): string {
  return bindingKey
    .replace(/^openingvfx-/, "Opening VFX ")
    .replace(/^sfx-/, "SFX ")
    .replace(/^bgm-/, "BGM ")
    .replace(/-/g, " ")
    .replace(/^mage sprite$/, "Mage sprite")
    .replace(/^enemy /, "Enemy ")
    .replace(/^spell icon /, "Spell icon ");
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
