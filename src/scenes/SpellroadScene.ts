import Phaser from "phaser";
import type { DebuffVariant, MasteryTier, SpellDefinition, WaveDefinition } from "../data/types";
import { HealthSystem, MAX_HP } from "../systems/HealthSystem";
import { ManaSystem, MANA_REGEN_PER_SEC, MAX_MANA } from "../systems/ManaSystem";
import { MasterySystem } from "../systems/MasterySystem";
import { HexcoinSystem, FEE_PHASE_RECOVERY, PHASE_RECOVERY_HP_FRACTION, MAX_RECOVERIES_HARD_CAP } from "../systems/HexcoinSystem";
import { DebuffSystem } from "../systems/DebuffSystem";
import { SpellCaster, SHAPE_GEOMETRY } from "../entities/SpellCaster";
import { Enemy, ARCHETYPE_DAMAGE } from "../entities/Enemy";
import { spawnWave } from "../systems/WaveLoader";
import { selectAutoAimTarget } from "../systems/autoAim";
import { isStillInRangedImpactZone } from "../systems/rangedImpact";
import { WaveSession, shouldAutoAdvance } from "../systems/waveSession";
import {
  ALL_LEVELS,
  TILESET_IMAGE_KEY,
  TILESET_IMAGE_URL,
  TILESET_NAME_IN_MAP,
  computeTilemapOffset,
  levelMapKey,
  levelMapUrl
} from "../systems/levelArt";

const PLAYER_SPEED = 180;
/** Widened 160->220 (2026-07-27, developer feedback: not enough room to evade projectiles/
 * melee), then 220->280 (2026-08-01, backlog 2.21 / issue #20: developer reported the lane
 * still feels stretched/cramped after the first pass). Kept centered on the same y=270
 * midline both times (ROAD_TOP recomputed accordingly) so the mage's start position and
 * every enemy-spawn point stay meaningful. This touches geometry
 * `RANGED_PREFERRED_RANGE`/`DEBUFFER_PREFERRED_RANGE`/`WALL_SLIDE_MARGIN` (Enemy.ts) were
 * tuned against at the original 160px height (backlog 2.10) — a taller lane only reduces how
 * often enemies hit the top/bottom wall (and thus how often wall-slide fires at all), it
 * can't newly break the non-overlapping bands those ranges were tuned for. Final magnitude
 * (280, not a larger number) is Loomwright's implementation call per issue #20, same as
 * 2.17's own precedent — confirmed via typecheck/build here, feel confirmed by developer
 * playtest, not fixed in advance by this comment. */
const ROAD_TOP = 130;
const ROAD_HEIGHT = 280;
const ROAD_LEFT = 90;
const ROAD_WIDTH = 780;
const MAGE_START = { x: 180, y: 270 };
/** Ranged attacks apply damage after a short simulated travel delay rather than a full projectile-physics sprite — a scoped-down visual, not a change to the 4-damage-per-hit number.
 * Widened 280->450ms (2026-07-27, developer feedback: no time to react/evade) — this is
 * purely a visual-pacing constant (Loomwright's own call per the comment above), not one of
 * Pato's validated numbers, so it's free to retune without a template change. */
const RANGED_TRAVEL_MS = 450;
/** GDD "Core Controls And Casting": a 1-6 hotbar on the number row. Was stuck at 3 keys
 * from when the spellbook only had 3 spells; now that backlog 3.1 shipped 12, this was
 * silently making 9 of them unreachable in play. Full loadout-selection UI (choosing which
 * known spells fill these 6 slots, swappable only between expeditions/at checkpoints) is
 * explicitly future work per the GDD ("full hotkey customization can be a later feature");
 * this fix widens the pipe and defaults it to the first 6 shipped spells, nothing more. */
const HOTBAR_KEYS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"] as const;
/** backlog 2.9 — hit-feedback color bands, keyed off the target's *remaining* HP% after the hit (not an HP bar, per the developer's clash concern with per-enemy bars). */
const DAMAGE_NUMBER_COLOR = { healthy: "#4caf50", wounded: "#f4c430", critical: "#e05252" } as const;
/** backlog 2.10 — the lane rectangle the mage and (per this fix) enemies are both clamped
 * to, and the shape preview is visually clipped to via a geometry mask. Hit-tests don't
 * need their own separate clip: once enemies can't exist outside this rect, there's
 * nothing off-lane to hit, so the clipped preview and the actual hit-test can't disagree. */
const LANE_RECT = new Phaser.Geom.Rectangle(ROAD_LEFT, ROAD_TOP, ROAD_WIDTH, ROAD_HEIGHT);
/** backlog 3.8 (issue #29) — explicit depths for the two background-ish layers, so stacking
 * order is correct regardless of *when* a layer is created, not just insertion order. This
 * matters specifically because the level-art tile layer gets destroyed and recreated at every
 * level transition (`renderLevelArt`), long after the mage/HUD/enemies already exist — without
 * an explicit depth, a freshly (re)created layer would insert on *top* of the display list and
 * render over everything, the same failure mode `spawnRangedProjectile`'s own depth comment
 * describes for a different reason. Background sits behind the tile art; both sit behind every
 * default-depth (0) gameplay/HUD object. */
