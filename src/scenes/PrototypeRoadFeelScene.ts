import Phaser from "phaser";
import {
  TILESET_IMAGE_KEY,
  TILESET_IMAGE_URL,
  TILESET_NAME_IN_MAP,
  computeTilemapOffset,
  levelMapKey,
  levelMapUrl
} from "../systems/levelArt";

/**
 * THROWAWAY PROTOTYPE — wayfinder ticket #68 ("what's the smallest addition that gives a road
 * segment a Tibia-like 'world worth wandering' feel?"). Not wired into the real game; reached
 * via `?prototype=roadfeel` (see main.ts). Delete this file and the main.ts hook once the
 * ticket is resolved and the answer is folded into the real scene (or dropped entirely).
 *
 * Three structurally different variants, cycled with 1/2/3 or Left/Right arrows:
 *   A — ambient dressing only (static, zero interaction/state)
 *   B — discoverable side-pocket (one-time pickup + lore + Hexcoin reward, data-driven)
 *   C — reactive shrine (repeatable proximity trigger, no reward, pure atmosphere)
 *
 * Reuses the real level-1 tile art and lane geometry so variants are judged against the actual
 * game's density, not a blank vacuum.
 */

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const ROAD_LEFT = 0;
const ROAD_TOP = 130;
const ROAD_WIDTH = 960;
const ROAD_HEIGHT = 280;
const LANE_RECT = new Phaser.Geom.Rectangle(ROAD_LEFT, ROAD_TOP, ROAD_WIDTH, ROAD_HEIGHT);
const PLAYER_SPEED = 180;
const PROTOTYPE_LEVEL = 1;

type VariantKey = "A" | "B" | "C";
const VARIANT_ORDER: VariantKey[] = ["A", "B", "C"];
const VARIANT_LABELS: Record<VariantKey, string> = {
  A: "A — Ambient dressing (static)",
  B: "B — Discoverable side-pocket (one-time pickup)",
  C: "C — Reactive shrine (repeatable proximity)"
};

