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

## 2026-08-07 — Issue #109: naming the two remaining archetypes, "The Nearblade" and "The Farlance"

Developer playtest (2026-08-06): "i dont like the name ranged and melee, lets use something else." This closes the gap my own 2026-08-02 entry above flagged ("melee/ranged untouched, still the generic capitalized fallback — no lore name exists for those yet") — the Tarrywright is no longer the only named archetype.

**The Nearblade** (melee): a duelist-mage whose instinct to close the last stride between themself and an opponent never faded — the Road folded that instinct into a permanent lunge, so it now closes distance on anything that enters the corridor and never stops arriving. Distinct from the Tarrywright's "stopped resisting" arc: the Nearblade never stopped fighting, it just stopped being able to fight anything but the Road's own idea of an opponent.

**The Farlance** (ranged): a mage who once measured every fight in the distance between a first shot and a killing one — patient, deliberate. The Road kept the aim and erased the patience, so it now looses on anything it can see, from wherever it happens to be standing, with none of the original judgment about when to actually take the shot.

Both are archetype-level identities, same category as the Tarrywright — a mass label shown above every enemy of that archetype, not a unique individual with their own scene or dialogue (no rescuable-adventurer-style NPC treatment; nothing here implies otherwise). Kept to two sentences each, in line with `lore-premise.md`'s output-length rule for a UI-surfaced name, not a paragraph. Checked against the originality requirement: neither name matches a named faction/character/creature I could recall from a published fantasy property; both are plain-English compounds in the same register as the existing five (Tarrywright, Invigilator, Latchkeeper, Hushmantle, Rootbound, Longwaiter).

**Written to `lore-premise.md`'s Established Named Facts** (the only file I edit for this). Wiring (`archetypeDisplayName`) done by Loomwright this same session — see `loomwright/log.md`, 2026-08-07 entry — since it was a mechanical one-line lookup-table change with no new display surface to design.

**Status:** content `shipped-and-validated` in the sense that it's written and internally consistent with the established naming convention; not yet Heckler-gated (tone/consistency — same "flagged for the next critique pass" handling backlog 4.3 used for the all-Novice flash message) and not yet developer-confirmed as landing well on-screen. Both are real, human-facing judgment calls (does the name read right, does it fit the melancholic tone) that I can't self-certify per my own contract.

## 2026-08-09 — Issue #142 (epic #124): music brief for the ordinary combat-encounter loop

