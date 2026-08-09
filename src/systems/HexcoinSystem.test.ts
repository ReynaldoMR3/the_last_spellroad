import { describe, expect, it } from "vitest";
import { FEE_PHASE_RECOVERY, HexcoinSystem } from "./HexcoinSystem";

describe("HexcoinSystem.restoreBalance", () => {
  it("sets the balance to the given amount", () => {
    const hexcoin = new HexcoinSystem();
    hexcoin.restoreBalance(75);
    expect(hexcoin.balance).toBe(75);
  });

  it("marks the restored amount as this level's floor, same as markLevelStart", () => {
    const hexcoin = new HexcoinSystem();
    hexcoin.restoreBalance(75);
    hexcoin.earn(10);
    hexcoin.rollbackToLevelStart();
    expect(hexcoin.balance).toBe(75);
  });

  it("clears any in-progress boss-fight snapshot so stale fight state can't leak in from before the save", () => {
    const hexcoin = new HexcoinSystem();
    hexcoin.earn(100);
    hexcoin.startBossFight();
    hexcoin.usePhaseRecovery(2);
    hexcoin.restoreBalance(50);
    expect(hexcoin.canUsePhaseRecovery(2)).toBe(50 >= FEE_PHASE_RECOVERY);
  });
});
