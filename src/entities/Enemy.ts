import Phaser from "phaser";
import type { DebuffVariant, Element, EnemyArchetype } from "../data/types";
import { EnemyCombatState, type AppliedElementalHit } from "../systems/EnemyCombatState";
import type { ResolvedElementalHit } from "../systems/elementalDamage";
import { computeHpBarColor, computeHpFraction } from "../systems/enemyStatusOverlay";
import { RANGED_STRAFE_SPEED, computeStrafeDirection } from "../systems/rangedStrafe";
import {
  ENEMY_SEPARATION_DISTANCE,
  ENEMY_SEPARATION_SPEED,
  addSeparationVelocity,
  type Point
} from "../systems/enemySeparation";
import { resolveWallSlideWantsNegativeY } from "../systems/wallSlideDirection";
import {
  ELEMENTAL_BADGE_PRESENTATION,
  defaultMonsterVisualId,
  monsterSprite,
  monsterVisual
} from "../systems/characterArt";

/** hp-template.md, "Enemy Archetype Per-Hit Damage" — fixed, never invented per-encounter. */
export const ARCHETYPE_DAMAGE: Record<EnemyArchetype, number> = {
  melee: 7,
  ranged: 4,
  debuffer: 0
};

const ARCHETYPE_COLOR: Record<EnemyArchetype, number> = {
  melee: 0xb1443e,
  ranged: 0xd8a53d,
  debuffer: 0x6f4fa8
};

/**
 * Issue #167 — `melee: 90` is the strongest force that opposes enemy separation (every enemy
 * steers at the mage's single point, so a chase converges continuously and at full strength).
 * `ENEMY_SEPARATION_SPEED` in `enemySeparation.ts` must stay above it, and
 * `enemySeparation.test.ts` mirrors this number as `MELEE_CHASE_SPEED` to assert that. If this
 * value ever rises, raise that one with it — otherwise enemies start stacking again.
 */
const ARCHETYPE_SPEED: Record<EnemyArchetype, number> = {
  melee: 90,
  ranged: 60,
  debuffer: 55
};

const MELEE_RANGE = 34;
const MELEE_COOLDOWN_MS = 1200;
/**
 * Issue #110 — developer playtest: "the melee units are always in the same spot so its easy
 * to kill them." Once in `MELEE_RANGE`, a melee enemy now strafes perpendicular to the
 * hold-range line (same `computeStrafeDirection` bounce logic `rangedStrafe.ts` already ships
 * for the ranged archetype) instead of stopping dead, plus a separation nudge
 * (`enemySeparation.ts`) away from any other melee enemy that's crowded too close — the
 * ticket's own two candidate causes: a fully deterministic resting bearing, and multiple
 * simultaneous melees stacking at the same point. Much slower than `RANGED_STRAFE_SPEED` (45)
 * deliberately: `MELEE_RANGE` (34px) is a far tighter band than ranged's hold range, so a fast
 * drift would risk carrying a melee enemy in and out of attack range every couple frames
 * instead of a small, steady shuffle. An explicit engine-feel number (not one of Pato's
 * economy values), same as `RANGED_STRAFE_SPEED` — free to retune without a template change.
 */
const MELEE_STRAFE_SPEED = 18;
/**
 * Issues #110/#138/#167 — `ENEMY_SEPARATION_DISTANCE`/`ENEMY_SEPARATION_SPEED` now live in
 * `enemySeparation.ts` (imported above) so the pure force-balance contract is testable without
 * importing Phaser; this comment stays here because it documents the playtest bug that drove
 * their retune, alongside the movement code that fights them.
 *
 * Two of the three #167 root causes were structural and are fixed in `update()` below (see its
 * comment): separation was applied only on the settled branches, and only between same-archetype
 * peers. The third, and the dominant one:
 *
 * Retuned `ENEMY_SEPARATION_SPEED` 40->140 and `ENEMY_SEPARATION_DISTANCE` 32->40. This was the
 * dominant cause of the reported stacking, and the one that made the other two look cosmetic
 * by comparison: separation was set at 40px/s while the melee chase it has to fight is
 * `ARCHETYPE_SPEED.melee` = 90px/s. Every enemy steers at one single point (the mage), so
 * convergence is continuous and full-strength, while separation could only ever push back at
 * under half that. The arithmetic in `enemySeparation.ts` was never wrong — it was simply being
 * asked to win a tug-of-war it was tuned to lose, which is why its unit tests stayed green
 * (they assert the push exists and points the right way, never that it beats an opposing chase).
 *
 * Derivation: separation must out-push the strongest force that opposes it, so it has to exceed
 * 90. It needs headroom above that rather than merely matching it, because a crowded enemy's
 * several per-ally pushes are normalized down to one capped vector (`addSeparationVelocity`)
 * while each opposing chase stays at full strength, and because the linear falloff means the
 * push only reaches its nominal speed at full overlap. 140 with a 40px trigger radius is the
 * measured knee of that curve.
 *
 * Measured over 60 headless encounters (3 real Level 1 wave compositions x 20 spawn-jitter
 * seeds, integrating this exact velocity model): worst-case gap between any two settled enemies
 * went 0.5px -> 23.6px, and worst-case gap between melee and ranged enemies specifically went
 * 0.3px -> 23.6px, against the 26x26 sprite footprint. The structural fixes below/above
 * contribute too (cross-archetype alone moved that case 0.3 -> 9.8) but could
 * not on their own overcome the force imbalance.
 *
 * Verified not to break what these enemies are *for*: the fraction of settled frames with at
 * least one melee inside `MELEE_RANGE` of the mage is unchanged (63% before, 63% after), and the
 * ranged/debuffer preferred-range bands are untouched — the 40px trigger radius is still shorter
 * than the ~50px gap between the [220,260] and [130,170] bands, so separation still cannot reach
 * across them (band excursions in the same simulation did not increase).
 *
 * Still explicit engine-feel numbers, not Pato's economy values (see `MELEE_STRAFE_SPEED`):
 * they change spacing only, never per-hit damage, HP, or income.
 */
