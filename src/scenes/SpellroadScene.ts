import Phaser from "phaser";
import type { AoEShape, DebuffVariant, Element, MasteryTier, SpellDefinition, WaveDefinition } from "../data/types";
import spellsData from "../data/spells/spells.json";
import wavesLevel1Data from "../data/waves/level-1.json";
import wavesLevel2Data from "../data/waves/level-2.json";
import wavesLevel3Data from "../data/waves/level-3.json";
import wavesLevel4Data from "../data/waves/level-4.json";
import wavesBoss1Data from "../data/waves/boss-1.json";
import { HealthSystem, MAX_HP } from "../systems/HealthSystem";
import { ManaSystem, MANA_REGEN_PER_SEC, MAX_MANA } from "../systems/ManaSystem";
import { MasterySystem } from "../systems/MasterySystem";
import { HexcoinSystem, FEE_PHASE_RECOVERY, PHASE_RECOVERY_HP_FRACTION, MAX_RECOVERIES_HARD_CAP } from "../systems/HexcoinSystem";
import { DebuffSystem } from "../systems/DebuffSystem";
import { computeDebuffMagnitude, formatDebuffHudLines } from "../systems/debuffDisplay";
import { archetypeDisplayName, computeHpBarColor, computeHpFraction } from "../systems/enemyStatusOverlay";
import { SpellCaster, SHAPE_GEOMETRY } from "../entities/SpellCaster";
import { Enemy, ARCHETYPE_DAMAGE } from "../entities/Enemy";
import { spawnWave } from "../systems/WaveLoader";
import { ENEMY_REGISTRY } from "../data/enemyRegistry";
import { countSpawnableEnemies } from "../systems/waveEnemyCounts";
import { selectDefaultLoadout } from "../systems/defaultLoadout";
import { selectAutoAimTarget } from "../systems/autoAim";
import { isStillInRangedImpactZone } from "../systems/rangedImpact";
import { WaveSession, canResolveEncounterChoice, canResolvePhaseChoice, shouldAutoAdvance } from "../systems/waveSession";
import {
  evaluateSidePocketOffer,
  resolveSidePocketExplore,
  shouldShowSidePocketHint,
  SIDE_POCKET_HINT_TEXT
} from "../systems/sidePocketEncounter";
import { SIDE_POCKET_ENCOUNTERS, type SidePocketEncounter } from "../data/sidePocketEncounters";
import { allRemainingAreYieldingDebuffers } from "../systems/lastEnemyStanding";
import { hasRecentPointerActivity } from "../systems/pointerActivity";
import {
  computeCooldownDisplay,
  computeHotbarSlotRects,
  formatShapeWeightTag,
  hotbarSlotIndexAtPoint,
  nextHotbarIndex,
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
import { ALL_ENEMY_ARCHETYPES, MAGE_SPRITE_KEY, MAGE_SPRITE_URL, enemySpriteKey, enemySpriteUrl } from "../systems/characterArt";
import {
  ALL_CAST_ELEMENTS,
  ALL_SFX_CUES,
  elementCastSfxKey,
  elementCastSfxUrl,
  sfxKey,
  sfxUrl
} from "../systems/sfx";
import { computeSfxVariation, computeSpellSfxVariation } from "../systems/sfxVariation";
import {
  BOSS_THEME_KEY,
  BOSS_THEME_URL,
  BOSS_THEME_VOLUME,
  COMBAT_CUE_KEY,
  COMBAT_CUE_URL,
  COMBAT_CUE_VOLUME,
  EXPLORATION_LOOP_FADE_IN_MS,
  EXPLORATION_LOOP_FADE_IN_START_VOLUME,
  EXPLORATION_LOOP_KEYS,
  EXPLORATION_LOOP_URLS,
  EXPLORATION_LOOP_VOLUME,
  pickExplorationTrack,
  shouldPlayCombatCueForWave,
  shouldPlayExplorationLoopBetweenWaves,
  type ExplorationLoopKey
} from "../systems/bgm";
import {
  OPENING_VFX_CAST_ANIM_KEY,
  OPENING_VFX_CAST_FRAME,
  OPENING_VFX_CAST_KEY,
  OPENING_VFX_CAST_URL,
  OPENING_VFX_IMPACT_ANIM_KEY,
  OPENING_VFX_IMPACT_FRAME,
  OPENING_VFX_IMPACT_KEY,
  OPENING_VFX_IMPACT_URL,
  OPENING_VFX_TRAIL_ANIM_KEY,
  OPENING_VFX_TRAIL_FRAME,
  OPENING_VFX_TRAIL_KEY,
  OPENING_VFX_TRAIL_URL
} from "../systems/openingVfx";
import {
  buildSaveBlob,
  prepareGameProgress,
  type PersistentMetadata,
  type SpellroadStartData
} from "../systems/gameProgress";
import { writeSave } from "../systems/SaveSystem";
import { resolveDebugStartWave } from "../systems/debugStart";

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
/** Issue #234 — an off-number-row alternate binding for arming hotbar slots 1-6, added
 * alongside (not replacing) `HOTBAR_KEYS` above, so a player can arm a spell without taking
 * a hand off WASD to reach the number row. Developer decision (2026-08-13), corrected during
 * 2026-08-14 re-triage: the original scheme's slot-1 key (`E`) collided with the Side-Pocket
 * Lore Encounter's `keydown-E` Explore prompt (see `startSidePocketChoice` below) — `Q` is
 * used for slot 1 instead. Same index-order convention as `HOTBAR_KEYS`: position N binds
 * hotbar slot N. */
const HOTBAR_SECONDARY_KEYS = ["Q", "R", "F", "SHIFT", "CTRL", "SPACE"] as const;
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
 * anything. Not reachable with the shipped `spells.json` (exactly 6 spells carry a
 * `default_loadout_slot`), but `equippedSpells`/`HOTBAR_KEYS` don't guarantee equal length —
 * a future re-curation with fewer than 6 slotted spells is real data, not just a hypothetical
 * — so handled rather than assumed. */
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
/** backlog 2.37 / issue #80 — developer playtest: "Not enough Mana" reads as flat gold-on-dark
 * text identical to every other transient flashMessage (a Level-up beat, a level transition
 * banner), so a rejection warning has no visual weight of its own and gets lost mid-combat.
 * `flashMessage`'s `emphasis` param (default vs warning) swaps color + gives the warning case an
 * opaque background panel (the default case stays fully transparent, matching every other
 * existing flashMessage call site's prior look exactly, so this is additive, not a redesign of
 * the shared banner). */
const MESSAGE_DEFAULT_COLOR = "#f3e7c2";
const MESSAGE_WARNING_COLOR = "#ffb4a8";
const MESSAGE_WARNING_BG = "#4a1f1f";
/** Issue #117 — developer playtest: "its also not clear when you advanced on the spells
 * levels, at level 5 i felt it was easier to kill the monsters." The tier-up notification has
 * existed since the very first engine commit (2026-07-22) and `MasterySystem`'s own trigger
 * logic is correct (see `MasterySystem.test.ts`, added alongside this fix) — a player played
 * through 4 full levels without ever registering it firing regardless. Backs `tierUpText`
 * (see its own comment for why that's a dedicated element, not a `flashMessage` emphasis):
 * gold/dark-gold rather than backlog 2.37/#80's salmon/dark-red, since this is a reward beat,
 * not a warning. */
const MESSAGE_MILESTONE_COLOR = "#ffe08a";
const MESSAGE_MILESTONE_BG = "#332a0f";
/** backlog 2.33 / issue #76 — developer full playtest of #30: "add floating HP/Mana status
 * bars above the player (Tibia-style)". `Enemy.ts` already draws exactly this pattern per
 * enemy (backlog 2.19); this reuses that same fraction/color arithmetic
 * (`enemyStatusOverlay.ts`'s `computeHpFraction`/`computeHpBarColor`, both generic ratio
 * helpers despite the module's enemy-facing name) rather than inventing a second one. Sized a
 * little wider than `Enemy.ts`'s 28px (the mage's 32x32 sprite vs. an enemy's 26x26) and offset
 * further up so two stacked bars (HP then Mana) both clear the sprite's top edge.
 * `PLAYER_MANA_BAR_COLOR` is a single fixed tone rather than banded: Mana running low isn't a
 * danger signal the way HP is (no death is triggered by 0 Mana), so a red "critical" band would
 * misread as a threat that isn't there. */
const PLAYER_STATUS_BAR_WIDTH = 36;
const PLAYER_STATUS_BAR_HEIGHT = 5;
const PLAYER_STATUS_BAR_GAP = 3;
const PLAYER_STATUS_BAR_HP_OFFSET_Y = -30;
const PLAYER_MANA_BAR_COLOR = 0x4a90d9;
/** backlog 2.36 / issue #79 — developer full playtest of #30: "spell casts/impacts have no
 * visual effect — combat reads as flat now that the full engine loop is confirmed working
 * end to end." Scoped to the ticket's own floor: one lightweight flash per AoE shape at cast
 * time (`spawnCastEffect`) plus a small burst at each individual hit (`spawnImpactBurst`), not
 * a full particle/VFX subsystem. Tinted by the spell's own element (`spellIcons.ts` already
 * establishes fire/ice/lightning/earth as this project's visual-identity axis for a spell, via
 * the hotbar icon — reusing that same axis here rather than inventing a second color scheme). */
const ELEMENT_EFFECT_COLOR: Record<Element, number> = {
  fire: 0xff6b3d,
  ice: 0x7fd8f0,
  lightning: 0xf5e14a,
  earth: 0x8a6b3d
};
/** backlog 2.13 — the enemy ranged-attack projectile/impact color, deliberately distinct from
 * every `ELEMENT_EFFECT_COLOR` entry and every enemy archetype's own sprite tint (see
 * `spawnRangedProjectile`'s own comment on why "a color that doesn't match any enemy body" was
 * the original fix for the shot not being noticed). Named out of the original inline literal
 * (issue #164) since it's now read from 3 call sites (`spawnRangedProjectile`,
 * `spawnEnemyRangedImpactVfx`) instead of 1. */
const ENEMY_THREAT_COLOR = 0xff3b3b;
const CAST_EFFECT_DURATION_MS = 220;
const IMPACT_BURST_DURATION_MS = 260;
/** Issue #164 — real animated cast/impact VFX for the 3 elements `spawnOpeningVfxCast` never
 * covered (see `systems/openingVfx.ts`'s own module comment: there is no developer-reviewed
 * CC0 Remix sprite art for ice/earth/lightning, and re-tinting fire's specific sprites would be
 * a muddy, never-reviewed guess). Procedurally generated instead of sourced: a runtime particle
 * burst per element, tinted by the same `ELEMENT_EFFECT_COLOR` axis, distinct in speed/spread/
 * gravity per element so ice/earth/lightning still read as different from each other, not just
 * three colors of the same effect. `undefined` for fire on purpose — fire keeps its own sourced
 * sprite-sheet treatment via `spawnOpeningVfxCast`/`spawnImpactBurst`'s existing fire branch. */
interface ElementalCastVfxConfig {
  color: number;
  particleRadius: number;
  quantity: number;
  speedMin: number;
  speedMax: number;
  lifespanMs: number;
  scaleStart: number;
  gravityY: number;
  spreadDeg: number;
  /** Issue #185 — additive blending so overlapping particles brighten toward white instead of
   * staying a flat tint, the concrete fix for "too subtle and washed out." Only set for
   * materials that plausibly emit light (ice/crystal); left off for earth's opaque debris,
   * where a glow would read as wrong-material rather than "more visible." */
  glow?: boolean;
  /** Issue #185 — the impact-side burst (`spawnElementalImpactVfx`) shared one flat quantity of
   * 6 across all 3 elements; ice/earth were the ones the developer flagged as reading as too
   * few particles, so only those two get a bump here. Lightning is left at the implicit default
   * (6) since the developer confirmed it already reads fine. */
  impactQuantity?: number;
}
const ELEMENTAL_CAST_VFX_CONFIG: Partial<Record<Element, ElementalCastVfxConfig>> = {
  // Issue #185 — developer playtest: ice read as "too subtle and washed out, too few
  // particles... not so visible like lightning or fire," and asked for "more white-blue-purple"
  // rather than the previous pale, near-monotone cyan. Shifted the hue toward blue-purple and
  // turned on additive glow (see `glow`'s own comment) — dense overlap among the particles
  // brightens toward white, giving the white/blue/purple range in one animated burst instead of
  // a flat single tint. Particle count, radius and lifespan all raised to read as a fuller burst.
  ice: {
    color: 0x7ea8ff,
    particleRadius: 5,
    quantity: 22,
    speedMin: 150,
    speedMax: 280,
    lifespanMs: 460,
    scaleStart: 1.2,
    gravityY: 60,
    spreadDeg: 22,
    glow: true,
    impactQuantity: 11
  },
  // Issue #185 — developer playtest: earth read as washed out with too few particles and the
  // "wrong material," asking for "something more brown/greenish." Previous color (0xa9814a) was
  // a flat tan with no green in it; shifted toward an olive brown-green and raised particle
  // count/scale for a chunkier, more visible burst. No `glow` here — debris is opaque, not
  // light-emitting, so additive blending would read as the wrong material, not just "brighter."
  earth: {
    color: 0x7c8f42,
    particleRadius: 6,
    quantity: 18,
    speedMin: 100,
    speedMax: 200,
    lifespanMs: 500,
    scaleStart: 1.3,
    gravityY: 260,
    spreadDeg: 30,
    impactQuantity: 11
  },
  // Fast, short-lived, near-zero gravity sparks, tightest spread — reads as a quick jolt rather
  // than a lobbed effect. Paired with `spawnLightningBoltFlicker`'s jagged bolt for the beat
  // particles alone can't sell (a bolt, not just sparks).
  lightning: {
    color: 0xfff6b0,
    particleRadius: 3,
    quantity: 18,
    speedMin: 220,
    speedMax: 380,
    lifespanMs: 260,
    scaleStart: 0.9,
    gravityY: 0,
    spreadDeg: 14
  }
};
/** backlog 2.35 / issue #78 — developer full playtest of #30: add an onboarding prompt
 * explaining hotbar targeting. Sized to the ticket's own floor (a one-time overlay/hint), not
 * a full tutorial system — see the ticket's own note that this may later fold into the
 * Boot/Title scene work (5.8) instead; kept standalone here since 5.8's own scope (scene flow,
 * not in-gameplay teaching copy) doesn't have a natural slot for combat-specific instructions. */
const ONBOARDING_HINT_TEXT =
  "Press 1-6 to aim a spell.\nPress it again (or click) to fire — Esc or right-click cancels.";
// Issue #233 (replaces #197) — developer decision, 2026-08-13: the hint used to double as the
// "spell armed" signal, so `handleHotbarPress` dismissed it the instant the player pressed a
// hotbar key at all — before they could read past the first line. The fallback window is
// widened from the old 9s to a full 60s now that dismissal no longer piggybacks on the first
// hotbar press; the player reads it at their own pace (click or the designated key below) and
// this is now genuinely a last-resort timeout, not the expected dismiss path.
const ONBOARDING_HINT_FALLBACK_MS = 60000;
/** backlog 4.10 / issue #96 — developer full playtest (2026-08-05): "nothing shows this is
 * the Director trial, no clear mini boss." Lorena's intro/outro narration (`lorena/log.md`,
 * 2026-07-30) was already written and Heckler-cleared, just never given a display surface.
 * Displayed verbatim (Loomwright doesn't author or edit lore) at the boss encounter's first
 * phase (intro) and at trial victory (outro, destroy-ending only — this vertical slice's only
 * shipped ending path). Deliberately its own element, not `flashMessage`/`onboardingHintText`
 * reused: a serif/italic treatment (matching `levelWaveText`'s existing Georgia serif rather
 * than the HUD's monospace) plus a wider word-wrapped panel is what makes it "clearly read as
 * the mini-boss," the developer's own framing of the gap. */
const BOSS_BANNER_INTRO_TEXT =
  "The trial chamber closes behind you with no sound of a door — only the hex-lines in the " +
  "floor brightening, one ring at a time, like a spell being read aloud. At the center, atop a " +
  "raised stone dais worn smooth by however many trials came before yours, the Director's " +
  "avatar assembles itself out of the same sacred geometry that built the Road: too " +
  "smooth, too attentive, more curious than cruel. You feel measured rather than hated, the way " +
  "a lesson feels measured, and understand, distantly, that surviving this is not escape — it " +
  "is only passing the part of the test that lets you keep walking. The Invigilator turns " +
  "toward you, unhurried, and begins.";
const BOSS_BANNER_OUTRO_TEXT =
  "The Invigilator's geometry comes apart the way frost leaves a window — not shattered, just " +
  "no longer held together, its hex-lines guttering into ordinary dark stone. For one long " +
  "moment there is a quiet the Road has never given you before, unscored by any generated " +
  "thing. You do not feel triumphant so much as tired, and faintly, uselessly sorry — this was " +
  "also, once, someone's careful work. Somewhere in the ledger a line closes; you do not know " +
  "yet whether the Director notices, or minds, or is already writing the next trial. The road " +
  "ahead stays exactly as endless as it was an hour ago, and you walk it anyway.";
/** Issue #183 — a UI-only confirm hint appended at the outro banner's call site, not folded
 * into `BOSS_BANNER_OUTRO_TEXT` itself: Loomwright doesn't author or edit Lorena's lore prose
 * (see that constant's own comment), and this line is pure interface chrome (the same shape as
 * `startPhaseBreak`'s "[Y] Pay ... / [N] Refuse" suffix), not narration. */
const BOSS_BANNER_OUTRO_CONFIRM_HINT = "\n\n[Y] Continue";
/** Issue #236 (replaces #206, closed — full triage/decision history there) — the vertical
 * slice's actual win acknowledgment. Developer decision (2026-08-13): replace the flat
 * `flashMessage("Vertical slice complete!", 3000)` (identical to any other transient status
 * flash, so a full clear read the same as being stuck with nothing left to fight) with a
 * distinct, clearly-a-win banner — same visual language as the existing boss intro/outro
 * narration (`showBossBanner`), framed as victory rather than a status readout. Placeholder
 * victory line: Loomwright owns the scene's win/completion flow per the issue, and drafting a
 * placeholder here doesn't require Lorena's voice (her outro narration, `BOSS_BANNER_OUTRO_TEXT`,
 * already plays first and is untouched by this addition — see `showWinBanner`'s own comment). */
const WIN_BANNER_TEXT =
  "Victory\n\nYou survived the Spellroad — every trial cleared, every foe that stood in your " +
  "way, gone. The road ahead is yours to keep walking, whenever you're ready.";
/** Same confirm-hint shape as `BOSS_BANNER_OUTRO_CONFIRM_HINT`, kept as its own constant
 * rather than reused: that one is scoped to the outro banner specifically by name/comment, and
 * this one has its own acceptance criteria (no forced post-win flow) governing what dismissing
 * it does — currently nothing beyond closing the banner. */
const WIN_BANNER_CONFIRM_HINT = "\n\n[Y] Continue";
/** Issue #113 — developer playtest found the outro banner (110 words) vanished on the same
 * flat timer as the intro (85 words), regardless of reading speed. Auto-hide is a fallback for
 * a player who never clicks/presses a key to dismiss (see `showBossBanner`'s own comment for
 * the early-dismiss path) — it now scales with the text's own word count instead of a single
 * constant, at a conservative ~200wpm reading pace, floored so a hypothetical future
 * short banner still gets a sensible minimum hold. */
const BOSS_BANNER_MIN_DISPLAY_MS = 9000;
const BOSS_BANNER_MS_PER_WORD = 300;
/** Issue #116 — see `bossNameText`'s own comment. Names the encounter's actual boss
 * explicitly rather than just its title, since the fight's individual enemies (ordinary
 * registry archetypes per `boss-1.json`) keep showing their own archetype label — e.g. a
 * Debuffer-archetype enemy's name tag still reads "The Tarrywright" — throughout the fight;
 * "wears many faces" preempts the "wait, which one is the real boss?" confusion that could
 * otherwise cause, without this HUD element having to override those per-enemy labels too. */
const BOSS_NAME_TEXT = "⚔ The Invigilator — wears many faces this fight";
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
/** Issue #157 — the Side-Pocket rune markers sit on the ground, above the tile art but below
 * every default-depth (0) mage/enemy sprite, same "explicit depth regardless of creation
 * order" reasoning as `TILE_LAYER_DEPTH` above (markers are created once in `create()`,
 * before any enemy of the level they belong to spawns). */
const SIDE_POCKET_MARKER_DEPTH = -1;
/** Radius (px) of the small ground-rune marker itself; proximity reactivity uses each
 * encounter's own larger `proximityRadiusPx` from the catalog. */
const SIDE_POCKET_MARKER_RADIUS_PX = 10;
/** Issue #157 story 29 / Heckler MAJOR finding 1 — restrained static dressing around each
 * rune marker: 3 small, muted pebbles at fixed offsets, well within the encounter's own
 * `proximityRadiusPx` so they read as belonging to the same small feature rather than
 * scattered clutter across the lane. */
const SIDE_POCKET_DRESSING_OFFSETS: ReadonlyArray<{ dx: number; dy: number; radius: number }> = [
  { dx: -16, dy: -7, radius: 3 },
  { dx: 13, dy: -10, radius: 4 },
  { dx: -6, dy: 13, radius: 3 }
];
/** Heckler critique, 2026-08-02 (8), MAJOR 1: none of the HUD text objects ever called
 * `setDepth`, so they sat at the same default depth (0) as every `Enemy` and its own
 * `nameLabel`/`statusBar` overlay (`Enemy.ts` — also never sets one). Phaser breaks
 * equal-depth ties by display-list insertion order, and enemies are constructed (and thus
 * inserted) after `createHud()` already ran, so an enemy's name label could paint over the
 * top-right Level/Wave and debuff HUD boxes whenever it wandered into that screen region —
 * reachable in ordinary play, not a contrived edge case (see Heckler's finding for the exact
 * lane-clamp-rectangle overlap math). Deliberately picked a value distinct from
 * `spawnRangedProjectile`'s own `dot.setDepth(1000)` (that one only means "above every other
 * *world* object", a different, narrower stacking claim than "above literally everything,
 * always") rather than reusing 1000 for a different intended meaning. HUD must win against
 * that projectile too, not just against enemies, hence a value clearly above it. */
const UI_DEPTH = 2000;
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
 * weight class, spanning shape and element as widely as 6 slots allow.
 *
 * Issue #71 — that curation now lives in data (`default_loadout_slot` on each spell in
 * `spells.json`, selected by `systems/defaultLoadout.ts`) instead of this file's own hardcoded
 * ID array, so Frieren can re-curate it without an engine change. Full player-facing loadout
 * *selection/swapping* between expeditions is still explicitly future work (see HOTBAR_KEYS
 * comment) — this only moves which six spells start equipped, not that feature. */
