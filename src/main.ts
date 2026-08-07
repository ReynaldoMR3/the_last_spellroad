import Phaser from "phaser";
import "./styles.css";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { SpellroadScene } from "./scenes/SpellroadScene";
import { PauseScene } from "./scenes/PauseScene";
import { PrototypeRoadFeelScene } from "./scenes/PrototypeRoadFeelScene";

// THROWAWAY — wayfinder ticket #68's prototype. `?prototype=roadfeel` boots straight into it
// instead of the real Boot->Title->Spellroad chain. Remove this flag and the scene import once
// the ticket resolves.
const prototypeFlag = new URLSearchParams(window.location.search).get("prototype");
const scenes =
  prototypeFlag === "roadfeel" ? [PrototypeRoadFeelScene] : [BootScene, TitleScene, SpellroadScene, PauseScene];

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
  // (launched on top of SpellroadScene, never started directly from here).
  scene: scenes
};

new Phaser.Game(config);