/**
 * backlog 2.10 — retuned 220->240 (Warden, 2026-07-25) so ranged/debuffer settle into
 * non-overlapping bands: each archetype holds preferredRange +/- 20, so the old 220/200
 * pair produced overlapping [200,240]/[180,220] bands (the actual cause of the reported
 * stacking). Independently re-verified by Pato: 240/150 yields non-overlapping
 * [220,260]/[130,170] bands, a real ~50px gap against the 26px sprite footprint.
 *
 * Re-checked, not retuned, for backlog 2.27 / issue #53 (2026-08-02, `ROAD_WIDTH`
 * 780->960): these bands describe a distance from the *player*, not from a lane wall, and
 * a wider lane only gives the mage/enemies more room to actually reach and hold a
 * preferred distance before a retreat runs into `WALL_SLIDE_MARGIN` — it can't newly
 * create an overlap between two bands whose own gap (240+/-20 vs 150+/-20, a 50px gap) is
 * independent of lane width. Exactly the same reasoning `SpellroadScene.ts`'s own
 * `ROAD_HEIGHT` widening comment already gives for this identical pair of constants
 * surviving 160->220->280 unretouched — a widened dimension only reduces how often a wall
 * is hit, never forces the bands themselves closer together. Left at 240/150.
 */
const RANGED_PREFERRED_RANGE = 240;
const RANGED_COOLDOWN_MS = 1800;
const DEBUFFER_PREFERRED_RANGE = 150;
/**
 * Issue #250 — developer playtest feedback (2026-08-15) after #237 shipped: with the debuff hit
 * now dodgeable (tell + travel, see `DEBUFFER_TELEGRAPH_MS`/`DEBUFFER_TRAVEL_MS` below), the
 * Debuffer's 2500ms cadence reads as too easy — it should attack more often to keep pressure up.
 * Cadence-only retune, same narrow scope #237 used: range (`DEBUFFER_PREFERRED_RANGE`), the
 * telegraph/travel timings, and the debuff's own magnitude/stacking-cap/floor/persistence (all
 * fixed in `hp-template.md`'s "Debuffer Magnitudes", re-checked here per the same
 * "consult Pato's numbers before picking a cadence number" precedent #237 set) are all untouched.
 *
 * 2500 -> 1800ms (28% faster; ~4 attacks/10s -> ~5.6 attacks/10s). Picked by requiring the *gap*
 * between attacks -- not just the cooldown itself -- to stay comfortably clear of the fixed
 * 900ms tell+travel dodge window. The cooldown resets at tell-start (#237), so the time between
 * one attack's projectile resolving (tell-start + 900ms) and the next tell beginning
 * (tell-start + DEBUFFER_COOLDOWN_MS) is `DEBUFFER_COOLDOWN_MS - 900`. At 2500ms that gap was
 * 1600ms; at 1800ms it's exactly 900ms -- one full dodge-window's worth of headroom, so a player
 * who reacts to one tell always gets a completely telegraph-free beat at least as long as the
 * dodge window itself before the next one can even start. That rules out tells overlapping or
 * stacking (which would need the gap to hit ~0, i.e. cooldown near 900ms) while still meaningfully
 * shortening the old 1600ms breather. Went no lower than 1800: a 900ms floor was chosen as a
 * clean "at least 1x headroom" rule rather than shaving it arbitrarily thinner, since the ticket
 * only asks to increase pressure "somewhat," not to make the Debuffer's tells effectively
 * back-to-back.
 */
const DEBUFFER_COOLDOWN_MS = 1800;
/** backlog 2.10 — how close to a lane wall a kiting retreat must get before it slides
 * along the wall instead of pinning nose-first (Warden's spec, Pato-validated 2026-07-25).
 *
 * Re-checked, not retuned, for backlog 2.27 / issue #53: this margin is an absolute
 * proximity-to-any-wall threshold (left/right/top/bottom alike), not a fraction of lane
 * width — a wider lane (780->960) only makes the left/right walls rarer to reach in the
 * first place, so wall-slide fires less often, the same direction of effect the prior
 * height widenings (160->220->280) already had on the top/bottom walls without needing
 * this number to change. Also re-derives the new `ENEMY_SPAWN_X` in `SpellroadScene.ts`
 * (kept exactly `WALL_SLIDE_MARGIN` px inside the new right wall, same as before the
 * widening) — see that constant's own comment. Left at 50.
 */