/** backlog 2.10 fix (Heckler, 2026-07-25): a plain "has the pointer ever moved" boolean
 * never resets, so an incidental trackpad jitter (common — resting a finger, OS cursor
 * accel) permanently defeats the fallback it was built for. A single pointermove event
 * must cover at least this many pixels to count as real aiming intent, not noise. */
const POINTER_JITTER_THRESHOLD_PX = 4;

export class SpellroadScene extends Phaser.Scene {
  private mage?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  /** backlog 2.33 / issue #76 — floating HP/Mana bars above the mage, redrawn every frame in
   * `updatePlayerStatusBars`. Given `UI_DEPTH` (not left at the default depth `Enemy.ts`'s own
   * equivalent overlay uses) so a melee enemy standing on top of the mage during a pile-up
   * can't paint over the player's own status readout — the same reasoning Heckler's 2026-08-02
   * critique already applied to every other persistent HUD element (see `UI_DEPTH`'s comment). */
  private playerStatusBar?: Phaser.GameObjects.Graphics;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private hotbarKeys: Phaser.Input.Keyboard.Key[] = [];
  /** Issue #234 — the Q/R/F/Shift/Ctrl/Space secondary hotbar bindings, kept in their own
   * array (rather than merged into `hotbarKeys`) so each key's `"down"` listener can still be
   * traced back to exactly one physical key during debugging. Both arrays drive the identical
   * `handleHotbarPress(index)` call — see `createInput`. */
  private hotbarSecondaryKeys: Phaser.Input.Keyboard.Key[] = [];

  private spells: SpellDefinition[] = [];
  private equippedSpells: SpellDefinition[] = [];
  private waves: WaveDefinition[] = [];
  private waveIndex = 0;
  private discoveredSpellIds: string[] = [];
  private persistentMetadata!: PersistentMetadata;
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
  /** Issue #157 — same shape/reasoning as `phaseChoiceListeners`, for the Side-Pocket Lore
   * Encounter's Explore ([E]) / Continue ([C]) prompt: hoisted out of
   * `startSidePocketChoice`'s closure so `handleDeath` can deregister both listeners by
   * reference if a death somehow interrupts an unresolved prompt (no enemies are alive while
   * this prompt is up, so this is defensive rather than a reachable player-facing path, but
   * the ticket's generation-token-protection requirement applies uniformly to every delayed
   * choice, not only the boss one). */
  private sidePocketChoiceListeners: { onExplore: () => void; onContinue: () => void } | null = null;
  /** Issue #157 — one ground-rune marker per Side-Pocket Lore Encounter, created once in
   * `create()` (`createSidePocketMarkers`) and kept for the scene's lifetime; visibility and
   * tint are redrawn every frame in `updateSidePocketMarkers` rather than destroyed/recreated
   * per level, since there are only ever 4 of them (one per level 1-4). Keyed by level number,
   * matching the catalog's own level-keyed lookup (`findSidePocketEncounter`). */
  private sidePocketMarkers = new Map<number, Phaser.GameObjects.Arc>();
  /** Issue #157 story 29 / Heckler MAJOR finding 1 (adversarial review, same day) — a small,
   * static cluster of muted pebble/rubble dots per encounter, so the rune doesn't read as
   * "dropped into an otherwise empty space." Deliberately static (no pulse, no visibility
   * logic beyond matching the main marker's current-level check) and built from the same
   * `this.add.circle` primitive the marker itself already uses — no new art asset dependency,
   * matching the ticket's "restrained... where existing approved assets suffice" bound. */
  private sidePocketDressing = new Map<number, Phaser.GameObjects.Arc[]>();
  /** Issue #239 — a short, always-created-but-hidden HUD hint (same lifecycle pattern as
   * `onboardingHintText`: created once in `createHud`, `setVisible` toggled every frame from
   * `updateSidePocketMarkers`, never destroyed/recreated) so playtesters stop mistaking the
   * reactive rune for the unrelated auto-aim highlight ring. Fixed screen position rather than
   * following the marker: the four markers sit at different lane heights (`sidePocketEncounters.ts`),
   * and a fixed top-of-lane anchor reads consistently regardless of which one is nearby. */
  private sidePocketHintText?: Phaser.GameObjects.Text;
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
  /** Issue #117 — the Mastery tier-up notification's own dedicated element, cleared on its
   * own `tierUpClearAt` timer rather than sharing `messageText`/`messageClearAt` — see
   * `flashTierUp`'s own comment for why. */
  private tierUpText?: Phaser.GameObjects.Text;
  private tierUpClearAt = 0;
  /** backlog 2.32 / issue #58 — persistent, larger, higher-contrast Level/Wave readout, kept
   * separate from both `hudText`'s small stat block and the transient `flashMessage` banner.
   * See its own comment at the bottom of `createHud`. */
  private levelWaveText?: Phaser.GameObjects.Text;
  /** backlog 2.31 / issue #57 — the debuff-magnitude HUD line, built on top of the existing
   * `spawnDebuffPulse` visual rather than replacing it. Empty string (no visible line) while
   * `this.debuff` has no active stacks. */
  private debuffText?: Phaser.GameObjects.Text;
  /** backlog 4.10 / issue #96 — the boss intro/outro narration banner (see
   * `BOSS_BANNER_INTRO_TEXT`'s own comment). Hidden (alpha 0) rather than absent when not
   * showing, same reasoning as `messageText`: one persistent element `showBossBanner`/
   * `hideBossBanner` toggle, not a create/destroy pair, since it fires at most twice a run. */
  private bossBannerText?: Phaser.GameObjects.Text;
  /** Code review, 2026-08-05: the auto-hide `delayedCall` `showBossBanner` schedules must be
   * cancelled by whatever ends the banner's display early (a manual `hideBossBanner`, or a
   * fresh `showBossBanner` call), or a death-and-retry within the display window leaves a
   * stale timer that fires mid-way through the *new* banner's own display and cuts it short.
   * Tracked so both paths can `.remove()` this exact pending call rather than letting it fire
   * unconditionally. */
  private bossBannerHideTimer?: Phaser.Time.TimerEvent;
  /** Issue #134 — a callback queued by `showBossBanner` to run once the banner has fully
   * hidden (whichever path gets it there: auto-timeout or the player dismissing it early),
   * so time-sensitive follow-up messages (e.g. the Phase-1 HP-carry warning) appear
   * sequentially after the banner instead of competing with it for the player's attention
   * on the same screen at the same time. */
  private bossBannerOnHidden?: () => void;
  /** Issues #112/#113 — developer playtest: the boss intro/outro banner blocked vision while
   * enemies kept attacking underneath it (#112), and the outro banner vanished on its fixed
   * auto-hide timer regardless of reading speed (#113, now scaled by word count — see
   * `BOSS_BANNER_MIN_DISPLAY_MS`). `update()` skips `updateEnemies` (freezing enemy
   * movement/attacks, not a full `scene.pause()` — that would also open the Esc pause menu,
   * which isn't the ask here) and any keypress/click dismisses the banner early instead of
   * waiting out the timer.
   *
   * **Issue #183 — narrowed, disclosed carve-out for the victory/outro banner specifically,
   * not a reversal of the above.** The any-keypress/click-dismisses behavior above is still
   * exactly right for the intro banner and every other in-combat message: #112/#113 fixed a
   * real complaint about vision/combat getting blocked, and that reasoning is untouched here.
   * But the outro banner (`BOSS_BANNER_OUTRO_TEXT`, Lorena's ending narration — this vertical
   * slice's only shipped ending) is a one-time, unrepeatable beat, and a leftover cast-key press
   * or click from the fight that just ended could skip it before the player reads a single word.
   * `bossBannerRequiresConfirm` (set only by the victory/outro call site, see `showBossBanner`'s
   * `requireConfirm` option) swaps the any-input dismiss for an explicit `[Y] Continue` gate,
   * reusing the same Y/N confirm pattern already established by `startPhaseBreak`/
   * `startSidePocketChoice` (this scene) and `TitleScene`'s overwrite confirm/`PauseScene`'s
   * quit confirm, rather than inventing a second mechanism. */
  private bossBannerActive = false;
  /** Issue #183 — see `bossBannerActive`'s own comment above for the full carve-out reasoning.
   * Set only by `showBossBanner`'s `requireConfirm` option (currently only the victory/outro
   * call site passes it); every other banner display leaves this false. */
  private bossBannerRequiresConfirm = false;
  /** The armed `keydown-Y` listener for the current `bossBannerRequiresConfirm` display, or
   * `null` if none is pending — same hoisted-out-of-the-closure reasoning as
   * `phaseChoiceListeners`/`sidePocketChoiceListeners`, so `hideBossBanner` can always
   * deregister it by reference regardless of which path ends the banner (the explicit Y press
   * itself, a death interrupting it, or a scene reset), rather than leaking a stale listener for
   * a later, unrelated confirm-gated banner to accidentally co-fire alongside. */
  private bossBannerConfirmListener: (() => void) | null = null;
  /** Issue #116 — persistent boss-name HUD element ("The Invigilator") shown for the whole
   * Level 5 encounter. `boss-1.json`'s three phases are composed entirely of ordinary
   * registry enemy types (`spellbound_thug`/`hexbow_skirmisher`/etc.), so before this the
   * fight's actual named identity only ever appeared in the intro/outro banner text — a
   * player who missed that (see #112/#113) had no in-combat way to learn who they were
   * fighting. Toggled by `startWave`'s boss-Phase-1 branch (shown) and the boss-victory
   * branch in `updateEnemies` (cleared); persists across a death/retry of the same fight,
   * same as the boss theme/banner. */
  private bossNameText?: Phaser.GameObjects.Text;
  /** backlog 4.11 / issue #97 — the currently-playing boss-theme instance, or `undefined` if
   * none is active. Tracked (not just fire-and-forget `this.sound.play()`) so `stopBossTheme`
   * can stop this exact instance — the track loops for the whole multi-phase encounter, so
   * unlike the one-shot SFX cues, something must be able to end it early (victory, death, or a
   * scene shutdown mid-fight). */
  private bossThemeSound?: Phaser.Sound.BaseSound;
  /** Issue #142 — the currently-playing ordinary-wave combat cue, or `undefined` if none is
   * active. Tracked for the same reason as `bossThemeSound`: it loops, so something has to end
   * it. Its lifetime is much shorter and far more frequent than the boss theme's — it starts on
   * a wave's *first enemy contact* and stops the moment that wave is cleared (or the player
   * dies, or the scene shuts down), which is many start/stop cycles per level. Lorena's brief
   * anticipated exactly that ("starts and stops many times across a single level, sometimes cut
   * short mid-phrase when a wave clears early") and set the 20-35s loop length for it, so the
   * cut is a designed behavior, not an artifact of this wiring. */
  private combatCueSound?: Phaser.Sound.BaseSound;
  /** Issue #188 — the currently-playing non-combat interlude loop, or `undefined` if none is
   * active. Tracked for the same reason as the two above. Its lifetime is the exact inverse of
   * `combatCueSound`'s: it starts when a wave clears and stops on the next wave's first enemy
   * spawn, which is the same instant the combat cue starts, so the two hand off with no gap and
   * are never both audible. */
  private explorationLoopSound?: Phaser.Sound.BaseSound;
  /** Issue #188 — which of the three interlude variants played last, so the next interlude can
   * pick a different one (`pickExplorationTrack`). Survives across waves and levels within a run
   * (that is the whole point — the repetition the developer noticed is across a session, not
   * within one gap), and is cleared on a scene restart alongside the sounds themselves. */
  private lastExplorationTrackKey?: ExplorationLoopKey;
  /** backlog 2.35 / issue #78, re-decided by issue #233 (replaces #197) — one-time onboarding
   * hint explaining hotbar targeting (1-6 arms a spell, press/click again to confirm-fire, or
   * Esc/right-click to cancel). Shown once per run. Root cause of #233's bug: dismissing this
   * on the first hotbar press doubled as arming a spell in the same action, so the player never
   * got past the first line before it vanished. Per the 2026-08-13 developer decision, dismissal
   * is now decoupled from spell-arming entirely — only an explicit acknowledgment (a click, or
   * the designated `SPACE` key, see the `pointerdown`/`keydown-SPACE` handlers in `createInput`)
   * or the `ONBOARDING_HINT_FALLBACK_MS` fallback timer ends it; a hotbar press (1-6) no longer
   * dismisses it at all. `undefined` once dismissed (destroyed, not just hidden) so
   * `dismissOnboardingHint` is a cheap no-op on every later call. */
  private onboardingHintText?: Phaser.GameObjects.Text;
  /** Issue #233 — true for as long as `onboardingHintText` is showing. `update()` uses this to
   * pause gameplay (freeze enemy movement/attacks) for the hint's whole duration, the same
   * narrower-than-`scene.pause()` carve-out `bossBannerActive` already established (see its own
   * comment) — everything else (Mana regen, cooldowns, HUD) keeps running. Kept as its own flag
   * rather than reusing `bossBannerActive` since the two are conceptually unrelated overlays that
   * happen never to be shown at the same time in practice, and `update()`'s gate below already
   * combines them. */
  private onboardingHintActive = false;

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
    // Bundled as ES module imports rather than `this.load.json(key, url)` — a raw `src/data/...`
    // URL is only reachable in dev (Vite's dev server transparently serves the whole project
    // root); a production build never copies files outside `public/` into `dist/`, so those
    // fetches 404 there and the scene silently starts with no spells/waves. Importing the JSON
    // directly (tsconfig already has `resolveJsonModule`) inlines it into the built JS instead,
    // identically in dev and prod.
    this.cache.json.add("spells", spellsData);
    this.cache.json.add("waves-level-1", wavesLevel1Data);
    this.cache.json.add("waves-level-2", wavesLevel2Data);
    this.cache.json.add("waves-level-3", wavesLevel3Data);
    this.cache.json.add("waves-level-4", wavesLevel4Data);
    this.cache.json.add("waves-boss-1", wavesBoss1Data);

