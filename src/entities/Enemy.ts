import Phaser from "phaser";
import type { DebuffVariant, EnemyArchetype } from "../data/types";
import { archetypeDisplayName, computeHpBarColor, computeHpFraction } from "../systems/enemyStatusOverlay";
import { RANGED_STRAFE_SPEED, computeStrafeDirection } from "../systems/rangedStrafe";
import { computeSettledEnemyVelocity, type Point } from "../systems/enemySeparation";
import { resolveWallSlideWantsNegativeY } from "../systems/wallSlideDirection";
import { enemySpriteKey } from "../systems/characterArt";

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
/** Issues #110/#138 — how close same-archetype enemies can get before pushing apart;
 * sized a little larger than the 26x26 sprite footprint (`Enemy.ensureTexture`) so the push
 * fires just before sprites visibly overlap, not only after. Same "explicit engine-feel
 * number, not Pato's scope" reasoning as `MELEE_STRAFE_SPEED` above. */
const ENEMY_SEPARATION_DISTANCE = 32;
const ENEMY_SEPARATION_SPEED = 40;
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
const DEBUFFER_COOLDOWN_MS = 2500;
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
 * backlog 2.19 / issue #26 — live name+HP-bar overlay geometry. The sprite itself is a
 * generated 26x26 texture centered on (x, y) (see `ensureTexture`), so these are small
 * fixed offsets from that center rather than anything derived from a per-archetype size
 * (every archetype currently shares the same 26x26 footprint).
 */
const STATUS_BAR_WIDTH = 28;
const STATUS_BAR_HEIGHT = 4;
const STATUS_BAR_OFFSET_Y = -20;
const STATUS_LABEL_OFFSET_Y = -28;
let nextSeparationId = 1;