const WALL_SLIDE_MARGIN = 50;
const ATTACK_COOLDOWN_MS: Record<EnemyArchetype, number> = {
  melee: MELEE_COOLDOWN_MS,
  ranged: RANGED_COOLDOWN_MS,
  debuffer: DEBUFFER_COOLDOWN_MS
};
/**
 * backlog 2.20 (developer, 2026-07-30): Wave 1 spawns both `hexbow_skirmisher` at the same
 * `spawn_delay_ms`, so with no jitter they close to `RANGED_PREFERRED_RANGE` together and
 * their independent cooldowns stay permanently in phase — every `RANGED_COOLDOWN_MS` the
 * player takes two near-simultaneous ranged hits sharing one `RANGED_TRAVEL_MS` dodge
 * window instead of two separate ones. Giving each enemy a random head start on its own
 * cooldown desyncs same-wave same-archetype attackers from their very first shot onward.
 * This changes attack *timing* only — average sustained DPS and Pato's per-hit numbers
 * are untouched, so it doesn't require a template/validation change.
 */
const INITIAL_COOLDOWN_JITTER_FRACTION = 0.5;

/**
 * Issue #237 (replaces #208, closed) — developer decision 2026-08-13: a competitive playtester
 * flagged the Debuffer's attack as "currently the most frustrating aspect of the game" -- an
 * instant, non-dodgable, ranged debuff with zero wind-up, whose range rivals the player's own
 * arc_lance. Fix is a visible tell before firing plus real projectile travel time, the same
 * counterplay shape `RANGED_TRAVEL_MS` (`SpellroadScene.ts`) already gives the Ranged
 * archetype -- explicitly NOT a change to range (`DEBUFFER_PREFERRED_RANGE`, untouched), the
 * debuff's per-application magnitude, its stacking cap/floor, or its persistence through the
 * enemy's own death (`DebuffSystem.clear()` still only runs at wave-start/player-death, never
 * touched here).
 *
 * Consulted Pato's own templates before picking a number (owner's ask: check the wind-up
 * timing against the debuff's current magnitude, not invent a new economy value):
 * `hp-template.md`'s "Debuffer Magnitudes" fixes 12% speed-drain / 2.4 Mana-regen-drain per
 * application, additive, hard-capped at 2 stacks (24% / 4.8 max), with **no decay until
 * wave-clear or death** -- i.e. an undodged hit's cost compounds and never falls off mid-fight,
 * which is exactly why making it reactively dodgeable (not smaller or slower to stack) is the
 * right lever, matching the issue's explicit non-goal of softening the debuff once it lands.
 *
 * Chose 450ms for both the wind-up tell and the travel time -- deliberately not a new bespoke
 * number, but the same 450ms reaction window `RANGED_TRAVEL_MS` already established and that a
 * player has already learned to read for the Ranged archetype, so the whole game teaches one
 * "450ms means dodge" rule instead of a second timing to relearn per archetype. The 900ms
 * total (tell + travel) stays well inside `DEBUFFER_COOLDOWN_MS` (2500ms, untouched) and is
 * reset at the moment the tell begins (see `update()` below), not when the projectile actually
 * launches -- so the Debuffer's attack cadence is exactly unchanged from before this fix. A
 * stationary or careless target still eventually eats the debuff at the same rate as before;
 * this only opens a real dodge window for a player who reacts, it doesn't reduce uptime against
 * one who doesn't.
 */
export const DEBUFFER_TELEGRAPH_MS = 450;
export const DEBUFFER_TRAVEL_MS = 450;

/**
 * Enemy-side HP. hp-template.md only fixes the player's pool and the per-hit damage the
 * player takes — it does not define a base enemy-HP number (Warden's own log flags this
 * exact gap). This is an engine-testing placeholder, not a shipped design number; flag to
 * Pato/developer before a future boss needs individually tougher enemies.
 */
const PLACEHOLDER_ENEMY_HP: Record<EnemyArchetype, number> = {
  melee: 18,
  ranged: 14,
  debuffer: 22
};

/**
 * Live HP-bar overlay geometry. The sprite itself is a
 * generated 26x26 texture centered on (x, y) (see `ensureTexture`), so these are small
 * fixed offsets from that center rather than anything derived from a per-archetype size
 * (every archetype currently shares the same 26x26 footprint).
 */
const STATUS_BAR_WIDTH = 28;
const STATUS_BAR_HEIGHT = 4;
const STATUS_BAR_OFFSET_Y = -20;
let nextSeparationId = 1;

