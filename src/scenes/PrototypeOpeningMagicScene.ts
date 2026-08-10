import Phaser from "phaser";
import type { SpellDefinition } from "../data/types";
import spellsData from "../data/spells/spells.json";
import { PrototypeVariantSwitcher } from "../dev/prototypeHarness";
import {
  OPENING_MAGIC_TREATMENTS,
  resolveOpeningMagicTreatmentAssets,
  type OpeningMagicTreatment,
  type TreatmentAssets
} from "../dev/openingMagicTreatments";
import { SHAPE_GEOMETRY } from "../entities/SpellCaster";
import {
  TILESET_IMAGE_KEY,
  TILESET_IMAGE_URL,
  TILESET_NAME_IN_MAP,
  computeTilemapOffset,
  levelMapKey,
  levelMapUrl
} from "../systems/levelArt";

/**
 * THROWAWAY PROTOTYPE — issue #128 ("Prototype 1: audition Arcane Momentum treatments in
 * Level 1", epic #124). Reached via `?prototype=openingmagic` (see `main.ts`). Delete this
 * file and the `main.ts` registry entry once the developer records a verdict and #125 (real
 * Level 1 application) takes over — per `docs/eng-skills/prototype-harness.md`'s capture-then-
 * cleanup convention.
 *
 * Reuses the real production Level 1 tilemap/canvas/geometry (`src/systems/levelArt.ts`, same
 * pattern `SpellroadScene.ts` and the resolved `PrototypeRoadFeelScene` both used) and issue
 * #68's resolved B+C road-feel verdict (a discoverable one-time side-pocket pair plus a
 * repeatable reactive shrine, adapted from `prototype/road-feel-68`'s
 * `src/scenes/PrototypeRoadFeelScene.ts`) as the fixed baseline every treatment shares.
 *
 * `1`/`2`/`3` (via `PrototypeVariantSwitcher`) switch between the three Runes Awake
 * presentation treatments (`openingMagicTreatments.ts`); `Space` casts the identical showcase
 * spell (`flame_sweep`, from `src/data/spells/spells.json`) using whichever treatment is
 * currently active. Switching a treatment only swaps textures/audio on already-existing
 * GameObjects — it never resets player position, the side-pocket/shrine consumed/active state,
 * or the hexcoin stub counter, per the ticket's own "don't change gameplay state/timing"
 * requirement.
 */

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const ROAD_TOP = 130;
const ROAD_HEIGHT = 280;
const ROAD_LEFT = 0;
const ROAD_WIDTH = 960;
const LANE_RECT = new Phaser.Geom.Rectangle(ROAD_LEFT, ROAD_TOP, ROAD_WIDTH, ROAD_HEIGHT);
const MAGE_START = { x: 180, y: 270 };
const PLAYER_SPEED = 180;
const PROTOTYPE_LEVEL = 1;
const SHOWCASE_SPELL_ID = "flame_sweep";

const TREATMENT_LABELS: Record<OpeningMagicTreatment, string> = {
  "cc0-remix": "1 - CC0 Remix",
  "deterministic-original": "2 - Deterministic Original",
  hybrid: "3 - Hybrid (expected winner)"
};

/** Mirrors `Enemy.ts`'s own `ARCHETYPE_COLOR` (not imported — that constant is module-private
 * and this prototype's enemies are deliberately static decoration, not real `Enemy` instances;
 * duplicating 3 hex colors is cheaper than widening Enemy.ts's exported surface for a throwaway
 * scene). Kept in visual sync by inspection, not by import, since neither file is expected to
 * change during this ticket. */
const STATIC_ENEMY_ARCHETYPES: { archetype: string; color: number; x: number; y: number }[] = [
  { archetype: "Melee", color: 0xb1443e, x: 560, y: ROAD_TOP + 60 },
  { archetype: "Ranged", color: 0xd8a53d, x: 700, y: ROAD_TOP + ROAD_HEIGHT - 60 },
  { archetype: "Debuffer", color: 0x6f4fa8, x: 830, y: ROAD_TOP + ROAD_HEIGHT / 2 }
];

/** Issue #68's B ("discoverable side-pocket") — walk in once, get a one-time lore line + a
 * stub Hexcoin reward, then the marker greys out for the rest of the session. A simple numeric
 * counter stands in for the real `HexcoinSystem` (issue #68's own resolution deferred full
 * economy integration to a separate follow-up ticket; this audition scene is about
 * presentation, not the economy). */
