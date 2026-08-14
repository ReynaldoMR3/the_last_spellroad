/**
 * Pure, Phaser-free layout math backing the redesigned single-row hotbar (backlog 2.29 /
 * issue #55 — the old 7-line vertical text block, "Hotbar:" header plus one line per equipped
 * spell at 14px font/4px spacing starting at y=424, overflowed the 540px-tall canvas: spell
 * 6's line landed past the bottom edge). Same seam convention as `enemyStatusOverlay.ts`
 * (HP-bar fraction/color) and `levelArt.ts` (`computeTilemapOffset`) — the actual testable
 * arithmetic lives here; `SpellroadScene.ts` (`createHud`/`updateHud`) owns the Phaser
 * Graphics/Text objects this feeds and is verified via typecheck/build/dev-server instead, per
 * `docs/agents/_reference/docker-testing-contract.md`.
 */
import type { AoEShape, Weight } from "../data/types";

/** One equipped-spell slot's on-canvas rectangle. Deliberately a real, distinct rect per slot
 * (not just an x-offset for concatenated text) so a future icon (backlog 2.30 / issue #56,
 * Tilesmith) has an unambiguous "slot N's art region" to draw into or behind — see the ticket's
 * own integration-point requirement. */
export interface HotbarSlotRect {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HotbarRowLayoutInput {
  /** Full render width of the scene's canvas (`CANVAS_WIDTH`, SpellroadScene.ts). */
  canvasWidth: number;
  /** Row's top y-coordinate. */
  top: number;
  /** Row height; every slot shares it. */
  slotHeight: number;
  /** Number of slots to lay out (currently always `HOTBAR_KEYS.length` = 6, but not
   * hardcoded here — a shorter loadout is a legitimate input, not a special case). */
  slotCount: number;
  /** Gap in px between adjacent slots, and reused as the outer left/right margin so the row
   * doesn't run flush to the canvas edges. */
  gapPx: number;
}

/**
 * Evenly spaces `slotCount` equal-width rectangles across `canvasWidth`, with `gapPx` margin
 * on both outer edges and between slots. The last slot's right edge always lands at
 * `canvasWidth - gapPx` (verified by the "fits fully within the canvas" test below) — there is
 * no way for a slot to extend past the canvas width by construction, since every width is
 * derived from the same `canvasWidth` this function is given.
 */
export function computeHotbarSlotRects({
  canvasWidth,
  top,
  slotHeight,
  slotCount,
  gapPx
}: HotbarRowLayoutInput): HotbarSlotRect[] {
  if (slotCount <= 0) {
    return [];
  }
  const totalGap = gapPx * (slotCount + 1);
  const slotWidth = (canvasWidth - totalGap) / slotCount;
  return Array.from({ length: slotCount }, (_, index) => ({
    index,
    x: gapPx + index * (slotWidth + gapPx),
    y: top,
    width: slotWidth,
    height: slotHeight
  }));
}

/** Cooldown-vs-ready display info for a single hotbar slot, derived from `SpellCaster`'s
 * existing `cooldownRemaining` and the new `cooldownDurationMs` (backlog 2.29 / issue #55,
 * `spellCost.ts`'s `computeCastCooldownMs`) rather than inventing a third source for "how long
 * is this spell's cooldown". `fractionReady` (0 = just triggered, 1 = ready) is exposed for a
 * future cooldown-wipe visual in the slot's art region even though the current renderer only
 * needs `isReady`/`label` — the same reasoning `computeHpFraction` documents for why a fraction,
 * not just a boolean, is the useful unit here. */
export interface CooldownDisplay {
  isReady: boolean;
  fractionReady: number;
  label: string;
}

/** @param remainingMs `SpellCaster.cooldownRemaining(spellId)`.
 *  @param totalMs `SpellCaster.cooldownDurationMs(spell, tier)` — the full duration this
 *  spell's cooldown was armed with, at the caster's current Mastery tier. */
export function computeCooldownDisplay(remainingMs: number, totalMs: number): CooldownDisplay {
  if (totalMs <= 0 || remainingMs <= 0) {
    return { isReady: true, fractionReady: 1, label: "ready" };
  }
  const clampedRemaining = Math.min(remainingMs, totalMs);
  return {
    isReady: false,
    fractionReady: 1 - clampedRemaining / totalMs,
    label: `${(clampedRemaining / 1000).toFixed(1)}s`
  };
}

/** Heckler 2026-08-02 (7), BLOCKING — Tilesmith's per-slot icon (backlog 2.30 / issue #56)
 * narrowed each hotbar slot's text budget (from ~144px to ~88px, `SpellroadScene.ts`'s
 * `hotbarTextLeft`) without re-checking the longest `[shape/weight]` tag against the new,
 * smaller budget. The un-abbreviated tag ranges from 12 characters (`[line/light]`) to 17
 * (`[circle/standard]`) depending on which of the 3 shapes x 3 weights = 9 combinations a
 * spell happens to have — `[circle/standard]` (`thunder_dome`, in the *default* loadout) was
 * the one nobody re-checked, and it bled past its slot's own right border into slot 6 on every
 * load. Abbreviating both halves to a fixed 3 characters makes every one of the 9 combinations
 * the identical 9-character length (`[xxx/yyy]`) instead of a 12-17 char spread with a worst
 * case that has to be re-derived by hand every time this budget changes. Shape/weight are
 * already conveyed by the cast-preview geometry and the (now element-differentiated, backlog
 * 2.30) icon — see `spellIcons.ts`'s own comment — so this tag is backup/secondary
 * information, which is why abbreviating it costs less real legibility than shrinking the
 * font to fit the un-abbreviated 17-character worst case would have. */
const SHAPE_ABBREVIATIONS: Record<AoEShape, string> = {
  line: "lin",
  cone: "con",
  circle: "cir"
};

const WEIGHT_ABBREVIATIONS: Record<Weight, string> = {
  light: "lgt",
  standard: "std",
  heavy: "hvy"
};

/** Formats a spell's shape/weight as a fixed, 9-character `[xxx/yyy]` tag. Every one of the 3x3
 * shape/weight combinations produces the exact same length by construction — there is no
 * "longest combination" left that could silently outgrow a slot's text budget the way the
 * un-abbreviated `[circle/standard]` (17 characters, vs. `[line/light]`'s 12) did. */
export function formatShapeWeightTag(shape: AoEShape, weight: Weight): string {
  return `[${SHAPE_ABBREVIATIONS[shape]}/${WEIGHT_ABBREVIATIONS[weight]}]`;
}

/** Issue #198 — click-to-arm: which hotbar slot (if any) a click/pointer landed inside, given
 * the same rects `computeHotbarSlotRects` already produced for rendering. Pure hit-test so
 * `SpellroadScene`'s pointerdown handler can route a click through the exact same
 * `handleHotbarPress(index)` call the number-key handler already uses, instead of forking a
 * second "arm spell" path. Returns `null` (not -1) for "no slot" so a caller can't
 * accidentally treat a miss as a valid index via truthiness/falsiness confusion with slot 0. */
export function hotbarSlotIndexAtPoint(rects: HotbarSlotRect[], x: number, y: number): number | null {
  for (const rect of rects) {
    if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
      return rect.index;
    }
  }
  return null;
}

