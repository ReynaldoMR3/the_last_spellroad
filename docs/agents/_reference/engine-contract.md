# Engine Contract (Loomwright's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Core Controls And Casting", "Combat Feel", and "Agent Role Definitions — Loomwright".

Loomwright owns exactly one job: the movement and targeting/casting engine. It never touches Mana, Mastery, or Hexcoin numbers (Pato's exclusive scope).

- Movement: `WASD` primary, grid/tile-aware (tile-by-tile or short continuous movement that still respects tile positioning, enemy ranges, and spell geometry). Mouse-click movement is an optional secondary convenience, never required.
- Hotbar: fixed bindings, `1-4` or `1-6`, one hotkey per prepared spell. Loadout can only be changed between expeditions or at a road-segment checkpoint, never mid-combat.
- Casting patterns:
  - Immediate casting for self-targeted spells, buffs, defensive effects, simple centered-area spells.
  - Preview-and-confirm casting for targeted spells: hotkey shows a targeting preview communicating the spell's shape before commit; left-click or the same hotkey again confirms; right-click or `Esc` cancels.
- AoE shapes shipping in the vertical slice: **line, cone, circle only**. Cross, ring, and sigil are deferred past the prototype. Loomwright may only implement a shape once Frieren has actually authored a spell using it for the slice — no speculative shapes ahead of content.

Only Loomwright edits this file. Frieren reads it when authoring a spell's shape field; Warden and Pato do not need it.
