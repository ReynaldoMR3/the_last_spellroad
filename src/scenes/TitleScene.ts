import Phaser from "phaser";
import { clearSave, hasSave, loadSave } from "../systems/SaveSystem";
import type { SpellroadStartData } from "../systems/gameProgress";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const OPTION_COLOR = "#9fb0d8";
const OPTION_SELECTED_COLOR = "#f3e7c2";
const OPTION_START_Y = 300;
const OPTION_GAP = 50;
/** Same warning palette `SpellroadScene`'s `flashMessage` uses for its "warning" emphasis
 * (backlog 2.37) — one visual language for "this needs your attention" across the game. */
const CONFIRM_WARNING_COLOR = "#ffb4a8";
const CONFIRM_WARNING_BG = "#4a1f1f";

interface TitleOption {
  label: string;
  action: () => void;
}

/**
 * backlog 5.8 / the 2026-08-01 boot-title-pause design spec, decisions 2 and 7 — the vertical
 * slice's title screen. No save: a single `New Game`. A save exists: `Continue` (loads the
 * existing blob) and `New Game`, which prompts a Y/N confirm before overwriting — reusing the
 * same confirm-prompt shape `SpellroadScene.startPhaseBreak` already establishes for a
 * different decision, rather than inventing a second one. No Options/Settings menu, per the
 * design doc's explicit scope cut.
 *
 */
export class TitleScene extends Phaser.Scene {
  private options: TitleOption[] = [];
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private confirmActive = false;
  private confirmText?: Phaser.GameObjects.Text;

  constructor() {
    super("TitleScene");
  }

  create(): void {
    this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x11131a);
    this.add
      .text(CANVAS_WIDTH / 2, 160, "The Last Spellroad", {
        color: "#f3e7c2",
        fontFamily: "Georgia, serif",
        fontSize: "40px"
      })
      .setOrigin(0.5);

    this.options = hasSave()
      ? [
          { label: "Continue", action: () => this.continueGame() },
          { label: "New Game", action: () => this.promptNewGameOverwrite() }
        ]
      : [{ label: "New Game", action: () => this.startNewGame() }];

    this.optionTexts = this.options.map((option, index) =>
      this.createOptionText(option.label, OPTION_START_Y + index * OPTION_GAP, index)
    );
    this.updateSelectionVisuals();

    this.input.keyboard?.on("keydown-UP", () => this.moveSelection(-1));
    this.input.keyboard?.on("keydown-DOWN", () => this.moveSelection(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.activateSelection());
  }

  private createOptionText(label: string, y: number, index: number): Phaser.GameObjects.Text {
    const text = this.add
      .text(CANVAS_WIDTH / 2, y, label, {
        color: OPTION_COLOR,
        fontFamily: "Georgia, serif",
        fontSize: "24px"
      })
      .setOrigin(0.5);
    text.setInteractive({ useHandCursor: true });
    text.on("pointerover", () => {
      if (this.confirmActive) {
        return;
      }
      this.selectedIndex = index;
      this.updateSelectionVisuals();
    });
    text.on("pointerdown", () => {
      if (this.confirmActive) {
        return;
      }
      this.selectedIndex = index;
      this.activateSelection();
    });
    return text;
  }

  private updateSelectionVisuals(): void {
    this.optionTexts.forEach((text, index) => {
      text.setColor(index === this.selectedIndex ? OPTION_SELECTED_COLOR : OPTION_COLOR);
    });
  }

  private moveSelection(delta: number): void {
    if (this.confirmActive || this.options.length === 0) {
      return;
    }
    this.selectedIndex = (this.selectedIndex + delta + this.options.length) % this.options.length;
    this.updateSelectionVisuals();
  }

  private activateSelection(): void {
    if (this.confirmActive) {
      return;
    }
    this.options[this.selectedIndex]?.action();
  }

  /** Reuses the Y/N confirm-prompt shape `SpellroadScene.startPhaseBreak` already establishes
   * (a message plus a pair of `keydown-Y`/`keydown-N` `.once` listeners) rather than inventing
   * a second confirm mechanism, per the design doc's explicit instruction. */
  private promptNewGameOverwrite(): void {
    this.confirmActive = true;
    this.confirmText = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40, "This will erase your current mage.\n[Y] Confirm   /   [N] Cancel", {
        color: CONFIRM_WARNING_COLOR,
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        align: "center",
        backgroundColor: CONFIRM_WARNING_BG,
        padding: { x: 12, y: 8 }
      })
      .setOrigin(0.5);

    const cleanup = () => {
      this.input.keyboard?.off("keydown-Y", onY);
      this.input.keyboard?.off("keydown-N", onN);
      this.confirmText?.destroy();
      this.confirmText = undefined;
      this.confirmActive = false;
    };
    const onY = () => {
      cleanup();
      this.startNewGame();
    };
    const onN = () => {
      cleanup();
    };
    this.input.keyboard?.once("keydown-Y", onY);
    this.input.keyboard?.once("keydown-N", onN);
  }

  private startNewGame(): void {
    clearSave();
    const startData: SpellroadStartData = { mode: "new" };
    this.scene.start("SpellroadScene", startData);
  }

  private continueGame(): void {
    const startData: SpellroadStartData = { mode: "continue", load: loadSave() };
    this.scene.start("SpellroadScene", startData);
  }
}
