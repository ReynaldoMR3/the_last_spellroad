/**
 * Wave damage-threat-budget calculator (backlog 2.21 / issue #20).
 *
 * A pure, Phaser-free reproduction of the arithmetic Warden and Pato have been hand-deriving
 * in their log entries since Phase 2: `hp-template.md`'s fixed per-hit percentages
 * (Melee 7% of the 100-HP pool, Ranged 4%, Debuffer 0%), combined per Warden's modeling
 * convention — careless play takes every enemy's per-hit value once; competent play takes
 * Ranged's hits in full (hard to avoid) plus ~20% of Melee's (readily dodged/blocked).
 *
 * This is a code-level reproduction of `hp-template.md`'s existing authority, not a new
 * source of truth — the standard band below is that document's own numbers.
 */

export interface WaveComposition {
  melee: number;
  ranged: number;
  debuffer: number;
}

export interface ThreatBudget {
  competentPct: number;
  carelessPct: number;
}

export interface ThreatBand {
  competentMin: number;
  competentMax: number;
  carelessMin: number;
  carelessMax: number;
}

const HIT_PCT = {
  melee: 7,
  ranged: 4,
  debuffer: 0
} as const;

const COMPETENT_MELEE_REALIZATION = 0.2;

export function computeThreatBudget(composition: WaveComposition): ThreatBudget {
  const { melee, ranged } = composition;
  const competentPct = HIT_PCT.ranged * ranged + HIT_PCT.melee * COMPETENT_MELEE_REALIZATION * melee;
  const carelessPct = HIT_PCT.ranged * ranged + HIT_PCT.melee * melee;
  return { competentPct, carelessPct };
}

/** `hp-template.md`'s standard regular-wave band — applies to every wave except the one
 * explicit Level 1 Wave 0 exception below. */
export const STANDARD_REGULAR_WAVE_BAND: ThreatBand = {
  competentMin: 10,
  competentMax: 15,
  carelessMin: 25,
  carelessMax: 35
};

export function isWithinBand(budget: ThreatBudget, band: ThreatBand): boolean {
  return (
    budget.competentPct >= band.competentMin &&
    budget.competentPct <= band.competentMax &&
    budget.carelessPct >= band.carelessMin &&
    budget.carelessPct <= band.carelessMax
  );
}

/**
 * Level 1 Wave 0's onboarding exception (backlog 2.21): an explicit, separate threshold —
 * not a loosened global constant — so a future wave can never silently inherit this grace
 * period by mistake. A composition qualifies only if it sits below the standard band's own
 * floors on *both* figures (a real, deliberate grace period on the whole encounter, not just
 * one play style) while still posing *some* threat (a fully zero-risk wave isn't a believable
 * opening skirmish, it's a cutscene).
 *
 * Both floors are required, not just the competent one: careless play weights Melee far more
 * heavily than competent play does (7 vs. 1.4 per unit), so a melee-heavy, ranged-light
 * composition can clear the competent floor while its careless-play figure still blows past
 * even the *standard* band's careless ceiling (e.g. Melee=7,Ranged=0 -> 9.8% competent, comfortably
 * under this ceiling, but 49% careless — worse than any standard-band wave in the game). Pato's
 * own manual gate-check (see `pato/log.md`, 2026-08-01) verified both figures for exactly this
 * reason; this function now matches that check instead of being weaker than it.
 */
export const ONBOARDING_COMPETENT_CEILING = STANDARD_REGULAR_WAVE_BAND.competentMin;
export const ONBOARDING_CARELESS_CEILING = STANDARD_REGULAR_WAVE_BAND.carelessMin;

export function isOnboardingGrace(budget: ThreatBudget): boolean {
  return (
    budget.competentPct > 0 &&
    budget.competentPct < ONBOARDING_COMPETENT_CEILING &&
    budget.carelessPct < ONBOARDING_CARELESS_CEILING
  );
}

