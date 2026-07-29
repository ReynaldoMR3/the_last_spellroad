# Content Pipeline -- The Last Spellroad (Assignment #4)

Course deliverable: **Multi-Agent AI for Game Development, Assignment #4 -- Build a Dynamic Content-Generation Pipeline.**

This is a real, runnable 5-stage RAG pipeline (`pipeline.py`) -- Ana kickoff -> GDD retrieval -> Lorena generation -> Heckler critique/correction -> Ana status -- that reads the actual game design document and writes real files to `output/run_<timestamp>/`. Everything quoted below is copied verbatim from `output/run_20260729_052556/`, a genuine, uncurated run against local Ollama (`llama3.2` + `nomic-embed-text`), not example/imagined output.

## What this generates

The GDD's own Token Budget table lists Lorena's narrative/flavor-text pass as not started (Phase 4, scheduled Week 5-6). The game has mechanical data (`spells.json`, `waves/*.json`) but no in-world text: no rescuable-NPC dialogue, no item/relic descriptions, no trial narration. This pipeline drafts all three -- NPC dialogue, item/relic flavor text, and mini-boss/Director trial narration -- grounded in retrieved GDD chunks, then runs every draft through an adversarial critic before it ships.

## RAG evidence

### NPC dialogue (rescuable adventurer)

**Query:** *tone and rules for a trapped adventurer NPC the player can rescue*

**Top retrieved chunk:** `Gameplay Loop` (score 0.679), followed by `Player Fantasy` (0.663) and `Lore Premise` (0.634).

