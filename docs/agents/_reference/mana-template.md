# Mana Template (Pato's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Mana And Spell Costs".

- Base Mana pool: **100**.
- Passive regen: **5 per second**, in and out of combat.
- Weight classes (every spell is authored into exactly one):

| Weight | Mana Cost | Cooldown |
| --- | --- | --- |
| Light | 10 | 2s |
| Standard | 20 | 4s |
| Heavy | 35 | 8s |

- At Master Mastery, cost or cooldown drops **10%** from the weight-class baseline (whichever the spell's design leans on more).
- Pacing target this feeds: regular waves are tuned to resolve before Mana pressure kicks in; boss/trial encounters are tuned to outlast a careless Mana budget (see "Spam Waves Vs. Tactical Trials" in the GDD).

Only Pato edits this file. Warden and Frieren read it; they never invent their own numbers.
