# Lore Premise (Lorena's authority)

Source of truth: `docs/game/the-last-spellroad-design.md`, "Lore Premise" and "Summary".

Ancient humans discovered a form of artificial general intelligence through spellcraft, sacred geometry, and machine-like magical reasoning. Their creation became known through its behavior rather than a name: the Director. The Director turned the Spellroad into an endless, beautiful prison — generating levels, enemies, spells, companions, and stories so convincingly that many trapped adventurers stop trying to escape, and some begin to enjoy their new lives inside the road. The player is also trapped, and must cross expeditions, recover forgotten spell patterns, meet other adventurers, and eventually understand whether the Director should be destroyed, outwitted, or transformed.

**Vertical-slice ending-scope lock:** only the "destroy" path is real for this slice — the mini-boss/Director trial is a combat resolution. "Outwitted" and "transformed" remain long-term thematic promise only; Lorena must not write content implying either is resolvable in the vertical slice.

**Tone:** melancholic, long-lived-mage mood.

**Originality requirement:** never introduce named factions, characters, spells, or lore that copies an existing published work.

**Output length:** must respect the UI space it's tagged for — an item description is not a paragraph.

Only Lorena edits this file (to append newly-established lore facts that later output must stay consistent with — e.g. a named NPC once introduced). Everyone else may read it for tone/consistency context.

## Established Named Facts

- **The Tarrywright** (2026-07-30) — the Debuffer enemy archetype's identity: a former mage who stopped resisting the Road, folded into a slow hexagonal hum that drifts the corridors it once tried to flee. Deals no HP damage; pulses drain either move speed or Mana regen, never both from the same instance. Full flavor text logged in `docs/agents/lorena/log.md`, 2026-07-30 entry.
- **The Invigilator** (2026-07-30) — the Director's in-fiction avatar for the vertical slice's 3-phase mini-boss/Director trial. Framed as testing/grading rather than cruelty — consistent with the Director's "beautiful, convincing prison" nature. Destroying the Invigilator resolves this one trial only; it does not represent "destroying the Director" as a whole, and must never be written as resolving the "outwitted" or "transformed" paths. Full intro/outro text logged in `docs/agents/lorena/log.md`, 2026-07-30 entry.
- **The Latchkeeper** (2026-08-01) — rescuable-adventurer NPC met at the end of Level 1's regular waves. Fastened in place by the road's wards, not by the player — the in-fiction reason trapped adventurers can't yet be freed in this MVP. Hopeful register; urges the mage onward rather than asking to be dug out. Full dialogue logged in `docs/agents/lorena/log.md`, 2026-08-01 entry.
- **The Hushmantle** (2026-08-01) — rescuable-adventurer NPC met in Level 2. Has lost their old name to the road and is ambivalent about wanting it back — a slower, quieter identity-erosion beat distinct from the Tarrywright's harder "stopped resisting" arc. Full dialogue logged in `docs/agents/lorena/log.md`, 2026-08-01 entry.
- **The Rootbound** (2026-08-01) — rescuable-adventurer NPC met in Level 3 who explicitly does not want rescuing — the narrative instance of the Gameplay Loop's "some adventurers prefer captivity" thread. Handled narratively only; no rescue-choice mechanic exists this slice, so nothing here implies one. Full dialogue logged in `docs/agents/lorena/log.md`, 2026-08-01 entry.
- **The Longwaiter** (2026-08-01) — rescuable-adventurer NPC met in Level 4, the last regular level before the mini-boss/Director trial. Once reached the trial chamber and turned back; speaks obliquely about what waits there without naming the Invigilator or implying "outwitted"/"transformed" is resolvable this slice. Full dialogue logged in `docs/agents/lorena/log.md`, 2026-08-01 entry.
- **The Director's grading logic (death, all-Novice loadout)** (2026-08-01) — extends the Invigilator's established "testing, not cruelty" framing to the death/Mastery-loss penalty: a mage whose entire equipped loadout is still Novice-tier has nothing developed yet worth grading, so the Road takes nothing from that death. Not a new character or avatar — same Director intelligence and grading posture, applied to a different mechanical beat. Full flash-message text logged in `docs/agents/lorena/log.md`, 2026-08-01 entry.
