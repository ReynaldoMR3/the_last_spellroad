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
import { WaveSession, canResolvePhaseChoice, shouldAutoAdvance } from "../systems/waveSession";
import { hasRecentPointerActivity } from "../systems/pointerActivity";
import {
  computeCooldownDisplay,
  computeHotbarSlotRects,
  formatShapeWeightTag,
  type HotbarSlotRect
} from "../systems/hotbarLayout";
import {
  ALL_LEVELS,
  TILESET_IMAGE_KEY,
  TILESET_IMAGE_URL,
  TILESET_NAME_IN_MAP,
  computeTilemapOffset,
  levelMapKey,
  levelMapUrl
} from "../systems/levelArt";
import { SPELL_ICON_ELEMENTS, iconKeyForSpell, spellIconKey, spellIconUrl } from "../systems/spellIcons";

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
/** Widened 90/780 -> 0/960 (2026-08-02, backlog 2.27 / issue #53: developer playtest —
 * "boundaries on the right and left side of the road are not clear... you get stuck before
 * reaching the end"). The road art (`computeTilemapOffset`, `src/systems/levelArt.ts`)
 * always rendered across the full 960px canvas width; the walkable lane was only 780px
 * centered in that same space, leaving a 90px strip on each side that looked walkable but
 * wasn't. Widened the lane to match the art (matches CANVAS_WIDTH below; kept as a literal
 * here rather than reading CANVAS_WIDTH, which is declared later in this file) rather than
 * shrinking the art, per the same precedent backlog 2.17/2.21 set for the lane's height —
 * an unwalkable strip that reads as road is strictly worse than a slightly generous walkable
 * area. See the retuned enemy constants in `Enemy.ts` (`RANGED_PREFERRED_RANGE`,
 * `DEBUFFER_PREFERRED_RANGE`, `WALL_SLIDE_MARGIN`) and the enemy spawn point below for what
 * this widening required re-checking. */
const ROAD_LEFT = 0;
const ROAD_WIDTH = 960;
const MAGE_START = { x: 180, y: 270 };
/** backlog 2.27 / issue #53 — enemy spawn point's x-coordinate, retuned 820 -> 910 to
 * preserve the exact relationship the old value had to the lane's right wall: 820 sat
 * precisely `WALL_SLIDE_MARGIN` (50, `Enemy.ts`) px inside the old right wall at 870
 * (870 - 50 = 820) — not a coincidence, the original spawn point was deliberately placed
 * just inside the wall-slide zone. `ROAD_LEFT + ROAD_WIDTH` (the new right wall, 960)
 * minus that same 50px margin keeps that invariant true at the new width (960 - 50 = 910),
 * so spawned enemies land in the same relative spot along the lane's far wall as before,
 * just at the new width. `WaveLoader.spawnWave`'s own +/-40/+/-30px spawn jitter still
 * can't push a spawn past the wall (40 < 50 margin), matching the same slack the old
 * numbers left (870 - (820+40) = 10px), so this isn't a new source of clamp-on-spawn. */
const ENEMY_SPAWN_X = 910;
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
/** backlog 2.29 / issue #55 — the hotbar used to be a "Hotbar:" header plus one 14px text
 * line per equipped spell (7 lines total) starting at `ROAD_TOP + ROAD_HEIGHT + 14` = 424 with
 * the road at its current 130/280 — 7 lines at ~18px each run to ~550px, past the 540px-tall
 * canvas (`main.ts`), clipping spell 6's line. Redesigned as a horizontal single row of
 * fixed-size slot rectangles (`computeHotbarSlotRects`, hotbarLayout.ts) below the road instead
 * — one row's height, not 7 lines', and each slot is a distinct rendered region a future spell
 * icon (backlog 2.30 / issue #56, Tilesmith) can be drawn into or behind. `HOTBAR_TOP_MARGIN`
 * keeps the same 14px breathing room below the road the old block used. See `createHud` for
 * the fits-within-canvas arithmetic this ticket's own instructions require re-verifying:
 * 130 + 280 + 14 + 96 = 520, comfortably under 540. */
