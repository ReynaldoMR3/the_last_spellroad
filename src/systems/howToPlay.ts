/**
 * Issue #216 — the authoritative player-controls reference. Both the opening onboarding hint
 * and PauseScene's persistent help view render this exact copy so they cannot silently drift.
 */
export const HOW_TO_PLAY_TEXT = [
  "Move: WASD or arrow keys",
  "Aim a spell: 1-6 or Q/R/F/Shift/Ctrl/Space",
  "Cast: press the same spell key again or left-click",
  "Select spells: click a hotbar slot or use the mouse wheel",
  "Cancel aim: Esc or right-click",
  "Pause: Esc when not aiming"
].join("\n");

/** Opening-only acknowledgement appended without changing the shared controls reference. */
export function onboardingHintText(): string {
  return `${HOW_TO_PLAY_TEXT}\n\nClick anywhere to begin.`;
}
