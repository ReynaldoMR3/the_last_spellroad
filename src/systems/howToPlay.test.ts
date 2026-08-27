import { describe, expect, it } from "vitest";
import { HOW_TO_PLAY_TEXT, onboardingHintText } from "./howToPlay";

describe("onboardingHintText", () => {
  it("keeps the opening hint's controls identical to the persistent help reference", () => {
    expect(onboardingHintText()).toBe(`${HOW_TO_PLAY_TEXT}\n\nClick anywhere to begin.`);
  });
});

describe("HOW_TO_PLAY_TEXT", () => {
  it("documents every current player control, including the alternate spell keys and hotbar interactions", () => {
    expect(HOW_TO_PLAY_TEXT).toContain("Move: WASD or arrow keys");
    expect(HOW_TO_PLAY_TEXT).toContain("Aim a spell: 1-6 or Q/R/F/Shift/Ctrl/Space");
    expect(HOW_TO_PLAY_TEXT).toContain("Cast: press the same spell key again or left-click");
    expect(HOW_TO_PLAY_TEXT).toContain("Select spells: click a hotbar slot or use the mouse wheel");
    expect(HOW_TO_PLAY_TEXT).toContain("Cancel aim: Esc or right-click");
    expect(HOW_TO_PLAY_TEXT).toContain("Pause: Esc when not aiming");
  });
});