export interface EnemyCallbacks {
  onMeleeHit?: () => void;
  onRangedFire?: (fromX: number, fromY: number, toX: number, toY: number) => void;
  onDebuffPulse?: (variant: DebuffVariant) => void;
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  /** Issues #110/#138 — stable tie-breaker for enemies spawned at the exact same point. */
  public readonly separationId = nextSeparationId++;
  public readonly archetype: EnemyArchetype;
  public readonly maxHp: number;
  public hp: number;
  /** Issue #71 — the spawning wave's `damage_modifier`, applied by the scene's own damage
   * callbacks (`ARCHETYPE_DAMAGE[archetype] * enemy.damageModifier`) rather than here, since
   * `ARCHETYPE_DAMAGE` is a flat per-archetype constant read at hit time, not per-enemy state. */
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
  /** backlog 2.19 / issue #26 — sibling GameObjects, not children of this Sprite (Phaser
   * Arcade Sprites don't support a display-container parent/child relationship the way
   * Containers do). Phaser does NOT destroy these automatically just because this sprite
   * gets destroyed, so `destroy()` below is overridden to clean them up explicitly. */
  private readonly nameLabel: Phaser.GameObjects.Text;
  private readonly statusBar: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    archetype: EnemyArchetype,
    debuffVariant: DebuffVariant = "speed",
    private readonly lane: Phaser.Geom.Rectangle = new Phaser.Geom.Rectangle(0, 0, Infinity, Infinity),
    /** Issue #71 — `WaveDefinition.hp_modifier`/`.damage_modifier`, previously authored but
     * never read. Defaults to 1 (unscaled) so every existing call site stays correct as-is. */
    hpModifier = 1,
    damageModifier = 1
  ) {
    super(scene, x, y, Enemy.ensureTexture(scene, archetype));
    this.archetype = archetype;
    this.maxHp = Math.round(PLACEHOLDER_ENEMY_HP[archetype] * hpModifier);
    this.hp = this.maxHp;
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
    // from (see `ENEMY_SEPARATION_DISTANCE`'s own comment, which is sized relative to this
    // exact 26x26 figure). Explicit `setDisplaySize`/body `setSize` keep both the on-screen
    // footprint and the hit box unchanged at 26x26 regardless of the backing texture's native
    // size — a pure visual swap, per the ticket's own "collision/attack geometry unaffected"
    // acceptance criterion.
    this.setDisplaySize(26, 26);
    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setSize(26, 26);
    // backlog 2.10 — mirror the mage's own lane clamp (SpellroadScene.createMage); enemies
    // previously only had the full-canvas default, and could wander outside the visible lane.
    (this.body as Phaser.Physics.Arcade.Body).setBoundsRectangle(this.lane);

    // backlog 2.19 / issue #26 — name label + live HP bar, drawn once here so a freshly
    // spawned enemy already shows full HP instead of waiting for its first `update()` call.
    this.nameLabel = scene.add.text(x, y + STATUS_LABEL_OFFSET_Y, archetypeDisplayName(archetype), {
      color: "#f3e7c2",
      fontFamily: "monospace",
      fontSize: "10px"
    });
    this.nameLabel.setOrigin(0.5, 1);
    this.statusBar = scene.add.graphics();
    this.refreshStatusOverlay();
  }

  /**
   * Issue #163 — real sprite art (`characterArt.ts`, one CC0 Tiny Creatures tile per
   * archetype) replaces the old `fillRoundedRect` flat-color-square placeholder. The scene's
   * own `preload()` loads each archetype's key via `this.load.image(enemySpriteKey(a), ...)`
   * before any wave can spawn an `Enemy`, so the normal path here is just "the key already
   * exists in the texture cache, return it." The `fillRoundedRect` fallback is kept, not
   * deleted, for the one case that isn't true — a caller that never ran that preload (e.g. a
   * future isolated unit test constructing an `Enemy` directly against a bare Scene) — so a
   * missing preload degrades to the old flat-color square instead of Phaser throwing on a
   * missing texture key.
   */
  private static ensureTexture(scene: Phaser.Scene, archetype: EnemyArchetype): string {
    const key = enemySpriteKey(archetype);
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
    this.hp -= amount;
    return this.hp <= 0;
  }

  /**
   * backlog 2.19 / issue #26 — repositions the name label + HP bar above the sprite's
   * current position and redraws the bar's fill from current `hp`/`maxHp`. Called once from
   * the constructor (so a freshly spawned enemy already shows full HP) and once per frame
   * from `update()` below (so the bar tracks both movement and any damage landed since the
   * last frame — `takeDamage` itself only mutates `hp`, it doesn't touch the overlay).
   * The fraction/color arithmetic is the pure, testable part (`enemyStatusOverlay.ts`); this
   * method is purely the Phaser-side wiring (position two GameObjects, draw two rects).
   */
  private refreshStatusOverlay(): void {
    this.nameLabel.setPosition(this.x, this.y + STATUS_LABEL_OFFSET_Y);

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
  }

  /**
   * Phaser does not automatically destroy manually-added sibling GameObjects (the name
   * label/HP bar) just because this Sprite gets destroyed — they aren't children of it, just
   * two other GameObjects this class happens to keep positioned above it. Every current
   * despawn path (`SpellroadScene.removeEnemy` and the death-reset `forEach` in
   * `handleDeath`) calls `enemy.destroy()` directly, so overriding it here is the one place
   * that guarantees the overlay never outlives the enemy it was drawn for, regardless of
   * which call site triggered the destroy.
   */
  destroy(fromScene?: boolean): void {
    this.nameLabel.destroy();
    this.statusBar.destroy();
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
    /** Issues #110/#138 — positions of currently-alive same-archetype allies, so settled
     * melee/ranged/debuffer enemies cannot overlap or co-travel as one target. */
    sameArchetypeEnemies: Point[] = []
  ): void {
    this.refreshStatusOverlay();
    this.attackCooldownMs = Math.max(0, this.attackCooldownMs - deltaMs);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const toTarget = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y);
    const distance = toTarget.length();
    const direction = distance === 0 ? new Phaser.Math.Vector2(0, 0) : toTarget.clone().normalize();

    if (this.archetype === "melee") {
      if (distance > MELEE_RANGE) {
        body.setVelocity(direction.x * ARCHETYPE_SPEED.melee, direction.y * ARCHETYPE_SPEED.melee);
      } else {
        // Issue #110 — see `MELEE_STRAFE_SPEED`'s own comment: strafe perpendicular to the
        // hold-range line (same bounce logic `rangedStrafe.ts` ships for the ranged
        // archetype, via `strafeVelocity`) instead of stopping dead, and push off any
        // too-close melee ally (`enemySeparation.ts`) instead of stacking on top of it.
        const strafe = this.strafeVelocity(direction, MELEE_STRAFE_SPEED);
        const velocity = computeSettledEnemyVelocity(
          this.archetype,
          { x: strafe.x, y: strafe.y },
          { x: this.x, y: this.y, separationId: this.separationId },
          sameArchetypeEnemies,
          ENEMY_SEPARATION_DISTANCE,
          ENEMY_SEPARATION_SPEED
        );
        body.setVelocity(velocity.x, velocity.y);
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
      body.setVelocity(direction.x * speed, direction.y * speed);
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
        body.setVelocity(perpendicular.x * speed, perpendicular.y * speed);
      } else {
        this.wallSlideWantsNegativeY = null;
        body.setVelocity(retreatX, retreatY);
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
      const velocity = computeSettledEnemyVelocity(
        this.archetype,
        { x: strafe.x, y: strafe.y },
        { x: this.x, y: this.y, separationId: this.separationId },
        sameArchetypeEnemies,
        ENEMY_SEPARATION_DISTANCE,
        ENEMY_SEPARATION_SPEED
      );
      body.setVelocity(velocity.x, velocity.y);
    } else {
      this.wallSlideWantsNegativeY = null;
      const velocity = computeSettledEnemyVelocity(
        this.archetype,
        { x: 0, y: 0 },
        { x: this.x, y: this.y, separationId: this.separationId },
        sameArchetypeEnemies,
        ENEMY_SEPARATION_DISTANCE,
        ENEMY_SEPARATION_SPEED
      );
      body.setVelocity(velocity.x, velocity.y);
    }

    if (distance <= preferredRange + 40 && this.attackCooldownMs <= 0) {
      if (this.archetype === "ranged") {
        this.attackCooldownMs = RANGED_COOLDOWN_MS;
        callbacks.onRangedFire?.(this.x, this.y, targetX, targetY);
      } else {
        this.attackCooldownMs = DEBUFFER_COOLDOWN_MS;
        callbacks.onDebuffPulse?.(this.debuffVariant);
      }
    }
  }
}
