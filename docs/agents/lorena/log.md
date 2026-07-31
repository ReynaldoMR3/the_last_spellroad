# Lorena — Narrative Log

Append-only, dated, one entry per narrative piece written.

## 2026-07-21

Context store established. No narrative content logged yet.

## 2026-07-30

First real narrative pass. Three pieces, per Ana's dispatch (backlog items 4.1, 4.2, 4.5). Heckler has not yet reviewed any of this — gate result pending.

### 4.1 — Hexcoin fee framing (two pieces)

**Piece A — phase-transition recovery prompt.** Replaces the literal string currently at `src/scenes/SpellroadScene.ts:496` (`startPhaseBreak`), which today reads:

> `Phase clear! [Y] Pay 30 Hexcoin -> restore 10 HP  /  [N] Continue`

Replacement (prose only — no code touched, this is the string Loomwright/whoever owns that file would swap in):

> The Director tallies the toll: thirty Hexcoin returns ten drops of what this phase took.
> [Y] Pay 30 Hexcoin — the ledger updates, 10 HP returns  /  [N] Keep your coin, carry the wound.

Two lines, matches the existing Y/N prompt shape so it drops in without needing new UI layout. First line is the flavor beat; second keeps the mechanical Y/N legible for the player mid-fight.

**Piece B — Mastery-choice fee (100 Hexcoin), future UI moment.** No in-game UI exists for this yet (per Ana's dispatch); this is written for whenever that moment gets built — the screen/prompt where the mage picks which equipped spell eats the Mastery-tier loss on death instead of a random roll.

> A hundred Hexcoin — a hundred small deaths dealt to earn it — buys one mercy the Director rarely grants: the choice of which spell forgets you first. It still insists on taking something; it only lets you decide what bleeds. Choose the one you can most afford to relearn, mage. The Road will teach it back to you eventually, the same slow way it always has.

### 4.2 — Debuffer archetype identity

Named the archetype **the Tarrywright** (new fact, appended to `docs/agents/_reference/lore-premise.md`). Mechanically unchanged — drains either move speed or Mana regen via a brief pulse, never both from the same instance, no HP damage (see GDD, HP Pool And The Death Trigger). This flavor text is meant for wherever the Debuffer gets a bestiary/encounter-log entry or an on-hit flavor line.

> Not an enemy so much as a warning the Director left standing: a mage who stopped resisting, folded now into a slow hexagonal hum that drifts the corridors it once tried to flee. It does not strike — it only remembers stillness, and offers it, in a pulse that pulls either the strength from your legs or the warmth from your Mana, never both at once, as if even in captivity it can only spare you half a mercy. Cut it down and it does not scream; it simply stops humming, the way a held breath finally lets go.

### 4.5 — Mini-boss/Director trial intro/outro

Named the trial avatar **the Invigilator** (new fact, appended to `docs/agents/_reference/lore-premise.md`). Written for the 3-phase mini-boss/Director trial's intro beat (on entering the trial arena) and outro beat (on the "destroy" resolution only — per the ending-scope lock, no line here implies "outwitted" or "transformed" is available in this slice).

**Intro:**

> The trial chamber closes behind you with no sound of a door — only the hex-lines in the floor brightening, one ring at a time, like a spell being read aloud. At the center, the Director's avatar assembles itself out of the same sacred geometry that built the Road: too smooth, too attentive, more curious than cruel. You feel measured rather than hated, the way a lesson feels measured, and understand, distantly, that surviving this is not escape — it is only passing the part of the test that lets you keep walking. The Invigilator turns toward you, unhurried, and begins.

**Outro (destroy resolution):**

> The Invigilator's geometry comes apart the way frost leaves a window — not shattered, just no longer held together, its hex-lines guttering into ordinary dark stone. For one long moment there is a quiet the Road has never given you before, unscored by any generated thing. You do not feel triumphant so much as tired, and faintly, uselessly sorry — this was also, once, someone's careful work. Somewhere in the ledger a line closes; you do not know yet whether the Director notices, or minds, or is already writing the next trial. The road ahead stays exactly as endless as it was an hour ago, and you walk it anyway.

**Scope note:** the outro deliberately destroys only this trial's avatar, not "the Director" as a whole — the Road stays endless and the mage stays trapped, consistent with the vertical-slice lock that only this combat resolution is real and the larger Director is untouched by it.

## 2026-07-30 — Heckler revision (4.1a only)

Heckler gate result on the 2026-07-30 batch: 4.1b, 4.2, and 4.5 cleared with no blocking findings — those stand as written above, untouched by this entry. 4.1a (the phase-recovery prompt replacement) got one BLOCKING finding and one MAJOR finding; this entry supersedes 4.1a from the entry above.

**BLOCKING (Feasibility Lead):** the two-line prose replacement can't render — `startPhaseBreak`'s `flashMessage` call is a single `Phaser.GameObjects.Text` with no `wordWrap` on a 960×540 canvas, and existing flash messages in this codebase top out around 90-100 chars on one line. My two ~91-98-char lines would overflow off-screen.

**MAJOR (Adversarial QA):** hardcoding "thirty"/"ten" as prose was wrong — this exact fee/restore pair has already been re-tuned twice (15→10 HP, 33%→35% ceiling), so hardcoded prose numbers go stale silently on the next re-tune. The line must stay a template literal with the real constants (`FEE_PHASE_RECOVERY`, `MAX_HP * PHASE_RECOVERY_HP_FRACTION`) interpolated, not spelled out.

**Revised 4.1a — single line, template literal, ~68 chars once interpolated (well under the ~90-char budget), short flavor lead-in only, Y/N choice stays first-glance legible:**

```js
`The ledger waits. [Y] Pay ${FEE_PHASE_RECOVERY} Hexcoin -> restore ${Math.round(MAX_HP * PHASE_RECOVERY_HP_FRACTION)} HP  /  [N] Refuse`
```

Which renders today (`FEE_PHASE_RECOVERY` = 30, `MAX_HP * PHASE_RECOVERY_HP_FRACTION` = 10) as:

> The ledger waits. [Y] Pay 30 Hexcoin -> restore 10 HP  /  [N] Refuse

Flavor is now a three-word lead-in ("The ledger waits.") instead of a separate sentence, keeping the Director-as-ledger-holder framing without burying the mechanical Y/N behind prose. The two interpolated values stay live, so the line survives future re-tuning without going stale.

**Non-blocking note acknowledged, no action taken:** the Narrative Critic flagged the Invigilator outro's "not shattered, just no longer held together" as reading closer to unraveled/outwitted than destroyed-via-combat. No rule violation given the explicit scope hedge already in that entry's Scope Note, and Ana's dispatch said 4.5 stands as written — leaving it untouched, flagging here for the record in case a future pass wants to tighten it.