/** Issue #198 — scroll-wheel cycling: given the currently-armed slot index (`-1` if none is
 * armed) and a direction (+1 = next, -1 = previous), returns the next slot index to arm,
 * wrapping around at both ends. `slotCount` is the full rendered hotbar width (matches
 * `HOTBAR_KEYS.length`/`hotbarSlotRects.length` in `SpellroadScene.ts`, not
 * `equippedSpells.length`), so cycling lands on the same slot indices a number-key press or a
 * hotbar click would — including a currently-empty trailing slot, which is a no-op stop in the
 * cycle exactly like clicking an empty slot is a no-op, rather than being silently skipped over
 * (skipping would require this pure function to know which slots are "empty", entangling it
 * with `equippedSpells` data it otherwise doesn't need to see).
 *
 * `currentIndex < 0` (no spell currently armed) is handled explicitly rather than folded into
 * the modulo arithmetic: encoding "none" as a sentinel one-before-slot-0 and letting a
 * backward step wrap through the usual `(i + slotCount) % slotCount` formula lands one slot
 * short of the actual last slot (off-by-one), so the "nothing armed yet" case picks its
 * starting slot directly instead (slot 0 going forward, the last slot going backward). */
export function nextHotbarIndex(currentIndex: number, slotCount: number, direction: 1 | -1): number {
  if (slotCount <= 0) {
    return -1;
  }
  if (currentIndex < 0) {
    return direction === 1 ? 0 : slotCount - 1;
  }
  return (currentIndex + direction + slotCount) % slotCount;
}