/**
 * Per-level difficulty curve (issue #162, resolving backlog 3.12/issue #95's flat-numbers
 * finding). `hp-template.md`'s "Per-Level Difficulty Curve" section is the authoritative
 * derivation; this is that section's own checkable reproduction, same relationship
 * `computeThreatBudget`/`isWithinBand` already have to the Wave/Boss Damage-Threat Budget
 * section above.
 *
 * Each level's regular-wave band is the standard band's own floor/ceiling envelope, scaled
 * uniformly by this multiplier -- not a new, independently-chosen band per level. Level 1's
 * multiplier is exactly 1.0 (i.e. Level 1 keeps validating against `STANDARD_REGULAR_WAVE_BAND`
 * completely unchanged), so nothing about Level 1's already-shipped, already-Pato-validated
 * margins moves. Levels 2-5 step the envelope up by a fixed +0.08 per level -- small enough
 * that every already-validated (Melee=3,Ranged=2)/(Melee=2,Ranged=3) composition pair still
 * clears the scaled floor at every level (see `waveThreatBudget.test.ts`), large enough that a
 * `damage_modifier` > 1.0 is actually necessary to reach the scaled ceiling instead of the
 * envelope just floating uselessly above the unmodified composition.
 */
export const LEVEL_BAND_MULTIPLIER: Record<number, number> = {
  1: 1.0,
  2: 1.08,
  3: 1.16,
  4: 1.24,
  5: 1.32
};

/** Scales every bound of a `ThreatBand` by the same factor -- the floor and ceiling move
 * together, so the band's shape (ratio of competent to careless width) never distorts. */
export function scaleBand(band: ThreatBand, multiplier: number): ThreatBand {
  return {
    competentMin: band.competentMin * multiplier,
    competentMax: band.competentMax * multiplier,
    carelessMin: band.carelessMin * multiplier,
    carelessMax: band.carelessMax * multiplier
  };
}

/** The regular-wave band a given level's waves are checked against -- `STANDARD_REGULAR_WAVE_BAND`
 * scaled by that level's `LEVEL_BAND_MULTIPLIER` entry. Throws for a level with no defined
 * multiplier (only 1-5 are regular-wave levels; the boss/trial uses `BOSS_TRIAL_BAND` below,
 * never this function) -- an unrecognized level is an authoring mistake, not a value to
 * silently pass through. */
export function levelRegularWaveBand(level: number): ThreatBand {
  const multiplier = LEVEL_BAND_MULTIPLIER[level];
  if (multiplier === undefined) {
    throw new Error(`levelRegularWaveBand: no LEVEL_BAND_MULTIPLIER entry for level ${level}`);
  }
  return scaleBand(STANDARD_REGULAR_WAVE_BAND, multiplier);
}

/** Applies a wave's `damage_modifier` to a raw composition budget -- `hp_modifier`/`damage_modifier`
 * scale the per-hit damage figures this file's `HIT_PCT` table encodes, so the modifier belongs
 * multiplied onto the composition's own competent/careless percentages, not layered separately. */
export function applyDamageModifier(budget: ThreatBudget, damageModifier: number): ThreatBudget {
  return {
    competentPct: budget.competentPct * damageModifier,
    carelessPct: budget.carelessPct * damageModifier
  };
}

/** `hp-template.md`'s Boss/trial row (40-60% competent / 70-90% careless), as a `ThreatBand` --
 * cumulative across every phase of a multi-phase fight (no HP reset between phases), never
 * scaled by `LEVEL_BAND_MULTIPLIER` (that table is for the five regular-wave levels only). */
export const BOSS_TRIAL_BAND: ThreatBand = {
  competentMin: 40,
  competentMax: 60,
  carelessMin: 70,
  carelessMax: 90
};

/** Sums per-phase budgets into the cumulative figure a multi-phase boss/trial is checked
 * against `BOSS_TRIAL_BAND` with -- separate from `computeThreatBudget` because a boss fight's
 * threat is cumulative across phases, not per-encounter like a regular wave's reset-every-time
 * budget. */
export function sumThreatBudgets(budgets: ThreatBudget[]): ThreatBudget {
  return budgets.reduce(
    (acc, budget) => ({
      competentPct: acc.competentPct + budget.competentPct,
      carelessPct: acc.carelessPct + budget.carelessPct
    }),
    { competentPct: 0, carelessPct: 0 }
  );
}
