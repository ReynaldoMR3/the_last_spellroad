import Phaser from "phaser";
import "./styles.css";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { SpellroadScene } from "./scenes/SpellroadScene";
import { PauseScene } from "./scenes/PauseScene";
import { resolveBootScenes, type PrototypeRegistry } from "./dev/prototypeHarness";

// A prototype ticket registers its throwaway scene here for the duration of that ticket only —
// e.g. `{ roadfeel: PrototypeRoadFeelScene }` — then removes the entry (and the scene file) once
// resolved. See docs/eng-skills/prototype-harness.md. Empty by default: a no-op for the real game.
const PROTOTYPE_REGISTRY: PrototypeRegistry = {};

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#15161f",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  // backlog 5.8 — Boot/Preload -> Title -> gameplay chain, plus the hard-pause menu scene
  // (launched on top of SpellroadScene, never started directly from here). `?prototype=<key>`
  // overrides this chain entirely — see PROTOTYPE_REGISTRY above.
  scene: resolveBootScenes([BootScene, TitleScene, SpellroadScene, PauseScene], PROTOTYPE_REGISTRY)
};

new Phaser.Game(config);
