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
 * competent floor (a real, deliberate grace period) while still posing *some* threat (a
 * fully zero-risk wave isn't a believable opening skirmish, it's a cutscene).
 */
export const ONBOARDING_COMPETENT_CEILING = STANDARD_REGULAR_WAVE_BAND.competentMin;

export function isOnboardingGrace(budget: ThreatBudget): boolean {
  return budget.competentPct > 0 && budget.competentPct < ONBOARDING_COMPETENT_CEILING;
}
