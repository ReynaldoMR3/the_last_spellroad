import Phaser from "phaser";

/**
 * Reusable plumbing for the `/prototype` skill's UI branch (see `~/.claude/skills/prototype/UI.md`)
 * applied to this repo: a Phaser game with one gameplay scene and no web router, so there's no
 * `/settings?variant=` page to bolt variants onto. Instead, a prototype ticket boots straight into
 * its own scene via `?prototype=<key>`, and switches between variants with number keys / arrows
 * instead of a URL param per variant (Phaser has one canvas, not one route per option).
 *
 * What's permanent (this file, and the `resolveBootScenes` call in `main.ts`): the boot-override
 * and the on-screen switcher. What's throwaway (per ticket): the prototype Scene itself and its
 * one-line registry entry in `main.ts` — delete both once the ticket resolves, per the prototype
 * skill's "capture, then clean up" step. See `docs/eng-skills/prototype-harness.md`.
 */

/**
 * Deliberately loose (`any` args/return): `main.ts`'s real scene classes have mismatched
 * constructor/`create` signatures (e.g. `PauseScene.create(data)`), and a strict `new () => T`
 * can't unify across them. This function only ever passes constructors through, never calls one.
 */
export type PrototypeSceneCtor = new (...args: any[]) => any;
export type PrototypeRegistry = Record<string, PrototypeSceneCtor>;

/**
 * Pure (besides reading `location.search`) so it's unit-testable without a live Phaser game —
 * pass `search` explicitly in tests instead of relying on the global.
 */
export function resolveBootScenes(
  defaultScenes: readonly PrototypeSceneCtor[],
  registry: PrototypeRegistry,
  search: string = typeof window !== "undefined" ? window.location.search : ""
): PrototypeSceneCtor[] {
  const key = new URLSearchParams(search).get("prototype");
  if (key && registry[key]) return [registry[key]];
  return [...defaultScenes];
}

export interface VariantSwitcherOptions<K extends string> {
  scene: Phaser.Scene;
  variants: readonly K[];
  labels: Record<K, string>;
  onChange: (variant: K) => void;
  /** Defaults to the canvas center-bottom; override for scenes with a different layout. */
  x?: number;
  y?: number;
}

/**
 * The floating variant switcher the `/prototype` UI branch calls for, adapted to Phaser: number
 * keys 1-9 jump straight to a variant, Left/Right cycle, and a text label shows the current one.
 * One instance per prototype scene — construct it in `create()` after any other keyboard bindings
 * the scene needs, and it takes care of both input and the on-screen label.
 */
export class PrototypeVariantSwitcher<K extends string> {
  private current: K;
  private readonly label: Phaser.GameObjects.Text;

  constructor(private readonly opts: VariantSwitcherOptions<K>) {
    const { scene, variants, labels, onChange } = opts;
    if (variants.length === 0) throw new Error("PrototypeVariantSwitcher: variants must be non-empty");
    if (variants.length > 9) {
      throw new Error("PrototypeVariantSwitcher: more than 9 variants can't be number-key-selected");
    }
    this.current = variants[0];

    const x = opts.x ?? scene.scale.width / 2;
    const y = opts.y ?? scene.scale.height - 24;

    this.label = scene.add
      .text(x, y, labels[this.current], {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#000000cc",
        padding: { x: 10, y: 6 }
      })
      .setOrigin(0.5)
      .setDepth(1000);

    const hintKeys = variants.map((_, i) => `${i + 1}`).join("  ");
    scene.add
      .text(x, y + 20, `← ${hintKeys} →`, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#9aa0b4"
      })
      .setOrigin(0.5, 0)
      .setDepth(1000);

    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error("PrototypeVariantSwitcher: scene has no keyboard plugin");
    variants.forEach((variant, index) => {
      keyboard.on(`keydown-${digitKeyName(index + 1)}`, () => this.set(variant));
    });
    keyboard.on("keydown-LEFT", () => this.cycle(-1));
    keyboard.on("keydown-RIGHT", () => this.cycle(1));

    onChange(this.current);
  }

  get variant(): K {
    return this.current;
  }

  private cycle(direction: 1 | -1): void {
    const { variants } = this.opts;
    const index = variants.indexOf(this.current);
    this.set(variants[(index + direction + variants.length) % variants.length]);
  }

  private set(variant: K): void {
    this.current = variant;
    this.label.setText(this.opts.labels[variant]);
    this.opts.onChange(variant);
  }
}

/** Phaser's keydown-* event names spell digits out (ONE, TWO, ...) rather than using the digit. */
const DIGIT_NAMES = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"];
function digitKeyName(n: number): string {
  return DIGIT_NAMES[n];
}
