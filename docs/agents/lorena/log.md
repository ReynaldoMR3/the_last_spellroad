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

## 2026-08-01

### 4.4 — Rescuable-adventurer dialogue and item flavor text, Levels 1-4

Per Ana's dispatch (backlog 4.4) and GDD Gameplay Loop step 5 ("meet or rescue trapped adventurers"). One rescuable-adventurer dialogue beat plus a small set of level-appropriate item flavor text, per regular level (Levels 1-4). Trapped-adventurer NPCs are invulnerable in this MVP with no friendly-fire/rescue-choice mechanic (per the design doc) — every beat below is flavor/dialogue only; none of it implies a rescue mechanic, a choice prompt, or a UI surface that doesn't exist. Nothing here is wired into `src/data/` or any scene — per 4.2/4.5's precedent, that is separate, unscoped future engine work.

**Grounding note:** read all three `content-pipeline/output/` runs (`run_20260729_052010`, `run_20260729_052556`, `run_20260729_054539`) — their `npc_dialogue.md`/`item_flavor.md` drafts are generic, level-unspecific one-liners (a captive asking to be freed, an "incantation fragment" item). Useful as a tonal baseline (melancholic captive voice, "fragment of something lost" item framing) but not level-grounded and not reused verbatim; the content below is authored fresh against the actual Level 1-4 enemy rosters and escalation arcs in `docs/agents/warden/log.md` (spellbound_thug/hexbow_skirmisher/creeping_bramble/murmur_wisp across Levels 1-2, `dread_reaver`/`storm_lancer` added Level 3, `voidfang_stalker` added Level 4) and against the "some adventurers prefer captivity" thread the design doc explicitly invites (`the-last-spellroad-design.md`, Gameplay Loop, ~line 49).

**Naming convention:** four new rescuable-adventurer NPCs are named the same way the Tarrywright and the Invigilator were — a road-given epithet, not the name they arrived with. This is deliberate, not incidental flavor: it reads as the Director's own habit of relabeling what it keeps, and it lets each dialogue beat carry a small grief (a person who has lost or is losing their name) without inventing a new mechanic. All four are appended to `lore-premise.md`'s Established Named Facts.

#### Level 1 — The Latchkeeper

Met at the close of Level 1's waves. Fastened in place by the road's own wards, not by anything the player did or failed to do — the in-fiction reason this NPC can't be freed this slice, so the invulnerability/no-rescue-mechanic constraint reads as world logic rather than an obvious missing feature. Hopeful register, deliberately placed on the first level to set the beat's tone before later levels complicate it.

> "You're new. I can tell — you still flinch at the hex-lines underfoot. I did too, the first hundred times."
>
> "Don't waste your strength on my corner of floor. The wards hold me tighter than any lock, and no spell in your hands touches wards, not yet. Walk on."
>
> "If you find the way out, mage, don't come back for me out of guilt. Come back because you remembered where the door was. That's the only rescue that'll ever hold."

**Item — Chalk-Stub Tally.** *A stub of chalk, worn round. Someone was counting days here, until the count stopped mattering more than the counting did.*

**Item — Blank Waymark.** *A page that means to be a map. Every time you look away, it forgets your steps and starts again.*

#### Level 2 — The Hushmantle

Met partway through Level 2, the first level to sit a debuffer at its cap. Ambivalent rather than hopeful or resigned — texture for the Director's slower, quieter erosion of identity, distinct from the Tarrywright's harder "stopped resisting" arc so the two don't read as the same beat twice.

> "Don't ask my name. I gave it up somewhere around the second wave of thugs, and the road never handed it back."
>
> "Some days I want it back so badly my teeth ache. Other days the not-remembering is the only rest I get in here."
>
> "You still have your name stitched to you, mage — I can see it, the way you move like it matters where you're going. Keep it stitched. Mine came loose a long time ago."

**Item — Bramble-Thorn Needle.** *Pulled from a creeping bramble's coiled length, still faintly slow to the touch. Prick your finger and count how long the sting takes to catch up.*

