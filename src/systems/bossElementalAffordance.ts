import type { Element, WaveDefinition } from "../data/types";

const ELEMENT_LABEL: Record<Element, string> = {
  fire: "▲ Fire",
  ice: "◆ Ice",
  earth: "■ Earth",
  lightning: "ϟ Lightning"
};

/** Persistent, nameless trial affordance linked directly to the onboarding legend. */
export function bossElementalAffordanceText(element: Element, resistantElements: readonly Element[]): string {
  const resistance = resistantElements.map((candidate) => ELEMENT_LABEL[candidate]).join(" + ");
  return `⚔ Final Trial   ${ELEMENT_LABEL[element]}   ◎ Resists ${resistance}`;
}

export interface BossWavePresentation {
  initializeTrial: boolean;
  phaseNumber: number;
  affordanceText: string | undefined;
}

/** Binds trial setup and the resistance plate to the active runtime wave. A direct debug entry
 * initializes whichever phase was selected, while normal progression initializes only phase 1. */
export function resolveBossWavePresentation(
  waves: readonly WaveDefinition[],
  currentIndex: number,
  directDebugEntry = false
): BossWavePresentation {
  const wave = waves[currentIndex];
  const phaseNumber = wave
    ? waves.slice(0, currentIndex + 1).filter((candidate) => candidate.is_boss === true && candidate.level === wave.level).length
    : 0;
  const bossAssignment = wave?.enemies.find((entry) => entry.type === "monster_boss_01");

  return {
    initializeTrial: wave?.is_boss === true && (directDebugEntry || waves[currentIndex - 1]?.is_boss !== true),
    phaseNumber,
    affordanceText: bossAssignment
      ? bossElementalAffordanceText(bossAssignment.element, bossAssignment.resistant_elements ?? [])
      : undefined
  };
}
