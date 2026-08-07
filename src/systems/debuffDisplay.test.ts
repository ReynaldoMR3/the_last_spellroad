import { describe, expect, it } from "vitest";
import { computeDebuffMagnitude, formatDebuffHudLines } from "./debuffDisplay";
import { MANA_REGEN_FLOOR, MAX_STACKS } from "./DebuffSystem";

describe("computeDebuffMagnitude", () => {
  it("is inactive with no stacks of either variant", () => {
    const m = computeDebuffMagnitude(0, 0, 5);
    expect(m.active).toBe(false);
    expect(m.speedDrainPercent).toBe(0);
    expect(m.effectiveManaRegenPerSec).toBe(5);
  });

  it("reports a 12% speed drain per single speed stack", () => {
    const m = computeDebuffMagnitude(1, 0, 5);
    expect(m.active).toBe(true);
    expect(m.speedDrainPercent).toBe(12);
  });

  it("reports a 24% speed drain at the 2-stack cap", () => {
    const m = computeDebuffMagnitude(MAX_STACKS, 0, 5);
    expect(m.speedDrainPercent).toBe(24);
  });

  it("mirrors DebuffSystem.effectiveManaRegen's own arithmetic for mana-regen stacks", () => {
    // base 8/sec (backlog 2.34), drain 2.4/stack (backlog 2.39/hp-template.md) -> 5.6 at 1
    // stack (70% of base, matching the pre-retune ratio), 3.2 (the floor) at 2 stacks.
    expect(computeDebuffMagnitude(0, 1, 8).effectiveManaRegenPerSec).toBeCloseTo(5.6, 5);
    expect(computeDebuffMagnitude(0, 2, 8).effectiveManaRegenPerSec).toBe(3.2);
  });

  it("never reports mana regen below MANA_REGEN_FLOOR even against a low base regen", () => {
    const m = computeDebuffMagnitude(0, 2, 1);
    expect(m.effectiveManaRegenPerSec).toBe(MANA_REGEN_FLOOR);
  });

  it("reports both variants independently when both are active at once", () => {
    const m = computeDebuffMagnitude(1, 1, 8);
    expect(m.active).toBe(true);
    expect(m.speedDrainPercent).toBe(12);
    expect(m.effectiveManaRegenPerSec).toBeCloseTo(5.6, 5);
  });
});

describe("formatDebuffHudLines", () => {
  it("returns no lines at all when inactive, not an empty/zero line", () => {
    const lines = formatDebuffHudLines(computeDebuffMagnitude(0, 0, 5), "Debuffer");
    expect(lines).toEqual([]);
  });

  it("names the source and shows only the speed line when only speed stacks are active", () => {
    const lines = formatDebuffHudLines(computeDebuffMagnitude(1, 0, 5), "Debuffer");
    expect(lines[0]).toContain("Debuffer");
    expect(lines.some((l) => l.includes("Speed -12%"))).toBe(true);
    expect(lines.some((l) => l.includes("Mana regen"))).toBe(false);
  });

  it("shows only the mana-regen line when only mana-regen stacks are active", () => {
    const lines = formatDebuffHudLines(computeDebuffMagnitude(0, 1, 8), "Debuffer");
    expect(lines.some((l) => l.includes("Speed"))).toBe(false);
    expect(lines.some((l) => l.includes("Mana regen 5.6/s"))).toBe(true);
  });

  it("shows both lines when both variants are active", () => {
    const lines = formatDebuffHudLines(computeDebuffMagnitude(2, 2, 8), "Debuffer");
    expect(lines.some((l) => l.includes("Speed -24%"))).toBe(true);
    expect(lines.some((l) => l.includes("Mana regen 3.2/s"))).toBe(true);
  });

  it("plugs in whatever source name it's given, ready for Lorena's lore-name wiring", () => {
    const lines = formatDebuffHudLines(computeDebuffMagnitude(1, 0, 5), "the Tarrywright");
    expect(lines[0]).toContain("the Tarrywright");
  });

  it("tells the player the drain outlives the source enemy, not just that it lasts until wave clears (Heckler 2026-08-02 (8), MAJOR 2)", () => {
    const lines = formatDebuffHudLines(computeDebuffMagnitude(1, 0, 5), "the Tarrywright");
    expect(lines[0]).toContain("outlives this enemy");
    expect(lines[0]).toContain("until wave clears");
  });
});
