import Phaser from "phaser";
import "./styles.css";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { SpellroadScene } from "./scenes/SpellroadScene";
import { PauseScene } from "./scenes/PauseScene";
import { resolveBootScenes, type PrototypeRegistry } from "./dev/prototypeHarness";

// A prototype ticket registers its throwaway scene here for the duration of that ticket only,
// then removes the entry (and the scene file) once resolved. See
// docs/eng-skills/prototype-harness.md. Empty by default, per the Active Prototype lifecycle
// (only one Active Prototype at a time; #127 last emptied this after `roadfeel`). Issue #125
// (epic #124) removed the previous occupant, `openingmagic` (`PrototypeOpeningMagicScene`),
// after applying its developer-selected CC0 Remix VFX treatment to the real Level 1 scene
// (`src/systems/openingVfx.ts`, `SpellroadScene.ts`).
const PROTOTYPE_REGISTRY: PrototypeRegistry = {};

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#15161f",
  // Issue #163 wired native 16x16 CC0 tile art (mage, enemy archetypes) upscaled to their
  // existing 32x32/26x26 footprints via setDisplaySize. Without pixelArt mode, Phaser's default
  // bilinear texture filtering smears that upscale into a blurry, indistinct blob instead of
  // crisp pixel art -- pixelArt: true switches to nearest-neighbor sampling for every texture.
  pixelArt: true,
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
