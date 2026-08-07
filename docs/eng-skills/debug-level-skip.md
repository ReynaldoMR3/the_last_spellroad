# Debug level skip

The game has no in-fiction level-select — reaching Level 5 normally means playing through
Levels 1-4 (12 waves) first. For verifying a Level 5-specific change (boss banner timing, SFX,
etc.) that's real playtime lost to content the change doesn't touch.

`?debugLevel=<n>` jumps straight to level `<n>`'s first wave instead of wave 0 (Level 1's
opening). Resolved by `src/systems/debugStart.ts`'s `resolveDebugStartWave`, wired into
`SpellroadScene.create()`'s final `startWave(...)` call — same query-param-driven dev-entry-point
convention as `?prototype=<key>` (`docs/eng-skills/prototype-harness.md`), but for skipping ahead
within the real game instead of booting a throwaway scene.

Example: `http://localhost:5173/?debugLevel=5` boots directly into the Level 5 boss fight's
Phase 1.

**Scope:** dev-only convenience, not a shipped feature — no in-game UI exposes it, and it has no
effect on save data, Hexcoin/Mastery progression, or anything else `startWave` normally does
(HP/Mana/wave-state resets all still run exactly as they would arriving at that wave normally).
Resolves against the real flattened `waves` array (each entry's own `level` field), not a
hardcoded index, so it can't drift out of sync with wave-count changes to earlier levels.

An unknown/malformed `debugLevel` value falls back to the normal wave-0 start silently — this is
a convenience shortcut, not a feature surface that needs to reject bad input loudly.
