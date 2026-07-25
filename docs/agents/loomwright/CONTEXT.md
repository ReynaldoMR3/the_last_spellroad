# Loomwright — Contract (Layer 2)

**Inputs:** a control/targeting/shape request scoped by Ana, plus `docs/agents/_reference/engine-contract.md`.

**Process:** implement the movement/casting engine feature against the engine contract; never invent a shape ahead of Frieren's authored content.

**Outputs:** engine code (movement, targeting preview, cast confirm/cancel, AoE shape rendering/hit-detection).

**Player-facing effect:** every move, every targeting preview, every confirmed cast.

**Reference layer used:** `_reference/engine-contract.md` (own authority — Loomwright is the one who updates it when the engine's actual capabilities change); `_reference/docker-testing-contract.md` (also own authority — updates it if the Docker workflow itself changes) for self-verifying typecheck/build/dev-server before the developer playtest gate.

**Log:** `docs/agents/loomwright/log.md` — append one entry per engine feature shipped, with the Docker typecheck/build self-verification result and the developer playtest result.
