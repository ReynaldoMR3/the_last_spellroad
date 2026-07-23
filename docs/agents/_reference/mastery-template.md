# Mastery Template (Pato's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Death And Mastery Loss".

| Mastery | Power | Enemies hit | Cooldown / Cost |
| --- | --- | --- | --- |
| Novice (start) | base | base (e.g. 1) | base |
| Adept | +1 | +1 | base |
| Master | +2 | +2 | -10% cooldown or resource cost |

Example (starting fire spell, base Power 5, 1 enemy): Novice = Power 5 / 1 enemy; Adept = Power 6 / 2 enemies; Master = Power 7 / 3 enemies with cheaper/faster cast.

Every spell uses this same template — Mastery scaling is never authored per spell. Death drops one Mastery tier on a random equipped spell by default; paying Pato's 100-Hexcoin fee (see `hexcoin-template.md`) lets the player choose which spell takes the loss instead.

**Resolved 2026-07-22 (developer decision, closing the 2026-07-21 review board's Novice-padding finding):** the random death-roll excludes Novice-tier equipped spells from its pool — there is nothing left to lose below Novice, so it isn't a valid roll target. If every equipped spell is Novice, death costs no Mastery that time. This is the designed floor, not an exploit to patch.

**Resolved 2026-07-22 (developer decision):** hierarchy rank never drops on death. Mastery-tier loss on a single spell is the entire cost death imposes.

**Still open, not yet resolved:** the Mastery growth rate — how many landed casts/kills advance a spell one tier. Developer's explicit call (2026-07-22) was to wait for Warden's regular-wave data rather than guess a placeholder. Do not invent this number; pick it up once that data exists.

Only Pato edits this file. Frieren and Warden read it; they never invent their own scaling.
