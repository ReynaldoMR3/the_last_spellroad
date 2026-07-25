import Phaser from "phaser";
import type { MasteryTier, SpellDefinition, WaveDefinition } from "../data/types";
import { HealthSystem, MAX_HP } from "../systems/HealthSystem";
import { ManaSystem, MANA_REGEN_PER_SEC, MAX_MANA } from "../systems/ManaSystem";
import { MasterySystem } from "../systems/MasterySystem";
import { HexcoinSystem } from "../systems/HexcoinSystem";
import { DebuffSystem } from "../systems/DebuffSystem";
import { SpellCaster, SHAPE_GEOMETRY } from "../entities/SpellCaster";
import { Enemy, ARCHETYPE_DAMAGE } from "../entities/Enemy";
import { spawnWave } from "../systems/WaveLoader";

const PLAYER_SPEED = 180;
const ROAD_TOP = 190;
const ROAD_HEIGHT = 160;
const ROAD_LEFT = 90;
const ROAD_WIDTH = 780;
const MAGE_START = { x: 180, y: 270 };
/** Ranged attacks apply damage after a short simulated travel delay rather than a full projectile-physics sprite — a scoped-down visual, not a change to the 4-damage-per-hit number. */
const RANGED_TRAVEL_MS = 280;
const HOTBAR_KEYS = ["ONE", "TWO", "THREE"] as const;

export class SpellroadScene extends Phaser.Scene {
  private mage?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private hotbarKeys: Phaser.Input.Keyboard.Key[] = [];

  private spells: SpellDefinition[] = [];
  private waves: WaveDefinition[] = [];
  private waveIndex = 0;

  private health!: HealthSystem;
  private mana!: ManaSystem;
  private mastery!: MasterySystem;
  private hexcoin!: HexcoinSystem;
  private debuff!: DebuffSystem;
  private caster!: SpellCaster;

  private enemies: Enemy[] = [];
  private enemiesRemainingToSpawn = 0;

  private previewSpellId: string | null = null;
  private previewGraphics?: Phaser.GameObjects.Graphics;

  private hudText?: Phaser.GameObjects.Text;
  private messageText?: Phaser.GameObjects.Text;
  private messageClearAt = 0;

  constructor() {
    super("SpellroadScene");
  }

  preload(): void {
    this.load.json("spells", "src/data/spells/spells.json");
    this.load.json("waves-level-1", "src/data/waves/level-1.json");
  }

  create(): void {
    this.spells = this.cache.json.get("spells") as SpellDefinition[];
    this.waves = this.cache.json.get("waves-level-1") as WaveDefinition[];

    this.health = new HealthSystem(
      () => this.handleDeath(),
      () => this.flashMessage("Hit!", 300)
    );
    this.mana = new ManaSystem();
    this.mastery = new MasterySystem();
    this.hexcoin = new HexcoinSystem();
    this.debuff = new DebuffSystem();
    this.caster = new SpellCaster(this.mana, this.mastery);

    this.createRoad();
    this.createMage();
    this.createHud();
    this.createInput();

    this.startWave(0);
  }

  update(_time: number, deltaMs: number): void {
    if (!this.mage) {
      return;
    }

    this.handleMovement();
    this.mana.update(deltaMs, this.debuff.effectiveManaRegen(MANA_REGEN_PER_SEC));
    this.caster.tickCooldowns(deltaMs);
    this.updateEnemies(deltaMs);
    this.updatePreview();
    this.updateHud();

    if (this.messageText && this.time.now > this.messageClearAt) {
      this.messageText.setText("");
    }
  }

  // ----- setup -----

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
    this.mage = this.physics.add.sprite(MAGE_START.x, MAGE_START.y, "");
    this.mage.setDisplaySize(32, 32);
    this.mage.setCollideWorldBounds(true);
    this.mage.body.setSize(32, 32);
    this.mage.body.setBoundsRectangle(
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
    this.add.text(32, 16, "The Last Spellroad", {
      color: "#f3e7c2",
      fontFamily: "Georgia, serif",
      fontSize: "24px"
    });

    this.hudText = this.add.text(32, 46, "", {
      color: "#9fb0d8",
      fontFamily: "monospace",
      fontSize: "14px",
      lineSpacing: 4
    });

    this.messageText = this.add.text(480, 400, "", {
      color: "#f3e7c2",
      fontFamily: "Georgia, serif",
      fontSize: "20px"
    });
    this.messageText.setOrigin(0.5, 0.5);

    this.previewGraphics = this.add.graphics();
  }

