import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { applyCatalogueOverrides } from "../../src/artBoard/catalog";
import { compileProposal, PRODUCTION_TARGET_INDEX } from "../../src/artBoard/proposal";
import type { ArtBrief, AssetOverride, AssetRecord } from "../../src/artBoard/domain";

export interface ArtBoardDevApiOptions {
  repositoryRoot: string;
}

type JsonResponse = { ok: true; path?: string; catalog?: unknown; targets?: unknown } | { ok: false; issues: unknown[] };

type Next = (error?: Error) => void;

/**
 * Development-server middleware for review artifacts. It only writes board
 * briefs and ignored proposal JSON; production game sources remain read-only.
 */
export function createArtBoardDevApi({ repositoryRoot }: ArtBoardDevApiOptions) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
    next: Next
  ): Promise<boolean> => {
    const pathname = new URL(request.url ?? "/", "http://art-board.local").pathname;
    if (!pathname.startsWith("/api/art-board/")) {
      next();
      return false;
    }

    try {
      if (request.method === "GET" && pathname === "/api/art-board/catalog") {
        const catalogue = await correctedCatalogueDocument(repositoryRoot);
        sendJson(response, 200, { ok: true, catalog: catalogue });
        return true;
      }
      if (request.method === "GET" && pathname === "/api/art-board/targets") {
        sendJson(response, 200, { ok: true, targets: PRODUCTION_TARGET_INDEX });
        return true;
      }
      if (request.method === "POST" && pathname === "/api/art-board/briefs") {
        const body = await readJsonBody(request);
        const catalogue = await catalogueAssets(repositoryRoot);
        const result = compileProposal(body, catalogue, PRODUCTION_TARGET_INDEX);
        if (result.issues.some(isError)) {
          sendJson(response, 400, { ok: false, issues: result.issues });
          return true;
        }
        const context = briefContextName(body);
        if (context === null) {
          sendJson(response, 400, { ok: false, issues: [invalidContext()] });
          return true;
        }
        const relativePath = `art-direction/boards/${context}.json`;
        await writeJsonAtomically(containedArtifactPath(repositoryRoot, relativePath), body);
        sendJson(response, 200, { ok: true, path: relativePath });
        return true;
      }
      if (request.method === "POST" && pathname === "/api/art-board/proposals") {
        const body = await readJsonBody(request);
        const brief = proposalBrief(body);
        const catalogue = await catalogueAssets(repositoryRoot);
        const result = compileProposal(brief, catalogue, PRODUCTION_TARGET_INDEX);
        if (result.proposal === null) {
          sendJson(response, 400, { ok: false, issues: result.issues });
          return true;
        }
        const context = briefContextName(brief);
        if (context === null) {
          sendJson(response, 400, { ok: false, issues: [invalidContext()] });
          return true;
        }
        const relativePath = `art-direction/proposals/proposal-${context}.json`;
        await writeJsonAtomically(
          containedArtifactPath(repositoryRoot, relativePath),
          result.proposal
        );
        sendJson(response, 200, { ok: true, path: relativePath });
        return true;
      }
      sendJson(response, 404, { ok: false, issues: [{ code: "not-found", message: "Unknown Art Board endpoint." }] });
      return true;
    } catch (error) {
      sendJson(response, 400, { ok: false, issues: [jsonIssue(error)] });
      return true;
    }
  };
}

async function catalogueAssets(repositoryRoot: string): Promise<AssetRecord[]> {
  return (await correctedCatalogueDocument(repositoryRoot)).assets;
}

async function correctedCatalogueDocument(
  repositoryRoot: string
): Promise<{ schemaVersion: 1; assets: AssetRecord[] }> {
  const catalogue = await readJson(join(repositoryRoot, "art-direction", "catalog.json"));
  if (!isRecord(catalogue) || !Array.isArray(catalogue.assets)) {
    throw new Error("Art Board catalogue must contain an assets array.");
  }
  const overrides = await readJson(join(repositoryRoot, "art-direction", "overrides.json"));
  if (!isRecord(overrides) || !Array.isArray(overrides.overrides)) {
    throw new Error("Art Board overrides must contain an overrides array.");
  }
  return {
    schemaVersion: 1,
    assets: applyCatalogueOverrides(
      catalogue.assets as AssetRecord[],
      overrides.overrides as AssetOverride[]
    )
  };
}

function proposalBrief(body: unknown): unknown {
  return isRecord(body) && "brief" in body ? body.brief : body;
}

function briefContextName(brief: unknown): string | null {
  if (!isRecord(brief) || !Array.isArray(brief.decisions) || brief.decisions.length === 0) {
    return null;
  }
  const contexts: string[] = [];
  for (const decision of brief.decisions) {
    if (!isRecord(decision) || !isRecord(decision.target)) return null;
    const target = decision.target;
    if (
      target.kind === "level" &&
      typeof target.level === "number" &&
      Number.isInteger(target.level) &&
      target.level >= 1 &&
      target.level <= 5
    ) {
      contexts.push(`level-${target.level}`);
      continue;
    }
    if (
      target.kind === "binding" &&
      typeof target.bindingKey === "string" &&
      Object.prototype.hasOwnProperty.call(PRODUCTION_TARGET_INDEX, target.bindingKey)
    ) {
      contexts.push(`binding-${target.bindingKey}`);
      continue;
    }
    return null;
  }
  const uniqueContexts = [...new Set(contexts)];
  if (uniqueContexts.length === 1) return uniqueContexts[0];
  const hash = createHash("sha256")
    .update(canonicalJson(brief.decisions))
    .digest("hex")
    .slice(0, 16);
  return `mixed-${hash}`;
}

function invalidContext() {
  return {
    code: "invalid-brief-context",
    severity: "error",
    message: "Art Board files require at least one validated level or production binding decision."
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function containedArtifactPath(repositoryRoot: string, relativePath: string): string {
  if (isAbsolute(relativePath)) throw new Error("Art Board artifact paths must be relative.");
  const root = resolve(repositoryRoot);
  const output = resolve(root, relativePath);
  const pathFromRoot = relative(root, output);
  if (
    pathFromRoot === "" ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`)
  ) {
    throw new Error("Art Board artifact path escaped the repository root.");
  }
  return output;
}

function isError(issue: { severity: string }): boolean {
  return issue.severity === "error";
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON at ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

async function writeJsonAtomically(path: string, document: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rename(temporaryPath, path);
}

function sendJson(response: ServerResponse, status: number, body: JsonResponse): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function jsonIssue(error: unknown) {
  return { code: "invalid-json", severity: "error", message: error instanceof Error ? error.message : String(error) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export type ArtBoardDevApi = ReturnType<typeof createArtBoardDevApi>;