const HOTBAR_TOP_MARGIN = 14;
const HOTBAR_SLOT_HEIGHT = 96;
const HOTBAR_SLOT_GAP = 8;
const HOTBAR_TEXT_PADDING = 6;
/** Heckler 2026-08-02 (7), BLOCKING follow-up — Tilesmith's icon (backlog 2.30 / issue #56)
 * shrank each slot's text budget from ~144px to ~88px (`hotbarTextLeft`, below) without
 * re-checking the longest label against it, so `thunder_dome`'s `[circle/standard]` tag (17
 * characters) bled past its own slot border every load, in the default loadout. Fixed two ways,
 * not one, so the margin is real rather than a hairline: (1) `formatShapeWeightTag`
 * (`hotbarLayout.ts`) abbreviates every one of the 3 shapes x 3 weights to a fixed 9-character
 * `[xxx/yyy]` tag instead of the previous 12-17 char spread; (2) this font drops one px, 11->10,
 * which also gives the *other* two lines in this same text block (the hotkey/cooldown line and
 * the spell-id line — `glacial_shard`, 13 characters, is the longest of the 12 shipped ids and
 * was left with near-zero margin of its own by the same icon-driven budget shrink, even though
 * it isn't in the current default loadout) real headroom instead of a second near-miss. At
 * 10px monospace, the 9-char worst-case tag and the 13-char worst-case id both render
 * comfortably inside the ~88px budget — verified live via dev-server screenshot per
 * `docs/agents/_reference/docker-testing-contract.md`, not just by this arithmetic. */
const HOTBAR_LABEL_FONT_SIZE_PX = 10;
const HOTBAR_SLOT_BG_COLOR = 0x1f2130;
const HOTBAR_SLOT_BG_ALPHA = 0.9;
/** Slot border colors: which of the three mutually-exclusive states a slot is in — currently
 * armed (in preview/aim mode, `previewSpellId` match), on cooldown, or ready — takes visual
 * priority in that order (an armed spell is always also "ready", by construction: you can't
 * enter preview on a cooling-down or unaffordable spell, see `handleHotbarPress`). */
const HOTBAR_BORDER_ARMED_COLOR = 0xf3e7c2;
const HOTBAR_BORDER_READY_COLOR = 0x4caf50;
const HOTBAR_BORDER_COOLDOWN_COLOR = 0x55597a;
/** A loadout shorter than 6 spells renders its remaining slots as an empty numbered outline
 * (this color) rather than leaving them blank/ambiguous about whether that hotkey does
 * anything. Not reachable with the current fixed 6-spell `DEFAULT_LOADOUT_IDS`, but
 * `equippedSpells`/`HOTBAR_KEYS` don't guarantee equal length, so handled rather than assumed. */
const HOTBAR_BORDER_EMPTY_COLOR = 0x33364a;
/** backlog 2.30 / issue #56 — per-slot spell icon (Tilesmith, hand-authored, one per element:
 * fire/ice/lightning/earth, see `spellIcons.ts`'s own comment for why element-level granularity
 * closes the reported "arc_lance and stone_spike look identical" bug without a full 12-icon
 * commission). Sized to fit inside `HOTBAR_SLOT_HEIGHT` (96) with room to spare, anchored at
 * the slot's left edge; the existing per-slot label text is shifted right by
 * `HOTBAR_ICON_SIZE + HOTBAR_ICON_PADDING * 2` so it no longer overlaps the icon. Purely
 * additive to `createHud`/`updateHotbar` — `computeHotbarSlotRects`'s own math (hotbarLayout.ts)
 * is untouched. */
