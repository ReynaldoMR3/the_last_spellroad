# Prototype Harness

How the `/prototype` skill's UI branch (`~/.claude/skills/prototype/UI.md`) should be carried out in this repo.

The skill's default shape — variants on an existing web route, switched via `?variant=` — doesn't fit: this is a single-page Phaser game with one canvas and no router. `src/dev/prototypeHarness.ts` is this repo's substitute: a throwaway prototype gets its own `Phaser.Scene`, booted directly via `?prototype=<key>` instead of the real Boot→Title→Spellroad chain, with variants switched by number keys / arrows instead of separate routes.

## Adding a new prototype

1. Write the prototype scene under `src/scenes/`, named so it reads as throwaway (e.g. `PrototypeRoadFeelScene.ts`).
2. In `create()`, build each variant's content, and drive switching with a `PrototypeVariantSwitcher`:

   ```ts
   import { PrototypeVariantSwitcher } from "../dev/prototypeHarness";

   const VARIANTS = ["A", "B", "C"] as const;
   const LABELS = { A: "A — ...", B: "B — ...", C: "C — ..." };

   new PrototypeVariantSwitcher({
     scene: this,
     variants: VARIANTS,
     labels: LABELS,
     onChange: (variant) => this.setVariant(variant)
   });
   ```

   The switcher owns the on-screen label, the `← 1 2 3 →` hint text, and the keyboard bindings (1-9, Left/Right). The scene owns what a variant actually looks like.

3. Register the scene in `main.ts`'s `PROTOTYPE_REGISTRY`:

   ```ts
   const PROTOTYPE_REGISTRY: PrototypeRegistry = {
     roadfeel: PrototypeRoadFeelScene
   };
   ```

4. Run `npm run dev`, open the printed URL with `?prototype=roadfeel` appended.

## Capturing and cleaning up

Same as the skill's base process: once a variant (or a mix) is chosen, commit the full variant set to a throwaway branch (out of `main`), record the decision on the ticket, and revert `main.ts`'s registry entry + delete the scene file from `main`. `resolveBootScenes` and `PrototypeVariantSwitcher` themselves stay — they're the reusable part; only the per-ticket registry entry and scene are throwaway.

## Why not real routes

Phaser scenes aren't URL-addressable the way pages are — there's one canvas, and only one scene chain can be active. `?prototype=<key>` swapping the entire boot chain is the closest equivalent to "a route gated by a search param," and keeping the registry empty by default means this plumbing is a no-op for the shipped game.