Per Ana's routing off the developer's 2026-08-09 `?prototype=openingmagic` playtest (issue #128, comment thread) and issue #142's filed follow-up. All three opening-magic audio treatments were rejected specifically for combat use — "the vibe is not for fighting monsters, it's most for exploration or wandering or when talking with NPCs" — even though the shipped loop faithfully executed the approved `opening-experience-brief.md`'s own musical direction. That brief was written before anyone tested it against a fight; it wasn't wrong for what it was asked to be, it was asked to be the wrong thing for this one moment. Nothing about the exploration identity is being revisited here — the developer explicitly wants the existing composed loop and forest-ambience concept kept for future exploration/NPC-conversation content, and I'm not re-briefing or discarding either. This is a brief for a **new, distinct** cue.

**Target: the ambient combat loop for ordinary monster-engagement waves, Level 1-4 — not the mini-boss/Director trial.** The Invigilator trial (backlog 4.9, issue #139's separate brass/percussion follow-up) is its own already-composed track with its own identity and stays untouched; scope confusion between "combat music" and "boss music" is exactly the kind of drift this brief needs to head off, so I'm naming the target as narrowly as the trial brief named its own. This cue plays from first enemy contact through an ordinary wave clearing — the GDD's "regular wave" tier specifically (10-15% of the HP pool on competent play, 25-35% careless — see `the-last-spellroad-design.md`, HP Pool And The Death Trigger), fought against the three named archetypes at their ordinary-wave scale: the Nearblade closing distance without stopping, the Farlance loosing from wherever it happens to be standing, the Tarrywright draining speed or Mana regen from range. That is a fast, frequent, resolve-quickly encounter type by the GDD's own Spam-Waves-vs-Tactical-Trials pacing split — a different shape of tension than the trial's rarer, cumulative, multi-phase ordeal, and the brief below is written for that shape specifically, not a scaled-down copy of the trial's mood.

**Mood:** alert and tactically live, not dread and not triumph. This is the moment the mage stops reading the road and starts reading a threat in motion — positioning, cooldowns, which archetype to face first. It must be unmistakably combat within a few seconds of a first playtest listen, which is the exact bar the rejected treatments failed. Two failure modes to avoid on either side: it must not drift back toward the exploration loop's bright, contented forward-momentum feel (the literal complaint), and it must not borrow the Invigilator trial's unhurried, being-tested-by-a-patient-intelligence weight (4.9's brief, "melancholic-tense... unhurried even while the player is under threat") — that mood belongs to one grading intelligence in one bounded trial, not to every ordinary wave in four levels. Regular combat here should feel like effort and urgency under real but survivable pressure, not existential and not victorious.

**Tempo:** 132-140 BPM, straight 4/4, a genuinely driving pulse — faster than the trial's deliberately unhurried 96 BPM, and a real gear-change from the exploration loop's already-brisk 128 BPM, achieved by rhythmic activity as much as raw speed (syncopated, insistent) rather than the exploration loop's steady ambient eighth-notes. The player should feel the tempo change the instant contact starts, not the same brightness ticking slightly faster. Still short of a twitch-action tempo (160+) — per the GDD's own combat-pacing philosophy ("wins through positioning... difficulty should come from spell choices... rather than twitch skill"), this scores tactical alertness, not a reflex-test.

**Key/harmony:** A minor, a tight two-to-three-chord vamp (i-VII-i or i-iv-v) rather than a wandering progression — legible and clean (this is still a grading-precision world, not horror-coded dissonance) but harmonically restless compared to both existing tracks: no major-key brightness (exploration) and no slow spacious sparseness resolving nowhere in particular (the trial). The vamp should feel like it's circling rather than settling, matching a wave that's actively being fought rather than mourned or celebrated.

**Instrumentation — deliberately contrasted against both existing tracks, not a variation on either:**
- **Low string ostinato** (viola/cello register) carrying a driving rhythmic pulse for the full loop — replaces the exploration loop's bright plucked celesta/pizzicato register and is busier/tighter than the trial's slow solo-cello melody. This is the instrument doing the "combat is live" work, continuously, not just coloring the mood.
- **Frame drum or low tom pulse, syncopated**, functioning as a constant rhythmic signal rather than decoration — replaces the exploration loop's woodblock hand-percussion (ambient, not urgent) and the trial's rare ritual bell/gong accent (used once per 8-16 bars specifically to feel unhurried, the opposite of what this cue needs).
- **Sparse horn or low brass stabs, on structural downbeats only** (roughly once every 2 bars), short and clipped rather than sustained or swelling. Both existing briefs explicitly ruled brass out — the opening brief said "avoid epic-orchestral bombast," the trial brief said "no bwah-bwah brass hits, no choir climax" — and that ruling stands for both those tracks. This is the one place I'm asking Composer to reach for something the other two tracks deliberately avoided, in a controlled, non-bombastic dose, specifically because "reads as combat" was the entire signal from the playtest and brass punctuation is a legible, efficient way to earn that without swelling into a triumphant fanfare.
- **Tense tremolo string bed** underneath, replacing the exploration loop's plucked lightness and the trial's held warm pad — for alert, slightly on-edge energy rather than either calm or dread.

**What this track must not become:** no ascending "magical capability" motif (that identity belongs to exploration and stays reserved for it); no unhurried, tested-by-an-intelligence pacing (that belongs to the Invigilator trial specifically); no full-orchestra bombast or a triumphant resolving cadence that makes a wave feel conquered — regular waves are meant to resolve quickly and often, not read as a AAA action-game climax. If it sounds like it could underscore either of the other two tracks' scenes, it hasn't done its job.

**Length/loop:** 20-35 seconds, looping cleanly with no dead air at the seam. Regular waves are the GDD's fast/frequent tier by design (Spam-Waves-vs-Tactical-Trials) and this cue starts and stops many times across a single level, sometimes cut short mid-phrase when a wave clears early — it needs to be short enough that starting, stopping, and restarting never feels like interrupting something that was building toward a payoff. This is deliberately much shorter than the trial's 45-75s loop (that track scores a single sustained multi-minute encounter the player returns to across retries; this one scores a fast-turnover wave).

**Status:** brief only, per Lorena's own AGENT.md — not separately Heckler-gated (the resulting track is, once Composer generates against this). Handed to Composer for issue #142's generation stage.

**Not touched, per my own contract:** `docs/agents/ana/backlog.md`, the existing `opening-experience-brief.md` (unchanged — this is a new, separate brief, not an amendment; the exploration direction it documents is explicitly being kept, not revised), and `lore-premise.md` (no new named fact needed — this brief only restates the three already-established archetype identities at their ordinary-wave scale, it doesn't add to them).

## 2026-08-10 — Issue #157: GDD synchronization for Side-Pocket Lore Encounters

Loomwright shipped the Side-Pocket Lore Encounters production feature (my four already-authored item lines — Blank Waymark, Murmur-Glass Vial, Root-Cellar Key, Chalked Ledger Scrap — reused verbatim, no new prose written). My job was closing the ticket's own GDD-synchronization user stories (39-41) against `docs/game/the-last-spellroad-design.md`, grounded in the actual shipped code rather than the ticket's description of it.

**Gameplay Loop:** added a paragraph naming the reactive off-route rune, the post-final-wave Explore/Continue pause, the forward-only skip semantics (Continue leaves the encounter available on a later expedition via its persisted lore flag, not a permanent loss), the quiet re-visit behavior, and Level 5's explicit absence of a fifth pocket. No prior text was stale here — the loop simply had no exploration beat described before this.

**Hexcoin:** corrected a now-stale sentence ("Hexcoin is a currency the mage earns from combat" -> earned from combat *and* Side-Pocket Lore Encounters) and, in the directly adjacent ledger-fiction paragraph, "a running ledger of every kill" -> "every kill and lore discovery" (this second one was the "directly adjacent stale statement" the ticket calls out to fix while already in this section). Added a paragraph naming the second income source: 2 Hexcoin/encounter, 8 total, persistent/non-farmable, explicitly deferring to Pato's Hexcoin Template as the numeric authority.

**Save Data And Persistence:** added a paragraph making explicit that an Explore action is one of the existing state-changing save events (not a new save path), rides the existing `markLevelStart()`/`rollbackToLevelStart()` retry-floor mechanism, and is idempotent against a stale/duplicate action.

**Vertical-slice scope / open design questions:** grepped the whole document for lore/exploration/density/undecided/TBD hedge language before editing — found none remaining to correct; #68/#70/#160's resolutions were already reflected elsewhere in the doc's history. Made no edit here rather than inventing one, per my own scope-discipline instruction to keep unrelated cleanup out.

No code files touched (`git diff --stat` confirms only the GDD file is mine in this diff). Heckler's independent pass (see `heckler/log.md`) spot-checked two of my specific factual claims ("the rune renders quietly," the fee-affordability-math claim) against the real code and numbers and found both accurate, with one minor nuance noted (the 8-Hexcoin addition does nudge Pato's own template's stated income-range estimate upward by 8, which my prose doesn't call out numerically — a reference-file nuance, not a false GDD claim). See `loomwright/log.md`, `pato/log.md`, `heckler/log.md`, and `ana/backlog.md` (3.23), all 2026-08-10.

## 2026-08-12 — Issue #188: variation brief for the Level 1 exploration loop (2 sibling tracks)

Developer playtest (2026-08-12, issue #188): "its good the level 1 music i like it, but i think we need 2 more very similar with some variations, so the loop of the song gets to bother it, so it changes every now and then based on the current one." Clarified on the same issue: "due to when i finish a level and select explore i dont hear any music, so it would be nice to hear the explore theme here."

**This is deliberately not a new brief.** The exploration identity is already briefed and approved — `docs/agents/_reference/opening-experience-brief.md`, "Narrative and musical direction," realized as `opening-magic-deterministic-original` (Composer's 2026-08-07 and 2026-08-07 (2) entries). The developer likes that track as-is and is asking for repetition relief, not a re-brief. So what follows is an **amendment scoped to two sibling tracks**, written against the existing brief rather than replacing it: every parameter the original brief pins (or that Composer interpretively pinned and shipped) stays pinned, and only a bounded set of variation axes is opened. `opening-experience-brief.md` itself is untouched, per my own contract — the original direction is still the direction.

**Target: the Level 1-4 non-combat interlude** — the quiet window between waves inside a level, which is where the Side-Pocket Explore/Continue prompt (issue #157) sits and where the developer noticed the silence. Explicitly **not** the Level 5 Director trial (the boss theme owns that space entirely, 4.9's brief) and **not** active ordinary combat (the #142 combat cue owns that). Three tracks — the existing original plus the two briefed here — rotate in that window so the same 45s loop is never heard twice back to back.

**Locked, not open to variation** (these are what make the two new tracks read as the *same* music, which is the developer's own framing — "very similar with some variations"):
- **Tempo: 128 BPM, straight 4/4.** Identical to the original. A tempo change is the single most audible way to make a listener hear "a different song," which is exactly the wrong outcome here.
- **Key: D major.** Identical, including the original's own reasoning that D major's parallel minor is a one-step darkening path for later arrangements ("remain transformable... without losing its identity").
- **Length: ~45 seconds, clean loop, no dead air at the seam.** Matching sibling lengths matters more than usual here: the three tracks are swapped in and out of the same slot, and a listener notices a length mismatch across a rotation faster than they notice a melodic one.
- **Instrumentation family: celesta melody, plucked-string ostinato, light hand percussion, sparse bright-bell accent.** Same four voices, same roles. No new instrument enters the family; no existing one leaves. The original brief's "avoid epic-orchestral bombast, dense synthetic spellstorm textures" still binds, and so does its ban on a triumphant resolving cadence — every sibling's phrase must still end unresolved (on V, not I) so the loop never lands as a finale.
- **Mood: magical capability and forward momentum, not loneliness.** Unchanged. A sibling that reads as melancholy, tense, or triumphant has failed even if every number above matches.

**Open for variation** (this is the whole of what's open — anything not on this list should stay as the original has it):
1. **The chord path through the 8-bar phrase.** The original walks I-V-vi-IV-I-V-IV-V. A sibling should take a recognisably different route through the same diatonic neighbourhood (the ii chord is available and unused by the original), landing on V at the end of the phrase exactly as the original does.
2. **The melodic ornament, not the motif.** The ascending magical motif is the identity and stays: a sibling still climbs. What changes is what it does at the top and on the way down — a turn, a neighbour tone, a longer held arrival, a different tail. A listener should recognise the gesture and not the phrase.
3. **Rhythmic weight of the percussion accent.** The original leans on beats 1 and 3. Moving the light accent elsewhere (a backbeat feel, a shifted downbeat pair) changes the walk without changing the pulse.
4. **The bright-bell flourish's shape.** The original marks each phrase head with a short ascending figure. Descending, or longer, or differently spaced, is fair game — it stays sparse and stays at the phrase head.
5. **The ostinato's figure within the chord.** Same instrument, same density, different path through the chord tones.

**Two siblings, deliberately different from each other and not just from the original** — a rotation of three where two of them are near-identical is a rotation of two:
- **Sibling A — brighter and busier than the original.** More ornament per bar, the melody reaching higher at the top of its climb, the bell figure inverted. This is the "the road is going well" face of the same theme.
- **Sibling B — more spacious than the original.** Fewer, longer melodic notes; the climb takes its time and arrives instead of hurrying on; a backbeat-leaning percussion feel. This is the "stop and look at something off the road" face of the same theme — which, given the Side-Pocket prompt is literally the moment a player stops to look at something off the road, is the one of the three most likely to be underneath that prompt at any given time.

**What either sibling must not become:** a track a listener would name as a different piece of music. The concrete test — and the one I'd like Heckler to actually apply rather than paraphrase — is that a player who has heard the original should, on hearing a sibling, register "this bit sounds different" and not "the music changed." If a sibling would work equally well in a scene the original wouldn't, it has drifted too far and should be pulled back toward the original, not shipped as-is.

**Status:** brief only, per my own AGENT.md — a brief isn't separately Heckler-gated, the resulting tracks are. Handed to Composer for issue #188's generation stage.

**Not touched, per my own contract:** `docs/agents/_reference/opening-experience-brief.md` (the original direction stands, unamended — this log entry is the amendment's home, so a future reader of that file isn't misled into thinking it now describes three tracks), `docs/agents/ana/backlog.md`, and `lore-premise.md` (no new named fact — nothing here names a person, place, or thing that didn't already exist).
