import { describe, expect, it } from "vitest";
import { HOW_TO_PLAY_TEXT, onboardingHintText } from "./howToPlay";

describe("onboardingHintText", () => {
  it("keeps the opening hint compact and points to the persistent controls reference", () => {
    expect(onboardingHintText()).toContain("Move: WASD/arrows");
    expect(onboardingHintText()).toContain("Full controls: Esc");
  });

  it("teaches four non-color motifs, the matchup cycle, and every elemental effect without monster identities", () => {
    const hint = onboardingHintText();
    for (const cue of ["▲ Fire", "◆ Ice", "■ Earth", "ϟ Lightning"]) expect(hint).toContain(cue);
    expect(hint).toContain("▲ → ◆ → ■ → ϟ → ▲");
    expect(hint).toContain("close +2");
    expect(hint).toContain("weaken 3s");
    expect(hint).toContain("primary +3");
    expect(hint).toContain("stun 0.5s");
    expect(hint).not.toMatch(/monster_[mrd]|monster_boss|melee|ranged|debuffer/i);
  });
});

describe("HOW_TO_PLAY_TEXT", () => {
  it("renders the identical elemental primer in both the opening card and pause help", () => {
    const elementalPrimer = [
      "TARGET MOTIFS  ▲ Fire   ◆ Ice   ■ Earth   ϟ Lightning",
      "COUNTERS  ▲ → ◆ → ■ → ϟ → ▲   (△ strong • ▽ weak • ◎ resisted)",
      "SPELL EFFECTS  ▲ close +2 • ◆ weaken 3s • ■ primary +3 • ϟ stun 0.5s"
    ].join("\n");

    expect(onboardingHintText()).toContain(elementalPrimer);
    expect(HOW_TO_PLAY_TEXT).toContain(elementalPrimer);
  });

  it("documents every current player control, including the alternate spell keys and hotbar interactions", () => {
    expect(HOW_TO_PLAY_TEXT).toContain("Move: WASD or arrow keys");
    expect(HOW_TO_PLAY_TEXT).toContain("Aim a spell: 1-6 or Q/R/F/Shift/Ctrl/Space");
    expect(HOW_TO_PLAY_TEXT).toContain("Cast: press the same spell key again or left-click");
    expect(HOW_TO_PLAY_TEXT).toContain("Select spells: click a hotbar slot or use the mouse wheel");
    expect(HOW_TO_PLAY_TEXT).toContain("Cancel aim: Esc or right-click");
    expect(HOW_TO_PLAY_TEXT).toContain("Pause: Esc when not aiming");
  });
});
