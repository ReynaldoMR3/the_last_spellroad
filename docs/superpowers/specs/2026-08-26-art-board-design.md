# The Last Spellroad Art Board

**Status:** Design approved; implementation planning pending review

**Date:** 2026-08-26

## 1. Purpose

Create a local browser-based Art Board that gives the developer a fast visual
way to direct art changes in The Last Spellroad without learning Tiled or
communicating through screenshots. The Art Board must catalogue every usable
asset in the repository and turn visual choices into versioned, machine-readable
art briefs that a coding agent can implement precisely.

The system is a repo companion, not a replacement game editor. Existing Tiled
JSON maps remain the game-compatible level format. The board records intent;
an explicit compilation/review step turns that intent into proposed changes.

## 2. Goals

- Catalogue every relevant visual and audio asset in the repository.
- Give every catalogued item a stable, human-readable ID that can be used in
  conversation, JSON briefs, and implementation work.
- Make scene-level art direction quick: browse, place approximately, remove,
  replace, annotate, and export.
- Support both level composition (Levels 1–5) and entity binding decisions
  (enemy sprites, spell icons/VFX, UI art, and audio).
- Retain source and license evidence with the asset record.
- Use frontier AI to create useful initial descriptions and tags, while keeping
  the workflow correct and useful without model training or a runtime model
  dependency.
- Produce reviewable before/after proposals before production game files change.

## 3. Non-goals

- Teaching the developer to use Tiled.
- Rebuilding a full tile editor or requiring individual 16×16-cell painting.
- Replacing Phaser, Vite, the existing Tiled loader, or the shared map format.
- Applying generated proposals silently.
- Training, hosting, or shipping a local large-language/vision model.
- Introducing unlicensed assets, new gameplay mechanics, or a new rendering
  engine as part of this work.

## 4. Product model

The Art Board is a separate browser entry within this repository. It shares the
project's Vite development workflow but is intentionally separate from the
Phaser game scene chain. The board loads repo-derived catalog data and shows a
context canvas for a selected level or game entity.

The developer selects an asset, performs an intent-first decision, and exports
an art brief. A compiler validates the brief and creates a proposal. The agent
implements approved proposals; the board does not own direct production writes.

```
repo assets → scan/catalogue → Art Board → art brief JSON
                                           ↓
                  approved game change ← proposal compiler ← validation
```

## 5. User workflow

1. Start the local project and open the Art Board companion page.
2. Search or filter the asset catalogue by type, tag, source, or ID.
3. Open a context:
   - a Level 1–5 scene board for environmental composition; or
   - an entity binding board for an enemy, spell, interface element, or sound.
4. Drag or select an asset and make a decision:
   - **Use**: place or bind the asset;
   - **Replace**: nominate an alternative for an existing use;
   - **Remove**: request removal of an existing use;
   - add an optional short intent note.
5. Export the board as an art brief.
6. Ask the agent to compile/review the brief. The agent shows a proposal with
   exact target files plus a before/after preview.
7. Approve the proposal. Only then does implementation edit the game and run
   the project verification gates.

Scene placement is approximate and meaningful rather than tile-perfect. A
placement uses a named zone or normalized position (for example, `entrance`
and `leftEdge`) plus intent such as “warm landmark; leave the combat lane
clear.” The compiling/implementation step owns conversion to precise Tiled
coordinates.

## 6. Art Board surface

The primary screen has three panels.

### 6.1 Asset catalogue

The left panel is searchable and filterable. Its initial groups are:

- tiles and static props;
- creature sheets and enemy art;
- spell icons;
- VFX;
- audio;
- level maps; and
- source/license documents.

Each asset card shows its ID, preview, kind, dimensions or duration, source
status, and suggested tags. Sprite sheets additionally expose addressable
regions/cells where metadata supports them.

### 6.2 Context canvas

The center panel presents either a selected level preview or an entity binding
view. A level context shows protected/non-walkable regions and the existing
combat lane as a readability aid. It accepts scene-level placements and
annotations; it does not expose a cell-painting tool.

An entity context shows the existing asset binding and a preview of replacement
candidates. Audio contexts include a playable preview, but use the same asset
identity and decision format.

### 6.3 Decision inspector

The right panel shows the selected asset and target. It captures the action,
intent note, optional target zone, and confidence/status. It also exposes an
export action that writes an art brief, not a map overwrite.

## 7. Data contracts

### 7.1 Generated catalogue

`art-direction/catalog.json` is reproducible and committed. Each asset record
includes at minimum:

