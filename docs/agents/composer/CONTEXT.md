# Composer — Contract (Layer 2)

**Inputs:** a mood/tempo/instrumentation brief from Lorena, scoped to one already-shipped level, scene, or trial event.

**Process:** compose a music track matching the brief, via a real Claude Code/Codex agent-dispatch session (never a raw API call, never local Ollama), then hand off to Heckler for validation.

**Outputs:** one rendered music track, tagged to the level/scene/trial event it's for.

**Player-facing effect:** the score playing under that level, scene, or trial.

**Reference layer used:** `_reference/lore-premise.md` -- read-only, for Lorena's established tone; Composer never edits it.

**Log:** `docs/agents/composer/log.md` -- append one entry per track composed: target level/scene/trial, the brief it was composed against, and the Heckler gate result.
