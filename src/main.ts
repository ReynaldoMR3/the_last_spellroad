import Phaser from "phaser";
import "./styles.css";
import { SpellroadScene } from "./scenes/SpellroadScene";

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
  scene: [SpellroadScene]
};

new Phaser.Game(config);
