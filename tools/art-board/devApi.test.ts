import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import type { IncomingMessage } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { createArtBoardDevApi } from "./devApi";

const tile = {
  id: "image:tiles:torch",
  path: "public/assets/tiles/torch.png",
  kind: "image",
  dimensions: null,
  contentHash: "sha256:test",
  source: { name: "Test", license: "CC0", evidencePath: "LICENSE" },
  tags: [],
  tagOrigin: "generated",
  enrichmentState: "complete",
  semanticClass: "prop",
  capabilities: ["level-placement"]
};

function levelOneBrief() {
  return {
    schemaVersion: 1,
    id: "brief:level-1",
    decisions: [
      {
        id: "decision:torch",
        target: { kind: "level", level: 1, zone: "entrance", anchor: "leftEdge" },
        action: "use",
        assetId: tile.id,
        status: "draft"
      }
    ]
  };
}

async function repository(
  assets: readonly typeof tile[] = [tile],
  overrides: readonly Record<string, unknown>[] = []
) {
  const root = await mkdtemp(join(tmpdir(), "art-board-api-"));
  await mkdir(join(root, "art-direction"), { recursive: true });
  await writeFile(join(root, "art-direction", "catalog.json"), JSON.stringify({ schemaVersion: 1, assets }));
  await writeFile(join(root, "art-direction", "overrides.json"), JSON.stringify({ schemaVersion: 1, overrides }));
  return root;
}

async function request(
  root: string,
  method: string,
  url: string,
  body?: unknown
): Promise<{ status: number; headers: Record<string, string>; json: unknown }> {
  const api = createArtBoardDevApi({ repositoryRoot: root });
  const chunks: Buffer[] = [];
  const headers: Record<string, string> = {};
  let status = 200;
  const response = {
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    end(chunk?: string | Buffer) {
      if (chunk !== undefined) chunks.push(Buffer.from(chunk));
    },
    writeHead(code: number, responseHeaders?: Record<string, string>) {
      status = code;
      for (const [name, value] of Object.entries(responseHeaders ?? {})) headers[name.toLowerCase()] = value;
      return response;
    }
  };
  const payload = body === undefined ? [] : [JSON.stringify(body)];
  const handled = await api(
    Object.assign(Readable.from(payload), { method, url }) as unknown as IncomingMessage,
    response as never,
    () => undefined
  );
  expect(handled).toBe(true);
  return { status, headers, json: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
}

describe("Art Board development API", () => {
  it("writes a valid Level 1 brief only to its context-derived board path", async () => {
    const root = await repository();

    const response = await request(root, "POST", "/api/art-board/briefs", levelOneBrief());

    expect(response).toMatchObject({
      status: 200,
      headers: { "cache-control": "no-store" },
      json: { ok: true, path: "art-direction/boards/level-1.json" }
    });
    expect(JSON.parse(await readFile(join(root, "art-direction", "boards", "level-1.json"), "utf8"))).toEqual(levelOneBrief());
    await expect(readFile(join(root, "src", "data", "waves", "level-1.json"), "utf8")).rejects.toThrow();
  });

  it("returns validation issues without writing an invalid brief", async () => {
    const root = await repository();
    const invalid = levelOneBrief();
    invalid.decisions[0].assetId = "image:missing:torch";

    const response = await request(root, "POST", "/api/art-board/briefs", invalid);

    expect(response).toMatchObject({ status: 400, json: { ok: false } });
    await expect(readFile(join(root, "art-direction", "boards", "level-1.json"), "utf8")).rejects.toThrow();
  });

  it("rejects a Level 1 brief when a durable override removes placement compatibility", async () => {
    const mageTile = {
      ...tile,
      id: "image:third-party:kenney-tiny-dungeon:tiles:tile-0084"
    };
    const root = await repository(
      [mageTile],
      [{
        id: mageTile.id,
        semanticClass: "creature",
        capabilities: ["visual-binding"]
      }]
    );
    const brief = levelOneBrief();
    brief.decisions[0].assetId = mageTile.id;

    const response = await request(root, "POST", "/api/art-board/briefs", brief);

    expect(response).toMatchObject({ status: 400, json: { ok: false } });
    expect((response.json as { issues: unknown[] }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "asset-kind-mismatch", assetId: mageTile.id })
    ]));
    await expect(readFile(join(root, "art-direction", "boards", "level-1.json"), "utf8")).rejects.toThrow();
  });

  it("keeps concurrent same-level brief writes independently atomic when timestamps match", async () => {
    const root = await repository();
    const now = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const first = levelOneBrief();
    first.id = "brief:level-1:first";
    const second = levelOneBrief();
    second.id = "brief:level-1:second";

    try {
      const [firstResponse, secondResponse] = await Promise.all([
        request(root, "POST", "/api/art-board/briefs", first),
        request(root, "POST", "/api/art-board/briefs", second)
      ]);

      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(200);
      expect(JSON.parse(await readFile(join(root, "art-direction", "boards", "level-1.json"), "utf8"))).toMatchObject({
        id: expect.stringMatching(/^brief:level-1:(first|second)$/)
      });
    } finally {
      now.mockRestore();
    }
  });

  it("derives proposal names from a valid brief and keeps output under proposals", async () => {
    const root = await repository();
    const proposal = { brief: levelOneBrief(), outputPath: "../../src/escaped.json" };

    const response = await request(root, "POST", "/api/art-board/proposals", proposal);

    expect(response).toMatchObject({
      status: 200,
      json: { ok: true, path: "art-direction/proposals/proposal-level-1.json" }
    });
    expect(JSON.parse(await readFile(join(root, "art-direction", "proposals", "proposal-level-1.json"), "utf8"))).toMatchObject({
      id: "proposal:brief:level-1",
      status: "review"
    });
    await expect(readFile(join(root, "src", "escaped.json"), "utf8")).rejects.toThrow();
  });
});