export class PrototypeRoadFeelScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private cursors!: Record<"w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;
  private variant: VariantKey = "A";
  private variantLabel!: Phaser.GameObjects.Text;
  private variantContent: Phaser.GameObjects.GameObject[] = [];
  private popupText?: Phaser.GameObjects.Text;
  private popupTimer?: Phaser.Time.TimerEvent;

  // Variant B state
  private hexcoinLabel!: Phaser.GameObjects.Text;
  private hexcoinCount = 0;

  constructor() {
    super("PrototypeRoadFeelScene");
  }

  preload(): void {
    this.load.image(TILESET_IMAGE_KEY, TILESET_IMAGE_URL);
    this.load.tilemapTiledJSON(levelMapKey(PROTOTYPE_LEVEL), levelMapUrl(PROTOTYPE_LEVEL));
  }

  create(): void {
    this.renderLevelArt();
    this.drawLaneOutline();

    this.player = this.add.circle(180, 270, 10, 0x9be564).setDepth(10);
    this.physics.add.existing(this.player);
    (this.player.body as Phaser.Physics.Arcade.Body).setBoundsRectangle(LANE_RECT);
    (this.player.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(false);

    const keyboard = this.input.keyboard!;
    this.cursors = {
      w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };

    keyboard.on("keydown-ONE", () => this.setVariant("A"));
    keyboard.on("keydown-TWO", () => this.setVariant("B"));
    keyboard.on("keydown-THREE", () => this.setVariant("C"));
    keyboard.on("keydown-LEFT", () => this.cycleVariant(-1));
    keyboard.on("keydown-RIGHT", () => this.cycleVariant(1));

    this.variantLabel = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 24, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#000000cc",
        padding: { x: 10, y: 6 }
      })
      .setOrigin(0.5)
      .setDepth(100);

    this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 4, "← 1  2  3 →", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#9aa0b4"
      })
      .setOrigin(0.5, 1)
      .setDepth(100);

    this.hexcoinLabel = this.add
      .text(12, 12, "", { fontFamily: "monospace", fontSize: "13px", color: "#f4d35e" })
      .setDepth(100);

    this.setVariant("A");
  }

  update(): void {
    this.handleMovement();
    this.updateVariantLogic();
  }

  private handleMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;
    if (this.cursors.a.isDown) vx -= 1;
    if (this.cursors.d.isDown) vx += 1;
    if (this.cursors.w.isDown) vy -= 1;
    if (this.cursors.s.isDown) vy += 1;
    const magnitude = Math.hypot(vx, vy) || 1;
    body.setVelocity((vx / magnitude) * PLAYER_SPEED, (vy / magnitude) * PLAYER_SPEED);
  }

  private renderLevelArt(): void {
    const map = this.make.tilemap({ key: levelMapKey(PROTOTYPE_LEVEL) });
    const tileset = map.addTilesetImage(TILESET_NAME_IN_MAP, TILESET_IMAGE_KEY);
    if (!tileset) return;
    const offset = computeTilemapOffset({
      canvasWidth: CANVAS_WIDTH,
      laneCenterY: ROAD_TOP + ROAD_HEIGHT / 2,
      mapWidthPx: map.widthInPixels,
      mapHeightPx: map.heightInPixels
    });
    map.createLayer("Terrain", tileset, offset.x, offset.y);
  }

  private drawLaneOutline(): void {
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(2, 0xffffff, 0.25);
    g.strokeRectShape(LANE_RECT);
  }

  private cycleVariant(direction: 1 | -1): void {
    const index = VARIANT_ORDER.indexOf(this.variant);
    const next = VARIANT_ORDER[(index + direction + VARIANT_ORDER.length) % VARIANT_ORDER.length];
    this.setVariant(next);
  }

  private setVariant(variant: VariantKey): void {
    this.variant = variant;
    this.variantLabel.setText(VARIANT_LABELS[variant]);
    this.variantContent.forEach((obj) => obj.destroy());
    this.variantContent = [];
    this.popupTimer?.remove();
    this.popupText?.destroy();
    this.popupText = undefined;
    this.hexcoinCount = 0;
    this.hexcoinLabel.setText("");

    if (variant === "A") this.buildVariantA();
    if (variant === "B") this.buildVariantB();
    if (variant === "C") this.buildVariantC();
  }

  // --- Variant A: ambient dressing only, no interaction ---------------------------------

  private buildVariantA(): void {
    const torchPositions = [
      { x: 60, y: ROAD_TOP + 20 },
      { x: 300, y: ROAD_TOP + ROAD_HEIGHT - 20 },
      { x: 540, y: ROAD_TOP + 20 },
      { x: 780, y: ROAD_TOP + ROAD_HEIGHT - 20 },
      { x: 900, y: ROAD_TOP + 20 }
    ];
    for (const pos of torchPositions) {
      const glow = this.add.circle(pos.x, pos.y, 6, 0xffa64d, 0.9).setDepth(2);
      this.tweens.add({ targets: glow, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
      this.variantContent.push(glow);
    }
    const foliagePositions = [
      { x: 140, y: ROAD_TOP + ROAD_HEIGHT - 12 },
      { x: 420, y: ROAD_TOP + 14 },
      { x: 660, y: ROAD_TOP + ROAD_HEIGHT - 14 },
      { x: 860, y: ROAD_TOP + ROAD_HEIGHT - 12 }
    ];
    for (const pos of foliagePositions) {
      const tuft = this.add.rectangle(pos.x, pos.y, 14, 8, 0x3f7a3f).setDepth(2);
      this.variantContent.push(tuft);
    }
  }

  // --- Variant B: discoverable side-pocket, one-time pickup + lore + Hexcoin -------------

  private buildVariantB(): void {
    const pockets = [
      { x: 90, y: ROAD_TOP + 24, lore: "A cracked rune, half-buried. It still hums faintly.", reward: 5 },
      { x: 860, y: ROAD_TOP + ROAD_HEIGHT - 24, lore: "Someone left a stash here, long ago.", reward: 8 }
    ];
    for (const pocket of pockets) {
      const marker = this.add
        .polygon(pocket.x, pocket.y, [0, -9, 9, 0, 0, 9, -9, 0], 0xf4d35e)
        .setDepth(2)
        .setData("consumed", false)
        .setData("lore", pocket.lore)
        .setData("reward", pocket.reward);
      this.tweens.add({ targets: marker, scale: 1.15, duration: 500, yoyo: true, repeat: -1 });
      this.variantContent.push(marker);
    }
  }

  // --- Variant C: reactive shrine, repeatable proximity trigger, no reward --------------

  private buildVariantC(): void {
    const shrine = this.add.circle(500, ROAD_TOP + 24, 12, 0x7c4dff, 0.5).setDepth(2);
    shrine.setData("active", false);
    this.variantContent.push(shrine);
  }

  // --- Per-frame variant behaviour --------------------------------------------------------

  private updateVariantLogic(): void {
    if (this.variant === "B") this.updateVariantB();
    if (this.variant === "C") this.updateVariantC();
  }

  private updateVariantB(): void {
    for (const obj of this.variantContent) {
      const marker = obj as Phaser.GameObjects.Polygon;
      if (marker.getData("consumed")) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, marker.x, marker.y);
      if (distance < 18) {
        marker.setData("consumed", true);
        marker.setFillStyle(0x555555);
        this.tweens.killTweensOf(marker);
        this.hexcoinCount += marker.getData("reward") as number;
        this.hexcoinLabel.setText(`Hexcoin +${marker.getData("reward")} (total this run: ${this.hexcoinCount})`);
        this.showPopup(marker.getData("lore") as string);
      }
    }
  }

  private updateVariantC(): void {
    const shrine = this.variantContent[0] as Phaser.GameObjects.Arc;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, shrine.x, shrine.y);
    const near = distance < 60;
    if (near && !shrine.getData("active")) {
      shrine.setData("active", true);
      shrine.setFillStyle(0x7c4dff, 1);
      this.showPopup("The old wards still hum here.", false);
    } else if (!near && shrine.getData("active")) {
      shrine.setData("active", false);
      shrine.setFillStyle(0x7c4dff, 0.5);
      this.popupText?.destroy();
      this.popupText = undefined;
    }
  }

  private showPopup(text: string, autoHide = true): void {
    this.popupText?.destroy();
    this.popupTimer?.remove();
    this.popupText = this.add
      .text(CANVAS_WIDTH / 2, ROAD_TOP - 24, text, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffffff",
        backgroundColor: "#000000aa",
        padding: { x: 8, y: 4 }
      })
      .setOrigin(0.5)
      .setDepth(100);
    if (autoHide) {
      this.popupTimer = this.time.delayedCall(2500, () => {
        this.popupText?.destroy();
        this.popupText = undefined;
      });
    }
  }
}
