import { describe, expect, it } from "vitest";
import { FEE_PHASE_RECOVERY, HexcoinSystem } from "./HexcoinSystem";

describe("HexcoinSystem", () => {
  it("hydrates current balance and restores the saved level floor on death", () => {
    const hexcoin = new HexcoinSystem({ balance: 47, levelStartBalance: 31 });

    hexcoin.rollbackToLevelStart();

    expect(hexcoin.balance).toBe(31);
  });

  it("snapshots both current balance and checkpoint floor", () => {
    const hexcoin = new HexcoinSystem({ balance: 47, levelStartBalance: 31 });

    expect(hexcoin.snapshot()).toEqual({ balance: 47, levelStartBalance: 31 });
  });
});

describe("HexcoinSystem.restoreBalance", () => {
  it("sets the balance and installs it as the level floor", () => {
    const hexcoin = new HexcoinSystem();

    hexcoin.restoreBalance(75);
    hexcoin.earn(10);
    hexcoin.rollbackToLevelStart();

    expect(hexcoin.balance).toBe(75);
  });

  it("clears transient boss-fight recovery state", () => {
    const hexcoin = new HexcoinSystem();
    hexcoin.earn(100);
    hexcoin.startBossFight();
    hexcoin.usePhaseRecovery(2);

    hexcoin.restoreBalance(50);

    expect(hexcoin.canUsePhaseRecovery(2)).toBe(50 >= FEE_PHASE_RECOVERY);
  });
});

describe("HexcoinSystem.awardPermanent", () => {
  // Issue #157 — Side-Pocket Lore Encounter rewards must be a permanent award, unlike plain
  // `earn()` (which only bumps the live balance, not the level-start floor `earn()` is safe
  // against death rollback for kills-within-a-level because the floor was already recorded
  // before those kills happened; a Side-Pocket reward must survive rollback even though it's
  // granted mid-level, so it has to move the floor itself, atomically, in the same call).
  it("increments the live balance", () => {
    const hexcoin = new HexcoinSystem({ balance: 10, levelStartBalance: 10 });
    hexcoin.awardPermanent(2);
    expect(hexcoin.balance).toBe(12);
  });

  it("commits the awarded amount as the new retry floor, so death rollback keeps it", () => {
    const hexcoin = new HexcoinSystem({ balance: 10, levelStartBalance: 10 });
    hexcoin.awardPermanent(2);
    hexcoin.earn(5); // an ordinary kill during the same attempt, which SHOULD roll back
    hexcoin.rollbackToLevelStart();
    expect(hexcoin.balance).toBe(12);
  });

  it("is additive across repeated calls, each one raising the floor further", () => {
    const hexcoin = new HexcoinSystem();
    hexcoin.awardPermanent(2);
    hexcoin.awardPermanent(2);
    hexcoin.rollbackToLevelStart();
    expect(hexcoin.balance).toBe(4);
  });

  it("also raises an in-progress boss fight-start snapshot, defensively, even though a Side-Pocket Encounter never fires mid-boss-fight", () => {
    const hexcoin = new HexcoinSystem();
    hexcoin.earn(20);
    hexcoin.startBossFight();
    hexcoin.awardPermanent(2);
    // canUsePhaseRecovery reads the frozen fight snapshot, not the live balance, whenever a
    // fight is in progress — proves the snapshot itself moved, not just the live balance.
    hexcoin.earn(1000); // would trivially satisfy the fee if the snapshot were stale/unmoved
    expect(hexcoin.canUsePhaseRecovery(2)).toBe(22 >= FEE_PHASE_RECOVERY);
  });
});