const HOTBAR_ICON_SIZE = 40;
const HOTBAR_ICON_PADDING = 8;
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
  /** Heckler, 2026-08-02 (6) — the exact `keydown-Y`/`keydown-N` listener refs armed by the
   * currently-pending `startPhaseBreak` call, or `null` if none is pending. Hoisted out of
   * `startPhaseBreak`'s closure so `handleDeath` can `.off()` them by reference when it
   * interrupts an unresolved phase-break, instead of leaving a stale pair registered for a
   * later, unrelated phase-break to accidentally co-fire alongside. Cleared whenever a
   * phase-break actually resolves or a death interrupts it — at most one phase-break is ever
   * pending at a time, so a single field (not a stack/set) is sufficient. */
  private phaseChoiceListeners: { onY: () => void; onN: () => void } | null = null;
  /** backlog 0.2 — highest wave `level` number reached so far; `startWave` only calls
   * `hexcoin.markLevelStart()` the first time a level number is crossed, never on a
   * same-level death-retry, so a death can't be used to re-bank an already-recorded floor. */
  private highestLevelReached = 0;

  private lastFacing = new Phaser.Math.Vector2(1, 0);
  /** Issue #49 fix — was a one-way `pointerHasMoved` boolean (set true on the first
   * post-jitter `pointermove`/`pointerdown`, never reset), which permanently deferred aim
   * to the mouse once tripped, regardless of idle time. Now a timestamp (`this.time.now` at
   * the moment of the last qualifying pointer event, or `null` if the pointer has never
   * moved this session); every read site calls `hasRecentPointerActivity` against the
   * current time instead of reading a flag. See `systems/pointerActivity.ts` for the pure
   * recency check and the chosen window's reasoning. */
  private lastPointerActivityAt: number | null = null;

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
   * Only ever set while aiming via the no-mouse fallback (no *recent* pointer activity, per
   * issue #49's `hasRecentPointerActivity` check); mouse aiming is untouched and always
   * leaves this null. */
  private previewLockedEnemy: Enemy | null = null;

  private hudText?: Phaser.GameObjects.Text;
  /** backlog 2.29 / issue #55 — the hotbar's per-slot backgrounds/borders (ready/cooldown/
   * armed state), redrawn every frame in `updateHotbar`. Replaces the old single vertical
   * `hotbarText` block. */
  private hotbarGraphics?: Phaser.GameObjects.Graphics;
  private hotbarSlotRects: HotbarSlotRect[] = [];
  private hotbarSlotTexts: Phaser.GameObjects.Text[] = [];
  /** backlog 2.30 / issue #56 — one `Image` per hotbar slot, texture swapped per-frame in
   * `updateHotbar` to the equipped spell's element icon (`spellIcons.ts`). Hidden (not
   * destroyed) for slots with no equipped spell, same pattern the empty-slot branch already
   * uses for the border/text. */
  private hotbarSlotIcons: Phaser.GameObjects.Image[] = [];
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

    // backlog 2.30 / issue #56 — one hand-authored icon per element (`spellIcons.ts`), loaded
    // eagerly up front same as the tileset image above (4 tiny PNGs, no runtime cost worth a
    // dynamic-loading dance).
    for (const element of SPELL_ICON_ELEMENTS) {
      this.load.image(spellIconKey(element), spellIconUrl(element));
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
    //
    // backlog 2.29 / issue #55 — that panel's own 7-line vertical text block later overflowed
    // the canvas in turn (see the `HOTBAR_TOP_MARGIN` comment above); redesigned here as a
    // single row of `HOTBAR_KEYS.length` fixed rectangles below the road, each one a distinct
    // region (background + border via `hotbarGraphics`, label text via its own `Text` object)
    // rather than concatenated lines. Fits-within-canvas check: row top =
    // `ROAD_TOP + ROAD_HEIGHT + HOTBAR_TOP_MARGIN` = 130 + 280 + 14 = 424; row bottom =
    // 424 + `HOTBAR_SLOT_HEIGHT` (96) = 520 <= `CANVAS_HEIGHT` (540) — 20px of margin left at
    // the bottom, no clipping.
    const hotbarTop = ROAD_TOP + ROAD_HEIGHT + HOTBAR_TOP_MARGIN;
    this.hotbarSlotRects = computeHotbarSlotRects({
      canvasWidth: CANVAS_WIDTH,
      top: hotbarTop,
      slotHeight: HOTBAR_SLOT_HEIGHT,
      slotCount: HOTBAR_KEYS.length,
      gapPx: HOTBAR_SLOT_GAP
    });
    this.hotbarGraphics = this.add.graphics();
    // backlog 2.30 / issue #56 — one icon Image per slot, hidden until `updateHotbar` gives it
    // a real spell's texture; created once here rather than per-frame, same lifecycle as
    // `hotbarSlotTexts` below.
    this.hotbarSlotIcons = this.hotbarSlotRects.map((rect) => {
      const icon = this.add.image(
        rect.x + HOTBAR_ICON_PADDING + HOTBAR_ICON_SIZE / 2,
        rect.y + rect.height / 2,
        spellIconKey(SPELL_ICON_ELEMENTS[0])
      );
      icon.setDisplaySize(HOTBAR_ICON_SIZE, HOTBAR_ICON_SIZE);
      icon.setVisible(false);
      return icon;
    });
    const hotbarTextLeft = HOTBAR_TEXT_PADDING + HOTBAR_ICON_SIZE + HOTBAR_ICON_PADDING * 2;
    this.hotbarSlotTexts = this.hotbarSlotRects.map((rect) =>
      this.add.text(rect.x + hotbarTextLeft, rect.y + HOTBAR_TEXT_PADDING, "", {
        color: "#9fb0d8",
        fontFamily: "monospace",
        fontSize: `${HOTBAR_LABEL_FONT_SIZE_PX}px`,
        lineSpacing: 3
      })
    );

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

    // backlog 2.10 / issue #49 — non-mouse aiming fallback tracks whether the pointer has
    // moved recently (past the jitter threshold, within `POINTER_ACTIVE_WINDOW_MS`); until
    // it has, or once that recency window lapses again, aiming defaults to last-move-
    // direction instead. Recording `this.time.now` (not a boolean) is what lets that window
    // actually lapse — see `lastPointerActivityAt`'s own comment.
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const moved = Phaser.Math.Distance.Between(
        pointer.prevPosition.x,
        pointer.prevPosition.y,
        pointer.position.x,
        pointer.position.y
      );
      if (moved >= POINTER_JITTER_THRESHOLD_PX) {
        this.lastPointerActivityAt = this.time.now;
      }
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.lastPointerActivityAt = this.time.now;
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

  /** backlog 2.10 / issue #49 — where a cast aims: the mouse if it's moved recently (within
   * `POINTER_ACTIVE_WINDOW_MS`, not just "at some point this session"), otherwise (backlog
   * 2.22 / issue #44) the auto-aim target locked in when the current preview started,
   * tracked live so a moving enemy doesn't dodge out of the shape; if no enemy was locked
   * (or it died mid-preview), falls back to the player's last movement direction at a fixed
   * default distance, same as before this feature existed. */
  private currentAimPoint(): { x: number; y: number } {
    if (!this.mage) {
      return { x: 0, y: 0 };
    }
    if (hasRecentPointerActivity(this.lastPointerActivityAt, this.time.now)) {
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
    // Issue #54 fix: previously mana was only checked inside `confirmCast` -> `tryCast`,
    // after the player had already entered preview/aim mode — the cast was rejected only
    // at the moment of confirm, contradicting the "tactical, readable" pillar's promise
    // that a cast attempt tells you upfront whether it's viable. Mirrors the cooldown
    // check immediately above: reject before entering preview, same flash message
    // `confirmCast` already uses for the same underlying reason (`this.mana.canAfford`
    // via `SpellCaster.canAffordCast`, which never mutates the Mana pool).
    if (!this.caster.canAffordCast(spell)) {
      this.flashMessage("Not enough Mana", 500);
      return;
    }
    this.previewSpellId = spell.id;
    // backlog 2.22 / issue #44, recency check per issue #49 — soft-lock: pick the auto-aim
    // target once, right here, never re-evaluated until this preview confirms or cancels.
    // Only applies to the no-mouse fallback path (no *recent* pointer activity); a mouse
    // player's own aim is untouched.
    this.previewLockedEnemy = hasRecentPointerActivity(this.lastPointerActivityAt, this.time.now)
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
      { x: ENEMY_SPAWN_X, y: 270 },
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
    // Issue #52 fix: this message used to promise "press any key to continue" in the
    // !canPay branch, but only `keydown-Y`/`keydown-N` listeners were ever armed below —
    // no "any key" handler existed anywhere, so declining players (nothing to decline,
    // nothing to pay) hit an unrecoverable freeze. Developer's call: not an auto-advance,
    // a deliberate pause beat — message now promises exactly the one key that's armed.
    this.flashMessage(
      canPay
        ? `The ledger waits. [Y] Pay ${FEE_PHASE_RECOVERY} Hexcoin -> restore ${Math.round(MAX_HP * PHASE_RECOVERY_HP_FRACTION)} HP  /  [N] Refuse`
        : "Phase clear! No recovery available — press Y to continue.",
      60000
    );
    const resolve = (pay: boolean) => {
      // Guards double-resolution (as the old boolean did), a keypress arriving after the
      // player died during the break (`handleDeath` moves the phase to `dead`), AND — Heckler,
      // 2026-08-02 (6) — a stale listener from an *earlier* phase-break that a death
      // interrupted, still armed because nothing had deregistered it, co-firing alongside a
      // fresh phase-break's listeners that happen to reach the same "awaiting-phase-choice"
      // phase string. Checking phase alone let that stale closure pass this guard and run its
      // side effects (Hexcoin spend, HP restore, `beginAdvance()`) against live state, then
      // starve the real, current phase-break's identical guard (phase already flipped by the
      // stale call) — a silent side effect followed by a permanent freeze, the same failure #52
      // was dispatched to fix, reached via a different path. `canResolvePhaseChoice` also
      // checks the token this closure was armed with against the session's live generation —
      // death always bumps the generation (`waveSession.ts`), so a stale attempt's token can
      // never match again once a death (and the retry's `beginWave()`) has moved the session on.
      if (!canResolvePhaseChoice(this.session.phase, this.session.generation, phaseGeneration)) {
        return;
      }
      this.session.beginAdvance();
      this.input.keyboard?.off("keydown-Y", onY);
      this.input.keyboard?.off("keydown-N", onN);
      this.phaseChoiceListeners = null;
      if (pay && this.hexcoin.usePhaseRecovery(this.bossMaxRecoveries)) {
        this.health.restore(MAX_HP * PHASE_RECOVERY_HP_FRACTION);
        this.flashMessage(`Recovered ${Math.round(MAX_HP * PHASE_RECOVERY_HP_FRACTION)} HP`, 1200);
      }
      // Known flagged interaction (code review, 2026-08-02, not a reported bug): the decline
      // path's 200ms delay is shorter than `RANGED_TRAVEL_MS` (450ms). `startWave` below always
      // bumps the generation (issue #48), so a ranged shot fired by the phase's last enemy just
      // before it died can have its impact silently voided by a same-life phase advance, not
      // just by death — if the player declines fast enough that the next phase starts before
      // the shot lands. Fails safe (a hit that should land doesn't; nothing crashes or
      // corrupts state) and needs sub-250ms player reaction to trigger, so left as-is rather
      // than redesigning the generation scheme to distinguish "world-ending" transitions from
      // "same-life" ones — flagged here instead of silently accepted.
      this.time.delayedCall(pay ? 1200 : 200, () => {
        if (!this.session.isCurrent(phaseGeneration)) {
          return;
        }
        this.startWave(nextIndex);
      });
    };
    const onY = () => resolve(true);
    const onN = () => resolve(false);
    // Heckler, 2026-08-02 (6): recorded so `handleDeath` can deregister this exact pair by
    // reference if it interrupts this phase-break before `resolve()` ever runs.
    this.phaseChoiceListeners = { onY, onN };
    // Issue #52 fix: `keydown-N` is only armed when refusing is actually a real choice
    // (there's a Y/N decision to make). When `canPay` is false there is nothing to
    // decline — arming a dangling `N` listener nobody was told about would just be a second
    // undocumented way to advance alongside the one the message now actually promises.
    this.input.keyboard?.once("keydown-Y", onY);
    if (canPay) {
      this.input.keyboard?.once("keydown-N", onN);
    }
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
    // Heckler, 2026-08-02 (6): if death interrupts an unresolved boss phase-break, its
    // `keydown-Y`/`keydown-N` `.once` listeners are still registered on the shared keyboard
    // plugin — generation-bumping alone does not deregister them. Left alone, a boss retry
    // reaching another phase-break would arm a second pair alongside this stale one, and a
    // single keypress would fire both closures (Phaser's `once` only deregisters the listener
    // that fired, not others on the same event). `canResolvePhaseChoice`'s token check in
    // `startPhaseBreak.resolve()` already makes the stale closure's side effects impossible
    // even if this cleanup were somehow skipped, but deregistering here is the primary fix —
    // it means a later, unrelated phase-break never inherits a stale listener at all, rather
    // than relying solely on the guard to no-op it after the fact.
    if (this.phaseChoiceListeners) {
      this.input.keyboard?.off("keydown-Y", this.phaseChoiceListeners.onY);
      this.input.keyboard?.off("keydown-N", this.phaseChoiceListeners.onN);
      this.phaseChoiceListeners = null;
    }
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

    this.hudText.setText([hpLine, manaLine, hexLine, waveLine].join("\n"));
    this.updateHotbar();
  }

  /** backlog 2.29 / issue #55 — redraws the single-row hotbar every frame: one rectangle per
   * equipped-spell slot, background + border communicating ready (green) vs on-cooldown
   * (muted) vs currently-armed (gold, `previewSpellId` match — a spell in preview/aim mode is
   * always also "ready" by construction, see `handleHotbarPress`'s cooldown/mana pre-checks,
   * so this can't collide with the cooldown state). Each slot's text carries the hotkey
   * number + cooldown/ready label, the spell id, and its `[shape/weight]` tag from backlog
   * 2.14 (dropped the tier that used to also appear here — doesn't fit this row's width
   * alongside the rest, a legibility judgment call, not a data loss: Mastery tier is Pato's
   * number and still fully tracked, just not surfaced in this compact view).
   * `equippedSpells.length < HOTBAR_KEYS.length` (not reachable with the current fixed
   * `DEFAULT_LOADOUT_IDS`, but not assumed away either) renders the remainder as an empty
   * numbered outline instead of leaving them blank. */
  private updateHotbar(): void {
    if (!this.hotbarGraphics) {
      return;
    }
    this.hotbarGraphics.clear();
    this.hotbarSlotRects.forEach((rect, index) => {
      const text = this.hotbarSlotTexts[index];
      const icon = this.hotbarSlotIcons[index];
      const spell = this.equippedSpells[index];
      if (!spell) {
        this.hotbarGraphics?.lineStyle(1, HOTBAR_BORDER_EMPTY_COLOR, 1);
        this.hotbarGraphics?.strokeRect(rect.x, rect.y, rect.width, rect.height);
        text?.setText(`[${index + 1}]`);
        icon?.setVisible(false);
        return;
      }

      const tier: MasteryTier = this.mastery.getTier(spell.id);
      const remaining = this.caster.cooldownRemaining(spell.id);
      const total = this.caster.cooldownDurationMs(spell, tier);
      const cooldown = computeCooldownDisplay(remaining, total);
      const isArmed = this.previewSpellId === spell.id;
      const borderColor = isArmed
        ? HOTBAR_BORDER_ARMED_COLOR
        : cooldown.isReady
        ? HOTBAR_BORDER_READY_COLOR
        : HOTBAR_BORDER_COOLDOWN_COLOR;

      this.hotbarGraphics?.fillStyle(HOTBAR_SLOT_BG_COLOR, HOTBAR_SLOT_BG_ALPHA);
      this.hotbarGraphics?.fillRect(rect.x, rect.y, rect.width, rect.height);
      this.hotbarGraphics?.lineStyle(isArmed ? 3 : 2, borderColor, 1);
      this.hotbarGraphics?.strokeRect(rect.x, rect.y, rect.width, rect.height);

      // backlog 2.30 / issue #56 — the actual per-spell (per-element) icon, so `arc_lance`
      // (lightning) and `stone_spike` (earth) — same shape/weight, the reported bug — now
      // render visibly different icons rather than only differing in the text label below.
      icon?.setTexture(iconKeyForSpell(spell));
      icon?.setVisible(true);

      text?.setText(
        [`[${index + 1}] ${cooldown.label}`, spell.id, formatShapeWeightTag(spell.shape, spell.weight)].join(
          "\n"
        )
      );
    });
  }
}