    // backlog 3.8 (issue #29) — Tilesmith's #28 Tiled layouts + their shared tileset image.
    // Loaded eagerly here, same precedent as the wave JSON above (all 5 levels' worth of data
    // preloaded up front, then switched between at runtime) rather than a mid-scene
    // `this.load.once('complete', ...)` dance — these are 5 small JSON files (~13KB each) plus
    // one already-committed 5KB PNG, not worth the extra dynamic-loading complexity.
    this.load.image(TILESET_IMAGE_KEY, TILESET_IMAGE_URL);
    for (const level of ALL_LEVELS) {
      this.load.tilemapTiledJSON(levelMapKey(level), levelMapUrl(level));
    }

    // Issue #163 — real mage sprite (`characterArt.ts`), replacing `createMage`'s old
    // `generateTexture("mage-placeholder", ...)` flat circle. Already-committed CC0 art
    // (Kenney Tiny Dungeon, 2026-07-30 sign-off), same eager-preload convention as the
    // tileset image above (one tiny PNG).
    this.load.image(MAGE_SPRITE_KEY, MAGE_SPRITE_URL);

    // Issue #163 — real per-archetype enemy sprites (`characterArt.ts`), replacing
    // `Enemy.ensureTexture`'s old `fillRoundedRect` flat-color-square placeholder. Loaded
    // eagerly up front (3 tiny PNGs) so every archetype's texture already exists in the cache
    // by the time the first wave spawns an `Enemy` — `ensureTexture`'s
    // `scene.textures.exists(key)` check is what makes this preload load-bearing rather than
    // cosmetic.
    for (const archetype of ALL_ENEMY_ARCHETYPES) {
      this.load.image(enemySpriteKey(archetype), enemySpriteUrl(archetype));
    }

    // backlog 2.30 / issue #56 — one hand-authored icon per element (`spellIcons.ts`), loaded
    // eagerly up front same as the tileset image above (4 tiny PNGs, no runtime cost worth a
    // dynamic-loading dance).
    for (const element of SPELL_ICON_ELEMENTS) {
      this.load.image(spellIconKey(element), spellIconUrl(element));
    }

    // backlog 3.10 / issue #81 (ADR-0002) — hit/impact/death one-shots, sourced from Kenney.nl
    // (CC0); see `systems/sfx.ts` for the per-cue source/rationale and
    // `docs/agents/tilesmith/log.md`'s 2026-08-04 entry for the full license record. Same
    // eager-preload convention as the tileset image and spell icons above — tiny (<1.3s) .ogg
    // files, not worth a dynamic-loading dance.
    for (const cue of ALL_SFX_CUES) {
      this.load.audio(sfxKey(cue), sfxUrl(cue));
    }

    // issue #111 (2026-08-07) — one real per-element cast recording each, replacing the single
    // shared "cast" cue the block above used to also load. See `systems/sfx.ts`'s
    // `ELEMENT_CAST_URL` doc comment and `docs/agents/tilesmith/log.md`'s 2026-08-07 entry for
    // sourcing/license detail per element.
    for (const element of ALL_CAST_ELEMENTS) {
      this.load.audio(elementCastSfxKey(element), elementCastSfxUrl(element));
    }

    // backlog 4.11 / issue #97 — mini-boss/Director trial theme, same eager-preload
    // convention as the SFX cues above (one small .ogg, not worth a dynamic-loading dance).
    this.load.audio(BOSS_THEME_KEY, BOSS_THEME_URL);

    // Issue #142 — the ordinary-wave combat cue, same eager-preload convention as the boss
    // theme above. Loaded once here, not per wave: `startWave` fires this cue on the first
    // enemy of nearly every wave in the game, so a lazy load would put a network fetch on the
    // exact frame combat starts.
    this.load.audio(COMBAT_CUE_KEY, COMBAT_CUE_URL);

    // Issue #188 — the three non-combat interlude variants, same eager-preload convention. All
    // three are loaded up front rather than the one that happens to be picked first: the pick
    // happens at the instant a wave clears (`updateEnemies`), and a lazy load there would put a
    // ~600KB network fetch on the frame the road goes quiet, which is the exact silence this
    // ticket exists to remove.
    for (const key of EXPLORATION_LOOP_KEYS) {
      this.load.audio(key, EXPLORATION_LOOP_URLS[key]);
    }