export interface EnemyCallbacks {
  onMeleeHit?: () => void;
  onRangedFire?: (fromX: number, fromY: number, toX: number, toY: number) => void;
  /** Issue #237 — fires once, the instant the wind-up tell begins (not when the debuff
   * actually lands). The scene draws the visible tell at (x, y) for `DEBUFFER_TELEGRAPH_MS`. */
  onDebuffTelegraphStart?: (x: number, y: number, variant: DebuffVariant) => void;
  /** Issue #237 — fires once the telegraph completes and the projectile actually launches;
   * from/to shape mirrors `onRangedFire` exactly. The debuff itself only lands after
   * `DEBUFFER_TRAVEL_MS`, and only if the scene's live impact-zone recheck still passes --
   * same dodge contract issue #47 already gave the Ranged archetype. */
  onDebuffFire?: (fromX: number, fromY: number, toX: number, toY: number, variant: DebuffVariant) => void;
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  /** Stable construction/spawn order drives both separation and elemental-primary ties. */
  public readonly spawnOrder = nextSeparationId++;
  public readonly separationId = this.spawnOrder;
  public readonly archetype: EnemyArchetype;
  public readonly maxHp: number;
  /** Issue #71 — the spawning wave's `damage_modifier`, applied by the scene's own damage
   * callbacks through `outgoingDamage(ARCHETYPE_DAMAGE[archetype])`. Ice weaken is the only
   * temporary factor layered onto that existing authored value. */
  public readonly damageModifier: number;
  private attackCooldownMs = 0;
  private readonly debuffVariant: DebuffVariant;
  /** backlog/issue #95 — which way this enemy is currently strafing while holding its
   * preferred range (ranged) or attack range (melee, issue #110); randomized per-enemy so
   * same-wave enemies of the same archetype don't drift in lockstep. */
  private strafeDirection: 1 | -1 = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
  /** backlog/issue #95 follow-up (2026-08-06) — persists which way a wall-blocked retreat
   * is currently sliding, so it isn't re-decided (and flip-flopped) every single frame.
   * `null` means no wall-slide episode is in progress; cleared whenever the retreat branch
   * isn't wall-blocked on a given frame, per `wallSlideDirection.ts`'s own doc comment. */
  private wallSlideWantsNegativeY: boolean | null = null;
  /** Sibling graphics rather than Sprite children, so their lifecycle is explicitly owned here. */
  private readonly statusBar: Phaser.GameObjects.Graphics;
  private readonly elementalFrame: Phaser.GameObjects.Graphics;
  private readonly effectOverlay: Phaser.GameObjects.Graphics;
  private readonly combatState: EnemyCombatState;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    archetype: EnemyArchetype,
    public readonly element: Element,
    public readonly resistantElements: readonly Element[],
    debuffVariant: DebuffVariant = "speed",
    private readonly lane: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle(0, 0, Infinity, Infinity),
    /** Issue #71 — `WaveDefinition.hp_modifier`/`.damage_modifier`, previously authored but
     * never read. Defaults to 1 (unscaled) so every existing call site stays correct as-is. */
    hpModifier = 1,
    damageModifier = 1,
    private readonly monsterId = defaultMonsterVisualId(archetype)
  ) {
    super(scene, x, y, Enemy.ensureTexture(scene, archetype, monsterId));
    this.archetype = archetype;
    this.maxHp = Math.round(PLACEHOLDER_ENEMY_HP[archetype] * hpModifier);
    this.combatState = new EnemyCombatState(this.maxHp);
    this.damageModifier = damageModifier;
    this.debuffVariant = debuffVariant;
    this.attackCooldownMs = Phaser.Math.Between(
      0,
      Math.floor(ATTACK_COOLDOWN_MS[archetype] * INITIAL_COOLDOWN_JITTER_FRACTION)
    );
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Issue #163 — the sprite art (`characterArt.ts`) is native 16x16, smaller than the old
    // generated 26x26 `fillRoundedRect` texture this footprint/hit-box size originally came
    // from (see `ENEMY_SEPARATION_DISTANCE` in `systems/enemySeparation.ts`, which is sized
    // relative to this exact 26x26 figure — issue #167 moved that constant out of this file,
    // and `enemySeparation.test.ts` mirrors the 26 as `SPRITE_FOOTPRINT_PX`). Keeping this
    // display size pinned is what keeps that separation tuning valid across the art swap.
    // Explicit `setDisplaySize`/body `setSize` keep both the on-screen
    // footprint and the hit box unchanged at 26x26 regardless of the backing texture's native
    // size — a pure visual swap, per the ticket's own "collision/attack geometry unaffected"
    // acceptance criterion.
    this.setDisplaySize(26, 26);
    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setSize(26, 26);
    // backlog 2.10 — mirror the mage's own lane clamp (SpellroadScene.createMage); enemies
    // previously only had the full-canvas default, and could wander outside the visible lane.
    (this.body as Phaser.Physics.Arcade.Body).setBoundsRectangle(this.lane);

    this.statusBar = scene.add.graphics();
    this.elementalFrame = scene.add.graphics().setDepth(-1);
    this.effectOverlay = scene.add.graphics().setDepth(2);
    this.refreshStatusOverlay();
  }

  /**
   * Issue #163 — real sprite art (`characterArt.ts`, one CC0 Tiny Creatures tile per
   * archetype) replaces the old `fillRoundedRect` flat-color-square placeholder. The scene's
   * own `preload()` loads each registry key before any wave can spawn an `Enemy`, so the normal path here is just "the key already
   * exists in the texture cache, return it." The `fillRoundedRect` fallback is kept, not
   * deleted, for the one case that isn't true — a caller that never ran that preload (e.g. a
   * future isolated unit test constructing an `Enemy` directly against a bare Scene) — so a
   * missing preload degrades to the old flat-color square instead of Phaser throwing on a
   * missing texture key.
   */
  private static ensureTexture(scene: Phaser.Scene, archetype: EnemyArchetype, monsterId: string): string {
    const key = monsterSprite(monsterId).key;
    if (scene.textures.exists(key)) {
      return key;
    }
    const graphics = scene.add.graphics();
    graphics.fillStyle(ARCHETYPE_COLOR[archetype], 1);
    graphics.fillRoundedRect(0, 0, 26, 26, 6);
    graphics.generateTexture(key, 26, 26);
    graphics.destroy();
    return key;
  }

  /** @returns true if this hit reduced the enemy to 0 HP or below. */
  takeDamage(amount: number): boolean {
    return this.combatState.applyElementalHit({
      directDamage: amount,
      effectDamage: 0,
      totalDamage: amount,
      outcome: "neutral"
    }).killed;
  }

  get hp(): number {
    return this.combatState.hp;
  }

  get defeated(): boolean {
    return this.combatState.defeated;
  }

  get isStunned(): boolean {
    return this.combatState.isStunned;
  }

  get isWeakened(): boolean {
    return this.combatState.isWeakened;
  }

  applyElementalHit(hit: ResolvedElementalHit): AppliedElementalHit {
    return this.combatState.applyElementalHit(hit);
  }

  outgoingDamage(authoredDamage: number): number {
    return this.combatState.outgoingDamage(authoredDamage, this.damageModifier);
  }

  /**
   * Repositions the live HP bar above the sprite and redraws its fill from current `hp`/`maxHp`. Called once from
   * the constructor (so a freshly spawned enemy already shows full HP) and once per frame
   * from `update()` below (so the bar tracks both movement and any damage landed since the
   * last frame — `takeDamage` itself only mutates `hp`, it doesn't touch the overlay).
   * The fraction/color arithmetic is the pure, testable part (`enemyStatusOverlay.ts`); this
   * method is purely the Phaser-side wiring (position two GameObjects, draw two rects).
   */
  private refreshStatusOverlay(): void {
    const fraction = computeHpFraction(this.hp, this.maxHp);
    const fillColor = computeHpBarColor(fraction);
    const barX = this.x - STATUS_BAR_WIDTH / 2;
    const barY = this.y + STATUS_BAR_OFFSET_Y;

    this.statusBar.clear();
    this.statusBar.fillStyle(0x14161f, 0.85);
    this.statusBar.fillRect(barX, barY, STATUS_BAR_WIDTH, STATUS_BAR_HEIGHT);
    if (fraction > 0) {
      this.statusBar.fillStyle(fillColor, 1);
      this.statusBar.fillRect(barX, barY, STATUS_BAR_WIDTH * fraction, STATUS_BAR_HEIGHT);
    }
    this.statusBar.lineStyle(1, 0x000000, 0.6);
    this.statusBar.strokeRect(barX, barY, STATUS_BAR_WIDTH, STATUS_BAR_HEIGHT);
    this.refreshElementalFrame();
    this.refreshEffectOverlay();
  }

  /** Applies the explicit wave-element presentation around a silhouette. The four motifs carry
   * identity when hue is unavailable; the dark frame stays neutral for contrast. */
  private refreshElementalFrame(): void {
    const presentation = monsterVisual(this.monsterId, this.element);
    const badge = ELEMENTAL_BADGE_PRESENTATION[this.element];
    const frame = this.elementalFrame;
    frame.clear();
    frame.fillStyle(presentation.outline.color, 1);
    frame.fillRoundedRect(this.x - 15, this.y - 15, 30, 30, 5);
    frame.lineStyle(2, presentation.accentColor, 1);
    switch (presentation.motif) {
      case "flame-spikes":
        frame.strokeTriangle(this.x - 12, this.y - 13, this.x - 6, this.y - 19, this.x, this.y - 13);
        frame.strokeTriangle(this.x, this.y - 13, this.x + 6, this.y - 19, this.x + 12, this.y - 13);
        break;
      case "ice-crystal":
        frame.strokePoints([
          new Phaser.Geom.Point(this.x, this.y - 19),
          new Phaser.Geom.Point(this.x + 5, this.y - 14),
          new Phaser.Geom.Point(this.x, this.y - 9),
          new Phaser.Geom.Point(this.x - 5, this.y - 14)
        ], true);
        break;
      case "earth-corners":
        frame.lineBetween(this.x - 15, this.y - 9, this.x - 15, this.y - 15);
        frame.lineBetween(this.x - 15, this.y - 15, this.x - 9, this.y - 15);
        frame.lineBetween(this.x + 15, this.y + 9, this.x + 15, this.y + 15);
        frame.lineBetween(this.x + 15, this.y + 15, this.x + 9, this.y + 15);
        break;
      case "lightning-zigzag":
        frame.strokePoints([
          new Phaser.Geom.Point(this.x + 2, this.y - 19),
          new Phaser.Geom.Point(this.x - 3, this.y - 13),
          new Phaser.Geom.Point(this.x + 2, this.y - 13),
          new Phaser.Geom.Point(this.x - 2, this.y - 8)
        ], false);
        break;
    }

    // Task 7 accessibility gate: a 16px (22px boss) filled badge sits outside the silhouette,
    // so overlapping neutral frames cannot erase the tactical cue. Geometry—not hue—carries
    // identity: triangle/fire, diamond/ice, square/earth, zigzag/lightning.
    const diameter = this.monsterId === "monster_boss_01" ? badge.bossDiameter : badge.regularDiameter;
    const radius = diameter / 2;
    const badgeX = this.x + 18;
    const badgeY = this.y - 14;
    frame.fillStyle(presentation.outline.color, 1);
    frame.fillCircle(badgeX, badgeY, radius + 2);
    frame.fillStyle(presentation.accentColor, 1);
    frame.lineStyle(3, 0xffffff, 1);
    switch (badge.shape) {
      case "triangle":
        frame.fillTriangle(badgeX, badgeY - radius + 2, badgeX - radius + 2, badgeY + radius - 2, badgeX + radius - 2, badgeY + radius - 2);
        frame.strokeTriangle(badgeX, badgeY - radius + 2, badgeX - radius + 2, badgeY + radius - 2, badgeX + radius - 2, badgeY + radius - 2);
        break;
      case "diamond":
        frame.fillPoints([
          new Phaser.Geom.Point(badgeX, badgeY - radius + 1),
          new Phaser.Geom.Point(badgeX + radius - 1, badgeY),
          new Phaser.Geom.Point(badgeX, badgeY + radius - 1),
          new Phaser.Geom.Point(badgeX - radius + 1, badgeY)
        ], true);
        break;
      case "square":
        frame.fillRect(badgeX - radius + 2, badgeY - radius + 2, diameter - 4, diameter - 4);
        frame.strokeRect(badgeX - radius + 2, badgeY - radius + 2, diameter - 4, diameter - 4);
        break;
      case "zigzag":
        frame.lineStyle(5, 0xffffff, 1);
        frame.strokePoints([
          new Phaser.Geom.Point(badgeX + 3, badgeY - radius + 1),
          new Phaser.Geom.Point(badgeX - 3, badgeY - 1),
          new Phaser.Geom.Point(badgeX + 2, badgeY - 1),
          new Phaser.Geom.Point(badgeX - 3, badgeY + radius - 1)
        ], false);
        break;
    }
  }

  /** Compact status motifs keep the authored ice/lightning effects readable without a monster
   * name: falling cyan chevrons mean weakened output; a gold cross-bolt means stunned. */
  private refreshEffectOverlay(): void {
    const overlay = this.effectOverlay;
    overlay.clear();
    if (this.isWeakened) {
      overlay.lineStyle(2, 0x8dd8ff, 1);
      overlay.lineBetween(this.x - 12, this.y + 18, this.x - 7, this.y + 22);
      overlay.lineBetween(this.x - 7, this.y + 22, this.x - 2, this.y + 18);
      overlay.lineBetween(this.x + 2, this.y + 18, this.x + 7, this.y + 22);
      overlay.lineBetween(this.x + 7, this.y + 22, this.x + 12, this.y + 18);
    }
    if (this.isStunned) {
      overlay.lineStyle(3, 0xf4c430, 1);
      overlay.strokePoints([
        new Phaser.Geom.Point(this.x - 10, this.y - 20),
        new Phaser.Geom.Point(this.x - 2, this.y - 24),
        new Phaser.Geom.Point(this.x + 2, this.y - 18),
        new Phaser.Geom.Point(this.x + 10, this.y - 22)
      ], false);
    }
  }

  /**
   * Phaser does not automatically destroy manually-added sibling GameObjects (the HP bar and
   * elemental/effect overlays) just because this Sprite gets destroyed — they aren't children
   * of it, just two other GameObjects this class keeps positioned around it. Every current
   * despawn path (`SpellroadScene.removeEnemy` and the death-reset `forEach` in
   * `handleDeath`) calls `enemy.destroy()` directly, so overriding it here is the one place
   * that guarantees the overlay never outlives the enemy it was drawn for, regardless of
   * which call site triggered the destroy.
   */
  destroy(fromScene?: boolean): void {
    this.statusBar.destroy();
    this.elementalFrame.destroy();
    this.effectOverlay.destroy();
    super.destroy(fromScene);
  }

  /** Code review, 2026-08-06 (issue #110's Standards pass) — the melee-in-range branch below
   * copy-pasted the ranged branch's direction-flip-and-perpendicular-velocity shape rather
   * than sharing it; factored out once both archetypes needed it, mirroring the seam the
   * pure `computeStrafeDirection` (`rangedStrafe.ts`) already models for the bounce decision
   * itself. */
  private strafeVelocity(direction: Phaser.Math.Vector2, speed: number): Phaser.Math.Vector2 {
    this.strafeDirection = computeStrafeDirection(
      this.y,
      this.lane.top,
      this.lane.bottom,
      WALL_SLIDE_MARGIN,
      this.strafeDirection
    );
    const perpendicular = new Phaser.Math.Vector2(direction.y, -direction.x);
    return perpendicular.scale(speed * this.strafeDirection);
  }

  update(
    deltaMs: number,
    targetX: number,
    targetY: number,
    callbacks: EnemyCallbacks,
    /**
     * Issues #110/#138/#167 — positions of every currently-alive *other* enemy (any archetype),
     * so no two enemies can overlap or co-travel as one target. Safe to include this enemy
     * itself: `computeSeparationNudge` skips a zero-distance pair whose separation ids match.
     */
    nearbyEnemies: Point[] = []
  ): void {
    const { debuffTelegraphCompleted } = this.combatState.tick(deltaMs);
    this.refreshStatusOverlay();
    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - deltaMs);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.isStunned) {
      body.setVelocity(0, 0);
      return;
    }
    if (debuffTelegraphCompleted) {
      callbacks.onDebuffFire?.(this.x, this.y, targetX, targetY, this.debuffVariant);
    }
    const toTarget = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y);
    const distance = toTarget.length();
    const direction = distance === 0 ? new Phaser.Math.Vector2(0, 0) : toTarget.clone().normalize();

    /**
     * Issue #167 — developer playtest: ranged and melee enemies still
     * stacked on top of each other instead of surrounding the mage, even though #110/#95's
     * separation and strafe systems were merged and green in isolation. Two gaps, both in this
     * method's *invocation* of them rather than in their arithmetic:
     *
     *   1. Separation was applied only on the hold-range/settled branches — the melee
     *      `distance <= MELEE_RANGE` arm and the ranged/debuffer in-band arm. The chase branch
     *      (`distance > MELEE_RANGE`, `distance > preferredRange + 20`), the retreat branch, and
     *      the wall-slide branch all called `body.setVelocity` with a raw chase/retreat vector
     *      and no separation at all. `WaveLoader.spawnWave` spawns every enemy around one fixed
     *      point (`ENEMY_SPAWN_X`, +/-40/+/-30 jitter) and each one then steers radially at its
     *      archetype's fixed speed toward the same mage — so same-speed peers converge back onto
     *      a single point during the entire approach and only ever un-stacked after arriving.
     *      That approach is most of what the player actually watches.
     *   2. Separation was applied only against same-archetype peers, so a melee enemy could stand
     *      exactly inside a ranged enemy (and did, every time one ran through the other's hold band
     *      on its way to the mage) with zero mutual push.
     *
     * Fix: hoist separation out of the individual branches into one post-processing step applied
     * to whatever base velocity the branch chose, against every nearby enemy of any archetype.
     *
     * The third root cause was a force-balance one — see `ARCHETYPE_SPEED` above and
     * `ENEMY_SEPARATION_SPEED` in `enemySeparation.ts`.
     *
     * None of this disturbs the deliberately non-overlapping preferred-range bands (240 ranged /
     * 150 debuffer / 34 melee, all distances from the *mage*): `ENEMY_SEPARATION_DISTANCE` is
     * 40px, still shorter than the ~50px gap between adjacent bands, so the push can only ever
     * resolve genuine sprite overlap between two enemies. It never has the reach to shove one
     * out of its own band. Nor does it stall a chase — separation is a bounded addition to the
     * chase vector, not a replacement for it, so a crowded chaser fans out sideways while still
     * closing (asserted by `enemySeparation.test.ts`'s "still lets a crowded chaser close").
     */
    const applyVelocity = (baseVelocity: Point): void => {
      const velocity = addSeparationVelocity(
        baseVelocity,
        { x: this.x, y: this.y, separationId: this.separationId },
        nearbyEnemies,
        ENEMY_SEPARATION_DISTANCE,
        ENEMY_SEPARATION_SPEED
      );
      body.setVelocity(velocity.x, velocity.y);
    };

    if (this.archetype === "melee") {
      if (distance > MELEE_RANGE) {
        applyVelocity({ x: direction.x * ARCHETYPE_SPEED.melee, y: direction.y * ARCHETYPE_SPEED.melee });
      } else {
        // Issue #110 — see `MELEE_STRAFE_SPEED`'s own comment: strafe perpendicular to the
        // hold-range line (same bounce logic `rangedStrafe.ts` ships for the ranged
        // archetype, via `strafeVelocity`) instead of stopping dead, and push off any
        // too-close ally (`enemySeparation.ts`) instead of stacking on top of it.
        const strafe = this.strafeVelocity(direction, MELEE_STRAFE_SPEED);
        applyVelocity({ x: strafe.x, y: strafe.y });
        if (this.attackCooldownMs <= 0) {
          this.attackCooldownMs = MELEE_COOLDOWN_MS;
          callbacks.onMeleeHit?.();
        }
      }
      return;
    }

    const preferredRange = this.archetype === "ranged" ? RANGED_PREFERRED_RANGE : DEBUFFER_PREFERRED_RANGE;
    const speed = ARCHETYPE_SPEED[this.archetype];
    if (distance > preferredRange + 20) {
      this.wallSlideWantsNegativeY = null;
      applyVelocity({ x: direction.x * speed, y: direction.y * speed });
    } else if (distance < preferredRange - 20) {
      const retreatX = -direction.x * speed;
      const retreatY = -direction.y * speed;
      const blockedRight = retreatX > 0 && this.x >= this.lane.right - WALL_SLIDE_MARGIN;
      const blockedLeft = retreatX < 0 && this.x <= this.lane.left + WALL_SLIDE_MARGIN;
      const blockedBottom = retreatY > 0 && this.y >= this.lane.bottom - WALL_SLIDE_MARGIN;
      const blockedTop = retreatY < 0 && this.y <= this.lane.top + WALL_SLIDE_MARGIN;
      if (blockedRight || blockedLeft || blockedBottom || blockedTop) {
        // Retreat is blocked by the lane bounds — slide perpendicular to the retreat
        // vector (toward the lane's centerline) instead of pinning nose-first against
        // the wall, per Warden's wall-slide spec (backlog 2.10).
        //
        // Fix (Heckler, 2026-07-25): a fixed per-position sign flipped on this.y alone
        // was correct for the left/right short-end case but wrong for top/bottom
        // long-wall blocks, where the perpendicular candidate's own y-sign depends on
        // direction.x — multiplying the whole vector by a single scalar could still
        // drive the y-component away from center. Instead, pick whichever orientation of
        // the perpendicular actually has a y-component pointing toward the centerline.
        //
        // Fix (2026-08-06, backlog/issue #95 follow-up): the line above re-derived
        // "which way is toward the centerline" from live position every single frame —
        // the instant this branch's own corrective slide crossed the exact centerline,
        // the target flipped again, driving it back across every frame indefinitely (a
        // persistent limit cycle, confirmed by direct simulation before touching this
        // code). Now decided once per wall-slide episode via `wallSlideDirection.ts` and
        // persisted on `wallSlideWantsNegativeY` until the retreat is no longer blocked.
        const perpendicular = new Phaser.Math.Vector2(direction.y, -direction.x);
        this.wallSlideWantsNegativeY = resolveWallSlideWantsNegativeY(
          this.y,
          this.lane.centerY,
          this.wallSlideWantsNegativeY
        );
        if (
          (this.wallSlideWantsNegativeY && perpendicular.y > 0) ||
          (!this.wallSlideWantsNegativeY && perpendicular.y < 0)
        ) {
          perpendicular.negate();
        }
        applyVelocity({ x: perpendicular.x * speed, y: perpendicular.y * speed });
      } else {
        this.wallSlideWantsNegativeY = null;
        applyVelocity({ x: retreatX, y: retreatY });
      }
    } else if (this.archetype === "ranged") {
      this.wallSlideWantsNegativeY = null;
      // backlog/issue #95 — developer: "the archers are always at the same spot, so its
      // easier to kill them". Stopping dead in-band (the old behavior, still used by
      // Debuffer below) combined with always approaching from the same spawn point along a
      // purely radial line made a ranged enemy's resting position fully deterministic.
      // Strafe perpendicular to the hold-range line instead, bouncing off the lane's
      // top/bottom edges rather than stopping there — see `rangedStrafe.ts` for the tested
      // bounce decision, and `strafeVelocity` for the shared mechanics issue #110 factored
      // out once the melee archetype needed this same shape too.
      const strafe = this.strafeVelocity(direction, RANGED_STRAFE_SPEED);
      applyVelocity({ x: strafe.x, y: strafe.y });
    } else {
      this.wallSlideWantsNegativeY = null;
      applyVelocity({ x: 0, y: 0 });
    }

    if (distance <= preferredRange + 40 && this.attackCooldownMs <= 0) {
      if (this.archetype === "ranged") {
        this.attackCooldownMs = RANGED_COOLDOWN_MS;
        callbacks.onRangedFire?.(this.x, this.y, targetX, targetY);
      } else if (this.combatState.beginDebuffTelegraph(DEBUFFER_TELEGRAPH_MS)) {
        // Issue #237 — reset the cooldown here, the same instant the old code fired
        // instantly, so the wind-up/travel added below sits inside the existing cadence
        // rather than lengthening it (see this file's `DEBUFFER_TELEGRAPH_MS` comment).
        this.attackCooldownMs = DEBUFFER_COOLDOWN_MS;
        callbacks.onDebuffTelegraphStart?.(this.x, this.y, this.debuffVariant);
      }
    }
  }
}
