# Boot / Title / Pause Screens — Scene Flow, Confirms, and Ownership

**Status:** Approved, ready to hand off to Ana for dispatch (Loomwright).
**Branch:** `design/boot-title-pause-screens`

## Context

The developer wants to start work on a pause screen and an initial load/title screen before the rest of the vertical slice's gameplay work continues. Grilled via `/grill-with-docs` (2026-08-01) rather than built directly, since neither screen existed in any form: `src/main.ts` registers exactly one scene (`SpellroadScene`) with no Boot/Preload, Title, or Pause scene anywhere in the codebase, and the GDD's only prior use of "pause" was colloquial (mana regen letting the player "pause and let the pool recover"), not a pause-screen feature.

Two open questions drove the session: whether this belongs in the living GDD, and whether it needed grilling at all. Both resolved during the session — see "Documentation" below for the GDD answer; the design itself turned out to have several real forks (title-screen scope, hard vs. soft pause, an `Esc`-binding conflict with the existing cast-preview-cancel behavior, and a genuine ownership gap in the agent roster) that were worth surfacing rather than building past.

## Decisions

### 1. Scene chain

Two distinct scenes, chained: **Boot/Preload → Title → `SpellroadScene`**. Rejected folding loading and title into one scene — a title screen needs its own assets (background, font) loaded before it can render, so a single scene would still need an internal loading step; two scenes is the plainer shape.

### 2. Title scene contents

- **No save exists:** single `New Game` button, straight into `SpellroadScene`.
- **Save exists:** `Continue` (loads the existing `localStorage` blob, see GDD "Save Data And Persistence") and `New Game`, which prompts a Y/N-style confirmation ("this will erase your current mage") before overwriting — reusing the confirm-prompt pattern already in `SpellroadScene` rather than inventing a new one.
- **No Options/Settings menu** in the vertical slice. Nothing in the locked design (Mana, Mastery, Hexcoin, hotbar) has a player-facing setting yet. A future music/volume option was raised and explicitly deferred, not scoped now.

### 3. Pause mechanism

**Hard pause**: the entire gameplay scene freezes via the engine's scene-pause mechanism (enemies, wave spawn timers, Mana regen all stop) while a separate, un-paused pause-menu scene renders on top. Rejected a soft pause (background scene keeps ticking under an overlay) — the GDD's core pillar is tactical, readable positioning over twitch reflexes; a wave that keeps spawning while the player reads a menu directly undercuts that, for no offsetting benefit.

### 4. Pause trigger

`Esc`, **contextual** with the existing binding: `SpellroadScene` already binds `Esc` to `cancelPreview()` for the spell preview-and-confirm flow (see GDD "Core Controls And Casting"). Rule: if a spell preview is active, `Esc` cancels the preview first (unchanged); otherwise `Esc` opens/closes the pause menu. This is the standard "back out one layer at a time" convention, not two competing bindings.

### 5. Pause menu contents

**`Resume` and `Quit to Title` only.** No `Restart` — death already owns the one voluntary-progress-reset path (Mastery-tier loss, optional Hexcoin-gated choice of which spell loses it), so a menu-triggered restart would be a second, redundant path to the same kind of decision. `Quit to Title` prompts its own Y/N confirm, since it can lose progress made since the last autosaved state-changing event (autosave already covers whatever was reached — no new save-on-quit logic needed).

### 6. Ownership

**Loomwright** (scene wiring / UI shell). No agent previously owned this — confirmed by grep across every `docs/agents/*/AGENT.md` and `docs/agents/ana/backlog.md`, zero hits for scene/menu/pause/boot/title. Resolved the same way item 0.1 resolved the HP/Mana/Mastery/Hexcoin runtime-ownership gap: a scope clarification following an established precedent, not a new design decision. Recorded as backlog item **0.7**; `docs/agents/_reference/engine-contract.md` and `docs/agents/loomwright/AGENT.md` updated accordingly.

### 7. Documentation

Both of the developer's original questions resolved to "yes, and both docs":
- A short addition to the GDD (`docs/game/the-last-spellroad-design.md`, new "Screen Flow And Pause" section, after Core Controls And Casting) — the player-facing design decision, at the same altitude as the GDD's other locked decisions.
- This spec, under `docs/superpowers/specs/`, carrying the implementation-level detail (scene names, key-binding interaction, confirm-prompt reuse) — mirroring the split already established by e.g. `2026-07-21-death-recovery-fee-decisions.md`.
- The ownership gap itself as backlog item 0.7, following the 0.1 precedent, rather than a new ADR — none of this clears the ADR bar (nothing here is hard-to-reverse architecture; it's UI-shell scope, not a locked technology or system-boundary choice).

## Out of scope

- Options/Settings menu (music/volume noted as a plausible future item only).
- Non-`Esc` pause trigger (e.g. a dedicated on-screen button) — not requested, `Esc` covers it.
- Multiple save slots — the existing single-blob `localStorage` save is unchanged by this design.
- `Restart` as a pause-menu action — death already owns voluntary progress reset.
- The actual scene/TypeScript implementation — tracked separately as backlog task 5.8, owned by Loomwright.
