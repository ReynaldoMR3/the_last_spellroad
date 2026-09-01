# Debug level skip

The game has no in-fiction level select. In the Vite development server, `?debugLevel=<n>` jumps directly to level `<n>`'s first wave so a level-specific change can be validated without playing every earlier wave. Add `&debugWave=<zero-based-index>` to select an exact authored wave inside that level. Invalid, missing, fractional, or cross-level values fail closed to the campaign start. Production builds ignore these parameters.

Examples:

- `http://localhost:5173/?debugLevel=5` starts at Level 5 Wave 0.
- `http://localhost:5173/?debugLevel=5&debugWave=5` starts at the final boss phase for reproducible review evidence.

`src/systems/debugStart.ts` resolves the query against the real flattened wave array and `SpellroadScene.create()` passes the result to its normal `startWave(...)` path. Unknown or malformed values fall back to wave zero. The shortcut has no in-game UI and does not bypass the ordinary HP, Mana, wave-session, or encounter initialization performed by `startWave`.
