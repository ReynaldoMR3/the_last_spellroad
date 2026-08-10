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
