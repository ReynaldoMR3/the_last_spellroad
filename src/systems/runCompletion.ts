import { clearSave } from "./SaveSystem";

/** The small portion of Phaser's scene API needed to return from a completed run. */
export interface SceneNavigator {
  start(sceneKey: string): void;
}

/** Ends a completed run at the game's initial screen. */
export function returnPlayerToTitle(navigator: SceneNavigator, storage: Pick<Storage, "removeItem"> = localStorage): void {
  clearSave(storage);
  navigator.start("TitleScene");
}
