# Engine Contract (Loomwright's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Core Controls And Casting", "Combat Feel", and "Agent Role Definitions — Loomwright".

Loomwright owns exactly one job: the movement and targeting/casting engine. It never touches Mana, Mastery, or Hexcoin numbers (Pato's exclusive scope).

**Scope extension, resolved 2026-07-23 (Ana's call, per `docs/agents/ana/backlog.md` item 0.1):** Loomwright's engine scope also covers *runtime execution* of the HP, Mana, Mastery, Hexcoin, and Debuff mechanics Pato defines in `hp-template.md`, `mana-template.md`, `mastery-template.md`, and `hexcoin-template.md` — reading and applying those numbers in code. This mirrors the split the GDD already sets for Save Data And Persistence ("Loomwright's engine scope — the read/write mechanism itself... while Pato's templates continue to own what values are valid to write"). Loomwright still never sets or invents a number; it only runs the numbers Pato already fixed.

**Scope extension, resolved 2026-08-01 (developer decision, per `docs/agents/ana/backlog.md` item 0.7):** Loomwright's engine scope also covers scene wiring and UI shell — the Boot/Preload → Title → gameplay scene chain, and the pause-menu scene (hard pause via the engine's scene-pause mechanism, `Esc`-triggered, `Resume`/`Quit to Title` only). See the GDD's "Screen Flow And Pause" section for the full design. No agent previously owned this; it falls outside Pato's numeric scope entirely (no economy values involved) and outside every other agent's charter.

- Movement: **arrow keys** primary, `WASD` bound in parallel as an equivalent alternate (same movement, not a separate scheme), grid/tile-aware (tile-by-tile or short continuous movement that still respects tile positioning, enemy ranges, and spell geometry). Mouse-click movement is an optional secondary convenience, never required. Arrow-keys-primary is deliberate: it puts movement on the right hand and the hotbar (below) on the left, so neither hand has to leave its keys mid-fight.
- Hotbar: fixed bindings, `1-6`, one hotkey per prepared spell. Loadout can only be changed between expeditions or at a road-segment checkpoint, never mid-combat.
- Casting patterns:
  - Immediate casting for self-targeted spells, buffs, defensive effects, simple centered-area spells.
  - Preview-and-confirm casting for targeted spells: hotkey shows a targeting preview communicating the spell's shape before commit; left-click or the same hotkey again confirms; right-click or `Esc` cancels.
- AoE shapes shipping in the vertical slice: **line, cone, circle only**. Cross, ring, and sigil are deferred past the prototype. Loomwright may only implement a shape once Frieren has actually authored a spell using it for the slice — no speculative shapes ahead of content.

Only Loomwright edits this file. Frieren reads it when authoring a spell's shape field; Warden and Pato do not need it.