const BACKGROUND_DEPTH = -100;
const TILE_LAYER_DEPTH = -50;
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
/** backlog 2.10 — non-mouse aiming fallback: default cast placement distance along
 * last-move-direction when the pointer hasn't been touched yet this session. */
const DEFAULT_AIM_DISTANCE = SHAPE_GEOMETRY.CIRCLE_MAX_PLACEMENT_RANGE / 2;
/** backlog 2.22 / issue #44 — decision 6 (visual feedback): a ring drawn around whichever
 * enemy auto-aim has soft-locked for the in-progress preview, so which enemy will be hit is
 * clear before confirming. Sized a little larger than the enemy sprite's 26x26 footprint
 * (Enemy.ensureTexture) so it reads as a ring around the sprite, not an overlapping outline. */
const AUTO_AIM_HIGHLIGHT_COLOR = 0xffd75e;
const AUTO_AIM_HIGHLIGHT_RADIUS = 20;
/** backlog 3.1 fix (Heckler, 2026-07-25): `slice(0, 6)` on spell-authoring order silently
 * orphaned all 3 Heavy spells and 2 of 3 Standard ones behind no swap UI — exactly the
 * spells the new Level 2/3 escalation assumes are reachable. Curated instead: 2 per
 * weight class, spanning shape and element as widely as 6 slots allow. Full loadout
 * selection is still explicitly future work (see HOTBAR_KEYS comment) — this is only a
 * better fixed default, not that feature. */
const DEFAULT_LOADOUT_IDS = ["arc_lance", "flame_sweep", "frost_nova", "stone_spike", "thunder_dome", "magma_lance"];
/** backlog 2.10 fix (Heckler, 2026-07-25): a plain "has the pointer ever moved" boolean
 * never resets, so an incidental trackpad jitter (common — resting a finger, OS cursor
 * accel) permanently defeats the fallback it was built for. A single pointermove event
 * must cover at least this many pixels to count as real aiming intent, not noise. */
const POINTER_JITTER_THRESHOLD_PX = 4;

export class SpellroadScene extends Phaser.Scene {
  private mage?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private hotbarKeys: Phaser.Input.Keyboard.Key[] = [];

  private spells: SpellDefinition[] = [];
  private equippedSpells: SpellDefinition[] = [];
  private waves: WaveDefinition[] = [];
  private waveIndex = 0;
  /** backlog 3.4 — cap on Phase-Transition Recovery purchases for the boss fight currently
   * in progress: min(that boss's phase-breaks - 1, MAX_RECOVERIES_HARD_CAP), per hp-template.md.
   * Recomputed at the start of every boss encounter; meaningless outside one. */
  private bossMaxRecoveries = 0;
  /** Issue #48 — the run's generation counter + phase. Every `delayedCall` this scene
   * schedules that can outlive the wave/life that scheduled it captures
   * `this.session.generation` and re-checks `isCurrent(token)` before acting, and the
   * wave-complete auto-advance is gated on `session.phase` instead of on counter values
   * `handleDeath` happens to reproduce. See `systems/waveSession.ts` for the full root cause. */
  private session!: WaveSession;
  /** backlog 0.2 — highest wave `level` number reached so far; `startWave` only calls
   * `hexcoin.markLevelStart()` the first time a level number is crossed, never on a
   * same-level death-retry, so a death can't be used to re-bank an already-recorded floor. */
  private highestLevelReached = 0;

  private lastFacing = new Phaser.Math.Vector2(1, 0);
  private pointerHasMoved = false;

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
  /** backlog 2.22 / issue #44 -- the enemy auto-aim locked onto for the in-progress
   * preview, chosen once when the preview starts (see `handleHotbarPress`) and tracked
   * live (not re-evaluated) until confirm/cancel, per the design doc's soft-lock decision.
   * Only ever set while aiming via the no-mouse fallback (`!pointerHasMoved`); mouse aiming
   * is untouched and always leaves this null. */
  private previewLockedEnemy: Enemy | null = null;

  private hudText?: Phaser.GameObjects.Text;
  private hotbarText?: Phaser.GameObjects.Text;
  private messageText?: Phaser.GameObjects.Text;
  private messageClearAt = 0;

  // backlog 3.8 (issue #29) — the currently-rendered level's real Tiled layout, swapped at
  // every level transition (see `renderLevelArt`). `renderedLevel` starts at 0 (no level is
  // valid at 0) so the very first `startWave(0)` call unconditionally renders Level 1's art.
  private currentLevelTilemap?: Phaser.Tilemaps.Tilemap;
  private currentLevelLayer?: Phaser.Tilemaps.TilemapLayer;
  private renderedLevel = 0;

  constructor() {
    super("SpellroadScene");
  }

