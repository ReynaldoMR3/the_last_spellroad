import Phaser from "phaser";
import { HOW_TO_PLAY_TEXT } from "../systems/howToPlay";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const OPTION_COLOR = "#9fb0d8";
const OPTION_SELECTED_COLOR = "#f3e7c2";
/** Same warning palette `SpellroadScene`'s `flashMessage` uses for its "warning" emphasis
 * (backlog 2.37) and `TitleScene`'s own overwrite confirm — one visual language for "this
 * needs your attention" across the game. */
const CONFIRM_WARNING_COLOR = "#ffb4a8";
const CONFIRM_WARNING_BG = "#4a1f1f";

interface PauseSceneData {
  gameplaySceneKey: string;
}

interface PauseOption {
  label: string;
  action: () => void;
}

/**
 * backlog 5.8 / the 2026-08-01 boot-title-pause design spec, decisions 3-5 — the hard-pause
 * menu. Launched (not started) on top of a gameplay scene that has already called
 * `this.scene.pause()` on itself, so the gameplay scene stays visible but frozen (enemies, wave
 * timers, Mana regen all stop) while this un-paused scene renders and handles input. `Resume`
 * and `Quit to Title` only — no `Restart` (death already owns the one voluntary-progress-reset
 * path, per the design doc's own reasoning). `Quit to Title` prompts its own Y/N confirm since
 * it can lose progress since the last autosaved state (same confirm-prompt shape
 * `TitleScene.promptNewGameOverwrite` and `SpellroadScene.startPhaseBreak` already use).
 *
 * A paused scene's own input listeners stop receiving events (Phaser ties the Input Plugin's
 * active state to the scene's own active/paused state), which is exactly why `Resume` — and the
 * Esc-to-resume binding — live here rather than on the now-frozen gameplay scene trying to
 * un-pause itself.
 */
export class PauseScene extends Phaser.Scene {
  private gameplaySceneKey = "SpellroadScene";
  private options: PauseOption[] = [];
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private confirmActive = false;
  private confirmText?: Phaser.GameObjects.Text;
  private panel?: Phaser.GameObjects.Rectangle;
  private headingText?: Phaser.GameObjects.Text;
  private helpText?: Phaser.GameObjects.Text;
  private showingHelp = false;

  constructor() {
    super("PauseScene");
  }

  create(data: PauseSceneData): void {
    this.gameplaySceneKey = data?.gameplaySceneKey ?? "SpellroadScene";
    this.confirmActive = false;
    this.selectedIndex = 0;
    this.showingHelp = false;

    this.panel = this.add.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 340, 220, 0x1c1330, 0.94);
    this.panel.setStrokeStyle(2, 0xf3e7c2, 0.6);

    this.headingText = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60, "Paused", {
        color: "#f3e7c2",
        fontFamily: "Georgia, serif",
        fontSize: "28px"
      })
      .setOrigin(0.5);

    this.showPauseMenu();

    this.input.keyboard?.on("keydown-UP", () => this.moveSelection(-1));
    this.input.keyboard?.on("keydown-DOWN", () => this.moveSelection(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.activateSelection());
    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.confirmActive) {
        return;
      }
      if (this.showingHelp) {
        this.showPauseMenu();
        return;
      }
      this.resumeGame();
    });
  }

  private showPauseMenu(): void {
    this.showingHelp = false;
    this.panel?.setSize(340, 220);
    this.headingText?.setText("Paused").setPosition(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
    this.helpText?.destroy();
    this.helpText = undefined;
    this.options = [
      { label: "Resume", action: () => this.resumeGame() },
      { label: "How to Play", action: () => this.showHelp() },
      { label: "Quit to Title", action: () => this.promptQuitConfirm() }
    ];
    this.renderOptions(CANVAS_HEIGHT / 2 - 22);
  }

  /** Issue #216 — always-available copy of the opening controls reference. Gameplay remains
   * paused underneath this scene; Continue resumes it while Back/Esc return to this menu. */
  private showHelp(): void {
    this.showingHelp = true;
    this.panel?.setSize(700, 400);
    this.headingText?.setText("How to Play").setPosition(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 164);
    this.helpText = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 104, HOW_TO_PLAY_TEXT, {
        color: "#9fb0d8",
        fontFamily: "monospace",
        fontSize: "15px",
        align: "center",
        lineSpacing: 7
      })
      .setOrigin(0.5, 0);
    this.options = [
      { label: "Continue", action: () => this.resumeGame() },
      { label: "Back", action: () => this.showPauseMenu() }
    ];
    this.renderOptions(CANVAS_HEIGHT / 2 + 104);
  }

  private renderOptions(startY: number): void {
    this.optionTexts.forEach((text) => text.destroy());
    this.selectedIndex = 0;
    this.optionTexts = this.options.map((option, index) => this.createOptionText(option.label, startY + index * 38, index));
    this.updateSelectionVisuals();
  }

  private createOptionText(label: string, y: number, index: number): Phaser.GameObjects.Text {
    const text = this.add
      .text(CANVAS_WIDTH / 2, y, label, {
        color: OPTION_COLOR,
        fontFamily: "Georgia, serif",
        fontSize: "20px"
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

  private resumeGame(): void {
    if (this.confirmActive) {
      return;
    }
    this.sound.resumeAll();
    this.scene.stop();
    this.scene.resume(this.gameplaySceneKey);
  }

  private promptQuitConfirm(): void {
    this.confirmActive = true;
    this.confirmText = this.add
      .text(
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 80,
        "This can lose progress since your last checkpoint.\n[Y] Quit to Title   /   [N] Cancel",
        {
          color: CONFIRM_WARNING_COLOR,
          fontFamily: "Georgia, serif",
          fontSize: "16px",
          align: "center",
          backgroundColor: CONFIRM_WARNING_BG,
          padding: { x: 12, y: 8 }
        }
      )
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
      this.sound.resumeAll();
      this.scene.stop(this.gameplaySceneKey);
      this.scene.stop();
      this.scene.start("TitleScene");
    };
    const onN = () => {
      cleanup();
    };
    this.input.keyboard?.once("keydown-Y", onY);
    this.input.keyboard?.once("keydown-N", onN);
  }
}
