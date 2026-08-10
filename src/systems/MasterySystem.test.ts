import { describe, expect, it } from "vitest";
import { MasterySystem } from "./MasterySystem";

/**
 * Issue #117 — developer playtest: "its also not clear when you advanced on the spells
 * levels, at level 5 i felt it was easier to kill the monsters." Backlog 5.3 asks to confirm
 * the Mastery-tier-up on-screen indicator "actually fires, not just exists in template text."
 * `MasterySystem` had zero test coverage despite being pure and Phaser-free — these tests
 * pin down the actual tier-up trigger condition (24 landed-kill casts/tier, per the class's
 * own doc comment) so a future regression here is caught at this seam instead of only
 * surfacing as another "I never saw it" playtest report.
 */
const LANDED_CASTS_PER_TIER = 24;

describe("MasterySystem", () => {
  it("starts every spell at Novice with no landed casts", () => {
    const mastery = new MasterySystem();
    expect(mastery.getTier("ember_lance")).toBe("novice");
  });

  it("does not fire onTierUp before the threshold is reached", () => {
    const mastery = new MasterySystem();
    const tierUps: string[] = [];
    for (let i = 0; i < LANDED_CASTS_PER_TIER - 1; i++) {
      mastery.recordLandedCast("ember_lance", (_id, tier) => tierUps.push(tier));
    }
    expect(mastery.getTier("ember_lance")).toBe("novice");
    expect(tierUps).toEqual([]);
  });

  it("fires onTierUp with the new tier on exactly the threshold-crossing cast", () => {
    const mastery = new MasterySystem();
    const tierUps: string[] = [];
    for (let i = 0; i < LANDED_CASTS_PER_TIER; i++) {
      mastery.recordLandedCast("ember_lance", (_id, tier) => tierUps.push(tier));
    }
    expect(mastery.getTier("ember_lance")).toBe("adept");
    expect(tierUps).toEqual(["adept"]);
  });

  it("progresses Novice -> Adept -> Master, resetting the counter each tier", () => {
    const mastery = new MasterySystem();
    const tierUps: string[] = [];
    for (let i = 0; i < LANDED_CASTS_PER_TIER * 2; i++) {
      mastery.recordLandedCast("ember_lance", (_id, tier) => tierUps.push(tier));
    }
    expect(mastery.getTier("ember_lance")).toBe("master");
    expect(tierUps).toEqual(["adept", "master"]);
  });

  it("stops progressing (and stops firing onTierUp) once Master is reached", () => {
    const mastery = new MasterySystem();
    for (let i = 0; i < LANDED_CASTS_PER_TIER * 2; i++) {
      mastery.recordLandedCast("ember_lance");
    }
    const tierUps: string[] = [];
    for (let i = 0; i < LANDED_CASTS_PER_TIER * 5; i++) {
      mastery.recordLandedCast("ember_lance", (_id, tier) => tierUps.push(tier));
    }
    expect(mastery.getTier("ember_lance")).toBe("master");
    expect(tierUps).toEqual([]);
  });

  it("tracks each spell's progress independently", () => {
    const mastery = new MasterySystem();
    for (let i = 0; i < LANDED_CASTS_PER_TIER; i++) {
      mastery.recordLandedCast("ember_lance");
    }
    expect(mastery.getTier("ember_lance")).toBe("adept");
    expect(mastery.getTier("glacial_shard")).toBe("novice");
  });

  it("scales power/targets bonuses per tier, identically for every spell", () => {
    const mastery = new MasterySystem();
    expect(mastery.getScaling("ember_lance")).toEqual({ powerBonus: 0, targetsBonus: 0 });
    for (let i = 0; i < LANDED_CASTS_PER_TIER; i++) {
      mastery.recordLandedCast("ember_lance");
    }
    expect(mastery.getScaling("ember_lance")).toEqual({ powerBonus: 1, targetsBonus: 1 });
    for (let i = 0; i < LANDED_CASTS_PER_TIER; i++) {
      mastery.recordLandedCast("ember_lance");
    }
    expect(mastery.getScaling("ember_lance")).toEqual({ powerBonus: 2, targetsBonus: 2 });
  });

  it("hydrates and snapshots saved Mastery progress", () => {
    const mastery = new MasterySystem({ arc_lance: { tier: "adept", landedCasts: 7 } });
    expect(mastery.getTier("arc_lance")).toBe("adept");
    expect(mastery.snapshot()).toEqual({ arc_lance: { tier: "adept", landedCasts: 7 } });
  });

  it("does not share mutable state with the loaded save", () => {
    const initial = { arc_lance: { tier: "adept" as const, landedCasts: 7 } };
    const mastery = new MasterySystem(initial);
    mastery.recordLandedCast("arc_lance");
    expect(initial.arc_lance.landedCasts).toBe(7);
  });

  it("does not share mutable state with a snapshot", () => {
    const mastery = new MasterySystem({ arc_lance: { tier: "adept", landedCasts: 7 } });
    const snapshot = mastery.snapshot();
    snapshot.arc_lance.tier = "novice";
    snapshot.arc_lance.landedCasts = 0;

    expect(mastery.snapshot()).toEqual({ arc_lance: { tier: "adept", landedCasts: 7 } });
  });

  describe("applyRandomDeathPenalty", () => {
    it("returns null and costs nothing when every equipped spell is Novice", () => {
      const mastery = new MasterySystem();
      const affected = mastery.applyRandomDeathPenalty(["ember_lance", "glacial_shard"]);
      expect(affected).toBeNull();
      expect(mastery.getTier("ember_lance")).toBe("novice");
      expect(mastery.getTier("glacial_shard")).toBe("novice");
    });

    it("drops exactly one tier on the one eligible (above-Novice) spell", () => {
      const mastery = new MasterySystem();
      for (let i = 0; i < LANDED_CASTS_PER_TIER; i++) {
        mastery.recordLandedCast("ember_lance");
      }
      expect(mastery.getTier("ember_lance")).toBe("adept");

      const affected = mastery.applyRandomDeathPenalty(["ember_lance", "glacial_shard"]);

      expect(affected).toBe("ember_lance");
      expect(mastery.getTier("ember_lance")).toBe("novice");
    });

    it("never selects a Novice-tier spell for the penalty", () => {
      const mastery = new MasterySystem();
      for (let i = 0; i < LANDED_CASTS_PER_TIER; i++) {
        mastery.recordLandedCast("ember_lance");
      }
      for (let trial = 0; trial < 20; trial++) {
        const affected = mastery.applyRandomDeathPenalty(["ember_lance", "glacial_shard"]);
        expect(affected).not.toBe("glacial_shard");
      }
    });

    it("resets the dropped spell's landed-cast counter", () => {
      const mastery = new MasterySystem();
      for (let i = 0; i < LANDED_CASTS_PER_TIER + 5; i++) {
        mastery.recordLandedCast("ember_lance");
      }
      expect(mastery.getTier("ember_lance")).toBe("adept");

      mastery.applyRandomDeathPenalty(["ember_lance"]);
      expect(mastery.getTier("ember_lance")).toBe("novice");

      // If the counter weren't reset, these 5 casts (the pre-penalty leftover) would be
      // enough on their own to immediately re-cross the Adept threshold early.
      for (let i = 0; i < LANDED_CASTS_PER_TIER - 1; i++) {
        mastery.recordLandedCast("ember_lance");
      }
      expect(mastery.getTier("ember_lance")).toBe("novice");
    });
  });

  describe("exportState / importState", () => {
    it("exportState returns every spell tracked so far, tier and landed-cast progress included", () => {
      const mastery = new MasterySystem();
      mastery.recordLandedCast("ember_lance");
      mastery.recordLandedCast("frost_bolt");
      expect(mastery.exportState()).toEqual({
        ember_lance: { tier: "novice", landedCasts: 1 },
        frost_bolt: { tier: "novice", landedCasts: 1 }
      });
    });

    it("importState replaces all prior tracking with the given state", () => {
      const mastery = new MasterySystem();
      mastery.recordLandedCast("ember_lance");
      mastery.importState({ frost_bolt: { tier: "master", landedCasts: 5 } });
      expect(mastery.getTier("frost_bolt")).toBe("master");
      expect(mastery.exportState()).toEqual({ frost_bolt: { tier: "master", landedCasts: 5 } });
    });

    it("a spell not present in an imported state starts fresh at Novice", () => {
      const mastery = new MasterySystem();
      mastery.importState({ frost_bolt: { tier: "master", landedCasts: 0 } });
      expect(mastery.getTier("ember_lance")).toBe("novice");
    });

    it("exportState returns defensive copies — mutating the returned object doesn't affect internal state", () => {
      // Final branch review, 2026-08-09 (finding #9) — `exportState` used to hand out the live
      // `MasteryState` objects by reference (`Object.fromEntries(this.state)`), so a caller
      // mutating its return value would silently corrupt this system's own tracking.
      const mastery = new MasterySystem();
      mastery.recordLandedCast("ember_lance");

      const exported = mastery.exportState();
      exported.ember_lance.tier = "master";
      exported.ember_lance.landedCasts = 999;

      expect(mastery.getTier("ember_lance")).toBe("novice");
      expect(mastery.exportState()).toEqual({ ember_lance: { tier: "novice", landedCasts: 1 } });
    });
  });
});