**Item — Murmur-Glass Vial.** *Sealed glass that once held a wisp's murmuring drain. Hold it to your ear and you can still hear it trying to hum.*

#### Level 3 — The Rootbound

Met sitting apart from Level 3's fighting, the level that first stacks both debuff caps at once. This is the narrative instance of the "some adventurers prefer captivity" thread the design doc explicitly invites — handled narratively only, with no choice prompt or mechanic implied, since none exists this slice. The tension is left open, not resolved.

> "You don't have to lower your staff on my account. I'm not fighting you, and I'm not coming with you either."
>
> "I know how that sounds. I said it to the last mage who stopped here, and the one before her. Say your piece if you need to — I've made the argument for leaving to myself, more than once."
>
> "Out there I was tired in a way that had no shape and no end. In here, at least the tired has a rhythm to it. You'll think that's the road talking. Maybe it is. Some mornings I've stopped being able to tell the difference, and the not-telling feels like the first peace I've had in years."
>
> "Go on, mage. Save the pity for someone who's still asking to be saved."

**Item — Reaver's Cracked Visor.** *Dented at the temple, the eye-slit still faintly warm. Whatever dread it was forged to wear has already moved on to the next one down the line.*

**Item — Root-Cellar Key.** *Opens nothing on this stretch of road. Someone still carries it anyway, the way you'd carry a door you weren't ready to walk back through.*

#### Level 4 — The Longwaiter

Met in Level 4, the last regular level before the mini-boss/Director trial. Speaks obliquely about the trial ahead without naming the Invigilator directly and without implying "outwitted" or "transformed" is resolvable this slice — matches the ending-scope lock and echoes the Invigilator's own established framing ("more curious than cruel," "measured rather than hated") without repeating it.

> "You're close now. Close enough that the hex-lines under this stretch of floor stopped flickering days ago — they only go steady like that near where it tests you."
>
> "I made it this far once, however long 'once' means on a road that doesn't count years the way you do. I did not go through the door at the end. I turned around, and I have been this far and no farther ever since."
>
> "I won't tell you what waits in there — not because I'm sworn to silence, only because I don't know if the thing I met is the same thing that's waiting for you, or the road's newest polite little lie wearing the last one's shape."
>
> "Whatever it is, it will not lie to you the way a person lies. It will only grade you, and mean it kindly. Go and be graded, mage. Some of us ran out of nerve for that particular exam."

**Item — Voidfang Tooth.** *Pulled still-humming from a stalker's jaw. It doesn't cut. It only remembers, very precisely, the shape of the last thing it closed on.*

**Item — Chalked Ledger Scrap.** *A torn corner of the Director's endless tally, one column of Hexcoin sums cut off mid-row. Whatever debt it was totaling, it isn't finished totaling it.*

**Scope note:** none of the four dialogue beats above offer a rescue action, a Y/N prompt, or any branch — they fire as flavor text on meeting the NPC and end there, matching the MVP's invulnerable/no-rescue-mechanic constraint. The Rootbound explicitly declines rescue in-fiction but the player is never given a mechanical choice to honor or override that — the tension stays narrative, per the developer's own framing of this as a "next-step for a future pass," not vertical-slice scope.

**Status:** authored and logged in full above; not wired into any UI, scene, or `src/data/` file this pass, per the same precedent 4.2 and 4.5 already set (content-only, display integration is separate unscoped engine work). **Content is ready for Heckler's tone/consistency gate (tracked separately).**

## 2026-08-01 (2) — 0.3 / 4.3: All-Novice death-penalty flash message

Per Ana's dispatch: the developer's final call on the 2026-07-23 adversarial-review finding (farming bosses for free by keeping an all-Novice loadout) is that the mechanic stays as-is — no new penalty. My job was only to reframe the existing `"Died — no Mastery lost (all Novice)"` line so the absence of a penalty reads as in-fiction logic rather than an obvious exploit gap.

Leaned on the Invigilator's already-established framing (2026-07-30 entry) — the Director tests and grades rather than punishes out of cruelty. An all-Novice mage hasn't grown anything yet for that grading intelligence to take an interest in; there's nothing on the ledger to dock. That reads as consistent Director behavior rather than the Road "letting someone off easy," which matters since the constraint here was explicitly to frame this narratively, not mechanically.