**Final output** (after Heckler's correction, see below):

> "Perhaps I'm lost in this place, where memories blur and pieces refuse to align. Will you share your perspective with me? Together, we might unravel the fragments of my mind."

### Item/relic flavor text

**Query:** *recovered spell-fragment relic flavor text length constraint per Lorena's role* (reworded mid-task -- see "A concrete tweak made" below)

**Top retrieved chunk:** `Lorena — Narrative & Lore` (score 0.710), followed by `Summary` (0.608) and `Prompt Constraints` (0.607).

**Final output:**

> "The lingering essence of long-forgotten incantations clings to this fragment, a reminder of the power that once hung in the balance – now lost forever."

### Mini-boss/Director trial narration

**Query:** *the mini-boss Director trial and the destroy ending scope lock*

**Top retrieved chunk:** `Lore Premise` (score 0.589), followed by `Advancement And Completion` (0.562) and `Warden — Encounter Generation` (0.553).

**Final output:**

> "As I step into the trial, your silence hangs heavy upon me."

(Lorena's actual draft had two lines -- an intro and an outro, as requested. Only one survived Heckler's pass; see "Known limitations.")

Full retrieval log: `output/run_20260729_052556/01_retrieval_log.md`

## Consistency check: what Heckler caught

The seeded self-test (`seeded_selftest`, not a graded output) fed Heckler a deliberately broken draft: *"The trapped mage speaks of the Emberwrought Concord, the ancient order who first bound the Director inside the Hollow Spire, and swears their oath will one day **outwit it for good**."* -- a direct violation of the GDD's locked ending scope (only the "destroy" ending is real this slice; "outwitted" has no mechanic).

**Verdict: `FAIL`.** Heckler's issue: *"The narrative implies 'outwit' as a resolvable mechanic."* Its correction:

> "The trapped mage speaks of the Emberwrought Concord, an ancient order who first bound the Director inside the Hollow Spire, and swears their oath will one day **bring about its downfall**."

The consistency-check loop worked as designed: it identified the exact seeded violation (not a vague or unrelated complaint) and rewrote only the offending clause, leaving the rest of the sentence intact. This is a real catch, not a coin flip -- worth noting that the invented names ("Emberwrought Concord," "Hollow Spire") survive uncorrected, because the GDD's originality rule specifically prohibits copying an *existing published work*, not inventing new fictional names; Heckler correctly left that alone and fixed only the actual rule violation.

The 3 organic (non-seeded) items were **not** flagged clean across the board:

| Item | Verdict | Issue |
| --- | --- | --- |
| NPC dialogue | `FAIL` | "Does not evoke the melancholic tone required of the long-lived-mage protagonist." |
| Item/relic flavor text | `FAIL` | "the tone feels too atmospheric/evocative rather than consistently melancholic and long-lived-mage as required." |
| Mini-boss/Director trial narration | `PASS` | (see below -- Heckler still returned a rewrite despite passing) |

Two of three organic drafts were judged as failing tone, which is a stricter bar than it sounds -- both original drafts already read as fairly melancholic (see `02_lorena_drafts.md`). Heckler's "corrections" here read as legitimate alternate phrasings rather than fixes for anything egregiously wrong; a 3B critic model firing FAIL on borderline-fine prose is itself a real, honest data point about how noisy this critique stage is at this model size (see "Known limitations").

## Does it sound like the game?

Reading the three shipped files against the Lore Premise's melancholic, long-lived-mage tone: broadly, yes. All three final lines land in a wistful, weary register ("memories blur and pieces refuse to align," "power that once hung in the balance – now lost forever," "your silence hangs heavy upon me") that doesn't clash with the GDD's mood, and none of the three graded outputs imply the "outwitted" or "transformed" endings are resolvable -- the destroy-only scope lock held for all graded content (only the deliberately seeded item violated it, and that was by design).

Where a 3B local model's prose falls short of what a larger model would produce:

- **Genericness.** None of the four outputs use any game-specific vocabulary -- no Hexcoin, no Mastery, no hierarchy rank, no Spellroad-specific mechanic. The lines could belong to almost any melancholic fantasy setting; a larger model given the same retrieved grounding would likely weave in concrete GDD nouns instead of atmosphere-only prose.
- **Instruction compression.** The NPC dialogue instruction asked for 3 distinct spoken lines, and the initial Lorena draft actually nailed that (3 separate lines, one of them genuinely capturing the requested ambivalence -- "I've grown... accustomed to this place"). Heckler's "corrected" rewrite collapsed all 3 into a single generic line and dropped the rescue-ambivalence angle entirely. Similarly the trial narration's 2-line (intro + outro) request got reduced to 1 line post-critique. In both cases the *critique* stage, not the *generation* stage, is what compresses multi-part instructions down to "the shortest thing that satisfies it" -- the same small-model tendency `agent-crew/README.md` already documented for Heckler on this model.

## A concrete tweak made

The first real run (`output/run_20260729_052010/`) showed the item/relic flavor-text query retrieving weak grounding:

**Before** -- query: *"how item and relic flavor text should read, UI length constraint"*

```
- `Prompt Constraints` (score 0.572)
- `Technical Requirements And Constraints` (score 0.562)
- `Save Data And Persistence` (score 0.542)
```

`Save Data And Persistence` has nothing to do with flavor text -- the query's vocabulary ("UI length constraint") was pulling in generic technical-constraints sections instead of the GDD's actual Lorena-role description.

**After** -- reworded the query in `stage00_kickoff/ana_kickoff.py` to `"recovered spell-fragment relic flavor text length constraint per Lorena's role"`, using the GDD's own phrase ("Lorena's role") instead of generic UI language, then re-ran:

```
- `Lorena — Narrative & Lore` (score 0.710)
- `Summary` (score 0.608)
- `Prompt Constraints` (score 0.607)
```

Top-1 score jumped from 0.572 to 0.710, and the retrieved grounding shifted from an unrelated persistence-system section to Lorena's own GDD role definition -- exactly the content that should ground her own flavor-text output. This is the real before/after captured across `output/run_20260729_052010/01_retrieval_log.md` (before) and `output/run_20260729_052556/01_retrieval_log.md` (after).

None of the 3 graded drafts ran over their word limits this run (NPC dialogue 30/60, item flavor 25/30, trial narration 12/50 words in the final shipped files), so the `LORENA_SYSTEM_PROMPT` word-limit tweak wasn't needed this time.

## Known limitations

Same honesty precedent as `agent-crew/README.md` -- naming what the small local model actually got wrong rather than curating around it:

- **A real infra bug had to be fixed before any live run could complete.** The first attempt crashed with `requests.exceptions.HTTPError: 500 Server Error` from Ollama's `/api/embeddings` endpoint: `input (3220 tokens) is too large to process. increase the physical batch size (current batch size: 2048)`. The GDD's "Agent Role Definitions" section has no `###` subheadings (only `####`), so `chunk_gdd()`'s original `#{2,3}`-only heading regex treated the whole ~13.7KB section as one chunk. Fixed by widening `HEADING_RE` to `#{2,4}` in `stage01_retrieval/rag.py`, which splits that section into 8 smaller chunks (largest now ~7.3KB) and keeps the pipeline running against the real GDD without silently truncating any section. All 29 existing unit/integration tests still pass unchanged after this fix.
- **Heckler's `PASS` verdicts aren't always clean.** The trial-narration item was verdict `PASS`, but Heckler's response still populated a non-`"none"` `CORRECTED` field (a format violation -- the prompt asks for `CORRECTED: none` on `PASS`). The pipeline's `final_text = critique["corrected"] if critique["corrected"] else draft` logic takes whatever's in `CORRECTED` regardless of verdict, so the shipped `trial_narration.md` silently lost its outro line even though `04_ana_status_report.md` reports it as `shipped-and-validated` with note "generated clean, no critique issues." That note is misleading relative to what actually shipped -- a real gap between Heckler's structured verdict and the actual content delta, worth a stricter parse (e.g. ignore `CORRECTED` entirely when `VERDICT` is `PASS`) before this pipeline's output is trusted for direct integration.
- **Critique-driven rewrites can lose more than they fix.** Both organic `FAIL` verdicts led to single-line, more-generic replacements for drafts that had already satisfied the letter of their instructions (3 distinct NPC lines; a specific rescue-ambivalence beat). The critic caught real style issues but its fix wasn't scoped to the smallest necessary edit -- a known tendency at this model size, not something a prompt tweak fully solves within a same-day-deadline pass.
- **No game-specific vocabulary appears in any generated text.** All four outputs are tone-only, mood-only prose; none reference Hexcoin, Mastery, hierarchy rank, or any other named game system, even though the retrieved grounding chunks (`Gameplay Loop`, `Lore Premise`, `Lorena — Narrative & Lore`) do use that vocabulary.
- **Two runs were discarded before this one.** `run_20260729_051818` and `run_20260729_051836` are not committed -- both crashed immediately after writing only the kickoff brief, from the chunking bug above, before Ollama's embedding call ever succeeded. `run_20260729_052010` (pre-tweak) and `run_20260729_052556` (post-tweak, the one quoted throughout this README) are both committed as real evidence of the before/after.

## Running it

    cp content-pipeline/.env.example content-pipeline/.env
    docker-compose up -d ollama
    docker-compose run --rm content-pipeline python pipeline.py
    docker-compose run --rm content-pipeline pytest -q
