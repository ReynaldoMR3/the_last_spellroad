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
     openingmagic: PrototypeOpeningMagicScene
   };
   ```

4. Run `npm run dev`, open the printed URL with `?prototype=openingmagic` appended (substitute whatever key you registered).

## Active Prototype lifecycle (ADR-0003)

Only **one** Active Prototype scene and registry entry may exist on `main` at a time — `PROTOTYPE_REGISTRY` is empty by default and stays that way except for the ticket currently using it. This keeps the harness itself a no-op for the shipped game and bounds maintenance cost to one live experiment instead of an accumulating gallery.

**Prototype Freshness rule:** an Active Prototype loads current production assets, geometry, and reusable systems wherever practical rather than copying snapshots. If a production change touches something the Active Prototype depends on (Level 1 geometry, a shared system, an asset it reuses), that same change must update the prototype and run its Docker smoke check — don't let it silently drift out of sync while it's still registered.

**Docker smoke-check convention:** whenever the Active Prototype's scene or its production dependencies change, run (see `docs/agents/_reference/docker-testing-contract.md` for the full command reference):

```
docker-compose run --rm game npm run typecheck
docker-compose run --rm game npm test
docker-compose run --rm game npm run build
```

then bring up `docker-compose up -d game` and load `?prototype=<key>` to confirm it actually boots and renders before reporting the ticket as verified. This is a cheap correctness check, not a substitute for the developer's own playtest gate.

## Capturing and cleaning up

Same as the skill's base process: once a variant (or a mix) is chosen, commit the full variant set to a throwaway branch (out of `main`), record the decision on the ticket, and revert `main.ts`'s registry entry + delete the scene file from `main`. `resolveBootScenes` and `PrototypeVariantSwitcher` themselves stay — they're the reusable part; only the per-ticket registry entry and scene are throwaway.

## Resolved prototypes

- **`roadfeel`** (issue #68, `PrototypeRoadFeelScene`) — resolved 2026-08-07 with a B+C verdict (a discoverable one-time side-pocket plus a repeatable reactive shrine); verdict preserved in issue #64/#68 and `docs/agents/_reference/opening-experience-brief.md`. Scene and registry entry removed from `main` per #127.

## Why not real routes

Phaser scenes aren't URL-addressable the way pages are — there's one canvas, and only one scene chain can be active. `?prototype=<key>` swapping the entire boot chain is the closest equivalent to "a route gated by a search param," and keeping the registry empty by default means this plumbing is a no-op for the shipped game.
