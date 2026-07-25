export const MAX_HP = 100;

/**
 * Player HP pool. No in-combat regen by design (hp-template.md) — only `reset()`
 * (called at wave start / checkpoint) or `restore()` (Phase-Transition Recovery fee)
 * can raise it, never passive time.
 */
export class HealthSystem {
  private hp = MAX_HP;

  constructor(
    private readonly onDeath: () => void,
    private readonly onDamage?: (amount: number, current: number) => void
  ) {}

  get current(): number {
    return this.hp;
  }

  reset(): void {
    this.hp = MAX_HP;
  }

  applyDamage(amount: number): void {
    if (this.hp <= 0) {
      return;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.onDamage?.(amount, this.hp);
    if (this.hp === 0) {
      this.onDeath();
    }
  }

  /** Phase-Transition Recovery restores a flat 10% of MAX_HP per hp-template.md. */
  restore(amount: number): void {
    this.hp = Math.min(MAX_HP, this.hp + amount);
  }
}