  private createInput(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;

    this.hotbarKeys = HOTBAR_KEYS.map((key) =>
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes[key])
    );
    this.hotbarKeys.forEach((key, index) => {
      key.on("down", () => this.handleHotbarPress(index));
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.confirmCast(pointer.worldX, pointer.worldY);
      } else if (pointer.rightButtonDown()) {
        this.cancelPreview();
      }
    });

    this.input.keyboard?.on("keydown-ESC", () => this.cancelPreview());
  }

  // ----- movement -----

  private handleMovement(): void {
    if (!this.mage) {
      return;
    }
    const left = this.cursors?.left.isDown || this.keys?.A.isDown;
    const right = this.cursors?.right.isDown || this.keys?.D.isDown;
    const up = this.cursors?.up.isDown || this.keys?.W.isDown;
    const down = this.cursors?.down.isDown || this.keys?.S.isDown;

    const velocity = new Phaser.Math.Vector2(0, 0);
    if (left) velocity.x -= 1;
    if (right) velocity.x += 1;
    if (up) velocity.y -= 1;
    if (down) velocity.y += 1;

    velocity.normalize().scale(PLAYER_SPEED * this.debuff.speedMultiplier);
    this.mage.setVelocity(velocity.x, velocity.y);
  }

  // ----- casting -----

  private handleHotbarPress(index: number): void {
    const spell = this.spells[index];
    if (!spell) {
      return;
    }
    if (this.previewSpellId === spell.id) {
      this.confirmCast(this.input.activePointer.worldX, this.input.activePointer.worldY);
      return;
    }
    if (this.caster.isOnCooldown(spell.id)) {
      this.flashMessage(`${spell.id} on cooldown`, 500);
      return;
    }
    this.previewSpellId = spell.id;
  }

  private cancelPreview(): void {
    this.previewSpellId = null;
    this.previewGraphics?.clear();
  }

  private confirmCast(targetX: number, targetY: number): void {
    if (!this.previewSpellId || !this.mage) {
      return;
    }
    const spell = this.spells.find((s) => s.id === this.previewSpellId);
    this.previewSpellId = null;
    this.previewGraphics?.clear();
    if (!spell) {
      return;
    }

    const result = this.caster.tryCast(spell, this.mage.x, this.mage.y, targetX, targetY);
    if (!result) {
      this.flashMessage("Not enough Mana", 500);
      return;
    }

    let hits = 0;
    for (const enemy of [...this.enemies]) {
      if (hits >= result.maxTargets) {
        break;
      }
      if (!result.hitTest(enemy.x, enemy.y)) {
        continue;
      }
      hits += 1;
      const killed = enemy.takeDamage(result.power);
      if (killed) {
        this.removeEnemy(enemy);
        this.hexcoin.earn(1);
      }
    }

    if (hits > 0) {
      this.mastery.recordLandedCast(spell.id, (spellId, tier) =>
        this.flashMessage(`${spellId} reached ${tier.toUpperCase()} Mastery!`, 1500)
      );
    }
  }

  private updatePreview(): void {
    if (!this.previewGraphics) {
      return;
    }
    this.previewGraphics.clear();
    if (!this.previewSpellId || !this.mage) {
      return;
    }
    const spell = this.spells.find((s) => s.id === this.previewSpellId);
    if (!spell) {
      return;
    }
    const pointer = this.input.activePointer;
    const direction = new Phaser.Math.Vector2(
      pointer.worldX - this.mage.x,
      pointer.worldY - this.mage.y
    );
    if (direction.length() === 0) {
      direction.x = 1;
    }
    direction.normalize();

    this.previewGraphics.fillStyle(0x8fd3ff, 0.28);
    this.previewGraphics.lineStyle(2, 0x8fd3ff, 0.8);

    if (spell.shape === "line") {
      const angle = Math.atan2(direction.y, direction.x);
      this.previewGraphics.save();
      this.previewGraphics.translateCanvas(this.mage.x, this.mage.y);
      this.previewGraphics.rotateCanvas(angle);
      this.previewGraphics.fillRect(
        0,
        -SHAPE_GEOMETRY.LINE_WIDTH / 2,
        SHAPE_GEOMETRY.LINE_LENGTH,
        SHAPE_GEOMETRY.LINE_WIDTH
      );
      this.previewGraphics.strokeRect(
        0,
        -SHAPE_GEOMETRY.LINE_WIDTH / 2,
        SHAPE_GEOMETRY.LINE_LENGTH,
        SHAPE_GEOMETRY.LINE_WIDTH
      );
      this.previewGraphics.restore();
    } else if (spell.shape === "cone") {
      const facing = Math.atan2(direction.y, direction.x);
      const half = Phaser.Math.DegToRad(SHAPE_GEOMETRY.CONE_HALF_ANGLE_DEG);
      this.previewGraphics.slice(
        this.mage.x,
        this.mage.y,
        SHAPE_GEOMETRY.CONE_RADIUS,
        facing - half,
        facing + half,
        false
      );
      this.previewGraphics.fillPath();
      this.previewGraphics.strokePath();
    } else {
      const distance = Math.min(
        Phaser.Math.Distance.Between(this.mage.x, this.mage.y, pointer.worldX, pointer.worldY),
        SHAPE_GEOMETRY.CIRCLE_MAX_PLACEMENT_RANGE
      );
      const center = new Phaser.Math.Vector2(this.mage.x, this.mage.y).add(
        direction.clone().scale(distance)
      );
      this.previewGraphics.fillCircle(center.x, center.y, SHAPE_GEOMETRY.CIRCLE_RADIUS);
      this.previewGraphics.strokeCircle(center.x, center.y, SHAPE_GEOMETRY.CIRCLE_RADIUS);
    }
  }

  // ----- enemies / waves -----

  private startWave(index: number): void {
    const wave = this.waves[index];
    if (!wave) {
      this.flashMessage("Level 1 complete!", 3000);
      return;
    }
    this.waveIndex = index;
    // hp-template.md: "full reset to 100 at the start of every wave" — every wave is a
    // clean HP budget, not cumulative damage carried in from the previous one.
    this.health.reset();
    this.debuff.clear();
    this.enemiesRemainingToSpawn = wave.enemies.reduce((sum, e) => sum + e.count, 0);
    spawnWave(this, wave, { x: 820, y: 270 }, (enemy) => {
      this.enemies.push(enemy);
      this.enemiesRemainingToSpawn -= 1;
    });
  }

  private updateEnemies(deltaMs: number): void {
    if (!this.mage) {
      return;
    }
    for (const enemy of this.enemies) {
      enemy.update(deltaMs, this.mage.x, this.mage.y, {
        onMeleeHit: () => this.health.applyDamage(ARCHETYPE_DAMAGE.melee),
        onRangedFire: () => {
          this.time.delayedCall(RANGED_TRAVEL_MS, () =>
            this.health.applyDamage(ARCHETYPE_DAMAGE.ranged)
          );
        },
        onDebuffPulse: (variant) => this.debuff.applyStack(variant)
      });
    }

    if (this.enemiesRemainingToSpawn === 0 && this.enemies.length === 0) {
      this.enemiesRemainingToSpawn = -1; // guard against re-triggering while the delay is pending
      this.time.delayedCall(1200, () => this.startWave(this.waveIndex + 1));
    }
  }

  private removeEnemy(enemy: Enemy): void {
    this.enemies = this.enemies.filter((e) => e !== enemy);
    enemy.destroy();
  }

  // ----- death -----

  private handleDeath(): void {
    const equipped = this.spells.map((s) => s.id);
    const affected = this.mastery.applyRandomDeathPenalty(equipped);
    this.flashMessage(
      affected ? `Died — ${affected} lost a Mastery tier` : "Died — no Mastery lost (all Novice)",
      2500
    );

    // Checkpoint/respawn placement is still an open developer decision (backlog item
    // 0.2 — does a death respawn before or after the pre-boss waves, do those waves
    // re-award Hexcoin on retry). Placeholder until that's resolved: respawn at the
    // level start and replay from wave 0. Do not treat this as the shipped policy.
    this.enemies.forEach((e) => e.destroy());
    this.enemies = [];
    this.enemiesRemainingToSpawn = 0;
    this.health.reset();
    this.debuff.clear();
    this.mage?.setPosition(MAGE_START.x, MAGE_START.y);
    this.time.delayedCall(1500, () => this.startWave(0));
  }

  // ----- hud -----

  private flashMessage(text: string, durationMs: number): void {
    this.messageText?.setText(text);
    this.messageClearAt = this.time.now + durationMs;
  }

  private updateHud(): void {
    if (!this.hudText) {
      return;
    }
    const hpLine = `HP    ${this.health.current}/${MAX_HP}`;
    const manaLine = `Mana  ${Math.floor(this.mana.current)}/${MAX_MANA}`;
    const hexLine = `Hexcoin ${this.hexcoin.balance}`;
    const waveLine = `Wave  ${this.waveIndex + 1}/${this.waves.length}  (enemies: ${this.enemies.length})`;
    const hotbarLine = this.spells
      .map((spell, index) => {
        const tier: MasteryTier = this.mastery.getTier(spell.id);
        const cooldown = this.caster.cooldownRemaining(spell.id);
        const cdLabel = cooldown > 0 ? `${(cooldown / 1000).toFixed(1)}s` : "ready";
        return `[${index + 1}] ${spell.id} (${tier}, ${cdLabel})`;
      })
      .join("  ");

    this.hudText.setText([hpLine, manaLine, hexLine, waveLine, hotbarLine].join("\n"));
  }
}
