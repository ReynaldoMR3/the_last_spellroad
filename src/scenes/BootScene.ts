import Phaser from "phaser";

/**
 * backlog 5.8 / the 2026-08-01 boot-title-pause design spec, decision 1 — the first link in
 * the Boot/Preload -> Title -> SpellroadScene chain. Today, `TitleScene` renders entirely from
 * generated Phaser Graphics/Text (no external image/font assets exist yet, same low-spec
 * approach `SpellroadScene`'s own placeholder sprites already use), so there is nothing
 * genuinely asynchronous to wait on here. This scene still exists as its own step — not folded
 * into `TitleScene` — per the design doc's own reasoning: a title screen that later gains real
 * assets (background art, a custom font) needs a loading step before it can render, and
 * splitting it out now means that future asset load has a natural home instead of requiring a
 * second scene to be carved out of `TitleScene` at that point.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.scene.start("TitleScene");
  }
}
