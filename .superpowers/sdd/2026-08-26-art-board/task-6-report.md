# Task 6 — Level 1 Art Board companion report

## Status

Implemented and verified. `npm run art:board` now opens a human-facing, Level 1-only companion with an accessible three-panel layout: searchable/filterable repository assets, a real Tiled Level 1 canvas with combat-lane guidance and semantic placement targets, and an inspector/review flow. Use, Replace, Remove, notes, brief export, and review-confirmed proposal export are present. The browser never offers a production-application action.

## Files changed

- `art-board.html` — Vite entry with `art-board-root` and the Art Board module script.
- `src/artBoard/main.ts` — catalogue/API loading, selected-asset inspector, Level 1 Tiled-map rendering, named-zone placement controls, local validation, brief export, explicit proposal review gate, and reviewed-proposal export.
- `src/artBoard/styles.css` — responsive three-panel visual treatment, map overlay, focus states, and catalogue/inspector presentation.
- `src/artBoard/boardState.ts` — pure view-state derivation for panel landmarks, selected asset, export gates, and Level 1 placement ordering.
- `src/artBoard/boardState.test.ts` — view-state and placement-order coverage.

No production game source, map, or asset file was modified.

## Red/green evidence

- **Initial RED:** `npx vitest run src/artBoard/boardState.test.ts` failed 3/10 tests with `deriveViewState(...) is not a function`, proving the selected-asset, three labelled region panels, review gate, and validation-error export behavior did not yet exist.
- **Initial GREEN:** the same command passed 10/10 after adding `deriveArtBoardViewState`.
- **Manual-check regression RED:** visual inspection showed placement buttons were ordered by zone before anchor, placing several semantic targets beneath the wrong zone column. A focused ordering test then failed 1/11 with `placementTargets is not a function`.
- **Regression GREEN:** the same test passed 11/11 after `levelOnePlacementTargets` began emitting each complete anchor row across all five named zones. The browser then reported the corrected first row as Entrance, Lane, Left edge, Right edge, and Threshold, all at the left anchor.

## Commands and results

- `npx vitest run src/artBoard tools/art-board/devApi.test.ts` — passed: 5 files, 79 tests.
- `npm run typecheck` — passed.
- `npm run build` — passed; Vite emitted its existing production chunk-size warning.
- `git diff --check` — passed.
- `npm run art:board -- --host 127.0.0.1 --port 5174 --strictPort` — started the Art Board on the alternate local port after the sandbox required its normal local-server approval.

## Live manual-check evidence

- Loaded `/art-board.html` and observed all three labelled region landmarks plus a 960 × 288 canvas rendered from `public/assets/levels/level-1.json` and its real Tiny Dungeon tileset.
- Searched `fire`, selected the stable-ID `image:spell-icons:fire` card, and confirmed the inspector showed its icon classification, capabilities, source state, and file state.
- The fire icon is intentionally binding-only (`visual-binding`) and cannot pass the Level 1 `level-placement` contract. To complete a valid export without bypassing validation, selected `image:third-party:kenney-tiny-dungeon:tiles:tile-0000`, added an entrance/left-anchor note, and created the Level 1 Use decision.
- Before brief export, the proposal button was disabled. After brief export it remained disabled. Only after checking “I reviewed the proposal summary” did it become enabled.
- Exported `art-direction/boards/level-1.json` and `art-direction/proposals/proposal-level-1.json`; the final UI status was “Reviewed proposal saved for human handoff.” Browser inspection found zero buttons with an apply action.
- Verified `git diff --name-only -- src ':!src/artBoard' public package.json vite.config.ts` produced no output before and after the live exports. The manual-check artifacts were then removed so an arbitrary verification placement is not committed as human art direction.

## Commit

- `9035429f2a9d683a3cfe5c1c1ad85af541177899` — `feat: add level art board companion`

## Concerns

- The fire icon requested for the live search check is correctly rejected as a Level 1 placement because its catalogue capability is `visual-binding`, not `level-placement`; the successful draft/proposal therefore uses a documented placeable tile after the icon inspection.
- `vite build` continues to report the repository's pre-existing large game-bundle warning. The development-only Art Board entry is exercised through `npm run art:board` and does not change that game bundle.
