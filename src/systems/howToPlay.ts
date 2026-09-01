/** Issue #207 — one authoritative elemental primer shared by every player-help surface. */
export const ELEMENTAL_PRIMER_TEXT = [
  "TARGET MOTIFS  ▲ Fire   ◆ Ice   ■ Earth   ϟ Lightning",
  "COUNTERS  ▲ → ◆ → ■ → ϟ → ▲   (△ strong • ▽ weak • ◎ resisted)",
  "SPELL EFFECTS  ▲ close +2 • ◆ weaken 3s • ■ primary +3 • ϟ stun 0.5s"
].join("\n");

/** Issue #216 — the authoritative persistent player-help reference. */
export const HOW_TO_PLAY_TEXT = [
  "Move: WASD or arrow keys",
  "Aim a spell: 1-6 or Q/R/F/Shift/Ctrl/Space",
  "Cast: press the same spell key again or left-click",
  "Select spells: click a hotbar slot or use the mouse wheel",
  "Cancel aim: Esc or right-click",
  "Pause: Esc when not aiming",
  "",
  ELEMENTAL_PRIMER_TEXT
].join("\n");

/** Compact first-use card; the full controls reference remains available from Pause. */
export function onboardingHintText(): string {
  return [
    "Move: WASD/arrows  •  Aim: 1-6  •  Cast: same key/click  •  Full controls: Esc",
    ELEMENTAL_PRIMER_TEXT,
    "Click anywhere to begin."
  ].join("\n");
}
