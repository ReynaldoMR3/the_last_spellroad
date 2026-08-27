import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { compileProposal, PRODUCTION_TARGET_INDEX, type CompileProposalIssue } from "../../src/artBoard/proposal";
import type { ArtBrief, AssetRecord } from "../../src/artBoard/domain";

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
        const catalogue = await readJson(join(repositoryRoot, "art-direction", "catalog.json"));
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
        const level = boardLevel(body, result.issues);
        if (result.issues.some(isError) || level === null) {
          sendJson(response, 400, { ok: false, issues: level === null ? [...result.issues, invalidContext()] : result.issues });
          return true;
        }
        const relativePath = `art-direction/boards/level-${level}.json`;
        await writeJsonAtomically(join(repositoryRoot, relativePath), body);
        sendJson(response, 200, { ok: true, path: relativePath });
        return true;
      }
      if (request.method === "POST" && pathname === "/api/art-board/proposals") {
        const body = await readJsonBody(request);
        const brief = proposalBrief(body);
        const catalogue = await catalogueAssets(repositoryRoot);
        const result = compileProposal(brief, catalogue, PRODUCTION_TARGET_INDEX);
        const level = boardLevel(brief, result.issues);
        if (result.proposal === null || level === null) {
          sendJson(response, 400, { ok: false, issues: level === null ? [...result.issues, invalidContext()] : result.issues });
          return true;
        }
        const relativePath = `art-direction/proposals/proposal-level-${level}.json`;
        await writeJsonAtomically(join(repositoryRoot, relativePath), result.proposal);
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
  const catalogue = await readJson(join(repositoryRoot, "art-direction", "catalog.json"));
  if (!isRecord(catalogue) || !Array.isArray(catalogue.assets)) {
    throw new Error("Art Board catalogue must contain an assets array.");
  }
  return catalogue.assets as AssetRecord[];
}

function proposalBrief(body: unknown): unknown {
  return isRecord(body) && "brief" in body ? body.brief : body;
}

function boardLevel(brief: unknown, issues: readonly CompileProposalIssue[]): number | null {
  if (issues.some(isError) || !isRecord(brief) || !Array.isArray(brief.decisions) || brief.decisions.length === 0) return null;
  const levels = new Set<number>();
  for (const decision of brief.decisions) {
    if (!isRecord(decision) || !isRecord(decision.target) || decision.target.kind !== "level") return null;
    const level = decision.target.level;
    if (typeof level !== "number" || !Number.isInteger(level) || level < 1 || level > 5) return null;
    levels.add(level);
  }
  return levels.size === 1 ? [...levels][0] : null;
}

function invalidContext() {
  return {
    code: "invalid-brief-context",
    severity: "error",
    message: "Art Board files require decisions for exactly one level context."
  };
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
