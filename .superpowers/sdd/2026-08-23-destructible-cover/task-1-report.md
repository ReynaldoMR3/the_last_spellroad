# Task 1 report: destructible-cover model

## Scope

Implemented the pure Phaser-free destructible-cover state machine from Task 1.
The model exposes `createCoverState`, `damageCover`, `coverBlocksMovement`, and
`coverBlocksProjectile`. Spell and ranged attacks apply clamped damage; melee
attacks are immune. Damage returns a new state for a successful hit, while
destroyed or melee-immune cover remains unchanged. Cover with zero HP is
destroyed and no longer blocks movement or projectiles.

Only these Task 1 files were added:

- `src/systems/destructibleCover.test.ts`
- `src/systems/destructibleCover.ts`

No scene, map, or art files were modified by this task.

## TDD evidence

### RED

Command:

```text
npm test -- src/systems/destructibleCover.test.ts
```

Result: exit code 1. Vitest failed to load the expected missing module
`./destructibleCover`; the suite collected 0 tests. This confirmed the new
tests failed because the implementation did not exist yet.

### GREEN

Command:

```text
npm test -- src/systems/destructibleCover.test.ts
```

Result: exit code 0. The focused suite passed 1 test file with 6 tests.

The tests cover initial intact blocking, spell damage, ranged damage, melee
immunity, nonnegative maximum HP and damage clamping, overkill clamping, and
the destroyed non-blocking state. They also verify that successful damage does
not mutate the prior state.

## Additional verification

| Command | Result |
| --- | --- |
| `npm test` | exit 0; 31 test files and 342 tests passed |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0; production bundle built |

The build emitted Vite's existing large-chunk warning for the Phaser bundle;
it did not fail the build.

## Follow-up boundary

Task 2 remains responsible for Tiled metadata and Phaser movement bodies. Task
3 remains responsible for routing scene spell and ranged impacts through this
model.