Replacement line: `Died — no Mastery lost; the Road grades what you've grown` — kept "no Mastery lost" as a literal clause rather than replacing it outright with pure prose, per the 4.1a lesson already on record in this log (mechanical facts stay legible; flavor rides alongside, not instead of). Single line, 57 characters (Heckler's critique caught my own count of 59 as a small arithmetic slip — corrected here, not just noted), comfortably under the ~90-char budget Heckler's Feasibility Lead flagged in the 4.1a revision.

Added one framing bullet to `lore-premise.md`'s Established Named Facts, explicitly scoped as an extension of the existing Invigilator fact rather than a new character — same Director "testing, not cruelty" posture, just applied to the death/Mastery beat instead of the trial-boss beat. No new proper noun introduced, per the task's constraint.

**Status:** wired directly into `src/scenes/SpellroadScene.ts`'s `handleDeath()` flash message by Ana this same session (small enough not to warrant a separate engine dispatch). Not yet Heckler-gated — flagged for the next critique pass rather than silently treated as fully closed.

## 2026-08-02 — 2.31 / issue #57 (my half): wiring "the Tarrywright" into `archetypeDisplayName`

Per Ana's dispatch, my half of backlog 2.31 / issue #57 (Loomwright built the HUD display surface separately). This is wiring, not writing — the Tarrywright's identity was already locked in at backlog 4.2 (2026-07-30 entry above; also `lore-premise.md`'s Established Named Facts: "**The Tarrywright** (2026-07-30) — the Debuffer enemy archetype's identity..."). No new backstory, dialogue, or embellishment introduced here.

**Change:** `src/systems/enemyStatusOverlay.ts`'s `archetypeDisplayName` now returns `"The Tarrywright"` for the `"debuffer"` case specifically (melee/ranged untouched, still the generic capitalized fallback — no lore name exists for those yet).

**Format decision (the one judgment call this task flagged as likely needed):** the established fact's exact wording is lowercase mid-sentence, `"the Tarrywright"` (see the log/reference quotes above). `archetypeDisplayName` feeds two call sites off one return value — the enemy's standalone overlay name label (`Enemy.ts`, backlog 2.19) and the lead-in of `debuffDisplay.ts`'s `formatDebuffHudLines` HUD sentence (`"${sourceName} pulse active (until wave clears)"`, backlog 2.31). A standalone name tag reads oddly starting with a lowercase "the"; a capitalized proper noun reads fine as both a standalone label and a HUD sentence lead-in. So I display-cased it to `"The Tarrywright"` — same capitalization convention this function already applies to every other archetype ("Melee"/"Ranged"/formerly "Debuffer") — without changing the established name itself, only how it's cased for on-screen display. Confirmed both call sites read sensibly: the enemy's floating label now shows `The Tarrywright` instead of `Debuffer`, and the HUD line now reads `The Tarrywright pulse active (until wave clears)`.

**Test update:** `src/systems/enemyStatusOverlay.test.ts` had a literal assertion `expect(archetypeDisplayName("debuffer")).toBe("Debuffer")` that would now fail (and, worse, silently assert the wrong string if left as `.not.toBe` or similar) — split it into its own `it()` block asserting `"The Tarrywright"`, and re-scoped the melee/ranged assertion's description to note only those two still lack a lore name. `debuffDisplay.test.ts` needed no change — it already exercises `formatDebuffHudLines` with a `"the Tarrywright"` literal passed directly as `sourceName` (not through `archetypeDisplayName`), so it wasn't asserting the old generic name and stayed accurate as-is.

**Self-verify (docker-compose):** `npm run typecheck` clean, `npm test` — 9 test files / 75 tests passed (including the updated `enemyStatusOverlay.test.ts`, now 7 tests), `npm run build` clean (only the pre-existing >500kB chunk-size advisory, unrelated to this change).

## 2026-08-04 — 4.9: First music brief, the mini-boss/Director trial (the Invigilator)

Per Ana's dispatch (backlog item 4.9, unblocked same day as `docs/adr/0002-unblock-audio-scope-add-composer-agent.md`), my first briefing task under the new Composer role. Picking one already-shipped target and writing its mood/tempo/instrumentation brief for Composer to generate against.

**Target chosen: the mini-boss/Director trial's combat loop — the music bed under the shipped 3-phase fight (`src/data/waves/boss-1.json`), not the intro/outro narration text itself (4.5, already logged above), which stays prose-only.** Reasoning: of the two example targets Ana's dispatch offered (a level opening, or the trial), the trial is the stronger first track for three reasons. First, it already carries the richest established tone anchor in this log — the Invigilator's intro/outro (4.5 entry above) gives Composer a fully-written fictional frame to score against, rather than a level opening that has no dedicated narration yet. Second, it's a single, bounded, already-numerically-locked encounter (3 phases / 2 phase-breaks, Warden's `boss-1.json`, Pato-validated) — one clear scene, not an ambiguous "which part of Level 1's opening" judgment call. Third, structurally a boss/trial track is exactly the kind of first-track investment that pays off regardless of which level ships more content later, since there is exactly one mini-boss per the vertical slice by design (GDD, Seven-Week Vertical Slice) — it will never be superseded by a second, different mini-boss track.

**Mood:** melancholic-tense, not bombastic. The Invigilator "tests and grades rather than punishes out of cruelty" (per the 2026-07-30 intro/outro and the 2026-08-01(2) all-Novice framing already established in `lore-premise.md`) — this is a fight that should feel like being measured, not mauled. Keep the long-lived-mage's weary sorrow present even under combat pressure: dread and fatigue first, adrenaline second. Avoid genre-standard "epic orchestral boss" bombast (no bwah-bwah brass hits, no choir climax) — that tone belongs to a different kind of antagonist than a "too smooth, too attentive, more curious than cruel" testing intelligence. The track should feel unhurried even while the player is under threat, echoing the outro's own line: "you do not feel triumphant so much as tired."

**Tempo:** 96 BPM, straight 4/4, deliberate rather than frantic — matches "The Invigilator turns toward you, unhurried, and begins" (4.5 intro). Not a slow dirge (this still has to function as combat music the player hears many times per playtest) and not a fast action tempo either; it sits in a controlled, metronomic middle that reads as *precision*, not excitement.

**Key/harmony:** D minor. Sparse, mostly diatonic harmony (i, iv, v, VI) — nothing chromatically "evil"; the Invigilator is not a monster, it's a grading intelligence, so the harmonic language should stay legible and almost clinical rather than dissonant or horror-coded.

**Instrumentation:**
- A solo low string melodic line (cello register) carrying the primary weary/sorrowful theme — the "someone's careful work" pathos from the outro.
- A sparse plucked ostinato (harp or pizzicato strings), steady 8th/16th-note pulse — represents the hex-lines "brightening, one ring at a time, like a spell being read aloud" from the intro: mechanical, precise, ticking.
- A sustained low pad/drone (strings or held organ tone) underneath, for dread and scale without adding bombast.
- One sparse deep bell or low gong accent, used rarely (e.g. once per 8-16 bars) rather than on a driving rhythm — marking the sense of ritual/ledger-closing rather than punctuating action beats.

**Length/loop:** roughly 45-75 seconds, structured to loop cleanly (this scores a fight the player may spend several minutes in across phases/retries) — Composer's call on exact bar count as long as the loop point is clean and the mood doesn't escalate into a different track by the end (no big finale swell; the piece should feel like it could keep going indefinitely, same as the Road itself).

**Status:** brief only — not separately Heckler-gated per Lorena's own AGENT.md ("a music brief itself isn't separately Heckler-gated... the resulting track is"). Handed to Composer for backlog 4.9's generation stage.

**Not touched, per my own contract:** `docs/agents/ana/backlog.md`, `docs/agents/loomwright/log.md`, `lore-premise.md` (no new fact — the Tarrywright entry already exists and needed no edit). Nothing committed; left for review per Ana's dispatch instructions.