    // Issue #125 — the developer-selected CC0 Remix VFX treatment (Prototype 1, issue #128)
    // for `flame_sweep`'s fire cast/impact/trail. Same eager-preload convention as the tileset
    // image/spell icons above (3 small PNGs). See `systems/openingVfx.ts` for why this is
    // fire-only, not every element.
    this.load.spritesheet(OPENING_VFX_CAST_KEY, OPENING_VFX_CAST_URL, OPENING_VFX_CAST_FRAME);
    this.load.spritesheet(OPENING_VFX_IMPACT_KEY, OPENING_VFX_IMPACT_URL, OPENING_VFX_IMPACT_FRAME);
    this.load.spritesheet(OPENING_VFX_TRAIL_KEY, OPENING_VFX_TRAIL_URL, OPENING_VFX_TRAIL_FRAME);
  }

  create(data: SpellroadStartData = { mode: "new" }): void {
    this.spells = this.cache.json.get("spells") as SpellDefinition[];
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
    const prepared = prepareGameProgress(data, this.spells.map((spell) => spell.id), this.waves);
    this.discoveredSpellIds = prepared.discoveredSpellIds;
    this.persistentMetadata = prepared.metadata;
    const discoveredSpellIds = new Set(this.discoveredSpellIds);
    // Fixed default loadout (see HOTBAR_KEYS comment) — data-driven via each spell's own
    // `default_loadout_slot` (issue #71), a curated 2-per-weight-class set authored in
    // `spells.json`, then limited to spells this save has actually discovered. The current
    // build still has no discovery mutation of its own; preparation remains the authority.
    this.equippedSpells = selectDefaultLoadout(this.spells).filter((spell) => discoveredSpellIds.has(spell.id));

    this.health = new HealthSystem(
      () => this.handleDeath(),
      // backlog 3.10 / issue #81 — the original developer ask ("we need sound to know when we
      // are getting hit, so you can run away"): played from the same `onDamage` callback the
      // existing "Hit!" flash already uses, so the audio and visual cues fire on the identical
      // event, never drift out of sync.
      () => {
        this.flashMessage("Hit!", 300);
        this.sound.play(sfxKey("hit"), computeSfxVariation());
      }
    );
    this.mana = new ManaSystem();
    this.mastery = new MasterySystem(prepared.masteryBySpell);
    this.hexcoin = new HexcoinSystem(prepared.hexcoin);
    this.debuff = new DebuffSystem();
    this.caster = new SpellCaster(this.mana, this.mastery);
    // Issue #48 — constructed with the rest of the run's systems so a scene restart gets a
    // clean generation/phase, not one inherited from the previous run.
    this.session = new WaveSession();

    // backlog 5.8 follow-up — developer playtest, 2026-08-04: "Quit to Title" -> "New Game"
    // rendered the road fully black (only the mage/enemies/spells/text showed) on the second
    // playthrough. Root cause: before 5.8 added a real Quit-to-Title/New-Game restart path,
    // `create()` only ever ran once per page load, so every mutable field below that isn't
    // reassigned above (the `new HealthSystem()`/etc. block, and the `waves`/`equippedSpells`
    // assignments) silently carried its value across a `scene.start("SpellroadScene")` restart
    // instead of resetting — Phaser reuses the same Scene instance across `start()` calls, it
    // does not recreate the class from scratch. `renderedLevel` (the tile-art re-render guard,
    // `renderLevelArt`) is the one that visibly broke: it survived from the previous life at
    // whatever level the player last reached, so the fresh scene's first `startWave(0)` ->
    // `renderLevelArt(1)` call saw `renderedLevel` already at some non-zero value and, if that
    // value happened to be 1 (the common case — most restarts happen after dying or quitting
    // on Level 1), skipped building a tile layer entirely, leaving only the near-black
    // `createRoad()` placeholder rect visible. `highestLevelReached` has the same latent bug
    // with no visible symptom yet: `hexcoin.markLevelStart()` only fires the first time a
    // level number is crossed, so a stale non-zero value from a deeper previous run would
    // silently skip re-arming the Hexcoin floor on the level the new run actually starts at.
    // Reset every field here that this same class of bug can reach, not just the one that
    // happened to be visible, matching the precedent the `session` reset above already set.
    this.renderedLevel = 0;
    this.currentLevelTilemap = undefined;
    this.currentLevelLayer = undefined;
    this.enemies = [];
    this.enemiesRemainingToSpawn = 0;
    this.waveIndex = 0;
    // A valid Continue already carries the floor marked when its checkpoint level was first
    // entered. Seed this guard so `startWave` does not replace that restored floor with the
    // current balance. Missing/reset/unknown checkpoints deliberately enter as fresh Level 1
    // progress, mark its floor, and immediately rewrite a valid save.
    const resumesKnownCheckpoint =
      data.mode === "continue" &&
      data.load.kind === "loaded" &&
      data.load.save.checkpointId === `level:${prepared.checkpointLevel}`;
    this.highestLevelReached = resumesKnownCheckpoint ? prepared.checkpointLevel : 0;
    this.bossMaxRecoveries = 0;
    this.previewSpellId = null;
    this.previewLockedEnemy = null;
    this.phaseChoiceListeners = null;
    // Issue #157 — same class of stale-state bug this reset block already documents: a
    // scene restart reuses this Scene instance, so a non-null listener pair left over from a
    // prompt that was up when the player quit mid-level would otherwise leak into the fresh
    // run (and, since `create()` below rebuilds the display list from scratch, would also be
    // holding closures over now-destroyed game objects).
    this.sidePocketChoiceListeners = null;
    this.lastFacing = new Phaser.Math.Vector2(1, 0);
    this.lastPointerActivityAt = null;
    this.messageClearAt = 0;
    this.tierUpClearAt = 0;
    // backlog 4.11 / issue #97 — same class of stale-state bug this comment block already
    // documents above: a `New Game`/scene restart reuses this Scene instance, so a boss theme
    // still playing from a fight the player quit out of mid-encounter would otherwise keep
    // looping right over the fresh run. Phaser's SoundManager is game-level, not scene-level,
    // so this has to be stopped explicitly rather than assumed to reset on its own.
    this.bossThemeSound?.stop();
    this.bossThemeSound = undefined;
    // Issue #142 — the combat cue needs the identical treatment for the identical reason, and
    // hits it far more often than the boss theme does: quitting to Title mid-wave (any wave in
    // Levels 1-4, not just the one boss fight) leaves this looping otherwise.
    this.combatCueSound?.stop();
    this.combatCueSound = undefined;
    // Issue #188 — and the interlude loop needs it for the same reason again, plus one of its
    // own: quitting to Title from the Side-Pocket Explore/Continue prompt (or any between-waves
    // gap) is a state the player can sit in indefinitely, so this is the track most likely to
    // still be playing at the moment a restart happens. `lastExplorationTrackKey` is reset with
    // it so a fresh run's first interlude is an unconstrained pick rather than one biased by
    // whatever a previous, abandoned run happened to be playing.
    this.explorationLoopSound?.stop();
    this.explorationLoopSound = undefined;
    this.lastExplorationTrackKey = undefined;
    this.bossBannerHideTimer?.remove();
    this.bossBannerHideTimer = undefined;
    // Issues #112/#113 — same class of stale-state bug this comment block already documents:
    // a scene restart reuses this Scene instance, so a `true` left over from a banner still
    // showing when the player quit mid-fight would otherwise freeze every enemy in the fresh
    // run (see `update()`'s `bossBannerActive` gate) with nothing left to ever flip it back.
    this.bossBannerActive = false;
    // Issue #183 — same reasoning: a scene restart mid-outro-banner must not leave a stale
    // confirm-gate flag or a `keydown-Y` listener registered against game objects `create()`
    // below is about to rebuild from scratch.
    this.bossBannerRequiresConfirm = false;
    if (this.bossBannerConfirmListener) {
      this.input.keyboard?.off("keydown-Y", this.bossBannerConfirmListener);
      this.bossBannerConfirmListener = null;
    }

    this.createRoad();
    this.createMage();
    this.createHud();
    this.createInput();
    this.createOpeningVfxAnimations();
    // Issue #157 — created fresh every `create()` (a scene restart destroys the whole
    // display list, so any marker from a previous life is already gone) rather than
    // conditionally reset, same lifecycle as `createHud`'s own graphics/text objects above.
    this.createSidePocketMarkers();

    // backlog 4.11 / issue #97 — safety net for exit paths this ticket's own acceptance
    // criteria don't explicitly name (e.g. `PauseScene`'s "Quit to Title" mid-fight): whatever
    // ends this scene stops the boss theme too, so the two explicit stop call sites (trial
    // victory, death) don't have to be the only things standing between this track and playing
    // forever over a screen it no longer belongs to.
    // Issue #142 — the combat cue rides the same safety net, for the same reason. Both stops in
    // one handler rather than two registrations: "this scene is going away, no music of its
    // survives it" is a single rule.
    // Issue #188 — the interlude loop joins the same net, under the same single rule.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopBossTheme();
      this.stopCombatCue();
      this.stopExplorationLoop();
    });

    const debugStartRequested =
      import.meta.env.DEV && new URLSearchParams(window.location.search).has("debugLevel");
    this.startWave(debugStartRequested ? resolveDebugStartWave(this.waves) : prepared.startWaveIndex);
    if (prepared.resetNotice) {
      this.flashMessage(prepared.resetNotice, 2500, "warning");
    }
  }

  update(_time: number, deltaMs: number): void {
    if (!this.mage) {
      return;
    }

    this.handleMovement();
    this.mana.update(deltaMs, this.debuff.effectiveManaRegen(MANA_REGEN_PER_SEC));
    this.caster.tickCooldowns(deltaMs);
    // Issue #112 — freeze enemy movement/attacks while a boss banner is on screen, so reading
    // the intro/outro narration never costs free hits. Deliberately narrower than
    // `scene.pause()` (which also opens the Esc pause menu, PauseScene) — everything else
    // (Mana regen, cooldowns, HUD, the banner's own tween) keeps running.
    // Issue #233 — same carve-out while the onboarding hint is up: a first-time player reading
    // it shouldn't be taking free hits from enemies that spawned before they finished reading.
    if (!this.bossBannerActive && !this.onboardingHintActive) {
      this.updateEnemies(deltaMs);
    }
    // Issue #157 — proximity reactivity runs regardless of the boss-banner freeze above (it
    // never touches combat), but there is no catalog entry for the boss level anyway, so it's
    // a no-op whenever a banner would be showing.
    this.updateSidePocketMarkers();
    this.updatePreview();
    this.updateHud();
    this.updatePlayerStatusBars();

    if (this.messageText && this.time.now > this.messageClearAt) {
      this.messageText.setText("");
      // backlog 2.37 — an expired warning banner's background panel must not linger (even
      // invisibly) onto whatever plain message shows next; `flashMessage` also resets this on
      // every new call, but clearing it here too means an empty banner is never left mid-style.
      this.messageText.setBackgroundColor("");
      this.messageText.setColor(MESSAGE_DEFAULT_COLOR);
    }
    // Issue #117 — `tierUpText`'s own independent clear timer; see `flashTierUp`'s comment
    // for why it doesn't share `messageText`/`messageClearAt`.
    if (this.tierUpText && this.time.now > this.tierUpClearAt) {
      this.tierUpText.setText("");
      this.tierUpText.setVisible(false);
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

  /** Issue #157 — one small ground-rune circle per catalog encounter, positioned per the
   * catalog's own `marker` data (chosen off the mage's straight-line path along the lane
   * midline, still inside `LANE_RECT` so it's always reachable — see
   * `sidePocketEncounters.ts`'s own placement comment). Hidden by default; `startWave`/
   * `updateSidePocketMarkers` show only the one matching the currently-rendered level. */
  private createSidePocketMarkers(): void {
    this.sidePocketMarkers = new Map(
      SIDE_POCKET_ENCOUNTERS.map((encounter) => {
        const marker = this.add.circle(
          encounter.marker.x,
          encounter.marker.y,
          SIDE_POCKET_MARKER_RADIUS_PX,
          encounter.presentation.runeColor
        );
        marker.setDepth(SIDE_POCKET_MARKER_DEPTH);
        marker.setVisible(false);
        return [encounter.level, marker] as const;
      })
    );
    this.sidePocketDressing = new Map(
      SIDE_POCKET_ENCOUNTERS.map((encounter) => {
        const pebbles = SIDE_POCKET_DRESSING_OFFSETS.map(({ dx, dy, radius }) => {
          const pebble = this.add.circle(
            encounter.marker.x + dx,
            encounter.marker.y + dy,
            radius,
            encounter.presentation.quietColor,
            0.35
          );
          pebble.setDepth(SIDE_POCKET_MARKER_DEPTH);
          pebble.setVisible(false);
          return pebble;
        });
        return [encounter.level, pebbles] as const;
      })
    );
  }

  /** Issue #157 — redrawn every frame (cheap: at most 4 circles, one visible at a time in
   * practice since only the current level's marker shows). Purely presentational: reacts to
   * proximity (undiscovered) or renders "quiet" (discovered, story 23) without ever touching
   * movement, collision, spawning, targeting, or the wave-advance decision itself — that
   * decision lives entirely in `updateEnemies`'s `evaluateSidePocketOffer` call. */
  private updateSidePocketMarkers(): void {
    if (!this.mage) {
      return;
    }
    const currentLevel = this.waves[this.waveIndex]?.level;
    // Issue #239 — recomputed fresh every frame below for whichever encounter matches
    // `currentLevel` (there's only ever one visible marker at a time); defaults to hidden so a
    // level with no catalog entry (Level 5) or a mid-transition frame never leaves a stale hint
    // on screen.
    let showHint = false;
    for (const [level, marker] of this.sidePocketMarkers) {
      const dressing = this.sidePocketDressing.get(level) ?? [];
      if (level !== currentLevel) {
        marker.setVisible(false);
        dressing.forEach((pebble) => pebble.setVisible(false));
        continue;
      }
      const encounter = SIDE_POCKET_ENCOUNTERS.find((entry) => entry.level === level);
      if (!encounter) {
        marker.setVisible(false);
        dressing.forEach((pebble) => pebble.setVisible(false));
        continue;
      }
      marker.setVisible(true);
      // Dressing is static regardless of discovered/proximity state (issue #157: dressing is
      // "supporting treatment," not part of the reactive/quiet presentation logic below).
      dressing.forEach((pebble) => pebble.setVisible(true));
      const discovered = this.persistentMetadata.loreFlags.includes(encounter.loreFlag);
      if (discovered) {
        // Quiet state (issue #157 story 23): present, but static — no reactive pulse, and it
        // never blocks the level's normal auto-advance (that gate is
        // `evaluateSidePocketOffer`'s flag check, entirely separate from this rendering).
        marker.setFillStyle(encounter.presentation.quietColor, 0.5);
        continue;
      }
      const distance = Phaser.Math.Distance.Between(
        this.mage.x,
        this.mage.y,
        encounter.marker.x,
        encounter.marker.y
      );
      const inRange = distance <= encounter.marker.proximityRadiusPx;
      // Gentle pulse while in range so the reaction reads as alive without any reading —
      // story 5's "atmospheric, not distracting" requirement. Dim and static otherwise.
      const pulse = inRange ? 0.75 + 0.25 * Math.sin(this.time.now / 150) : 0.6;
      marker.setFillStyle(encounter.presentation.runeColor, pulse);
      showHint = shouldShowSidePocketHint(inRange, discovered, this.session.phase);
    }
    this.sidePocketHintText?.setVisible(showHint);
  }

  private createMage(): void {
    // Issue #163 — real sprite art (`characterArt.ts`'s `MAGE_SPRITE_KEY`, preloaded above)
    // replaces the old `generateTexture("mage-placeholder", ...)` flat tan-and-purple circle.
    // `setDisplaySize`/`body.setSize` stay explicit at the same 32x32 figure as before the
    // swap, so the on-screen footprint and hit box are unaffected by the new texture's native
    // 16x16 size — a pure visual change, per the ticket's own "collision geometry unaffected"
    // acceptance criterion.
    this.mage = this.physics.add.sprite(MAGE_START.x, MAGE_START.y, MAGE_SPRITE_KEY);
    this.mage.setDisplaySize(32, 32);
    this.mage.setCollideWorldBounds(true);
    this.mage.body.setSize(32, 32);
    this.mage.body.setBoundsRectangle(LANE_RECT);

    this.playerStatusBar = this.add.graphics();
    this.playerStatusBar.setDepth(UI_DEPTH);
  }

  private createHud(): void {
    this.add
      .text(32, 16, "The Last Spellroad", {
        color: "#f3e7c2",
        fontFamily: "Georgia, serif",
        fontSize: "24px"
      })
      .setDepth(UI_DEPTH);

    this.hudText = this.add
      .text(32, 46, "", {
        color: "#9fb0d8",
        fontFamily: "monospace",
        fontSize: "14px",
        lineSpacing: 4
      })
      .setDepth(UI_DEPTH);

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
    this.hotbarGraphics.setDepth(UI_DEPTH);
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
      // backlog 2.32 / issue #58, Heckler MAJOR finding 1 (2026-08-02 (8)) — every persistent
      // HUD element needs an explicit depth above enemy overlays (`Enemy.ts`'s nameLabel/
      // statusBar, added to the display list after createHud() runs); the icon/text slots
      // introduced by #55/#56 predate that fix and need the same UI_DEPTH applied here.
      icon.setDepth(UI_DEPTH);
      return icon;
    });
    const hotbarTextLeft = HOTBAR_TEXT_PADDING + HOTBAR_ICON_SIZE + HOTBAR_ICON_PADDING * 2;
    this.hotbarSlotTexts = this.hotbarSlotRects.map((rect) =>
      this.add
        .text(rect.x + hotbarTextLeft, rect.y + HOTBAR_TEXT_PADDING, "", {
          color: "#9fb0d8",
          fontFamily: "monospace",
          fontSize: `${HOTBAR_LABEL_FONT_SIZE_PX}px`,
          lineSpacing: 3
        })
        .setDepth(UI_DEPTH)
    );

    // Issue #170 — this element was unbounded until the Side-Pocket prompt (#157) started
    // routing a full lore sentence plus "[E] Explore / [C] Continue" through `flashMessage`:
    // as one centered line at 20px serif that overruns 960px and clips off both screen edges.
    // Same `wordWrap` width `bossBannerText` already uses for its own multi-line prose, with
    // `align: "center"` so wrapped lines stay centered under this element's 0.5 origin. Every
    // other `flashMessage` caller is short enough to still render on a single line.
    this.messageText = this.add.text(480, 400, "", {
      color: MESSAGE_DEFAULT_COLOR,
      fontFamily: "Georgia, serif",
      fontSize: "20px",
      align: "center",
      padding: { x: 10, y: 6 },
      wordWrap: { width: 640 }
    });
    this.messageText.setOrigin(0.5, 0.5);
    this.messageText.setDepth(UI_DEPTH);

    // Issue #117 — see `flashTierUp`'s own comment for why this is a separate element from
    // `messageText` rather than another `flashMessage` emphasis. Stacked just above
    // `messageText` (400) with enough gap that the two never visually overlap, still clear of
    // the hotbar row starting at 424.
    this.tierUpText = this.add.text(480, 340, "", {
      color: MESSAGE_MILESTONE_COLOR,
      fontFamily: "Georgia, serif",
      fontStyle: "bold",
      fontSize: "18px",
      align: "center",
      backgroundColor: MESSAGE_MILESTONE_BG,
      padding: { x: 12, y: 6 }
    });
    this.tierUpText.setOrigin(0.5, 0.5);
    this.tierUpText.setDepth(UI_DEPTH);
    // Issue #140 — an empty Phaser Text with padding + `backgroundColor` still renders its
    // padded background. Keep the panel absent until `flashTierUp` gives it real content;
    // otherwise it appears as an unexplained dark rectangle in the middle of every level.
    this.tierUpText.setVisible(false);

    // Developer feedback (2026-08-02, issue #58): "Level 5, wave 1 its difficult to read in
    // what level we are" — `Level X, Wave Y` was one line inside the 14px stat block above,
    // easy to miss mid-combat, and the only other signal was the transient `flashMessage`
    // banner (1500ms, then gone). This is a dedicated, persistent, fixed-position element:
    // top-right corner (clear of the title text and the small stat block, both top-left),
    // large (28px vs. the stat block's 14px) and high-contrast (opaque panel background,
    // not just colored text over the dark canvas fill). Never cleared by `flashMessage`'s
    // timer — only `updateHud` ever calls `setText` on it, every frame, same as `hudText`.
    this.levelWaveText = this.add.text(CANVAS_WIDTH - 16, 16, "", {
      color: "#ffe08a",
      fontFamily: "Georgia, serif",
      fontStyle: "bold",
      fontSize: "28px",
      backgroundColor: "#1c1330",
      padding: { x: 12, y: 6 }
    });
    this.levelWaveText.setOrigin(1, 0);
    this.levelWaveText.setDepth(UI_DEPTH);

    // Issue #116 — persistent boss-name plate, top-center so it doesn't collide with the
    // top-left stat block or the top-right Level/Wave readout. Empty (no visible element)
    // outside the Level 5 encounter — `startWave`/`updateEnemies` are the only two call
    // sites that ever set/clear its text.
    this.bossNameText = this.add.text(CANVAS_WIDTH / 2, 16, "", {
      color: MESSAGE_WARNING_COLOR,
      fontFamily: "Georgia, serif",
      fontStyle: "bold",
      fontSize: "18px",
      backgroundColor: "#1c1330",
      padding: { x: 12, y: 6 }
    });
    this.bossNameText.setOrigin(0.5, 0);
    this.bossNameText.setDepth(UI_DEPTH);
    // Same empty-background behavior as `tierUpText` above: outside Level 5, the blank boss
    // plate must not leave a 24x32 dark block at the top-center of the HUD.
    this.bossNameText.setVisible(false);

    // backlog 2.31 / issue #57 — debuff-magnitude/duration HUD line, directly below the
    // Level/Wave readout above (same fixed top-right column). Left empty by default;
    // `updateHud` only ever gives it text while `this.debuff` actually has an active stack,
    // so it takes no HUD space at all during a fight with no Debuffer in it.
    this.debuffText = this.add.text(CANVAS_WIDTH - 16, 64, "", {
      color: "#c9a7f0",
      fontFamily: "monospace",
      fontSize: "13px",
      align: "right",
      lineSpacing: 3
    });
    this.debuffText.setOrigin(1, 0);
    this.debuffText.setDepth(UI_DEPTH);

    // backlog 2.35 / issue #78 — centered in the upper lane, clear of the hotbar row below
    // and the top-left/top-right HUD corners, so it doesn't compete with any always-on element.
    this.onboardingHintText = this.add.text(CANVAS_WIDTH / 2, ROAD_TOP + 40, ONBOARDING_HINT_TEXT, {
      color: "#f3e7c2",
      fontFamily: "monospace",
      fontSize: "14px",
      align: "center",
      backgroundColor: "#1c1330",
      padding: { x: 14, y: 10 }
    });
    this.onboardingHintText.setOrigin(0.5, 0);
    this.onboardingHintText.setDepth(UI_DEPTH);
    // Issue #233 — pause gameplay (see `update()`'s `onboardingHintActive` gate) for as long as
    // this hint is visible, and only dismiss it via `dismissOnboardingHint`'s two explicit
    // triggers (a click or the designated key — `createInput`'s `pointerdown`/`keydown-SPACE`
    // handlers) or this fallback timer, never as a side effect of a hotbar press.
    this.onboardingHintActive = true;
    this.time.delayedCall(ONBOARDING_HINT_FALLBACK_MS, () => this.dismissOnboardingHint());

    // Issue #239 — proximity hint for the Side-Pocket Lore Encounter's reactive marker.
    // Positioned directly below `onboardingHintText`'s row (rather than the same row) so the
    // rare case both are visible at once (an unusually fast player reaching a marker before the
    // 9s onboarding fallback fires) stacks instead of overlapping. Created hidden; only
    // `updateSidePocketMarkers` toggles visibility, every frame, off the pure
    // `shouldShowSidePocketHint` gate.
    this.sidePocketHintText = this.add.text(CANVAS_WIDTH / 2, ROAD_TOP + 76, SIDE_POCKET_HINT_TEXT, {
      color: "#dff2ff",
      fontFamily: "monospace",
      fontSize: "14px",
      align: "center",
      backgroundColor: "#1c1330",
      padding: { x: 14, y: 10 }
    });
    this.sidePocketHintText.setOrigin(0.5, 0);
    this.sidePocketHintText.setDepth(UI_DEPTH);
    this.sidePocketHintText.setVisible(false);

    // backlog 4.10 / issue #96 — the Invigilator intro/outro banner. Centered, wider than the
    // onboarding hint (word-wrapped, since the authored narration runs several sentences), and
    // deliberately in `levelWaveText`'s serif font rather than the HUD's monospace — a
    // narrative beat should not read as another status readout. Starts hidden (alpha 0); only
    // `showBossBanner`/`hideBossBanner` toggle it, same persistent-element pattern as
    // `messageText`.
    this.bossBannerText = this.add.text(CANVAS_WIDTH / 2, ROAD_TOP + 30, "", {
      color: "#ffe08a",
      fontFamily: "Georgia, serif",
      fontStyle: "italic",
      fontSize: "16px",
      align: "center",
      lineSpacing: 4,
      backgroundColor: "#1c1330",
      padding: { x: 20, y: 14 },
      wordWrap: { width: 640 }
    });
    this.bossBannerText.setOrigin(0.5, 0);
    this.bossBannerText.setDepth(UI_DEPTH);
    this.bossBannerText.setAlpha(0);

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

    // Issue #234 — secondary off-number-row bindings (Q/R/F/Shift/Ctrl/Space -> slots 1-6),
    // added alongside the number-row keys above, not replacing them. Both call the exact same
    // `handleHotbarPress(index)` the number row and #198's click-to-arm/wheel-cycle already
    // use, so every input path converges on one arm-spell call with no divergent behavior.
    this.hotbarSecondaryKeys = HOTBAR_SECONDARY_KEYS.map((key) =>
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes[key])
    );
    this.hotbarSecondaryKeys.forEach((key, index) => {
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
      // Issue #233 — a click while the onboarding hint is showing is exactly one of its two
      // explicit acknowledgment triggers (the other is `keydown-SPACE` below): it dismisses the
      // hint and is swallowed here (neither arms/confirms a hotbar slot nor casts/cancels
      // underneath it), same "swallow the input that ended the overlay" shape as the confirm-
      // gated boss banner below, just without needing a requireConfirm carve-out of its own
      // since every onboarding-hint display uses this same any-click dismiss.
      if (this.onboardingHintActive) {
        this.dismissOnboardingHint();
        return;
      }
      // Issues #112/#113 — a click while the boss banner is showing dismisses it early
      // instead of casting/cancelling underneath it.
      // Issue #183 — except the confirm-gated outro banner: a click is swallowed (neither
      // dismisses the banner nor casts/cancels underneath it) rather than acting as a second,
      // undocumented dismiss path alongside the `[Y]` gate the on-screen text actually promises.
      if (this.bossBannerActive) {
        if (this.bossBannerRequiresConfirm) {
          return;
        }
        this.hideBossBanner();
        return;
      }
      // Issue #198 — click-to-arm: a click landing inside a rendered hotbar slot arms (or
      // re-confirms) that slot's spell through the exact same `handleHotbarPress(index)` call
      // the number-key handler already uses, instead of falling through to `confirmCast`/
      // `cancelPreview` below. This also means clicking the hotbar itself can never be
      // misread as "confirm-cast aimed at the HUD" — before this change, any left-click
      // (hotbar or not) always called `confirmCast(pointer.worldX, pointer.worldY)`. The HUD
      // has no camera scroll applied (`SpellroadScene` never moves its camera), so the
      // pointer's screen coordinates line up with the same coordinate space
      // `hotbarSlotRects` was laid out in.
      const hotbarIndex = hotbarSlotIndexAtPoint(this.hotbarSlotRects, pointer.x, pointer.y);
      if (hotbarIndex !== null) {
        if (pointer.leftButtonDown()) {
          this.handleHotbarPress(hotbarIndex);
        }
        return;
      }
      if (pointer.leftButtonDown()) {
        this.lastPointerActivityAt = this.time.now;
        this.confirmCast(pointer.worldX, pointer.worldY);
      } else if (pointer.rightButtonDown()) {
        this.cancelPreview();
      }
    });

    // Issue #198 — scroll-wheel cycling: an additional input path onto the same
    // `handleHotbarPress(index)` call the number-key and hotbar-click handlers already use, so
    // preview/confirm/cancel behavior is identical regardless of which of the three armed the
    // spell. Cycles across every rendered hotbar slot (`hotbarSlotRects.length`, i.e. the full
    // 1-6 row), not just occupied ones — landing on an empty trailing slot is a no-op stop in
    // the cycle, the same as clicking or number-keying an empty slot already is; skipping empty
    // slots here would need this handler to know which slots are occupied, when
    // `handleHotbarPress` already handles that itself. Scroll direction: wheel-down (natural
    // "scroll down the list", positive `deltaY`) moves to the next slot; wheel-up moves to the
    // previous slot — an arbitrary but internally consistent choice, since neither the issue
    // nor `hotbarLayout.ts`'s existing conventions specify one.
    this.input.on(
      "wheel",
      (_pointer: Phaser.Input.Pointer, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
        if (this.hotbarSlotRects.length === 0) {
          return;
        }
        const direction: 1 | -1 = deltaY > 0 ? 1 : -1;
        const currentIndex = this.equippedSpells.findIndex((spell) => spell.id === this.previewSpellId);
        const nextIndex = nextHotbarIndex(currentIndex, this.hotbarSlotRects.length, direction);
        this.handleHotbarPress(nextIndex);
      }
    );

    // Issues #112/#113 — same dismiss-early contract for the keyboard: any keypress ends the
    // boss banner's display rather than waiting out its reading-speed-scaled auto-hide. Phaser fires
    // this generic `keydown` event alongside (not instead of) the specific `keydown-Y`/
    // `keydown-N`/hotbar-digit handlers below, so none of those need to change. Esc is
    // excluded deliberately (code review, 2026-08-06): it already has its own contextual
    // meaning below (cancel preview, or open the pause menu) — letting it also dismiss the
    // banner here would fire both on the same keypress (banner vanishes AND PauseScene
    // launches at once), a confusing combination neither #112 nor #113 asked for.
    //
    // Issue #183 — `bossBannerRequiresConfirm` opts the outro banner out of this any-keypress
    // path entirely: it's ended only by the dedicated `keydown-Y` listener
    // `armBossBannerConfirmListener` arms, the same way `startPhaseBreak`'s Y/N prompt is only
    // ended by its own specific listeners, not this generic handler.
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (this.bossBannerActive && !this.bossBannerRequiresConfirm && event.code !== "Escape") {
        this.hideBossBanner();
      }
    });

    // Issue #233 — the onboarding hint's designated-key acknowledgment (the other trigger is
    // the `pointerdown` handler above). `SPACE` is unbound everywhere else in this scene
    // (hotbar is 1-6, movement is arrows/WASD, Esc has its own contextual meaning below), so it
    // can't be misread as any other input while doubling as this dismiss. Deliberately its own
    // narrow listener rather than folding into the generic `keydown` handler above — that one is
    // scoped to the boss banner's any-keypress dismiss contract and explicitly excludes Escape;
    // reusing it here would tangle two unrelated overlays' dismiss rules together.
    this.input.keyboard?.on("keydown-SPACE", () => {
      if (this.onboardingHintActive) {
        this.dismissOnboardingHint();
      }
    });

    // backlog 5.8 / the 2026-08-01 boot-title-pause design spec, decision 4 — Esc is
    // contextual with the existing preview-cancel binding: an active spell preview cancels
    // first (unchanged), otherwise Esc opens the hard-pause menu. `scene.pause()` freezes this
    // scene's own `update()` (enemies, wave timers, Mana regen all stop) while `PauseScene`
    // renders on top, un-paused, and owns Resume/Quit-to-Title from here on — this scene's own
    // input listeners stop firing once paused, so there is no risk of this same handler
    // double-triggering a second pause launch.
    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.previewSpellId) {
        this.cancelPreview();
        return;
      }
      this.scene.pause();
      this.scene.launch("PauseScene", { gameplaySceneKey: "SpellroadScene" });
    });
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
    // Issue #233 (replaces #197) — a hotbar press deliberately no longer dismisses the
    // onboarding hint. The old behavior (any hotbar press, even toward an empty slot, dismissed
    // it) was the root cause of the bug this ticket fixes: arming a spell and dismissing the
    // hint were the same action, so a first-time player never got past the hint's first line
    // before it vanished. Dismissal now only happens via `dismissOnboardingHint`'s explicit
    // triggers (see its own comment) — a hotbar press here is left free to arm/preview a spell
    // exactly as it would with no hint showing at all.
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
      this.flashMessage("Not enough Mana", 900, "warning");
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
      this.flashMessage("Not enough Mana", 900, "warning");
      return;
    }

    // backlog 2.36 / issue #79 — the cast itself gets a visual beat regardless of whether it
    // lands a hit (a whiff should still visibly confirm the spell fired), fired once here
    // rather than per-enemy inside the hit loop below.
    this.spawnCastEffect(spell, targetX, targetY);

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
      this.spawnImpactBurst(enemyX, enemyY, ELEMENT_EFFECT_COLOR[spell.element], spell.element);
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
      // Issue #117 — was 1500ms on the shared `flashMessage` channel, identical styling to a
      // throwaway "Hit!"/wave-transition beat and just as vulnerable to being clobbered by
      // one; a player played through 4 full levels without ever registering it. `flashTierUp`
      // is a dedicated element (see its own comment) so a "Hit!" moments later can't erase it;
      // 2600ms matches the death message's own weight for a comparably significant event.
      this.mastery.recordLandedCast(spell.id, (spellId, tier) =>
        this.flashTierUp(`${spellId} reached ${tier.toUpperCase()} Mastery!`, 2600)
      );
      this.persistProgress();
    }
  }

  /** backlog 2.36 / issue #79 — shared mage-to-target shape geometry between the live preview
   * (`updatePreview`) and the one-shot cast-effect flash (`spawnCastEffect`): both need
   * identical line/cone/circle math, differing only in which `Graphics` object and fill/stroke
   * style is active when it runs. Draws into whatever style the caller already set on
   * `graphics` — this method only computes and traces geometry, never touches style, so a
   * translucent preview and an opaque flash can share it without either dictating the other's
   * look. */
  private traceAoEShape(
    graphics: Phaser.GameObjects.Graphics,
    shape: AoEShape,
    originX: number,
    originY: number,
    targetX: number,
    targetY: number
  ): void {
    const direction = new Phaser.Math.Vector2(targetX - originX, targetY - originY);
    if (direction.length() === 0) {
      direction.x = 1;
    }
    direction.normalize();

    if (shape === "line") {
      const angle = Math.atan2(direction.y, direction.x);
      graphics.save();
      graphics.translateCanvas(originX, originY);
      graphics.rotateCanvas(angle);
      graphics.fillRect(0, -SHAPE_GEOMETRY.LINE_WIDTH / 2, SHAPE_GEOMETRY.LINE_LENGTH, SHAPE_GEOMETRY.LINE_WIDTH);
      graphics.strokeRect(0, -SHAPE_GEOMETRY.LINE_WIDTH / 2, SHAPE_GEOMETRY.LINE_LENGTH, SHAPE_GEOMETRY.LINE_WIDTH);
      graphics.restore();
    } else if (shape === "cone") {
      const facing = Math.atan2(direction.y, direction.x);
      const half = Phaser.Math.DegToRad(SHAPE_GEOMETRY.CONE_HALF_ANGLE_DEG);
      graphics.slice(originX, originY, SHAPE_GEOMETRY.CONE_RADIUS, facing - half, facing + half, false);
      graphics.fillPath();
      graphics.strokePath();
    } else {
      const distance = Math.min(
        Phaser.Math.Distance.Between(originX, originY, targetX, targetY),
        SHAPE_GEOMETRY.CIRCLE_MAX_PLACEMENT_RANGE
      );
      const center = new Phaser.Math.Vector2(originX, originY).add(direction.clone().scale(distance));
      graphics.fillCircle(center.x, center.y, SHAPE_GEOMETRY.CIRCLE_RADIUS);
      graphics.strokeCircle(center.x, center.y, SHAPE_GEOMETRY.CIRCLE_RADIUS);
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

    this.previewGraphics.fillStyle(0x8fd3ff, 0.28);
    this.previewGraphics.lineStyle(2, 0x8fd3ff, 0.8);
    this.traceAoEShape(this.previewGraphics, spell.shape, this.mage.x, this.mage.y, aim.x, aim.y);

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
      // Issue #236 — replaces the old flat `flashMessage("Vertical slice complete!", 3000)`.
      // The ordinary path into this branch is 1200ms after the boss's last phase clears (the
      // shared advance-delay `delayedCall` in `updateEnemies` calls `startWave(nextIndex)`
      // unconditionally; `nextIndex` is out of range exactly when the boss fight just ended
      // the vertical slice), which is the same tick the outro banner
      // (`BOSS_BANNER_OUTRO_TEXT`, `requireConfirm: true`) is still up awaiting its own
      // `[Y] Continue` — that narration must play first, unchanged, per this issue's
      // acceptance criteria. Deferring via `bossBannerOnHidden` (the same "run once the
      // current banner has fully hidden" hook issue #134 already established) means the win
      // banner only actually appears once the player has dismissed the outro, never
      // interrupting or racing it. If there's no boss banner in the way (`bossBannerActive`
      // false — not reachable in this vertical slice today, but true for any future
      // non-boss ending), it shows immediately instead of waiting on nothing.
      if (this.bossBannerActive) {
        const previousOnHidden = this.bossBannerOnHidden;
        this.bossBannerOnHidden = () => {
          previousOnHidden?.();
          this.showWinBanner();
        };
      } else {
        this.showWinBanner();
      }
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
      this.persistProgress();
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
        // Issue #115 — developer playtest: "on this wave we should let the players now that
        // they are on a trial and their life wont be restoring like in the other levels."
        // hp-template.md's per-wave reset is real (this is the one reset point for the
        // fight), but nothing told the player it's also the LAST one until Phase 3 — every
        // other level fully resets HP every wave, and this trial deliberately doesn't.
        // Code review, 2026-08-06 (spec check against #115): the recovery-prompt reminder at
        // the actual decision point (`startPhaseBreak`, below) already got #114's "warning"
        // treatment, but this earlier, first-told-here announcement was left on the plain
        // "default" emphasis #114 exists specifically to move away from — the one place this
        // HP-reset rule is announced ahead of any decision hinging on it.
        // Issue #134 — developer playtest: this flashMessage used to fire the same tick as
        // `showBossBanner` below, so the HP-carry warning and the boss intro narration
        // rendered simultaneously and competed for attention. Deferred to the banner's
        // `onHidden` callback so the player reads the narration first, then the mechanical
        // warning, never both at once.
        // Issue #142 — the two tracks are mutually exclusive (`shouldPlayCombatCueForWave`).
        // Level 5's Phase 1 is entered directly from the last ordinary wave of Level 4, whose
        // cue is already stopped by the wave-clear path below; this is belt-and-braces for the
        // one path that isn't a normal wave clear (`?debugLevel=5` boots straight in).
        this.stopCombatCue();
        // Issue #188 — same belt-and-braces for the third track. The interlude predicate
        // (`shouldPlayExplorationLoopBetweenWaves`) already refuses to start an interlude into a
        // boss wave, so on the normal Level 4 -> 5 path there is nothing playing to stop; this
        // covers `?debugLevel=5` and any future path that reaches Phase 1 without a preceding
        // ordinary wave clear.
        this.stopExplorationLoop();
        this.playBossTheme();
        this.showBossBanner(BOSS_BANNER_INTRO_TEXT, () => {
          this.flashMessage("Director Trial — Phase 1 (HP won't reset again until you win or die)", 2400, "warning");
        });
        this.bossNameText?.setText(BOSS_NAME_TEXT).setVisible(true);
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
      // Developer feedback (2026-08-13): mana was previously never reset at wave start
      // (only on death/respawn), so a low-mana finish carried into the next wave. Regular
      // waves now mirror HP's clean-budget reset; the Director Trial deliberately keeps its
      // no-refill carry-over (this branch is skipped for `wave.is_boss` above), preserving the
      // resource-strategy stakes across its phases.
      this.mana.reset();
    }

    this.debuff.clear();
    // Issue #71 fix — was `wave.enemies.reduce((sum, e) => sum + e.count, 0)`, counting every
    // authored entry including ones `spawnWave` silently skips for an unregistered `type`. That
    // skip never called `onSpawn`, so the counter could never reach zero and the wave soft-locked
    // permanently even after every spawnable enemy died. `countSpawnableEnemies` counts only
    // entries `ENEMY_REGISTRY` actually recognizes, matching what `spawnWave` will really spawn.
    this.enemiesRemainingToSpawn = countSpawnableEnemies(wave, ENEMY_REGISTRY);
    spawnWave(
      this,
      wave,
      { x: ENEMY_SPAWN_X, y: 270 },
      LANE_RECT,
      (enemy) => {
        this.enemies.push(enemy);
        this.enemiesRemainingToSpawn -= 1;
        // Issue #142 — "first enemy contact," concretely: the moment the first monster of this
        // wave actually exists in the world. Hooked to `spawnWave`'s own spawn callback rather
        // than to `startWave`'s top, because waves stagger their spawns (`spawn_delay_ms`) and
        // a level-transition wave can open on a beat with no enemy on screen yet — starting the
        // music there would score the empty road, which is the exact complaint this ticket
        // exists to fix. Not hooked to first *damage* either: the player is already reading and
        // repositioning against a visible threat well before anyone lands a hit, and that is the
        // moment Lorena's brief names ("the mage stops reading the road and starts reading a
        // threat in motion"). `playCombatCue` is idempotent while playing, so the second and
        // subsequent spawns of the same wave are no-ops and never restart the loop mid-phrase.
        // Issue #188 — and the same instant is where the interlude ends. Stopped unconditionally,
        // ahead of the cue's own boss check: whatever this wave is, an enemy now exists in the
        // world, so the road is no longer quiet. Putting the stop here rather than at `startWave`'s
        // top is what makes the handoff seamless — `startWave` runs up to `spawn_delay_ms` before
        // the first monster appears, and stopping there would reintroduce a smaller version of the
        // exact silence this ticket removes.
        this.stopExplorationLoop();
        if (shouldPlayCombatCueForWave(wave)) {
          this.playCombatCue();
        }
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
    //
    // Issue #114 — developer playtest: "the text for using the hexcoins to buy more life
    // isnt easy to read." This call used to render via `flashMessage`'s plain "default"
    // styling branch (no background panel) despite being a comparably important, 60-second-
    // displayed, real-stakes Y/N decision. Backlog 2.37/#80 already added the "warning"
    // emphasis (salmon text on an opaque dark-red panel) for exactly this "hard to read"
    // complaint on the Mana-rejection message — reused here rather than inventing a second
    // styling scheme. Issue #115's HP-carries-over reminder is folded into this same prompt,
    // since it's the actual decision point where that fact changes what "pay or refuse" means.
    //
    // Issue #182 — developer playtest: taking longer than the old fixed 60000ms to decide (read
    // it, went AFK, or paused-and-came-back) let `update()`'s generic `messageClearAt` timer
    // wipe this prompt's text while the `keydown-Y`/`keydown-N` listeners below were still
    // armed with no expiry of their own — the game sat blocked waiting for a keypress with
    // nothing on screen saying why. `Infinity` here means `update()`'s
    // `this.time.now > this.messageClearAt` check can never trip while this choice is still
    // pending: the prompt now persists until `resolve()` actually fires (which itself calls
    // `flashMessage`/`startWave`'s own flashes with a real duration, naturally retiring this
    // text once the choice is resolved) rather than auto-clearing on any fixed timer.
    this.flashMessage(
      canPay
        ? `The ledger waits. [Y] Pay ${FEE_PHASE_RECOVERY} Hexcoin -> restore ${Math.round(MAX_HP * PHASE_RECOVERY_HP_FRACTION)} HP (HP won't reset otherwise!)  /  [N] Refuse`
        : "Phase clear! HP carries into the next phase (no reset) — press Y to continue.",
      Infinity,
      "warning"
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
        this.persistProgress();
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

  /** Issue #157 — offered once per Side-Pocket Lore Encounter, at the final wave of its
   * level. Same in-world-prompt shape as `startPhaseBreak` (reuses `messageText` via
   * `flashMessage`, keyed off a captured-not-bumped generation, listener refs hoisted to a
   * scene field for `handleDeath` to deregister) but a different resolution shape: Continue
   * ([C]) is the only action that ever advances — Explore ([E]) reveals/awards and then
   * re-renders this same prompt in its "already explored" form so the player reads the
   * reveal before choosing to move on, per the ticket's "Explore returns to the Continue
   * choice" decision. */
  private startSidePocketChoice(encounter: SidePocketEncounter, nextIndex: number): void {
    const encounterGeneration = this.session.generation;
    this.session.beginEncounterChoice();

    const promptText = (discovered: boolean): string =>
      discovered
        ? `${encounter.objectName} -- "${encounter.loreSentence}"  [C] Continue`
        : `A ${encounter.objectName.toLowerCase()} waits off the road. [E] Explore  /  [C] Continue`;

    const alreadyDiscovered = this.persistentMetadata.loreFlags.includes(encounter.loreFlag);
    // Issue #182 — same fix as `startPhaseBreak`'s Y/N prompt just above: this is also an
    // indefinite-wait keyboard choice (`keydown-E`/`keydown-C` below, armed with no expiry), so
    // it must not auto-clear on a fixed timer while unresolved. `Infinity` keeps `update()`'s
    // generic clear check from ever tripping until a real `flashMessage` call (the re-rendered
    // "already explored" prompt below, or the next wave's own flash) naturally replaces it.
    this.flashMessage(promptText(alreadyDiscovered), Infinity, "warning");

    const onExplore = () => {
      if (!canResolveEncounterChoice(this.session.phase, this.session.generation, encounterGeneration)) {
        return;
      }
      const result = resolveSidePocketExplore(encounter, this.persistentMetadata.loreFlags);
      if (result.applied) {
        // Mutate in place then persist, following the exact existing convention
        // (`persistProgress`'s own doc comment) every other state-changing mutation in this
        // scene already uses.
        this.persistentMetadata.loreFlags = result.updatedLoreFlags;
        this.hexcoin.awardPermanent(result.rewardHexcoin);
        this.persistProgress();
      }
      // Re-render the "already explored" prompt regardless of whether this call actually
      // applied anything — a duplicate/stale Explore delivered after the flag is already set
      // must land on the exact same Continue-only prompt a legitimate first Explore does. One
      // combined `flashMessage` call (not reveal-then-prompt as two calls): `flashMessage`
      // unconditionally overwrites `messageText`, so a second call issued in the same tick
      // would silently clobber the first before it ever renders. Issue #182 — still an
      // unresolved choice (Continue hasn't fired yet), so this re-render keeps the same
      // `Infinity` no-auto-clear duration as the initial prompt above.
      this.flashMessage(promptText(true), Infinity, "warning");
    };
    const onContinue = () => {
      if (!canResolveEncounterChoice(this.session.phase, this.session.generation, encounterGeneration)) {
        return;
      }
      this.session.beginAdvance();
      this.input.keyboard?.off("keydown-E", onExplore);
      this.input.keyboard?.off("keydown-C", onContinue);
      this.sidePocketChoiceListeners = null;
      this.time.delayedCall(200, () => {
        if (!this.session.isCurrent(encounterGeneration)) {
          return;
        }
        this.startWave(nextIndex);
      });
    };
    this.sidePocketChoiceListeners = { onExplore, onContinue };
    // Both keys are independent `.once` listeners, unlike the phase-break's Y/N (where either
    // choice ends the prompt): pressing E must not disarm C, since Explore is meant to return
    // control to the same Continue choice rather than end the prompt. Only C's own callback
    // deregisters both (there's nothing left to explore once the player has moved on).
    this.input.keyboard?.once("keydown-E", onExplore);
    this.input.keyboard?.once("keydown-C", onContinue);
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
    // Issues #110/#138/#167 — every enemy receives *every* other live enemy's position, not
    // just its same-archetype peers, so no two enemies can overlap or co-travel indefinitely.
    // Issue #167: this used to be bucketed per archetype (`positionsByArchetype`), on the
    // reasoning that the deliberately non-overlapping preferred-range bands (240 ranged vs. 150
    // debuffer vs. 34 melee) already kept different archetypes apart. They don't: those bands
    // describe a settled distance from the mage, and say nothing about a Nearblade crossing
    // straight through a Farlance on its way in — which is exactly what the developer saw. The
    // bands are still safe from the flat separation applied here; see `Enemy.update`'s comment.
    //
    // Snapshotted once, before the update loop, so separation is computed from a single
    // consistent start-of-frame world state rather than letting an enemy's push depend on where
    // it happens to sit in `this.enemies` (earlier enemies would otherwise react to
    // start-of-frame positions and later ones to already-moved positions).
    const activeEnemies = this.enemies.filter((enemy) => enemy.active);
    const enemyPositions = activeEnemies.map((enemy) => ({
      x: enemy.x,
      y: enemy.y,
      separationId: enemy.separationId
    }));
    for (const enemy of activeEnemies) {
      if (!enemy.active) {
        continue;
      }
      enemy.update(
        deltaMs,
        this.mage.x,
        this.mage.y,
        {
          onMeleeHit: () => this.health.applyDamage(Math.round(ARCHETYPE_DAMAGE.melee * enemy.damageModifier)),
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
                this.health.applyDamage(Math.round(ARCHETYPE_DAMAGE.ranged * enemy.damageModifier));
              }
            });
          },
          onDebuffPulse: (variant) => {
            this.spawnDebuffPulse(enemy.x, enemy.y, variant);
            this.debuff.applyStack(variant);
          }
        },
        // Issues #110/#167 — see `Enemy.update`'s own comment: lets any enemy push off any
        // other enemy crowded too close instead of stacking on the same point.
        enemyPositions
      );
    }

    // Backlog 2.38 / issue #87 — a Debuffer (0 direct damage by design) left as the only thing
    // standing has nothing left to threaten and nothing left to protect; developer's call
    // (2026-08-06) was to keep the 0-damage design but end the pointless standoff rather than
    // let the player camp it indefinitely. Checked before `shouldAutoAdvance` below so clearing
    // the yielding Debuffers here is exactly what lets that existing check fire the very same
    // frame (or the next), same as if the player had landed the killing blow.
    if (
      this.session.phase === "running" &&
      allRemainingAreYieldingDebuffers(this.enemies, this.enemiesRemainingToSpawn)
    ) {
      const yielding = [...this.enemies];
      for (const enemy of yielding) {
        // Not routed through `confirmCast`'s per-hit loop (no player spell did this), so no
        // Mastery credit — `recordLandedCast` is keyed to a specific spell, and none applies
        // here. Hexcoin is still awarded (`removeEnemy` alone doesn't grant it, per that
        // method's own scope): every spawned enemy in a wave otherwise contributes exactly 1
        // Hexcoin toward Pato's validated per-wave income budget, and a Debuffer that yields
        // instead of being cast down is still a cleared enemy, not a forfeited one.
        this.removeEnemy(enemy);
        this.hexcoin.earn(1);
      }
      this.persistProgress();
      this.flashMessage(`${archetypeDisplayName("debuffer")} yields -- nothing left to guard`, 1400);
    }

    // Issue #48 — gated on the session phase, not on the counters alone. The old condition
    // (`enemiesRemainingToSpawn === 0 && enemies.length === 0`, guarded by a `-1` sentinel)
    // is *exactly* the state `handleDeath` creates when it clears the field, so every death
    // used to schedule a bonus wave-advance that fired 300ms before the death restart did.
    if (shouldAutoAdvance(this.session.phase, this.enemiesRemainingToSpawn, this.enemies.length)) {
      const advanceGeneration = this.session.generation;
      this.session.beginAdvance(); // replaces the old `enemiesRemainingToSpawn = -1` sentinel
      // Issue #142 — end of wave: every enemy is spawned and dead, so combat is over and the
      // cue stops here, before any of the branches below (phase break, Side-Pocket prompt,
      // boss victory, plain 1200ms auto-advance) decide what comes next. Placed once at the
      // top rather than repeated per branch: "the wave is cleared" is the single condition that
      // ends the cue, and two of those branches (`startPhaseBreak`, `startSidePocketChoice`)
      // `return` early, so a stop at the bottom would be silently skipped for them. That also
      // means the Side-Pocket lore prompt — the closest thing the shipped game currently has to
      // an exploration beat — is read in quiet, not over combat music.
      this.stopCombatCue();
      const wave = this.waves[this.waveIndex];
      const next = this.waves[this.waveIndex + 1];
      const nextIndex = this.waveIndex + 1;
      // Issue #188 — the interlude starts here, on the same line the combat cue ends, rather than
      // when the Side-Pocket prompt appears. The developer noticed the silence at the Explore
      // prompt ("when i finish a level and select explore i dont hear any music"), but the prompt
      // is only one of the four things that can follow a wave clear and it appears at most four
      // times in the whole slice — the silence itself is every non-combat gap between waves.
      // Starting on the clear rather than on the prompt is the more general fix, needs no second
      // trigger inside `startSidePocketChoice`, and reads as one rule ("no monsters on the road,
      // exploration music plays") instead of a special case. This also means the branch this
      // choice sits above — the plain 1200ms auto-advance — is scored too, which is the ordinary
      // between-waves gap the previous comment above already noted was read "in quiet."
      //
      // Deliberately not restarting an interlude that's already playing (`playExplorationLoop` is
      // a no-op while playing): back-to-back short waves would otherwise cut the same track's
      // opening bar over and over. Because of that no-op, the rotation only advances when an
      // interlude genuinely stopped and started again, which is exactly "each time it starts up
      // again after having stopped" — a wave's combat is what separates two interludes.
      if (shouldPlayExplorationLoopBetweenWaves(wave, next)) {
        this.playExplorationLoop();
      }
      if (wave?.is_boss && next?.is_boss && next.level === wave.level) {
        // Another phase of the same boss follows: offer the paid recovery choice instead
        // of auto-advancing — this is the phase-break, not a regular wave transition.
        this.startPhaseBreak(nextIndex);
        return;
      }
      // Issue #157 — the final wave of a regular level (1-4) with an undiscovered Side-Pocket
      // Lore Encounter pauses here instead of auto-advancing, exactly the same interception
      // point/shape as the boss phase-break branch above. `evaluateSidePocketOffer` already
      // excludes boss waves and Level 5 (no catalog entry), so this check is safe to run
      // unconditionally for every non-boss wave-clear, not only ones already known to be a
      // level's last.
      if (wave) {
        const offer = evaluateSidePocketOffer(wave, next, this.persistentMetadata.loreFlags);
        if (offer.offer && offer.encounter) {
          this.startSidePocketChoice(offer.encounter, nextIndex);
          return;
        }
      }
      if (wave?.is_boss) {
        // Last phase of the boss just cleared.
        this.hexcoin.endBossFight();
        this.flashMessage("Director Trial — Victory!", 2500);
        this.stopBossTheme();
        // Issue #183 — narrowed carve-out from #112/#113's any-input-dismisses behavior: this
        // is the run's actual ending beat (Lorena's outro narration, the vertical slice's only
        // shipped ending), so a leftover cast-key press or click from the fight that just ended
        // must not be able to skip it. `requireConfirm` swaps that for an explicit
        // `[Y] Continue` gate, reusing this file's existing Y/N confirm pattern
        // (`startPhaseBreak`) rather than a new mechanism. The intro banner a few phases back
        // and every other in-combat message are deliberately untouched — #112/#113's reasoning
        // (don't block vision/combat unnecessarily) still holds for those.
        this.showBossBanner(BOSS_BANNER_OUTRO_TEXT + BOSS_BANNER_OUTRO_CONFIRM_HINT, undefined, {
          requireConfirm: true
        });
        // Issue #116 — the fight is over; clear the persistent name plate rather than leaving
        // "The Invigilator" on screen through the regular levels that follow.
        this.bossNameText?.setText("").setVisible(false);
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
    // backlog 3.10 / issue #81 — enemy death SFX; `removeEnemy` is only ever called from
    // `confirmCast`'s `if (killed)` branch, so this is exactly the "enemy dying" event the
    // ticket scopes, never a despawn/cleanup path (e.g. `handleDeath`'s own
    // `this.enemies.forEach((e) => e.destroy())` calls `destroy()` directly, not this method).
    this.sound.play(sfxKey("enemyDeath"), computeSfxVariation());
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
    const dot = this.add.circle(fromX, fromY, 7, ENEMY_THREAT_COLOR);
    dot.setStrokeStyle(2, 0xffffff, 0.9);
    dot.setDepth(1000);
    // Issue #164 — developer playtest: enemy attacks read as flat next to the new spell VFX.
    // A pulsing scale on the bolt itself plus a short trail of fading spark particles following
    // it (`startFollow`) turns the previously-static dot into a genuinely animated projectile,
    // without changing its travel timing/hitbox math (both still key off `RANGED_TRAVEL_MS` and
    // `toX`/`toY` exactly as before — this is visual-only).
    this.tweens.add({
      targets: dot,
      scale: { from: 0.85, to: 1.25 },
      duration: 140,
      yoyo: true,
      repeat: -1
    });
    const trailTextureKey = this.ensureElementalVfxTexture("enemy-threat", ENEMY_THREAT_COLOR, 5);
    const trail = this.add.particles(fromX, fromY, trailTextureKey, {
      lifespan: 200,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      frequency: 20,
      quantity: 1
    });
    trail.setDepth(999);
    trail.startFollow(dot);
    this.tweens.add({
      targets: dot,
      x: toX,
      y: toY,
      duration: RANGED_TRAVEL_MS,
      ease: "Linear",
      onComplete: () => {
        dot.destroy();
        trail.stop();
        this.time.delayedCall(220, () => trail.destroy());
        this.spawnEnemyRangedImpactVfx(toX, toY);
      }
    });
  }

  /** Issue #164 — a small animated burst at the projectile's arrival point (visual only, fires
   * regardless of whether the delayed damage check in `onRangedFire` actually lands — matching
   * `spawnCastEffect`'s own existing "flash fires unconditionally, even on a whiff" convention)
   * so a ranged shot's landing is a distinct visible beat, not silent until the HP bar moves. */
  private spawnEnemyRangedImpactVfx(x: number, y: number): void {
    const burst = this.add.circle(x, y, 4, ENEMY_THREAT_COLOR, 0.55);
    burst.setStrokeStyle(2, ENEMY_THREAT_COLOR, 1);
    burst.setDepth(1000);
    this.tweens.add({
      targets: burst,
      radius: 20,
      alpha: 0,
      duration: 260,
      ease: "Cubic.Out",
      onUpdate: () => burst.setStrokeStyle(2, ENEMY_THREAT_COLOR, burst.alpha),
      onComplete: () => burst.destroy()
    });
    const textureKey = this.ensureElementalVfxTexture("enemy-threat", ENEMY_THREAT_COLOR, 4);
    const sparks = this.add.particles(x, y, textureKey, {
      speed: { min: 80, max: 160 },
      lifespan: 220,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      emitting: false
    });
    sparks.setDepth(1000);
    sparks.explode(8, x, y);
    this.time.delayedCall(240, () => sparks.destroy());
  }

  /** Issue #125 — registers the 3 CC0 Remix fire-VFX play-once animations exactly once per
   * scene instance. Called from `create()`, which (per the stale-state-reset comment above
   * this method's own call site) re-runs on every New Game/Quit-to-Title restart against the
   * same Scene instance — `this.anims.exists` guards against Phaser's "animation key already
   * exists" warning on the 2nd+ run rather than relying on `anims.create` to silently no-op. */
  private createOpeningVfxAnimations(): void {
    if (this.anims.exists(OPENING_VFX_CAST_ANIM_KEY)) {
      return;
    }
    // Issue #164 — developer playtest (2026-08-10): "the spell from the fire...seems very
    // fast, you cant really see the animation." At the original 16fps, every one of these
    // 4-frame atlases played in 4/16 = 250ms total — verified frame count x frame rate before
    // touching anything, per this repo's root-cause-before-fix convention, rather than assuming
    // where the slowness should go. Halved to 8fps (500ms total per atlas) so the shape is
    // actually readable at real gameplay speed; still a single quick beat, not a lingering one,
    // since these layer on top of `spawnCastEffect`'s own fast flash rather than replacing it.
    const READABLE_FRAME_RATE = 8;
    this.anims.create({
      key: OPENING_VFX_CAST_ANIM_KEY,
      frames: this.anims.generateFrameNumbers(OPENING_VFX_CAST_KEY, { start: 0, end: OPENING_VFX_CAST_FRAME.frameCount - 1 }),
      frameRate: READABLE_FRAME_RATE,
      repeat: 0
    });
    this.anims.create({
      key: OPENING_VFX_IMPACT_ANIM_KEY,
      frames: this.anims.generateFrameNumbers(OPENING_VFX_IMPACT_KEY, { start: 0, end: OPENING_VFX_IMPACT_FRAME.frameCount - 1 }),
      frameRate: READABLE_FRAME_RATE,
      repeat: 0
    });
    this.anims.create({
      key: OPENING_VFX_TRAIL_ANIM_KEY,
      frames: this.anims.generateFrameNumbers(OPENING_VFX_TRAIL_KEY, { start: 0, end: OPENING_VFX_TRAIL_FRAME.frameCount - 1 }),
      frameRate: READABLE_FRAME_RATE,
      repeat: 0
    });
  }

  /** Issue #125 — layers the developer-selected CC0 Remix cast/trail sprite VFX on top of
   * `spawnCastEffect`'s existing element-tinted shape flash, fire element only (see
   * `systems/openingVfx.ts`'s module comment for why this doesn't extend to ice/earth/
   * lightning). Purely additive: the flash/SFX/traceAoEShape guide `spawnCastEffect` already
   * fires are unchanged for every element, including fire — this only adds a second, richer
   * visual layer on top for the one element the developer actually reviewed. Fires for all 3
   * fire-element spells (`flame_sweep`/cone, `flare_jab`/cone, `magma_lance`/line) — the fire
   * element itself, not one specific spell, is this codebase's existing visual-identity axis
   * (`spellIcons.ts`/`ELEMENT_EFFECT_COLOR`), so this reuses that same axis rather than
   * hardcoding to the one spell id the developer's playtest happened to showcase. */
  private spawnOpeningVfxCast(spell: SpellDefinition, targetX: number, targetY: number): void {
    if (!this.mage) {
      return;
    }
    const direction = new Phaser.Math.Vector2(targetX - this.mage.x, targetY - this.mage.y);
    if (direction.length() === 0) {
      direction.x = 1;
    }
    const angle = Math.atan2(direction.y, direction.x);
    direction.normalize();

    const castSprite = this.add.sprite(this.mage.x, this.mage.y, OPENING_VFX_CAST_KEY);
    castSprite.setRotation(angle);
    castSprite.setDepth(10);
    castSprite.play(OPENING_VFX_CAST_ANIM_KEY);
    castSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => castSprite.destroy());

    // Trail travels toward the target, capped at the *actual spell shape's own reach*
    // (line -> LINE_LENGTH, cone -> CONE_RADIUS, circle -> CIRCLE_RADIUS) rather than always
    // the cone's radius — a fire spell using a different shape (`magma_lance`, "line", reach
    // 220px) must not have its decorative trail undershoot a shorter cone-radius cap (180px)
    // that has nothing to do with that spell's real hit geometry. Same per-shape reach
    // `traceAoEShape`'s own branches already use for hit/preview geometry, just read here
    // instead of duplicated as a new constant.
    const reach =
      spell.shape === "line"
        ? SHAPE_GEOMETRY.LINE_LENGTH
        : spell.shape === "circle"
          ? SHAPE_GEOMETRY.CIRCLE_RADIUS
          : SHAPE_GEOMETRY.CONE_RADIUS;
    const travelDistance = Math.min(Phaser.Math.Distance.Between(this.mage.x, this.mage.y, targetX, targetY), reach);
    const trailTarget = new Phaser.Math.Vector2(this.mage.x, this.mage.y).add(direction.clone().scale(travelDistance * 0.7));
    const trailSprite = this.add.sprite(this.mage.x, this.mage.y, OPENING_VFX_TRAIL_KEY);
    trailSprite.setRotation(angle);
    trailSprite.setDepth(9);
    trailSprite.play(OPENING_VFX_TRAIL_ANIM_KEY);
    this.tweens.add({
      targets: trailSprite,
      x: trailTarget.x,
      y: trailTarget.y,
      duration: 260,
      ease: "Linear",
      onComplete: () => trailSprite.destroy()
    });
  }

  /** Issue #164 — one small runtime-generated circular texture per element, cached by key so
   * repeated casts of the same element don't regenerate a texture every time. Procedural (built
   * from `Graphics.generateTexture`, the same primitive `createMage`'s placeholder already uses
   * in this file) rather than a loaded asset file — no new art dependency, matching
   * `spawnDebuffPulse`'s existing "no new art asset" bound for effects that don't have a
   * developer-reviewed sprite yet. */
  private ensureElementalVfxTexture(cacheKey: string, color: number, radius: number): string {
    const key = `elemental-vfx-particle-${cacheKey}`;
    if (this.textures.exists(key)) {
      return key;
    }
    const size = radius * 2;
    const graphics = this.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillCircle(radius, radius, radius);
    graphics.generateTexture(key, size, size);
    graphics.destroy();
    return key;
  }

  /** Issue #164 — the real animated cast VFX for ice/earth/lightning (fire keeps its own
   * sourced-sprite `spawnOpeningVfxCast`). A one-shot particle burst, angled toward the target
   * and tuned per `ELEMENTAL_CAST_VFX_CONFIG` so each element still reads as visually distinct
   * from the others, not just three tints of one effect. Lightning additionally gets a jagged
   * bolt flicker (`spawnLightningBoltFlicker`) since a spark burst alone doesn't read as
   * "lightning" the way a burst alone does read as "ice shards" or "earth debris". */
  private spawnElementalCastVfx(spell: SpellDefinition, targetX: number, targetY: number): void {
    if (!this.mage) {
      return;
    }
    const config = ELEMENTAL_CAST_VFX_CONFIG[spell.element];
    if (!config) {
      return;
    }
    const direction = new Phaser.Math.Vector2(targetX - this.mage.x, targetY - this.mage.y);
    if (direction.length() === 0) {
      direction.x = 1;
    }
    const angleDeg = Phaser.Math.RadToDeg(Math.atan2(direction.y, direction.x));
    const textureKey = this.ensureElementalVfxTexture(spell.element, config.color, config.particleRadius);
    const emitter = this.add.particles(this.mage.x, this.mage.y, textureKey, {
      angle: { min: angleDeg - config.spreadDeg, max: angleDeg + config.spreadDeg },
      speed: { min: config.speedMin, max: config.speedMax },
      lifespan: config.lifespanMs,
      scale: { start: config.scaleStart, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: config.gravityY,
      emitting: false
    });
    emitter.setDepth(10);
    if (config.glow) {
      emitter.setBlendMode(Phaser.BlendModes.ADD);
    }
    emitter.explode(config.quantity, this.mage.x, this.mage.y);
    this.time.delayedCall(config.lifespanMs + 60, () => emitter.destroy());

    if (spell.element === "lightning") {
      this.spawnLightningBoltFlicker(this.mage.x, this.mage.y, targetX, targetY, config.color);
    }
  }

  /** Issue #164 — a short jagged bolt redrawn with fresh jitter a few times in quick succession
   * before fading, the same "a handful of discrete, readable steps" feel `spawnOpeningVfxCast`'s
   * sourced sprite-sheet animation gives fire, built from `Graphics` instead since no lightning
   * sprite sheet exists (see `ELEMENTAL_CAST_VFX_CONFIG`'s own comment). Purely additive to the
   * particle burst `spawnElementalCastVfx` already fires for lightning. */
  private spawnLightningBoltFlicker(fromX: number, fromY: number, toX: number, toY: number, color: number): void {
    const bolt = this.add.graphics();
    bolt.setDepth(11);
    const segments = 5;
    const steps = 3;
    const stepDelayMs = 55;
    const drawJitteredBolt = () => {
      bolt.clear();
      bolt.lineStyle(3, color, 0.95);
      bolt.beginPath();
      bolt.moveTo(fromX, fromY);
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const baseX = Phaser.Math.Linear(fromX, toX, t);
        const baseY = Phaser.Math.Linear(fromY, toY, t);
        const jitter = i === segments ? 0 : Phaser.Math.Between(-10, 10);
        bolt.lineTo(baseX + jitter, baseY + jitter);
      }
      bolt.strokePath();
    };
    drawJitteredBolt();
    for (let step = 1; step < steps; step++) {
      this.time.delayedCall(step * stepDelayMs, drawJitteredBolt);
    }
    this.tweens.add({
      targets: bolt,
      alpha: 0,
      duration: 180,
      delay: steps * stepDelayMs,
      onComplete: () => bolt.destroy()
    });
  }

  /** Issue #164 — the per-hit impact-side counterpart to `spawnElementalCastVfx`, same rationale
   * as that method's own comment (fire keeps its sourced sprite via `spawnImpactBurst`'s
   * existing fire branch; the other 3 elements get a small procedural puff instead of stopping
   * at the plain tinted ring `spawnImpactBurst` already draws for every element). */
  private spawnElementalImpactVfx(element: Element, x: number, y: number): void {
    const config = ELEMENTAL_CAST_VFX_CONFIG[element];
    if (!config) {
      return;
    }
    const textureKey = this.ensureElementalVfxTexture(element, config.color, config.particleRadius);
    const emitter = this.add.particles(x, y, textureKey, {
      speed: { min: 40, max: 110 },
      lifespan: 220,
      scale: { start: config.scaleStart * 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      emitting: false
    });
    emitter.setDepth(11);
    if (config.glow) {
      emitter.setBlendMode(Phaser.BlendModes.ADD);
    }
    emitter.explode(config.impactQuantity ?? 6, x, y);
    this.time.delayedCall(260, () => emitter.destroy());
  }

  /** backlog 2.36 / issue #79 — a one-shot flash of the actual cast shape (line/cone/circle),
   * tinted by the spell's element, fading out fast. Reuses `updatePreview`'s own
   * mage-to-target geometry (angle/distance math), drawn once on a fresh `Graphics` instead of
   * the persistent, cleared-every-frame `previewGraphics` this shares its shape logic with. */
  private spawnCastEffect(spell: SpellDefinition, targetX: number, targetY: number): void {
    if (!this.mage) {
      return;
    }
    // backlog 3.10 / issue #81 — cast SFX wired alongside this existing visual hook, the
    // natural integration point per the ticket: the sound and the shape flash fire from the
    // same call, once per cast regardless of whether it lands a hit (a whiff still confirms
    // audibly, matching `confirmCast`'s own comment on why the visual flash fires unconditionally).
    // issue #111 — a real per-element recording (not the old single shared "cast" cue),
    // still layered with the per-play pitch/volume variation on top.
    // issue #133 — the #111 recordings run several seconds long (vs. the old sub-second
    // stand-ins), so a second cast of the same element before the first cue finishes used to
    // layer both playbacks and read as one "contaminated" sound. Stop (and destroy, since
    // `this.sound.play`'s shorthand only auto-destroys on natural completion, not on a manual
    // `.stop()`) any still-playing instance of this exact element's cue first.
    const castSfxKey = elementCastSfxKey(spell.element);
    this.sound.getAll(castSfxKey).forEach((instance) => {
      instance.stop();
      instance.destroy();
    });
    this.sound.play(castSfxKey, computeSpellSfxVariation(spell.element));
    const color = ELEMENT_EFFECT_COLOR[spell.element];
    const flash = this.add.graphics();
    flash.fillStyle(color, 0.55);
    flash.lineStyle(2, color, 0.9);
    this.traceAoEShape(flash, spell.shape, this.mage.x, this.mage.y, targetX, targetY);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: CAST_EFFECT_DURATION_MS,
      ease: "Cubic.Out",
      onComplete: () => flash.destroy()
    });

    // Issue #125 — see spawnOpeningVfxCast's own doc comment for why fire gets its own sourced
    // sprite treatment. Issue #164 — every other element now gets a real animated VFX too
    // (`spawnElementalCastVfx`), not just this flat shape flash.
    if (spell.element === "fire") {
      this.spawnOpeningVfxCast(spell, targetX, targetY);
    } else {
      this.spawnElementalCastVfx(spell, targetX, targetY);
    }
  }

  /** backlog 2.36 / issue #79 — a small expanding+fading burst at each individual hit,
   * layered alongside the existing floating damage number (backlog 2.9) rather than
   * replacing it — the number carries the amount, this carries the "something just hit"
   * beat, tinted by the same per-element color `spawnCastEffect` uses for the same cast. */
  private spawnImpactBurst(x: number, y: number, color: number, element: Element): void {
    // backlog 3.10 / issue #81 — impact SFX wired alongside this existing per-hit visual beat,
    // same integration point as the cast SFX above. Fires once per landed hit (`confirmCast`'s
    // per-enemy loop calls this per hit, not per cast), matching the existing damage-number/
    // burst cadence for an AoE that lands on multiple enemies at once.
    // issue #111 — same per-element detune as the cast cue above, so an AoE landing on several
    // enemies at once still reads as one spell's element rather than a generic thud each time.
    this.sound.play(sfxKey("impact"), computeSpellSfxVariation(element));
    const burst = this.add.circle(x, y, 4, color, 0.5);
    burst.setStrokeStyle(2, color, 1);
    this.tweens.add({
      targets: burst,
      radius: 18,
      alpha: 0,
      duration: IMPACT_BURST_DURATION_MS,
      ease: "Cubic.Out",
      onUpdate: () => burst.setStrokeStyle(2, color, burst.alpha),
      onComplete: () => burst.destroy()
    });

    // Issue #125 — layers the developer-selected CC0 Remix impact sprite on top of the
    // existing tinted burst above, fire element only (see `systems/openingVfx.ts`'s module
    // comment). Purely additive, same rationale as `spawnOpeningVfxCast`. Issue #164 — the other
    // 3 elements get their own procedural particle impact instead of stopping at the plain ring.
    if (element === "fire") {
      const impact = this.add.sprite(x, y, OPENING_VFX_IMPACT_KEY);
      impact.setDepth(11);
      impact.play(OPENING_VFX_IMPACT_ANIM_KEY);
      impact.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => impact.destroy());
    } else {
      this.spawnElementalImpactVfx(element, x, y);
    }
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

  /** backlog 2.33 / issue #76 — redraws the mage's HP/Mana bars every frame, same seam
   * convention as `Enemy.ts`'s `refreshStatusOverlay` (the fraction/color arithmetic is the
   * pure, already-tested part; this method is purely the Phaser-side drawing). Two segments
   * stacked above the sprite: HP on top (banded, matches the floating damage-number colors —
   * backlog 2.9), Mana below it (single fixed tone — see `PLAYER_MANA_BAR_COLOR`'s comment). */
  private updatePlayerStatusBars(): void {
    if (!this.mage || !this.playerStatusBar) {
      return;
    }
    const barX = this.mage.x - PLAYER_STATUS_BAR_WIDTH / 2;
    const hpY = this.mage.y + PLAYER_STATUS_BAR_HP_OFFSET_Y;
    const manaY = hpY + PLAYER_STATUS_BAR_HEIGHT + PLAYER_STATUS_BAR_GAP;

    const hpFraction = computeHpFraction(this.health.current, MAX_HP);
    const manaFraction = computeHpFraction(this.mana.current, MAX_MANA);

    this.playerStatusBar.clear();
    this.drawPlayerStatusSegment(barX, hpY, hpFraction, computeHpBarColor(hpFraction));
    this.drawPlayerStatusSegment(barX, manaY, manaFraction, PLAYER_MANA_BAR_COLOR);
  }

  private drawPlayerStatusSegment(x: number, y: number, fraction: number, fillColor: number): void {
    if (!this.playerStatusBar) {
      return;
    }
    this.playerStatusBar.fillStyle(0x14161f, 0.85);
    this.playerStatusBar.fillRect(x, y, PLAYER_STATUS_BAR_WIDTH, PLAYER_STATUS_BAR_HEIGHT);
    if (fraction > 0) {
      this.playerStatusBar.fillStyle(fillColor, 1);
      this.playerStatusBar.fillRect(x, y, PLAYER_STATUS_BAR_WIDTH * fraction, PLAYER_STATUS_BAR_HEIGHT);
    }
    this.playerStatusBar.lineStyle(1, 0x000000, 0.6);
    this.playerStatusBar.strokeRect(x, y, PLAYER_STATUS_BAR_WIDTH, PLAYER_STATUS_BAR_HEIGHT);
  }

  // ----- death -----

  private handleDeath(): void {
    // backlog 3.10 / issue #81 — player death SFX, played first (before any of the state
    // resets below) so it fires exactly once per actual death regardless of how the rest of
    // this method's cleanup unfolds — mirrors the existing `flashMessage` call a few lines
    // down, which also fires unconditionally on every `handleDeath` invocation.
    this.sound.play(sfxKey("playerDeath"), computeSfxVariation());
    // backlog 4.11 / issue #97 — a death respawns at the current level's start (0.2's
    // resolution), which for the boss level is Phase 1 — `startWave` below will restart the
    // theme/banner on its own once the respawn delay elapses. Stopped here first so neither
    // lingers, unstyled, over the "Died —..." beat in the meantime; harmless no-op if the death
    // didn't happen mid-boss-fight (nothing is playing/visible to stop).
    this.stopBossTheme();
    // Issue #142 — same reasoning for the ordinary-wave cue, which is what will actually be
    // playing for the overwhelming majority of deaths (Levels 1-4). The retry's `startWave`
    // restarts it on its own at the respawned wave's first spawn; stopping here means the
    // "Died — ..." beat and the 1500ms respawn pause aren't scored by combat music for a fight
    // that is already over.
    this.stopCombatCue();
    // Issue #188 — a death during an interlude is a real state, not a corner case: the player can
    // be standing in a between-waves gap when a ranged shot already in flight lands. Stopping here
    // means the death beat isn't scored by exploration music either, and the retry's own wave
    // clear starts a freshly-rotated interlude rather than resuming the interrupted one.
    this.stopExplorationLoop();
    this.hideBossBanner();
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
    // Issue #157 — same reasoning as the phase-break cleanup just above: a death that
    // interrupts an unresolved Side-Pocket Explore/Continue prompt (a delayed ranged impact
    // can still land after the last enemy died and the prompt is already up, same timing gap
    // `updateEnemies`'s own 1200ms-advance comment documents) must not leave `keydown-E`/
    // `keydown-C` listeners registered for a later, unrelated prompt to accidentally co-fire
    // alongside. `canResolveEncounterChoice`'s token check already makes the stale closure's
    // side effects impossible even if this were skipped, but deregistering here means a later
    // prompt never inherits a stale listener in the first place.
    if (this.sidePocketChoiceListeners) {
      this.input.keyboard?.off("keydown-E", this.sidePocketChoiceListeners.onExplore);
      this.input.keyboard?.off("keydown-C", this.sidePocketChoiceListeners.onContinue);
      this.sidePocketChoiceListeners = null;
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
    this.persistProgress();
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

  private persistProgress(): void {
    writeSave(
      buildSaveBlob(
        this.persistentMetadata,
        this.discoveredSpellIds,
        this.mastery.snapshot(),
        this.hexcoin.snapshot(),
        this.highestLevelReached
      )
    );
  }

  // ----- hud -----

  /** backlog 2.35 / issue #78, re-decided by issue #233 — idempotent (checks the field) so
   * either dismiss trigger (an explicit click/designated-key acknowledgment, or the 60s
   * fallback timer) can call this safely regardless of which one fires first. Also clears
   * `onboardingHintActive` so `update()` resumes enemy movement/attacks the same frame. */
  private dismissOnboardingHint(): void {
    if (!this.onboardingHintText) {
      return;
    }
    this.onboardingHintText.destroy();
    this.onboardingHintText = undefined;
    this.onboardingHintActive = false;
  }

  // ----- boss encounter (backlog 4.10/4.11, issues #96/#97) -----

  /** Starts looping if nothing is already playing; a no-op otherwise so a same-fight
   * phase-break (`startWave` re-entering with `wave_index !== 0`) never restarts the track
   * mid-loop — only a fresh Phase 1 entry (first attempt or a death-retry) calls this. */
  private playBossTheme(): void {
    if (this.bossThemeSound?.isPlaying) {
      return;
    }
    this.bossThemeSound = this.sound.add(BOSS_THEME_KEY, { loop: true, volume: BOSS_THEME_VOLUME });
    this.bossThemeSound.play();
  }

  private stopBossTheme(): void {
    this.bossThemeSound?.stop();
    this.bossThemeSound = undefined;
  }

  // ----- ordinary-wave combat cue (issue #142) -----

  /** Starts looping on a wave's first enemy contact if nothing is already playing; a no-op
   * otherwise, so the second through nth spawn of a staggered wave never restarts the loop from
   * the top mid-phrase. Deliberately shaped exactly like `playBossTheme` above (same
   * already-playing guard, same tracked-instance pattern) rather than generalized into one
   * parameterized helper: the two tracks share four lines of Phaser boilerplate but nothing
   * about when they start or stop, and collapsing them would put the interesting difference —
   * the lifecycle — behind a shared abstraction that has nothing to say about it. */
  private playCombatCue(): void {
    if (this.combatCueSound?.isPlaying) {
      return;
    }
    this.combatCueSound = this.sound.add(COMBAT_CUE_KEY, { loop: true, volume: COMBAT_CUE_VOLUME });
    this.combatCueSound.play();
  }

  /** Idempotent — called from the wave-clear path, `handleDeath`, a boss Phase 1 entry, the
   * scene-restart reset block, and the SHUTDOWN safety net, several of which can be reached
   * back-to-back with nothing playing in between. */
  private stopCombatCue(): void {
    this.combatCueSound?.stop();
    this.combatCueSound = undefined;
  }

  // ----- non-combat interlude loop (issue #188) -----

  /** Starts a rotated interlude variant if nothing is already playing; a no-op otherwise, so the
   * only thing that can advance the rotation is an interlude that genuinely stopped and started
   * again. Shaped like `playBossTheme`/`playCombatCue` above for the reason `playCombatCue`'s
   * own comment gives (three tracks with three unrelated lifecycles; the boilerplate is the
   * uninteresting part), with the one real addition being which track to play.
   *
   * The pick itself lives in `pickExplorationTrack` (`systems/bgm.ts`) — this method only holds
   * the previous choice and hands it back in, so the no-immediate-repeat rule is testable without
   * Phaser, matching `shouldPlayCombatCueForWave`'s convention. A `undefined` pick (only possible
   * from an empty track list) skips playback rather than throwing: a music rotation is not worth
   * taking a level down over. */
  private playExplorationLoop(): void {
    if (this.explorationLoopSound?.isPlaying) {
      return;
    }
    const key = pickExplorationTrack(this.lastExplorationTrackKey);
    if (!key) {
      return;
    }
    this.lastExplorationTrackKey = key;
    this.explorationLoopSound = this.sound.add(key, {
      loop: true,
      volume: EXPLORATION_LOOP_FADE_IN_START_VOLUME
    });
    this.explorationLoopSound.play();
    // Developer feedback (2026-08-13): full volume the instant a wave clears read as a "wave
    // complete" stinger, not a music handoff. Ramp up instead of snapping in.
    this.tweens.add({
      targets: this.explorationLoopSound,
      volume: EXPLORATION_LOOP_VOLUME,
      duration: EXPLORATION_LOOP_FADE_IN_MS,
      ease: "Sine.Out"
    });
  }

  /** Idempotent, same as `stopCombatCue` and for the same reason — called from the next wave's
   * first enemy spawn, a boss Phase 1 entry, `handleDeath`, the scene-restart reset block, and
   * the SHUTDOWN safety net, most of which routinely fire with nothing playing. */
  private stopExplorationLoop(): void {
    this.explorationLoopSound?.stop();
    this.explorationLoopSound = undefined;
  }

  /** Fades in, holds, then fades back out. Issues #112/#113 — developer playtest: the intro
   * banner didn't pause the fight ("it blocks your vision and the enemies hit you") and the
   * outro banner vanished on a fixed timer regardless of reading speed. Previously documented
   * here as intentionally non-blocking; now sets `bossBannerActive` so `update()` freezes
   * enemy movement/attacks for the display's duration, and any keypress/click (see
   * `createInput`) dismisses it early via `hideBossBanner` instead of waiting out
   * `BOSS_BANNER_MIN_DISPLAY_MS`/`BOSS_BANNER_MS_PER_WORD` reading-speed-scaled auto-hide (see
   * that constant's own comment, issue #113).
   * @param onHidden issue #134 — optional callback fired once the banner has fully hidden
   * (see `bossBannerOnHidden`'s own comment), so a caller can defer a message that would
   * otherwise render on top of/alongside the banner.
   * @param options.requireConfirm issue #183 — the victory/outro banner's narrowed carve-out
   * (see `bossBannerRequiresConfirm`'s own comment): when true, skips the reading-speed-scaled
   * auto-hide timer entirely and does not respond to the generic any-keypress/click dismiss
   * (`createInput`) — only an explicit `[Y]` press (armed by `armBossBannerConfirmListener`)
   * ends the display. Defaults to false so every other caller (the intro banner, and any future
   * banner call) keeps #112/#113's existing fast-dismiss behavior unchanged. */
  private showBossBanner(text: string, onHidden?: () => void, options?: { requireConfirm?: boolean }): void {
    if (!this.bossBannerText) {
      return;
    }
    this.bossBannerActive = true;
    this.bossBannerRequiresConfirm = options?.requireConfirm ?? false;
    this.bossBannerOnHidden = onHidden;
    // See `bossBannerHideTimer`'s own comment: a still-pending auto-hide from a previous
    // display (e.g. the intro banner, cut short by a death) must not fire mid-way through
    // this new display and hide it early.
    this.bossBannerHideTimer?.remove();
    this.bossBannerHideTimer = undefined;
    // Issue #183 — same reasoning for a still-armed confirm listener from a previous
    // confirm-gated display: at most one is ever pending, so a fresh display must not inherit
    // an earlier one's listener registration.
    if (this.bossBannerConfirmListener) {
      this.input.keyboard?.off("keydown-Y", this.bossBannerConfirmListener);
      this.bossBannerConfirmListener = null;
    }
    this.bossBannerText.setText(text);
    this.tweens.killTweensOf(this.bossBannerText);
    this.bossBannerText.setAlpha(0);
    if (this.bossBannerRequiresConfirm) {
      this.tweens.add({
        targets: this.bossBannerText,
        alpha: 1,
        duration: 400,
        onComplete: () => this.armBossBannerConfirmListener()
      });
      return;
    }
    const wordCount = text.trim().split(/\s+/).length;
    const displayMs = Math.max(BOSS_BANNER_MIN_DISPLAY_MS, wordCount * BOSS_BANNER_MS_PER_WORD);
    this.tweens.add({
      targets: this.bossBannerText,
      alpha: 1,
      duration: 400,
      onComplete: () => {
        this.bossBannerHideTimer = this.time.delayedCall(displayMs, () => this.hideBossBanner());
      }
    });
  }

  /** Issue #183 — arms the single `[Y] Continue` listener a confirm-gated banner (currently
   * only the victory/outro banner) waits on, mirroring `startPhaseBreak`'s own `onY` shape:
   * a `.once` listener that deregisters itself and calls `hideBossBanner` to end the display.
   * Deliberately no expiry/auto-hide alongside it — same "persist until resolved" fix issue
   * #182 applies to the phase-break/Side-Pocket prompts, so this banner does not reintroduce
   * that exact bug in a new form by pairing an indefinite keyboard wait with a timed
   * auto-dismiss of its own. */
  private armBossBannerConfirmListener(): void {
    const onY = () => {
      this.input.keyboard?.off("keydown-Y", onY);
      this.bossBannerConfirmListener = null;
      this.hideBossBanner();
    };
    this.bossBannerConfirmListener = onY;
    this.input.keyboard?.once("keydown-Y", onY);
  }

  private hideBossBanner(): void {
    this.bossBannerHideTimer?.remove();
    this.bossBannerHideTimer = undefined;
    // Issue #183 — end the display via any path (the explicit Y press already deregistered
    // itself before calling here, but death interrupting the banner or a scene reset call
    // this directly) without leaking a stale `keydown-Y` registration for a later, unrelated
    // confirm-gated banner to co-fire alongside.
    if (this.bossBannerConfirmListener) {
      this.input.keyboard?.off("keydown-Y", this.bossBannerConfirmListener);
      this.bossBannerConfirmListener = null;
    }
    if (!this.bossBannerText) {
      this.bossBannerActive = false;
      const onHidden = this.bossBannerOnHidden;
      this.bossBannerOnHidden = undefined;
      onHidden?.();
      return;
    }
    this.tweens.killTweensOf(this.bossBannerText);
    // Code review, 2026-08-06 (spec check against #112/#113): `bossBannerActive` used to
    // clear synchronously here, before this 400ms fade-out even started — for that whole
    // window (including the ordinary auto-timeout path, not just a manual dismiss) enemies
    // resumed attacking while the banner graphic was still visibly on screen mid-fade,
    // reproducing in miniature exactly #112's complaint ("it blcoks your vision and the
    // enemies hit you"). Clearing it in `onComplete` instead means the banner is fully
    // invisible before combat resumes.
    this.tweens.add({
      targets: this.bossBannerText,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        this.bossBannerActive = false;
        const onHidden = this.bossBannerOnHidden;
        this.bossBannerOnHidden = undefined;
        onHidden?.();
      }
    });
  }

  /** Issue #236 — the vertical slice's win acknowledgment, shown once `startWave` finds no
   * more waves (see that call site's own comment for why it's deferred behind the Invigilator
   * outro banner rather than called directly from there). Reuses `showBossBanner` with
   * `requireConfirm: true` rather than a new UI element or timed flash — exactly "persists
   * until dismissed" and "same visual language as the boss intro/outro banners," both
   * explicit acceptance criteria, for free from the mechanism issue #183 already built.
   * Deliberately no `onHidden` follow-up: another acceptance criterion is no forced post-win
   * flow (no auto-return to Title, no replay prompt), so dismissing this banner does nothing
   * beyond closing it — the player simply stays on the field, free to keep playing. */
  private showWinBanner(): void {
    this.showBossBanner(WIN_BANNER_TEXT + WIN_BANNER_CONFIRM_HINT, undefined, { requireConfirm: true });
  }

  /** @param emphasis "warning" gives the banner a distinct color + opaque background panel
   * (backlog 2.37 / issue #80) instead of the default plain colored text over the gameplay
   * canvas — reserved for rejection messages the player needs to notice mid-combat, not every
   * flashMessage (a Level-up beat or a level-transition banner has no legibility complaint on
   * record and keeps its prior look unchanged). */
  private flashMessage(text: string, durationMs: number, emphasis: "default" | "warning" = "default"): void {
    if (!this.messageText) {
      return;
    }
    this.messageText.setText(text);
    if (emphasis === "warning") {
      this.messageText.setColor(MESSAGE_WARNING_COLOR);
      this.messageText.setBackgroundColor(MESSAGE_WARNING_BG);
    } else {
      this.messageText.setColor(MESSAGE_DEFAULT_COLOR);
      this.messageText.setBackgroundColor("");
    }
    this.messageClearAt = this.time.now + durationMs;
  }

  /** Issue #117 (code review, 2026-08-06) — a Mastery tier-up used to route through
   * `flashMessage`'s shared `messageText` channel, but that channel gets unconditionally
   * overwritten by whatever fires next: "Hit!" (300ms, `HealthSystem`'s `onDamage` callback),
   * "Not enough Mana" (900ms), or a wave/level transition banner. A tier-up fires mid-combat
   * (right after a landed kill) — exactly when a "Hit!" or another cast is likely within the
   * next couple seconds — so even a longer duration and its own color on the shared channel
   * would still routinely get clobbered before the player reads it. Same reasoning
   * `bossBannerText`/`onboardingHintText` already have their own dedicated elements for: a
   * message that must survive concurrent combat noise needs its own channel, not the shared
   * transient one `flashMessage` owns. */
  private flashTierUp(text: string, durationMs: number): void {
    if (!this.tierUpText) {
      return;
    }
    this.tierUpText.setText(text).setVisible(true);
    this.tierUpClearAt = this.time.now + durationMs;
  }

  private updateHud(): void {
    if (!this.hudText) {
      return;
    }
    const hpLine = `HP    ${this.health.current}/${MAX_HP}`;
    const manaLine = `Mana  ${Math.floor(this.mana.current)}/${MAX_MANA}`;
    const hexLine = `Hexcoin ${this.hexcoin.balance}`;
    // backlog 2.32 / issue #58 — Level/Wave itself moved to `levelWaveText` (its own
    // persistent, larger, higher-contrast element, set below); this small block keeps only
    // the live enemy count, which changes every kill and belongs with the other
    // glance-frequently combat counters, not with the rarely-changing level/wave value.
    const enemiesLine = `Enemies  ${this.enemies.length}`;
    const currentWave = this.waves[this.waveIndex];
    this.hudText.setText([hpLine, manaLine, hexLine, enemiesLine].join("\n"));
    this.updateHotbar();

    // backlog 2.32 / issue #58 — persistent Level/Wave readout, its own fixed top-right spot.
    this.levelWaveText?.setText(
      currentWave
        ? `Level ${currentWave.level} · Wave ${currentWave.wave_index + 1}`
        : `Wave ${this.waveIndex + 1}/${this.waves.length}`
    );

    // backlog 2.31 / issue #57 — debuff magnitude/duration, built on top of the existing
    // `spawnDebuffPulse` visual rather than replacing it. `archetypeDisplayName("debuffer")`
    // is the same seam the enemy's own overlay label already uses (see its doc comment in
    // `enemyStatusOverlay.ts`) and now returns Lorena's "The Tarrywright" (backlog 4.2) —
    // that one function's "debuffer" case feeds this line and the enemy label together.
    const debuffMagnitude = computeDebuffMagnitude(
      this.debuff.speedStackCount,
      this.debuff.manaRegenStackCount,
      MANA_REGEN_PER_SEC
    );
    const debuffLines = formatDebuffHudLines(debuffMagnitude, archetypeDisplayName("debuffer"));
    this.debuffText?.setText(debuffLines.join("\n"));
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
   * `equippedSpells.length < HOTBAR_KEYS.length` (not reachable with the shipped `spells.json`,
   * but not assumed away either) renders the remainder as an empty numbered outline instead of
   * leaving them blank. */
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