  preload(): void {
    this.load.json("spells", "src/data/spells/spells.json");
    this.load.json("waves-level-1", "src/data/waves/level-1.json");
    this.load.json("waves-level-2", "src/data/waves/level-2.json");
    this.load.json("waves-level-3", "src/data/waves/level-3.json");
    this.load.json("waves-level-4", "src/data/waves/level-4.json");
    this.load.json("waves-boss-1", "src/data/waves/boss-1.json");

    // backlog 3.8 (issue #29) — Tilesmith's #28 Tiled layouts + their shared tileset image.
    // Loaded eagerly here, same precedent as the wave JSON above (all 5 levels' worth of data
    // preloaded up front, then switched between at runtime) rather than a mid-scene
    // `this.load.once('complete', ...)` dance — these are 5 small JSON files (~13KB each) plus
    // one already-committed 5KB PNG, not worth the extra dynamic-loading complexity.
    this.load.image(TILESET_IMAGE_KEY, TILESET_IMAGE_URL);
    for (const level of ALL_LEVELS) {
      this.load.tilemapTiledJSON(levelMapKey(level), levelMapUrl(level));
    }
  }

  create(): void {
    this.spells = this.cache.json.get("spells") as SpellDefinition[];
    // Fixed default loadout (see HOTBAR_KEYS/DEFAULT_LOADOUT_IDS comments) — a curated
    // 2-per-weight-class set, not just the first N in file order.
    this.equippedSpells = DEFAULT_LOADOUT_IDS.map((id) => this.spells.find((s) => s.id === id)).filter(
      (s): s is SpellDefinition => s !== undefined
    );
    // backlog 3.3/3.8 — flatten all shipped levels into one sequential wave list; each
    // entry already carries its own `level`/`wave_index`, so no extra bookkeeping needed
    // to walk from Level 1's last wave straight into Level 2's first.
    this.waves = [
      ...(this.cache.json.get("waves-level-1") as WaveDefinition[]),
      ...(this.cache.json.get("waves-level-2") as WaveDefinition[]),
      ...(this.cache.json.get("waves-level-3") as WaveDefinition[]),
      ...(this.cache.json.get("waves-level-4") as WaveDefinition[]),
      ...(this.cache.json.get("waves-boss-1") as WaveDefinition[])
    ];

    this.health = new HealthSystem(
      () => this.handleDeath(),
      () => this.flashMessage("Hit!", 300)
    );
    this.mana = new ManaSystem();
    this.mastery = new MasterySystem();
    this.hexcoin = new HexcoinSystem();
    this.debuff = new DebuffSystem();
    this.caster = new SpellCaster(this.mana, this.mastery);
    // Issue #48 — constructed with the rest of the run's systems so a scene restart gets a
    // clean generation/phase, not one inherited from the previous run.
    this.session = new WaveSession();

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
    // backlog 3.8 (issue #29) — the placeholder colored rectangles this used to draw
    // (a flat ROAD_WIDTH x ROAD_HEIGHT box, two border lines, tick marks every 60px) are gone;
    // `renderLevelArt` (called from `startWave` at every level transition, including the
    // first) now draws each level's real Tiled layout in their place. This background rect is
    // the one placeholder kept on purpose: Tilesmith's #28 maps only paint their own bordered
    // box, not the surrounding canvas (see `tilesmith/log.md`, 2026-08-01 "Backlog 3.7" entry),
    // so something still needs to fill the area outside that box.
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x11131a).setDepth(
      BACKGROUND_DEPTH
    );
  }

  /** backlog 3.8 (issue #29) — swaps in the real Tiled layout for `level` (1-4 regular, 5 =
   * boss arena), replacing whatever level's art was showing before. Idempotent per level
   * (`renderedLevel` guard) so calling this every `startWave()` — including phase-breaks
   * within the same boss fight, which stay on the same level — doesn't tear down and rebuild
   * the same tilemap for no reason. Purely visual: `LANE_RECT`/`ROAD_WIDTH`/`ROAD_HEIGHT`
   * (movement clamping, enemy spawn positioning, spell-preview clipping) are never read from
   * or written by this method. */
  private renderLevelArt(level: number): void {
    if (this.renderedLevel === level) {
      return;
    }
    this.currentLevelLayer?.destroy();
    this.currentLevelTilemap?.destroy();

    const map = this.make.tilemap({ key: levelMapKey(level) });
    const tileset = map.addTilesetImage(TILESET_NAME_IN_MAP, TILESET_IMAGE_KEY);
    if (!tileset) {
      // Shouldn't happen against Tilesmith's #28 files (every one names its embedded tileset
      // identically) — surfaced loudly instead of silently leaving the previous level's art
      // on screen, which would be a confusing, hard-to-notice bug.
      throw new Error(`renderLevelArt: addTilesetImage failed for level ${level} (map key ${levelMapKey(level)})`);
    }
    const offset = computeTilemapOffset({
      canvasWidth: CANVAS_WIDTH,
      laneCenterY: ROAD_TOP + ROAD_HEIGHT / 2,
      mapWidthPx: map.widthInPixels,
      mapHeightPx: map.heightInPixels
    });
    const layer = map.createLayer("Terrain", tileset, offset.x, offset.y);
    layer?.setDepth(TILE_LAYER_DEPTH);

    this.currentLevelTilemap = map;
    this.currentLevelLayer = layer ?? undefined;
    this.renderedLevel = level;
  }

  private createMage(): void {
    this.mage = this.physics.add.sprite(MAGE_START.x, MAGE_START.y, "");
    this.mage.setDisplaySize(32, 32);
    this.mage.setCollideWorldBounds(true);
    this.mage.body.setSize(32, 32);
    this.mage.body.setBoundsRectangle(LANE_RECT);

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

    // Developer feedback (2026-07-27): "the hotbar now contaminates the gameplay screen"
    // — the per-spell shape/weight tags (backlog 2.14) made the top-left HUD block tall
    // enough to overlap the road (ROAD_TOP=190). Given its own dedicated panel below the
    // road instead of stacking under the top stats, where there's no gameplay to cover.
    this.hotbarText = this.add.text(32, ROAD_TOP + ROAD_HEIGHT + 14, "", {
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
    // backlog 2.10 — clip the shape preview to the lane rectangle so line/cone/circle
    // fills never visibly render past the purple guide-rails, regardless of aim angle.
    const laneMaskShape = this.make.graphics({}, false);
    laneMaskShape.fillRect(LANE_RECT.x, LANE_RECT.y, LANE_RECT.width, LANE_RECT.height);
    this.previewGraphics.setMask(laneMaskShape.createGeometryMask());
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

    // backlog 2.10 — non-mouse aiming fallback tracks whether the pointer has genuinely
    // moved this session (past the jitter threshold); until it has, aiming defaults to
    // last-move-direction instead.
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const moved = Phaser.Math.Distance.Between(
        pointer.prevPosition.x,
        pointer.prevPosition.y,
        pointer.position.x,
        pointer.position.y
      );
      if (moved >= POINTER_JITTER_THRESHOLD_PX) {
        this.pointerHasMoved = true;
      }
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.pointerHasMoved = true;
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

    if (velocity.x !== 0 || velocity.y !== 0) {
      this.lastFacing = velocity.clone().normalize();
    }
    velocity.normalize().scale(PLAYER_SPEED * this.debuff.speedMultiplier);
    this.mage.setVelocity(velocity.x, velocity.y);
  }

  // ----- casting -----

  /** backlog 2.10 — where a cast aims: the mouse once it's been touched this session,
   * otherwise (backlog 2.22 / issue #44) the auto-aim target locked in when the current
   * preview started, tracked live so a moving enemy doesn't dodge out of the shape; if
   * no enemy was locked (or it died mid-preview), falls back to the player's last
   * movement direction at a fixed default distance, same as before this feature existed. */
  private currentAimPoint(): { x: number; y: number } {
    if (!this.mage) {
      return { x: 0, y: 0 };
    }
    if (this.pointerHasMoved) {
      return { x: this.input.activePointer.worldX, y: this.input.activePointer.worldY };
    }
    const lockedEnemy = this.livePreviewLockedEnemy();
    if (lockedEnemy) {
      return { x: lockedEnemy.x, y: lockedEnemy.y };
    }
    return {
      x: this.mage.x + this.lastFacing.x * DEFAULT_AIM_DISTANCE,
      y: this.mage.y + this.lastFacing.y * DEFAULT_AIM_DISTANCE
    };
  }

  /** backlog 2.22 / issue #44 — `previewLockedEnemy` if it's still a live enemy, otherwise
   * null (it despawned mid-preview, e.g. killed by something else). Shared by
   * `currentAimPoint` and the highlight-drawing code in `updatePreview` so both agree on
   * "still locked" without duplicating the liveness check. */
  private livePreviewLockedEnemy(): Enemy | null {
    if (this.previewLockedEnemy && this.enemies.includes(this.previewLockedEnemy)) {
      return this.previewLockedEnemy;
    }
    return null;
  }

  private handleHotbarPress(index: number): void {
    if (!this.mage) {
      return;
    }
    const spell = this.equippedSpells[index];
    if (!spell) {
      return;
    }
    if (this.previewSpellId === spell.id) {
      const aim = this.currentAimPoint();
      this.confirmCast(aim.x, aim.y);
      return;
    }
    if (this.caster.isOnCooldown(spell.id)) {
      this.flashMessage(`${spell.id} on cooldown`, 500);
      return;
    }
    this.previewSpellId = spell.id;
    // backlog 2.22 / issue #44 — soft-lock: pick the auto-aim target once, right here,
    // never re-evaluated until this preview confirms or cancels. Only applies to the
    // no-mouse fallback path; a mouse player's own aim is untouched.
    this.previewLockedEnemy = this.pointerHasMoved
      ? null
      : selectAutoAimTarget(this.enemies, this.mage.x, this.mage.y, this.lastFacing.x, this.lastFacing.y);
  }

  private cancelPreview(): void {
    this.previewSpellId = null;
    this.previewLockedEnemy = null;
    this.previewGraphics?.clear();
  }

  private confirmCast(targetX: number, targetY: number): void {
    if (!this.previewSpellId || !this.mage) {
      return;
    }
    const spell = this.spells.find((s) => s.id === this.previewSpellId);
    this.previewSpellId = null;
    this.previewLockedEnemy = null;
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
    let kills = 0;
    for (const enemy of [...this.enemies]) {
      if (hits >= result.maxTargets) {
        break;
      }
      if (!result.hitTest(enemy.x, enemy.y)) {
        continue;
      }
      hits += 1;
      const enemyX = enemy.x;
      const enemyY = enemy.y;
      const killed = enemy.takeDamage(result.power);
      this.spawnDamageNumber(enemyX, enemyY, result.power, enemy.hp, enemy.maxHp);
      if (killed) {
        this.removeEnemy(enemy);
        this.hexcoin.earn(1);
        kills += 1;
      }
    }

    // backlog 0.5, resolved 2026-08-01: gate Mastery progress on a KILL, not any landed
    // hit. Previously this fired whenever `hits > 0`, so a player could farm unlimited
    // Mastery progress by deliberately landing non-lethal hits on one enemy, bounded
    // only by real time, not by level content — see MasterySystem.ts's doc comment and
    // mastery-template.md for the corrected casts-per-tier derivation this required.
    if (kills > 0) {
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
    const aim = this.currentAimPoint();
    const direction = new Phaser.Math.Vector2(aim.x - this.mage.x, aim.y - this.mage.y);
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
        Phaser.Math.Distance.Between(this.mage.x, this.mage.y, aim.x, aim.y),
        SHAPE_GEOMETRY.CIRCLE_MAX_PLACEMENT_RANGE
      );
      const center = new Phaser.Math.Vector2(this.mage.x, this.mage.y).add(
        direction.clone().scale(distance)
      );
      this.previewGraphics.fillCircle(center.x, center.y, SHAPE_GEOMETRY.CIRCLE_RADIUS);
      this.previewGraphics.strokeCircle(center.x, center.y, SHAPE_GEOMETRY.CIRCLE_RADIUS);
    }

    // backlog 2.22 / issue #44 — highlight the auto-aim soft-locked enemy, if any, on top
    // of the shape preview above.
    const lockedEnemy = this.livePreviewLockedEnemy();
    if (lockedEnemy) {
      this.previewGraphics.lineStyle(2, AUTO_AIM_HIGHLIGHT_COLOR, 0.9);
      this.previewGraphics.strokeCircle(lockedEnemy.x, lockedEnemy.y, AUTO_AIM_HIGHLIGHT_RADIUS);
    }
  }

  // ----- enemies / waves -----

  private startWave(index: number): void {
    const wave = this.waves[index];
    if (!wave) {
      // Issue #48 — park the session explicitly instead of relying on the old
      // `enemiesRemainingToSpawn = -1` sentinel still happening to be in place: nothing to
      // advance to, so the auto-advance gate must stay shut for good.
      this.session.markComplete();
      this.flashMessage("Vertical slice complete!", 3000);
      return;
    }
    // Issue #48 — a new wave makes every callback the previous wave/life scheduled stale.
    // Taken before anything else here, so nothing below can be attributed to the old
    // generation, and captured locally for this wave's own spawn timers below.
    const waveGeneration = this.session.beginWave();
    this.waveIndex = index;
    this.renderLevelArt(wave.level);

    // backlog 0.2 (Heckler-fixed 2026-08-01): mark the Hexcoin floor exactly once, the
    // first time this level number is reached — never on a death-retry of the same level,
    // since `wave.level` doesn't increase on a retry. See HexcoinSystem.markLevelStart.
    if (wave.level > this.highestLevelReached) {
      this.highestLevelReached = wave.level;
      this.hexcoin.markLevelStart();
    }

    if (wave.is_boss) {
      if (wave.wave_index === 0) {
        // First phase of the fight: this is the one HP-reset point (hp-template.md's
        // per-wave reset) — later phases in this same fight deliberately do NOT reset,
        // since the boss/trial damage-threat budget is cumulative across phases, which is
        // the entire reason Phase-Transition Recovery exists as a paid mid-fight option.
        const totalPhases = this.waves.filter((w) => w.is_boss && w.level === wave.level).length;
        this.bossMaxRecoveries = Math.min(totalPhases - 2, MAX_RECOVERIES_HARD_CAP);
        this.hexcoin.startBossFight();
        this.health.reset();
        this.flashMessage("Director Trial — Phase 1", 1800);
      } else {
        this.flashMessage(`Director Trial — Phase ${wave.wave_index + 1}`, 1800);
      }
    } else {
      if (wave.wave_index === 0) {
        this.flashMessage(`Level ${wave.level}`, 1500);
      }
      // hp-template.md: "full reset to 100 at the start of every wave" — every regular wave
      // is a clean HP budget, not cumulative damage carried in from the previous one.
      this.health.reset();
    }

    this.debuff.clear();
    this.enemiesRemainingToSpawn = wave.enemies.reduce((sum, e) => sum + e.count, 0);
    spawnWave(
      this,
      wave,
      { x: 820, y: 270 },
      LANE_RECT,
      (enemy) => {
        this.enemies.push(enemy);
        this.enemiesRemainingToSpawn -= 1;
      },
      // Issue #48 — this wave's staggered spawn timers only fire while this wave is still the
      // live one. A death (or any later wave start) takes a new generation, so leftovers from
      // the wave the player died in can no longer spawn into — or decrement the spawn counter
      // of — the wave that replaces it.
      () => this.session.isCurrent(waveGeneration)
    );
  }

  /** backlog 3.4 — offered at every boss phase-break (never at a regular wave's end).
   * Pay `FEE_PHASE_RECOVERY` Hexcoin (from the fight-start-frozen snapshot) to restore
   * `PHASE_RECOVERY_HP_FRACTION` of MAX_HP, or decline and continue at current HP. */
  private startPhaseBreak(nextIndex: number): void {
    // Issue #48 — the phase-break's own pending state is now one of the session's phases
    // rather than a second parallel `awaitingPhaseChoice` boolean that had to be kept in
    // agreement with the `enemiesRemainingToSpawn = -1` sentinel by hand. `generation` is
    // captured (not bumped) so this break's resolution timer stays valid for exactly as long
    // as this boss phase does — a wave-advance elsewhere can never cancel it, and a death
    // during the break always does.
    const phaseGeneration = this.session.generation;
    this.session.beginPhaseChoice();
    const canPay = this.hexcoin.canUsePhaseRecovery(this.bossMaxRecoveries);
    this.flashMessage(
      canPay
        ? `The ledger waits. [Y] Pay ${FEE_PHASE_RECOVERY} Hexcoin -> restore ${Math.round(MAX_HP * PHASE_RECOVERY_HP_FRACTION)} HP  /  [N] Refuse`
        : "Phase clear! No recovery available — press any key to continue.",
      60000
    );
    const resolve = (pay: boolean) => {
      // Guards double-resolution (as the old boolean did) AND a keypress arriving after the
      // player died during the break — `handleDeath` moves the phase to `dead`, so a late Y
      // can no longer buy a recovery for, or advance, a run that's already being restarted.
      if (this.session.phase !== "awaiting-phase-choice") {
        return;
      }
      this.session.beginAdvance();
      this.input.keyboard?.off("keydown-Y", onY);
      this.input.keyboard?.off("keydown-N", onN);
      if (pay && this.hexcoin.usePhaseRecovery(this.bossMaxRecoveries)) {
        this.health.restore(MAX_HP * PHASE_RECOVERY_HP_FRACTION);
        this.flashMessage(`Recovered ${Math.round(MAX_HP * PHASE_RECOVERY_HP_FRACTION)} HP`, 1200);
      }
      this.time.delayedCall(pay ? 1200 : 200, () => {
        if (!this.session.isCurrent(phaseGeneration)) {
          return;
        }
        this.startWave(nextIndex);
      });
    };
    const onY = () => resolve(true);
    const onN = () => resolve(false);
    this.input.keyboard?.once("keydown-Y", onY);
    this.input.keyboard?.once("keydown-N", onN);
  }

  private updateEnemies(deltaMs: number): void {
    if (!this.mage) {
      return;
    }
    // Snapshot before iterating, and skip anything destroyed mid-loop: a melee hit's
    // onMeleeHit callback can synchronously kill the player and run handleDeath(), which
    // destroys every enemy (including ones this loop hasn't reached yet) and reassigns
    // `this.enemies`. Without both guards, the loop's next iteration calls .update() on an
    // already-destroyed enemy whose Arcade body Phaser has nulled, throwing
    // "Cannot read properties of undefined (reading 'setVelocity')" and freezing the game.
    for (const enemy of [...this.enemies]) {
      if (!enemy.active) {
        continue;
      }
      enemy.update(deltaMs, this.mage.x, this.mage.y, {
        onMeleeHit: () => this.health.applyDamage(ARCHETYPE_DAMAGE.melee),
        onRangedFire: (fromX, fromY, toX, toY) => {
          // Developer feedback (2026-07-27): no way to tell a non-melee hit is coming.
          // `EnemyCallbacks` already carried the shot's start/end coordinates — the scene
          // just never drew anything with them. Visible travel time doubles as the dodge
          // window the competent-play damage-threat model already assumes exists.
          this.spawnRangedProjectile(fromX, fromY, toX, toY);
          // Issue #47 fix: the delayed callback previously applied damage unconditionally,
          // with nothing backing the visible travel tween above — dodging during the
          // window could never actually avoid the hit. Recheck the player's live position
          // against the point the shot was fired at (`toX`/`toY`, the mage's position at
          // fire time) once the shot actually arrives; only apply damage if still in range.
          // Issue #48: tagged with the firing wave's generation too. The shooter belongs to
          // this wave/life; if the player dies (or the wave is replaced) during the 450ms
          // travel window, the shot must not land on the respawned mage — that phantom hit is
          // the same "timer outlives the world that scheduled it" class of bug as the wave
          // race itself, reachable from the exact same playtest.
          const fireGeneration = this.session.generation;
          this.time.delayedCall(RANGED_TRAVEL_MS, () => {
            if (!this.mage || !this.session.isCurrent(fireGeneration)) {
              return;
            }
            if (isStillInRangedImpactZone(this.mage.x, this.mage.y, toX, toY)) {
              this.health.applyDamage(ARCHETYPE_DAMAGE.ranged);
            }
          });
        },
        onDebuffPulse: (variant) => {
          this.spawnDebuffPulse(enemy.x, enemy.y, variant);
          this.debuff.applyStack(variant);
        }
      });
    }

    // Issue #48 — gated on the session phase, not on the counters alone. The old condition
    // (`enemiesRemainingToSpawn === 0 && enemies.length === 0`, guarded by a `-1` sentinel)
    // is *exactly* the state `handleDeath` creates when it clears the field, so every death
    // used to schedule a bonus wave-advance that fired 300ms before the death restart did.
    if (shouldAutoAdvance(this.session.phase, this.enemiesRemainingToSpawn, this.enemies.length)) {
      const advanceGeneration = this.session.generation;
      this.session.beginAdvance(); // replaces the old `enemiesRemainingToSpawn = -1` sentinel
      const wave = this.waves[this.waveIndex];
      const next = this.waves[this.waveIndex + 1];
      const nextIndex = this.waveIndex + 1;
      if (wave?.is_boss && next?.is_boss && next.level === wave.level) {
        // Another phase of the same boss follows: offer the paid recovery choice instead
        // of auto-advancing — this is the phase-break, not a regular wave transition.
        this.startPhaseBreak(nextIndex);
        return;
      }
      if (wave?.is_boss) {
        // Last phase of the boss just cleared.
        this.hexcoin.endBossFight();
        this.flashMessage("Director Trial — Victory!", 2500);
      }
      this.time.delayedCall(1200, () => {
        // If the player died during this 1200ms gap (a ranged shot already in flight when the
        // last enemy fell can still land), `handleDeath` has taken a new generation and this
        // advance is void — the death restart owns what happens next.
        if (!this.session.isCurrent(advanceGeneration)) {
          return;
        }
        this.startWave(nextIndex);
      });
    }
  }

  private removeEnemy(enemy: Enemy): void {
    this.enemies = this.enemies.filter((e) => e !== enemy);
    enemy.destroy();
  }

  /** backlog 2.9: a landed hit previously produced zero visible signal. Floating number
   * shows the damage dealt; its color bands the target's remaining HP% (>80% green,
   * 30-80% yellow, <30% red) rather than a per-enemy HP bar, per the developer's call
   * that stacked bars would clash when enemies overlap. */
  private spawnDamageNumber(x: number, y: number, amount: number, remainingHp: number, maxHp: number): void {
    const percent = Math.max(0, remainingHp) / maxHp;
    const color =
      percent > 0.8 ? DAMAGE_NUMBER_COLOR.healthy : percent > 0.3 ? DAMAGE_NUMBER_COLOR.wounded : DAMAGE_NUMBER_COLOR.critical;
    const label = this.add.text(x, y - 14, `-${amount}`, {
      color,
      fontFamily: "Georgia, serif",
      fontStyle: "bold",
      fontSize: "18px"
    });
    label.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: label,
      y: y - 44,
      alpha: 0,
      duration: 700,
      ease: "Cubic.Out",
      onComplete: () => label.destroy()
    });
  }

  /** backlog 2.13 — a ranged shot previously applied delayed damage with zero visible
   * warning (the enemy-side fire coordinates existed in `EnemyCallbacks` but the scene
   * never drew anything with them). A small dot tweens from the shooter to the target over
   * the same `RANGED_TRAVEL_MS` window the damage delay already uses, so the shot's arrival
   * and its visible travel are the same event, not two disconnected timers. */
  private spawnRangedProjectile(fromX: number, fromY: number, toX: number, toY: number): void {
    // Developer feedback (2026-07-27): the first version (radius 4, the same amber as the
    // Ranged archetype's own sprite) wasn't actually noticed in play. Bigger, a color that
    // doesn't match any enemy body, a thin contrasting outline, and forced above every
    // other game object via depth (nothing else in the scene sets one, so equal-depth
    // insertion order should already have put this on top — setting it explicitly rules
    // that out as a cause rather than assuming it wasn't the problem).
    const dot = this.add.circle(fromX, fromY, 7, 0xff3b3b);
    dot.setStrokeStyle(2, 0xffffff, 0.9);
    dot.setDepth(1000);
    this.tweens.add({
      targets: dot,
      x: toX,
      y: toY,
      duration: RANGED_TRAVEL_MS,
      ease: "Linear",
      onComplete: () => dot.destroy()
    });
  }

  /** backlog 2.13 — a Debuffer's pulse previously applied its stack with zero visible
   * signal at all (unlike melee/ranged, it has no HP consequence, so nothing else hinted a
   * debuff had just landed). A brief expanding ring at the Debuffer, tinted by variant. */
  private spawnDebuffPulse(x: number, y: number, variant: DebuffVariant): void {
    const color = variant === "speed" ? 0x6f4fa8 : 0x4fa8a3;
    const ring = this.add.circle(x, y, 6, color, 0);
    ring.setStrokeStyle(2, color, 0.9);
    this.tweens.add({
      targets: ring,
      radius: 30,
      alpha: 0,
      duration: 500,
      ease: "Cubic.Out",
      onUpdate: () => ring.setStrokeStyle(2, color, ring.alpha),
      onComplete: () => ring.destroy()
    });
  }

  // ----- death -----

  private handleDeath(): void {
    // Issue #48 — taken first, before any state is cleared: from this line on, every callback
    // scheduled by the wave the player just died in (its remaining staggered spawn timers, a
    // wave-advance that may already be pending from having cleared it, a boss phase-break
    // resolution, an archer's in-flight impact) is stale and will no-op when it fires. Nothing
    // is force-cancelled, so unrelated pending timers are untouched.
    const deathGeneration = this.session.beginDeath();
    const equipped = this.equippedSpells.map((s) => s.id);
    const affected = this.mastery.applyRandomDeathPenalty(equipped);
    this.flashMessage(
      affected ? `Died — ${affected} lost a Mastery tier` : "Died — no Mastery lost; the Road grades what you've grown",
      2500
    );

    // Checkpoint/respawn placement (backlog item 0.2, resolved 2026-08-01 by the
    // developer): a death respawns at the first wave of the CURRENT level, not the
    // absolute start of the run, and waves replayed on that retry re-award Hexcoin —
    // nothing here suppresses that, `confirmCast`'s `hexcoin.earn(1)` fires on every
    // kill unconditionally.
    //
    // Heckler's critique of the first version of this fix (2026-08-01) found a real
    // BLOCKING bug: calling `resetExpedition()` (zero the balance) on every death,
    // combined with forward-only progression, permanently locks a player out of Fee 2
    // (30 Hexcoin) the moment they die in or after Level 4 — that level's own kill
    // budget (25) is below the fee, and forward-only means earlier levels' already-
    // banked income can never be re-earned to cover the gap. Fixed by rolling back to
    // this level's own starting balance instead of zero (`rollbackToLevelStart`) — this
    // undoes only the failed attempt's partial gains, never Hexcoin already banked from
    // levels actually cleared, while still bounding what a single retry can add (capped
    // by that level's own kill count, same intent the zero-reset was reaching for).
    this.enemies.forEach((e) => e.destroy());
    this.enemies = [];
    this.enemiesRemainingToSpawn = 0;
    this.health.reset();
    this.mana.reset();
    this.debuff.clear();
    this.mage?.setPosition(MAGE_START.x, MAGE_START.y);
    this.hexcoin.rollbackToLevelStart();
    const currentLevel = this.waves[this.waveIndex]?.level;
    const levelStartIndex = this.waves.findIndex((w) => w.level === currentLevel);
    this.time.delayedCall(1500, () => {
      // A second death can't happen during this window (HP is already back at full and every
      // enemy is destroyed), but check anyway rather than assume: if anything did take a newer
      // generation, that transition owns the restart, not this one.
      if (!this.session.isCurrent(deathGeneration)) {
        return;
      }
      this.startWave(levelStartIndex >= 0 ? levelStartIndex : 0);
    });
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
    const currentWave = this.waves[this.waveIndex];
    const waveLine = currentWave
      ? `Level ${currentWave.level}, Wave ${currentWave.wave_index + 1}  (enemies: ${this.enemies.length})`
      : `Wave  ${this.waveIndex + 1}/${this.waves.length}  (enemies: ${this.enemies.length})`;
    // Developer feedback (2026-07-27): "unclear when i should use which spell" — the
    // hotbar showed only each spell's raw id, which doesn't self-describe its shape/weight
    // (e.g. "arc_lance" gives no hint it's a single-target line). Surfacing shape+weight
    // directly is the cheapest legibility fix available without a fuller tooltip/icon
    // system (future work, not this fix).
    const hotbarLine = this.equippedSpells
      .map((spell, index) => {
        const tier: MasteryTier = this.mastery.getTier(spell.id);
        const cooldown = this.caster.cooldownRemaining(spell.id);
        const cdLabel = cooldown > 0 ? `${(cooldown / 1000).toFixed(1)}s` : "ready";
        return `[${index + 1}] ${spell.id} [${spell.shape}/${spell.weight}] (${tier}, ${cdLabel})`;
      })
      .join("\n");

    this.hudText.setText([hpLine, manaLine, hexLine, waveLine].join("\n"));
    this.hotbarText?.setText(["Hotbar:", hotbarLine].join("\n"));
  }
}
