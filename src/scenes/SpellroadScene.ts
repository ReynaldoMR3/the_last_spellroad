import Phaser from "phaser";

const PLAYER_SPEED = 180;
const ROAD_TOP = 190;
const ROAD_HEIGHT = 160;
const ROAD_LEFT = 90;
const ROAD_WIDTH = 780;

export class SpellroadScene extends Phaser.Scene {
  private mage?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;

  constructor() {
    super("SpellroadScene");
  }

  create(): void {
    this.createRoad();
    this.createMage();
    this.createHud();

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;
  }

  update(): void {
    if (!this.mage) {
      return;
    }

    const left = this.cursors?.left.isDown || this.keys?.A.isDown;
    const right = this.cursors?.right.isDown || this.keys?.D.isDown;
    const up = this.cursors?.up.isDown || this.keys?.W.isDown;
    const down = this.cursors?.down.isDown || this.keys?.S.isDown;

    const velocity = new Phaser.Math.Vector2(0, 0);

    if (left) {
      velocity.x -= 1;
    }

    if (right) {
      velocity.x += 1;
    }

    if (up) {
      velocity.y -= 1;
    }

    if (down) {
      velocity.y += 1;
    }

    velocity.normalize().scale(PLAYER_SPEED);
    this.mage.setVelocity(velocity.x, velocity.y);
  }

  private createRoad(): void {
    this.add.rectangle(480, 270, 960, 540, 0x11131a);
    this.add.rectangle(480, 270, ROAD_WIDTH, ROAD_HEIGHT, 0x303548);
    this.add.rectangle(480, ROAD_TOP, ROAD_WIDTH, 4, 0x7b6fbd);
    this.add.rectangle(480, ROAD_TOP + ROAD_HEIGHT, ROAD_WIDTH, 4, 0x7b6fbd);

    for (let x = ROAD_LEFT; x <= ROAD_LEFT + ROAD_WIDTH; x += 60) {
      this.add.rectangle(x, 270, 2, ROAD_HEIGHT, 0x252939, 0.8);
    }
  }

  private createMage(): void {
    this.mage = this.physics.add.sprite(180, 270, "");
    this.mage.setDisplaySize(32, 32);
    this.mage.setCollideWorldBounds(true);
    this.mage.body.setSize(32, 32);

    const body = this.mage.body;
    body.setBoundsRectangle(
      new Phaser.Geom.Rectangle(ROAD_LEFT, ROAD_TOP, ROAD_WIDTH, ROAD_HEIGHT)
    );

    const graphics = this.add.graphics();
    graphics.fillStyle(0xd9c27f, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.lineStyle(3, 0x4b3f72, 1);
    graphics.strokeCircle(16, 16, 13);
    graphics.generateTexture("mage-placeholder", 32, 32);
    graphics.destroy();

    this.mage.setTexture("mage-placeholder");
  }

  private createHud(): void {
    this.add.text(32, 28, "The Last Spellroad", {
      color: "#f3e7c2",
      fontFamily: "Georgia, serif",
      fontSize: "28px"
    });

    this.add.text(32, 64, "Phaser + TypeScript foundation ready", {
      color: "#9fb0d8",
      fontFamily: "Arial, sans-serif",
      fontSize: "16px"
    });
  }
}
