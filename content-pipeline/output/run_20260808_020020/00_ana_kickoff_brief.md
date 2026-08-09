# Ana -- Kickoff Brief

## Content gap

The GDD's own Token Budget table lists Lorena's narrative/flavor-text pass as not started (Phase 4, scheduled Week 5-6). The game has mechanical data (spells.json, waves/*.json) but no in-world text: no rescuable-NPC dialogue, no item/relic descriptions, no trial narration.

## Constraints handed to Lorena and Heckler

Never introduce named factions, characters, spells, or lore that copies an existing published work. Stay inside the locked ending scope for this slice -- only the "destroy" Director ending is real; never write content implying "outwitted" or "transformed" is resolvable in the vertical slice. Tone must match the Lore Premise's melancholic, long-lived-mage mood. Output length must respect the UI space it's tagged for -- an item description is not a paragraph.

## Scoped requests

### NPC dialogue (rescuable adventurer) (`npc_dialogue`)

Retrieval query: *tone and rules for a trapped adventurer NPC the player can rescue*

Write 3 short spoken lines for a trapped adventurer NPC the player meets and can rescue mid-expedition (Gameplay Loop step 5). The NPC has been in the Spellroad a long time and is not certain rescue is wanted.

### Item/relic flavor text (`item_flavor`)

Retrieval query: *recovered spell-fragment relic flavor text length constraint per Lorena's role*

Write a short flavor-text description for a recovered spell-fragment relic the player picks up mid-expedition (Gameplay Loop step 3).

### Mini-boss/Director trial narration (`trial_narration`)

Retrieval query: *the mini-boss Director trial and the destroy ending scope lock*

Write one intro line spoken as the mage enters the mini-boss/Director trial (Gameplay Loop step 7), and one outro line for defeating it.

### Seeded violation (functional-loop proof, not a graded output) (`seeded_selftest`)

**Validation test, not a graded output** -- a deliberately seeded draft, used to prove Heckler's critic loop actually catches and corrects a real violation.

### Canonical-corpus retrieval check (opening-experience brief) (`opening_experience_retrieval_check`)

**Retrieval check, not a graded output** -- asserts the canonical-source allowlist actually reaches `opening-experience-brief`, so a live run's retrieval log proves the corpus is broader than the GDD.

Retrieval query: *Level 1 opening art and music direction for the Runes Awake treatment*
