import { describe, expect, it } from "vitest";
import { returnPlayerToTitle } from "./runCompletion";

describe("returnPlayerToTitle", () => {
  it("starts the title screen when the completed run is acknowledged", () => {
    const startedScenes: string[] = [];
    const removedSaveKeys: string[] = [];

    returnPlayerToTitle(
      { start: (sceneKey) => startedScenes.push(sceneKey) },
      { removeItem: (key) => removedSaveKeys.push(key) }
    );

    expect(removedSaveKeys).toEqual(["spellroad-save"]);
    expect(startedScenes).toEqual(["TitleScene"]);
  });
});