```json
{
  "id": "tile:kenney-tiny-dungeon:0042",
  "path": "public/assets/third-party/kenney-tiny-dungeon/Tiles/tile_0042.png",
  "kind": "tile",
  "dimensions": { "width": 16, "height": 16 },
  "source": { "name": "Kenney Tiny Dungeon", "license": "CC0", "evidencePath": "public/assets/third-party/kenney-tiny-dungeon/License.txt" },
  "tags": ["stone", "floor"],
  "tagOrigin": "generated"
}
```

IDs are deterministic from asset family and canonical path/region. Renames or
tag corrections never change the primary identity.

### 7.2 Overrides

`art-direction/overrides.json` is committed and contains human/agent revisions
to suggested tags, display names, exclusions, and source clarifications.
Overrides always take precedence over scanner and AI output.

### 7.3 Art briefs

`art-direction/boards/<context>.json` is committed and contains developer
decisions. A representative placement is:

```json
{
  "id": "decision:level-1:entry-torch",
  "target": { "kind": "level", "level": 1, "zone": "entrance", "anchor": "leftEdge" },
  "action": "use",
  "assetId": "tile:kenney-tiny-dungeon:0042",
  "intent": "Warm landmark at entry; leave combat lane clear.",
  "status": "draft"
}
```

Entity replacements use `target.kind: "binding"` plus the exact enemy/spell/UI
or audio binding key. A removal names the target and its current use; it does
not rely on an ambiguous thumbnail alone.

### 7.4 Proposals

The compiler writes temporary review output to `art-direction/proposals/`.
Each proposal lists validated source briefs, exact target files, an asset-use
diff, diagnostics, and preview artifact locations. It is not applied merely by
being generated.

## 8. Catalogue and AI enrichment

The scanner is deterministic. It enumerates supported repository assets,
captures content hash, media metadata, tile/sprite-sheet grid metadata where
available, related map references, and source/license evidence. A refresh
updates current metadata without deleting a record that is still referenced by
an art brief; instead it marks that record missing and reports a repair task.

A frontier AI pass may inspect contact sheets and file/source context to suggest
display names, short descriptions, and tags. These values are saved as
suggestions. They never replace file-derived identity, source data, or manual
overrides. The system does not need a local model and must remain usable if AI
enrichment is skipped or fails.

Generated thumbnails and scan caches belong under `.art-board/cache/` and are
gitignored. Durable catalogue/override/brief data are reviewable text files in
version control.

## 9. Validation and failures

Before export and compilation, validation must report:

- unknown or missing asset IDs;
- missing/changed source files;
- invalid level number, entity key, target zone, or action;
- unsuitable media use (for example, selecting audio as a tile placement);
- source/license information that is absent when a new asset is proposed; and
- conflicting decisions that target the same binding.

Failures are actionable: the board highlights the failed decision and offers
the current asset or target metadata. It never discards the developer's draft
brief automatically. Compilation stops on invalid references and cannot make a
partially applied production change.

## 10. Verification

- Unit-test stable ID generation, metadata extraction, override precedence,
  board-schema validation, and proposal diagnostics.
- Test compiler mapping from an approved brief to its target-map/binding
  proposal without requiring Phaser.
- Render catalogue and level previews using representative tiles, creature
  sheet regions, VFX, icons, and audio metadata.
- Run the project's typecheck, test suite, and production build after a
  proposal is implemented.
- Human-review the visual before/after result and perform the existing game
  playtest gate, particularly for combat-lane readability and asset provenance.

## 11. Delivery sequence

1. Establish the stable catalogue schema and deterministic scanner for all
   repository assets, including source/license discovery and thumbnail cache.
2. Add initial agent-produced suggested tags plus the durable override model.
3. Deliver the Art Board entry and catalogue browsing/search.
4. Add Level 1 scene-board decisions and art-brief export/validation.
5. Add proposal compilation and review rendering for a Level 1 decision.
6. Extend context handling to Levels 2–5, entity bindings, spell/UI assets,
   VFX, and audio.
7. Run the catalogue and board against a real art-direction change; approve a
   proposal and verify the resulting game change.

This sequence prioritizes an early vertical slice: the developer can make a
real Level 1 art choice long before the board supports every context.

## 12. Acceptance criteria

- A developer can open one local browser companion and view the repository's
  assets with stable IDs and provenance.
- A developer can direct a Level 1 visual change without opening Tiled or
  sharing a screenshot.
- The output is a valid, committed art brief an agent can unambiguously read.
- A proposal maps the brief to exact game files and requires explicit approval.
- Corrected tags/names persist across catalogue refreshes.
- The system supports future enemy, spell, VFX, UI, and audio decisions without
  replacing its core catalogue or brief format.
- No model training, cloud model runtime, or silent production write is required.
