# Art Board workflow

The Art Board is a local, human-review companion for art direction. It presents repository assets beside the five level maps and the production bindings for the mage, enemies, spell icons, opening VFX, SFX, and music.

It is not Tiled. Level decisions use semantic zones and anchors so an implementer can preserve the combat lane and translate intent into an appropriate map edit later. The Art Board never paints cells and never writes a production map, TypeScript binding, or game asset automatically.

## 1. Refresh the catalogue

Run the deterministic scanner before beginning a review:

```bash
npm run art:catalog
```

Review the resulting `art-direction/catalog.json` diff. A retained asset referenced by an existing brief is marked `missing` or `changed` rather than silently deleted. Resolve unexpected source, license, or file-status diagnostics before proposing the asset for production.

## 2. Make an art brief

Start the local board:

```bash
npm run art:board
```

Choose one of the Level 1–5 previews or an exact production binding. The catalogue narrows to candidates compatible with that target's media kind, semantic class, and required capability. Select a candidate, choose Use, Replace, or Remove, and record the visual or audio intent in the note.

Audio cards use the browser's native preview control and show the file format. If the browser cannot decode a codec, the card shows a non-blocking fallback; the decision draft remains available.

Exporting creates one versioned `ArtBrief` document under `art-direction/boards/`. Diagnostics block export but do not discard draft decisions. A missing saved asset or conflicting binding remains visible so it can be repaired deliberately.

## 3. Compile and review

After the brief is valid, inspect the proposal summary and explicitly confirm that review in the board. Exporting the proposal writes review-only data under `art-direction/proposals/`.

The compiler derives binding keys, current asset identities, URLs, and target modules from the existing game systems. Its output names exact target files, before/after asset IDs, diagnostics, and preview paths. Compilation does not apply any change.

## 4. Obtain explicit approval

A developer must inspect the brief, proposal, provenance, and relevant previews and then explicitly approve the decision. Creating or compiling a brief is not approval. Do not commit an art-direction board as an approved decision, and do not alter a production map or binding, until that approval is recorded.

## 5. Implement and playtest normally

After approval, implement the proposal through the repository's normal code or Tiled workflow. Treat the brief's zones, anchors, and notes as intent rather than literal cell instructions.

Run the normal typecheck, tests, and production build. Then playtest the changed level or binding in the game, with particular attention to combat-lane readability, silhouette and icon recognition, VFX timing, audio balance/codec support, and asset provenance. The developer playtest remains the final acceptance gate.

## Elemental monster roster proposals

The Art Board is a proposal surface, not the elemental source of truth. For a new or reassigned
monster silhouette:

1. Review the CC0 asset, provenance, normal-size silhouette, and intended existing archetype in
   the board. Never invent a fourth archetype.
2. Export the proposal for review; do not let the board write `MONSTER_REGISTRY`, wave JSON, or
   production bindings.
3. After explicit approval, update `src/data/monsterRegistry.ts` and the authored wave entry
   together. The registry is the supported place to reassign a silhouette's archetype; per-wave
   archetype text must match it. The wave entry separately owns the active element.
4. Run the content/test/build gates, then capture normal, grayscale, protanopia, and deuteranopia
   evidence at the normal 960×540 game viewport. Confirm the filled triangle, diamond, square,
   and zigzag badges remain identifiable in a mixed cluster without relying on hue.
5. For the capstone, use `?debugLevel=5&debugWave=5` and verify the persistent `▲ Fire` plus
   `◎ Resists ◆ Ice + ϟ Lightning` trial affordance is visible before the first boss hit.

The review checklist lives in the
[Issue #207 implementation plan](../superpowers/plans/2026-08-31-elemental-monster-roster.md)
so a later reviewer can reproduce the same frame.
