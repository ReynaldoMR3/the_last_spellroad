import { describe, expect, it } from "vitest";
import { resolveBootScenes } from "./prototypeHarness";

class SceneA {}
class SceneB {}
class SceneC {}

describe("resolveBootScenes", () => {
  const defaultScenes = [SceneA, SceneB] as const;
  const registry = { roadfeel: SceneC };

  it("returns the default scene chain when no ?prototype= param is present", () => {
    expect(resolveBootScenes(defaultScenes, registry, "")).toEqual(defaultScenes);
  });

  it("returns the default scene chain when ?prototype= doesn't match any registry key", () => {
    expect(resolveBootScenes(defaultScenes, registry, "?prototype=unknown")).toEqual(defaultScenes);
  });

  it("boots straight into the matching prototype scene, dropping the default chain", () => {
    expect(resolveBootScenes(defaultScenes, registry, "?prototype=roadfeel")).toEqual([SceneC]);
  });

  it("returns the default scene chain for an empty registry regardless of the param", () => {
    expect(resolveBootScenes(defaultScenes, {}, "?prototype=roadfeel")).toEqual(defaultScenes);
  });

  it("ignores unrelated query params", () => {
    expect(resolveBootScenes(defaultScenes, registry, "?debug=true&prototype=roadfeel")).toEqual([SceneC]);
  });
});
