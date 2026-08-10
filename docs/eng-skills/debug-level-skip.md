# Debug level skip

The game has no in-fiction level select. In the Vite development server, `?debugLevel=<n>` jumps directly to level `<n>`'s first wave so a level-specific change can be validated without playing every earlier wave. Production builds ignore the parameter.

Example: `http://localhost:5173/?debugLevel=5` starts at the Level 5 boss fight's first phase.

`src/systems/debugStart.ts` resolves the query against the real flattened wave array and `SpellroadScene.create()` passes the result to its normal `startWave(...)` path. Unknown or malformed values fall back to wave zero. The shortcut has no in-game UI and does not bypass the ordinary HP, Mana, wave-session, or encounter initialization performed by `startWave`.