interface SidePocket {
  sprite: Phaser.GameObjects.Image;
  consumed: boolean;
  lore: string;
  reward: number;
  x: number;
  y: number;
}

export class PrototypeOpeningMagicScene extends Phaser.Scene {
  private mage!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private cursors!: Record<"w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;
  private lastFacing = new Phaser.Math.Vector2(1, 0);

  private spells: SpellDefinition[] = [];
  private showcaseSpell!: SpellDefinition;

  private currentTreatment: OpeningMagicTreatment = OPENING_MAGIC_TREATMENTS[0];
  private currentAssets!: TreatmentAssets;
  private activeAudio?: Phaser.Sound.BaseSound;
  private audioStatusText!: Phaser.GameObjects.Text;

  private sidePockets: SidePocket[] = [];
  private shrineSprite!: Phaser.GameObjects.Image;
  private shrineActive = false;
  private hexcoinCount = 0;
  private hexcoinLabel!: Phaser.GameObjects.Text;
  private popupText?: Phaser.GameObjects.Text;
  private popupTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super("PrototypeOpeningMagicScene");
  }

  preload(): void {
    this.load.image(TILESET_IMAGE_KEY, TILESET_IMAGE_URL);
    this.load.tilemapTiledJSON(levelMapKey(PROTOTYPE_LEVEL), levelMapUrl(PROTOTYPE_LEVEL));
    // See SpellroadScene.preload's comment: a raw `src/data/...` load URL 404s in a production
    // build, so this is bundled as a direct import instead.
    this.cache.json.add("spells", spellsData);

    // Preload all 3 treatments' assets up front (not lazily on switch) so the comparison in
    // one Docker-run session is instant/clean, matching the design spec's acceptance
    // criterion ("compare all three treatments in one session"). De-duplicated by cache key
    // first (Hybrid reuses Deterministic Original's exact keys) so a shared file is never
    // queued twice.
    const images = new Map<string, string>();
    const atlases = new Map<string, { url: string; frameWidth: number; frameHeight: number }>();
    const audio = new Map<string, string>();

    for (const treatment of OPENING_MAGIC_TREATMENTS) {
      const assets = resolveOpeningMagicTreatmentAssets(treatment);
      for (const glyph of Object.values(assets.glyphs)) images.set(glyph.key, glyph.url);
      for (const atlas of [assets.vfx.cast, assets.vfx.impact, assets.vfx.trail]) {
        atlases.set(atlas.key, { url: atlas.url, frameWidth: atlas.frameWidth, frameHeight: atlas.frameHeight });
      }
      if (assets.music) audio.set(assets.music.key, assets.music.url);
      if (assets.ambience) audio.set(assets.ambience.key, assets.ambience.url);
    }

    images.forEach((url, key) => this.load.image(key, url));
    atlases.forEach((atlas, key) => this.load.spritesheet(key, atlas.url, atlas));
    audio.forEach((url, key) => this.load.audio(key, url));
  }

  create(): void {
    this.spells = this.cache.json.get("spells") as SpellDefinition[];
    const showcase = this.spells.find((spell) => spell.id === SHOWCASE_SPELL_ID);
    if (!showcase) {
      throw new Error(`PrototypeOpeningMagicScene: showcase spell "${SHOWCASE_SPELL_ID}" not found in spells.json`);
    }
    this.showcaseSpell = showcase;

    this.createRoad();
    this.createMage();
    this.createStaticEnemies();
    this.createSidePocketsAndShrine();
    this.createAnimations();
    this.createHud();
    this.createInput();

    // Cleanly stop any playing music/ambience if this scene is ever torn down (matches
    // SpellroadScene's own boss-theme shutdown safety net).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.activeAudio?.stop();
      this.activeAudio?.destroy();
    });

    // Constructing the switcher immediately calls onChange with the first variant
    // ("cc0-remix"), which is what actually starts audio and sets initial glyph textures.
    new PrototypeVariantSwitcher({
      scene: this,
      variants: OPENING_MAGIC_TREATMENTS,
      labels: TREATMENT_LABELS,
      onChange: (treatment) => this.setTreatment(treatment)
    });
  }

  update(): void {
    this.handleMovement();
    this.updateSidePockets();
    this.updateShrine();
  }

  // ----- setup -----

  private createRoad(): void {
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x11131a).setDepth(-100);
    const map = this.make.tilemap({ key: levelMapKey(PROTOTYPE_LEVEL) });
    const tileset = map.addTilesetImage(TILESET_NAME_IN_MAP, TILESET_IMAGE_KEY);
    if (!tileset) {
      throw new Error("PrototypeOpeningMagicScene: addTilesetImage failed for Level 1's production tileset");
    }
    const offset = computeTilemapOffset({
      canvasWidth: CANVAS_WIDTH,
      laneCenterY: ROAD_TOP + ROAD_HEIGHT / 2,
      mapWidthPx: map.widthInPixels,
      mapHeightPx: map.heightInPixels
    });
    const layer = map.createLayer("Terrain", tileset, offset.x, offset.y);
    layer?.setDepth(-50);
  }

  private createMage(): void {
    this.mage = this.physics.add.sprite(MAGE_START.x, MAGE_START.y, "");
    this.mage.setDisplaySize(32, 32);
    this.mage.body.setSize(32, 32);
    this.mage.body.setBoundsRectangle(LANE_RECT);
    this.mage.setCollideWorldBounds(true);

    const graphics = this.add.graphics();
    graphics.fillStyle(0xd9c27f, 1);
    graphics.fillCircle(16, 16, 16);
    graphics.lineStyle(3, 0x4b3f72, 1);
    graphics.strokeCircle(16, 16, 13);
    graphics.generateTexture("openingmagic-mage-placeholder", 32, 32);
    graphics.destroy();
    this.mage.setTexture("openingmagic-mage-placeholder");
  }

  /** Stable, non-moving enemy silhouettes — per the design brief, "every audition treatment
   * uses identical movement, enemy silhouettes, spell timing, and one showcase cast" (they are
   * NOT treatment-owned, so `setTreatment` never touches them). No AI/combat: this ticket's
   * own non-goals explicitly exclude combat/economy redesign, and the audition question is
   * about presentation, not whether enemies are fought. */
  private createStaticEnemies(): void {
    for (const enemy of STATIC_ENEMY_ARCHETYPES) {
      const g = this.add.graphics();
      g.fillStyle(enemy.color, 1);
      g.fillRoundedRect(0, 0, 26, 26, 6);
      const key = `openingmagic-enemy-${enemy.archetype.toLowerCase()}`;
      g.generateTexture(key, 26, 26);
      g.destroy();
      this.add.image(enemy.x, enemy.y, key).setDepth(2);
      this.add
        .text(enemy.x, enemy.y - 20, enemy.archetype, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#f3e7c2"
        })
        .setOrigin(0.5, 1)
        .setDepth(2);
    }
  }

  /** Issue #68's resolved B+C verdict, adapted from `prototype/road-feel-68`'s
   * `PrototypeRoadFeelScene.buildVariantB`/`buildVariantC`. Fixed for the whole session
   * (never switched, unlike the 3 treatments) — this IS the common baseline every treatment
   * sits on top of. Uses the initial treatment's glyph textures as the marker art;
   * `setTreatment` re-textures these same sprites in place on every switch.
   *
   * Array order here is load-bearing: `setTreatment` re-textures `sidePockets[0]` with the
   * gold glyph and `sidePockets[1]` with violet by index, not by name — reordering this array
   * silently swaps which pocket gets which color. */
  private createSidePocketsAndShrine(): void {
    const pocketDefs = [
      { x: 90, y: ROAD_TOP + 24, lore: "A cracked rune, half-buried. It still hums faintly.", reward: 5 }, // index 0 -> gold glyph, see setTreatment
      { x: 860, y: ROAD_TOP + ROAD_HEIGHT - 24, lore: "Someone left a stash here, long ago.", reward: 8 } // index 1 -> violet glyph, see setTreatment
    ];
    this.sidePockets = pocketDefs.map((def) => {
      const sprite = this.add.image(def.x, def.y, "").setDisplaySize(24, 24).setDepth(3);
      this.tweens.add({ targets: sprite, scale: 1.15, duration: 500, yoyo: true, repeat: -1 });
      return { sprite, consumed: false, lore: def.lore, reward: def.reward, x: def.x, y: def.y };
    });

    this.shrineSprite = this.add.image(500, ROAD_TOP + 24, "").setDisplaySize(40, 40).setDepth(3).setAlpha(0.5);

    this.hexcoinLabel = this.add
      .text(12, 12, "", { fontFamily: "monospace", fontSize: "13px", color: "#f4d35e" })
      .setDepth(100);
  }

  /** One `play`-once animation per unique VFX atlas key actually loaded (Hybrid shares
   * Deterministic Original's keys, so this naturally covers it too without a duplicate
   * `anims.create` call, which Phaser would otherwise reject). */
  private createAnimations(): void {
    const seen = new Set<string>();
    for (const treatment of OPENING_MAGIC_TREATMENTS) {
      const assets = resolveOpeningMagicTreatmentAssets(treatment);
      for (const atlas of [assets.vfx.cast, assets.vfx.impact, assets.vfx.trail]) {
        if (seen.has(atlas.key)) continue;
        seen.add(atlas.key);
        this.anims.create({
          key: `${atlas.key}-play`,
          frames: this.anims.generateFrameNumbers(atlas.key, { start: 0, end: atlas.frameCount - 1 }),
          frameRate: 16,
          repeat: 0
        });
      }
    }
  }

  private createHud(): void {
    this.add
      .text(16, 16, "Opening Magic Audition Lab — prototype #128", {
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        color: "#f3e7c2"
      })
      .setDepth(100);
    this.add
      .text(16, 40, "WASD move · Space = cast flame_sweep · 1/2/3 = switch treatment", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#9fb0d8"
      })
      .setDepth(100);
    this.audioStatusText = this.add
      .text(16, 60, "", { fontFamily: "monospace", fontSize: "12px", color: "#c9a7f0" })
      .setDepth(100);
  }

  private createInput(): void {
    const keyboard = this.input.keyboard!;
    this.cursors = {
      w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    keyboard.on("keydown-SPACE", () => this.castShowcaseSpell());
  }

  // ----- per-frame -----

  private handleMovement(): void {
    const body = this.mage.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;
    if (this.cursors.a.isDown) vx -= 1;
    if (this.cursors.d.isDown) vx += 1;
    if (this.cursors.w.isDown) vy -= 1;
    if (this.cursors.s.isDown) vy += 1;
    if (vx !== 0 || vy !== 0) {
      this.lastFacing.set(vx, vy).normalize();
    }
    const magnitude = Math.hypot(vx, vy) || 1;
    body.setVelocity((vx / magnitude) * PLAYER_SPEED, (vy / magnitude) * PLAYER_SPEED);
  }

  private updateSidePockets(): void {
    for (const pocket of this.sidePockets) {
      if (pocket.consumed) continue;
      const distance = Phaser.Math.Distance.Between(this.mage.x, this.mage.y, pocket.x, pocket.y);
      if (distance < 18) {
        pocket.consumed = true;
        pocket.sprite.setTint(0x555555);
        this.tweens.killTweensOf(pocket.sprite);
        this.hexcoinCount += pocket.reward;
        this.hexcoinLabel.setText(`Hexcoin +${pocket.reward} (total this run: ${this.hexcoinCount})`);
        this.showPopup(pocket.lore);
      }
    }
  }

  private updateShrine(): void {
    const distance = Phaser.Math.Distance.Between(this.mage.x, this.mage.y, this.shrineSprite.x, this.shrineSprite.y);
    const near = distance < 60;
    if (near && !this.shrineActive) {
      this.shrineActive = true;
      this.shrineSprite.setAlpha(1);
      this.showPopup("The old wards still hum here.", false);
    } else if (!near && this.shrineActive) {
      this.shrineActive = false;
      this.shrineSprite.setAlpha(0.5);
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

  // ----- treatment switching -----

  /** Swaps every treatment-owned visual/audio layer in place. Deliberately does NOT touch:
   * mage position/velocity, the static enemy silhouettes, `sidePockets[*].consumed`,
   * `shrineActive`, or `hexcoinCount` — per the ticket's "switch cleanly without changing
   * gameplay state/timing" requirement. */
  private setTreatment(treatment: OpeningMagicTreatment): void {
    this.currentTreatment = treatment;
    this.currentAssets = resolveOpeningMagicTreatmentAssets(treatment);

    // Re-texture the side-pockets/shrine in place (state untouched) — consumed pockets stay
    // tinted grey (setTint above survives a setTexture call) and the shrine keeps its current
    // active/inactive alpha.
    this.sidePockets[0]?.sprite.setTexture(this.currentAssets.glyphs.gold.key);
    this.sidePockets[1]?.sprite.setTexture(this.currentAssets.glyphs.violet.key);
    this.shrineSprite.setTexture(this.currentAssets.glyphs.cyan.key);

    this.swapAudio(this.currentAssets);
  }

  /** Stops whatever was playing before starting the new treatment's track, so switching never
   * overlaps two loops or leaks a still-playing instance — the ticket's explicit "stop any
   * playing music/ambience before starting the new treatment's" requirement. CC0 Remix has no
   * dedicated music track (a known, disclosed gap, not a bug): falls back to its ambience bed,
   * so the scene is never silent by accident, only by that treatment's own documented gap if a
   * future treatment genuinely ships neither. */
  private swapAudio(assets: TreatmentAssets): void {
    this.activeAudio?.stop();
    this.activeAudio?.destroy();
    this.activeAudio = undefined;

    const track = assets.music ?? assets.ambience;
    if (track) {
      this.activeAudio = this.sound.add(track.key, { loop: true, volume: 0.35 });
      this.activeAudio.play();
    }

    const musicNote = assets.music
      ? "music loop"
      : assets.ambience
        ? "no dedicated music track — ambience bed only (documented gap, see docs/agents/ana/log.md 2026-08-09)"
        : "silent — no music or ambience asset";
    this.audioStatusText.setText(`Audio: ${musicNote}`);
  }

  // ----- showcase spell -----

  /** Fires the identical `flame_sweep` cone cast in every treatment, textured with whichever
   * treatment is currently active (`this.currentAssets`). Presentation-only: no real hit
   * detection against the static enemy silhouettes (this ticket's non-goals explicitly exclude
   * combat/economy redesign) — the impact bursts land at fixed points inside the cone geometry,
   * matching `flame_sweep`'s own `base_targets: 2`. */
  private castShowcaseSpell(): void {
    if (!this.currentAssets) return;
    const facing = this.lastFacing.clone();
    if (facing.length() === 0) facing.set(1, 0);
    const angle = Math.atan2(facing.y, facing.x);

    this.drawConeGuide(angle);

    const castSprite = this.add.sprite(this.mage.x, this.mage.y, this.currentAssets.vfx.cast.key);
    castSprite.setRotation(angle);
    castSprite.setDepth(50);
    castSprite.play(`${this.currentAssets.vfx.cast.key}-play`);
    castSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => castSprite.destroy());

    const travelDistance = SHAPE_GEOMETRY.CONE_RADIUS * 0.7;
    const trailTarget = new Phaser.Math.Vector2(this.mage.x, this.mage.y).add(facing.clone().scale(travelDistance));
    const trailSprite = this.add.sprite(this.mage.x, this.mage.y, this.currentAssets.vfx.trail.key);
    trailSprite.setRotation(angle);
    trailSprite.setDepth(49);
    trailSprite.play(`${this.currentAssets.vfx.trail.key}-play`);
    this.tweens.add({
      targets: trailSprite,
      x: trailTarget.x,
      y: trailTarget.y,
      duration: 260,
      ease: "Linear",
      onComplete: () => trailSprite.destroy()
    });

    // flame_sweep's base_targets is 2 — two impact bursts inside the cone, fired after the
    // trail's travel window so the sweep reads as landing rather than instant.
    const impactOffsets = [0.55, 0.85];
    for (const fraction of impactOffsets) {
      const point = new Phaser.Math.Vector2(this.mage.x, this.mage.y).add(
        facing.clone().scale(SHAPE_GEOMETRY.CONE_RADIUS * fraction)
      );
      this.time.delayedCall(260, () => {
        const impact = this.add.sprite(point.x, point.y, this.currentAssets.vfx.impact.key);
        impact.setDepth(51);
        impact.play(`${this.currentAssets.vfx.impact.key}-play`);
        impact.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => impact.destroy());
      });
    }
  }

  /** A translucent cone-shape guide (same geometry `SpellroadScene.traceAoEShape` uses for
   * `flame_sweep`'s "cone" shape) so the spell's actual reach is legible underneath the VFX
   * sprites, not just implied by them. */
  private drawConeGuide(angle: number): void {
    const half = Phaser.Math.DegToRad(SHAPE_GEOMETRY.CONE_HALF_ANGLE_DEG);
    const guide = this.add.graphics().setDepth(48);
    guide.fillStyle(0xff6b3d, 0.25);
    guide.lineStyle(2, 0xff6b3d, 0.6);
    guide.slice(this.mage.x, this.mage.y, SHAPE_GEOMETRY.CONE_RADIUS, angle - half, angle + half, false);
    guide.fillPath();
    guide.strokePath();
    this.tweens.add({
      targets: guide,
      alpha: 0,
      duration: 260,
      ease: "Cubic.Out",
      onComplete: () => guide.destroy()
    });
  }
}
