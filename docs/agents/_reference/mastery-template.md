# Mastery Template (Pato's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Death And Mastery Loss".

| Mastery | Power | Enemies hit | Cooldown / Cost |
| --- | --- | --- | --- |
| Novice (start) | base | base (e.g. 1) | base |
| Adept | +1 | +1 | base |
| Master | +2 | +2 | -10% cooldown or resource cost |

Example (starting fire spell, base Power 5, 1 enemy): Novice = Power 5 / 1 enemy; Adept = Power 6 / 2 enemies; Master = Power 7 / 3 enemies with cheaper/faster cast.

Every spell uses this same template — Mastery scaling is never authored per spell. Death drops one Mastery tier on a random equipped spell by default; paying Pato's 100-Hexcoin fee (see `hexcoin-template.md`) lets the player choose which spell takes the loss instead.

**Open design question, not yet resolved (see GDD "Open Design Questions" and the 2026-07-21 review board):** whether hierarchy rank (the Power pillar's other progression axis) ever drops on death too, and the exact behavior when a random death-roll targets an already-Novice spell. Do not invent numbers for either — flag back to Ana/the developer if a task depends on them.

Only Pato edits this file. Frieren and Warden read it; they never invent their own scaling.
