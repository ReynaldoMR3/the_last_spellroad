# Content Pipeline -- The Last Spellroad (Assignment #4)

Course deliverable: **Multi-Agent AI for Game Development, Assignment #4 -- Build a Dynamic Content-Generation Pipeline.**

This is a real, runnable 5-stage RAG pipeline (`pipeline.py`) -- Ana kickoff -> GDD retrieval -> Lorena generation -> Heckler critique/correction -> Ana status -- that reads the actual game design document and writes real files to `output/run_<timestamp>/`. Everything quoted below is copied verbatim from `output/run_20260729_054539/`, a genuine, uncurated run against local Ollama (`llama3.2` + `nomic-embed-text`), not example/imagined output. This run was taken *after* a final whole-branch code review found and fixed two real bugs (see "Known limitations" below for what changed and why this run replaces the previously-committed one).

## What this generates

The GDD's own Token Budget table lists Lorena's narrative/flavor-text pass as not started (Phase 4, scheduled Week 5-6). The game has mechanical data (`spells.json`, `waves/*.json`) but no in-world text: no rescuable-NPC dialogue, no item/relic descriptions, no trial narration. This pipeline drafts all three -- NPC dialogue, item/relic flavor text, and mini-boss/Director trial narration -- grounded in retrieved GDD chunks, then runs every draft through an adversarial critic before it ships.

## RAG evidence

### NPC dialogue (rescuable adventurer)

**Query:** *tone and rules for a trapped adventurer NPC the player can rescue*

**Top retrieved chunk:** `Gameplay Loop` (score 0.679), followed by `Player Fantasy` (0.663) and `Lore Premise` (0.634).

**Retrieved chunk text (excerpt, as captured in `run_20260729_054539/01_retrieval_log.md`):**

> "## Gameplay Loop  1. Enter a narrow Spellroad expedition. 2. Fight tile-based enemy waves. 3. Collect spell fragments, relics, or knowledge. 4. Choose from generated spell upgrades. 5. Meet or rescue trapped adventurers. 6. Advance to a harder road segment. 7. Face a Director-controlled boss or tria..."

*(This run predates a later fix that stops excerpts from repeating the chunk's own heading line -- current code produces heading-free excerpts; this quote is frozen evidence from the run it's copied from.)*

**Final output** (after Heckler's correction, see below):

> "Time's a river, mage. I've seen so many like you come and go, their dreams worn thin by the road's endless stretch. Some try to escape, but comfort is what they find – the silence, the stillness. Me? I've grown weary of it all. Are you sure you want me free?"

### Item/relic flavor text

**Query:** *recovered spell-fragment relic flavor text length constraint per Lorena's role* (reworded during Task 10 -- see prior review history in `.superpowers/sdd/`)

**Top retrieved chunk:** `Lorena — Narrative & Lore` (score 0.710), followed by `Summary` (0.608) and `Prompt Constraints` (0.607).

**Retrieved chunk text (excerpt):**

> "#### Lorena — Narrative & Lore  Keeps the Lore Premise, companion authenticity, and ending-path scope (destroy, outwit, or transform the Director) consistent across every other agent's output, and writes flavor text and dialogue."

**Final output:**

> "A shard of forgotten incantation, bound to my will, yet darkened by the shadows that shroud this forsaken Spellroad."

### Mini-boss/Director trial narration

**Query:** *the mini-boss Director trial and the destroy ending scope lock*

**Top retrieved chunk:** `Lore Premise` (score 0.589), followed by `Advancement And Completion` (0.562) and `Warden — Encounter Generation` (0.553).

**Retrieved chunk text (excerpt):**

> "## Lore Premise  Ancient humans discovered a form of artificial general intelligence through spellcraft, sacred geometry, and machine-like magical reasoning. Their creation became known through its behavior rather than a name: the Director.  The Director turned the Spellroad into an endless, beautif..."

**Final output:**

> "As I stand before the Director's eternal gate, a whispered promise echoes through the Spellroad's winding passages: "This is but a single exit from an unending road.""

(Lorena's actual draft had two lines -- an intro and an outro, as requested. Heckler's FAIL-verdict correction collapsed the intro line but dropped the outro; see "Known limitations" for why this is a different, still-open issue from the PASS-verdict content-loss bug that was fixed this pass.)

Full retrieval log, now including retrieved-chunk-text excerpts for every item: `output/run_20260729_054539/01_retrieval_log.md`. The same excerpts are also persisted in `bundle.json`'s `results[].retrieved[].text_excerpt`, so the RAG evidence quoted above is programmatically verifiable, not hand-copied.

## Consistency check: what Heckler caught

The seeded self-test (`seeded_selftest`, not a graded output) fed Heckler a deliberately broken draft: *"The trapped mage speaks of the Emberwrought Concord, the ancient order who first bound the Director inside the Hollow Spire, and swears their oath will one day **outwit it for good**."* -- a direct violation of the GDD's locked ending scope (only the "destroy" ending is real this slice; "outwitted" has no mechanic).

**Verdict: `FAIL`.** Heckler's issue this run: *"The named faction 'Emberwrought' and its associated lore is copied from an existing published work."* Its correction:

> "The trapped mage speaks of a long-lost order who first bound the Director inside the Hollow Spire, and swears their oath will one day bring about a reckoning."

The loop caught a violation and corrected the draft, so the consistency-check mechanism is confirmed functional -- but this run's stated *issue* text is itself a small data point worth being honest about: it flags "Emberwrought" as copied from an existing published work, when the GDD's actual rule (and the prior committed run's Heckler pass) is narrower -- inventing new fictional names is fine, only copying a *real* published work's names is not. The critic still fixed the actual outwit-implication problem in its rewrite ("bring about a reckoning" instead of "outwit it for good"), so the functional catch is real even though the stated reasoning drifted. This is exactly the kind of small-model critique noise this pipeline's Known Limitations section already calls out.

The 3 organic (non-seeded) items were **not** flagged clean across the board this run either -- all three came back `FAIL`:

| Item | Verdict | Issue |
| --- | --- | --- |
| NPC dialogue | `FAIL` | "The dialogue does not capture the melancholic tone required by the game." |
| Item/relic flavor text | `FAIL` | "The draft implies 'haunt' is a fitting descriptor for the shadows on the Spellroad, which could suggest a narrative resolution where the mage overcomes or resolves with the shadows." |
| Mini-boss/Director trial narration | `FAIL` | "The phrase 'endless labyrinth' is too explicit and closely resembles existing published works (e.g., J.R.R. Tolkien's 'The Lord of the Rings')." |

None of the four items came back `PASS` this run (this is expected non-determinism against a small local model -- see "A note on this run's coverage of the PASS-verdict fix" below). Every `FAIL` verdict here came with a real, substantive `CORRECTED` field, and `final_text` correctly used it in every case -- confirmed by the shipped `.md` files matching Heckler's `CORRECTED` text, not Lorena's original draft.

## Does it sound like the game?

Reading the three shipped files against the Lore Premise's melancholic, long-lived-mage tone: broadly, yes. All three final lines land in a wistful, weary register ("their dreams worn thin by the road's endless stretch," "darkened by the shadows that shroud this forsaken Spellroad," "a whispered promise echoes through the Spellroad's winding passages") that doesn't clash with the GDD's mood, and none of the three graded outputs imply the "outwitted" or "transformed" endings are resolvable -- the destroy-only scope lock held for all graded content (only the deliberately seeded item violated it, and that was by design).

Where a 3B local model's prose falls short of what a larger model would produce:

- **Genericness.** None of the four outputs use any game-specific vocabulary -- no Hexcoin, no Mastery, no hierarchy rank, no Spellroad-specific mechanic. The lines could belong to almost any melancholic fantasy setting; a larger model given the same retrieved grounding would likely weave in concrete GDD nouns instead of atmosphere-only prose.
- **Instruction compression.** The trial narration instruction asked for 2 lines (an intro and an outro); Lorena's draft actually delivered both, but Heckler's `FAIL` correction collapsed them to a single intro line and dropped the outro entirely. The same pattern showed up in the previously-committed run too (there it happened to be a `PASS` verdict, which is what surfaced the separate content-loss bug described below). The *critique* stage, not the *generation* stage, is what compresses multi-part instructions down to "the shortest thing that satisfies it" -- the same small-model tendency `agent-crew/README.md` already documented for Heckler on this model.

None of the 3 graded drafts ran over their word limits this run (NPC dialogue 51/60, item flavor 19/30, trial narration 27/50 words in the final shipped files).

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

Top-1 score jumped from 0.572 to 0.710, and the retrieved grounding shifted from an unrelated persistence-system section to Lorena's own GDD role definition -- exactly the content that should ground her own flavor-text output. This is the real before/after captured across `output/run_20260729_052010/01_retrieval_log.md` (before) and `output/run_20260729_052556/01_retrieval_log.md` (after) -- both restored and committed as evidence, not asserted from memory.

## Re-verification run (2026-08-06)

Re-checked before finalizing the course submission pointer, since "code that does not run receives 0 across all criteria" is the assignment's own stated bar. `pytest -q` caught a real regression first: the GDD's "Token Budget And Projections" section had grown to 10,039 chars with no `###`/`####` subheadings of its own -- past the 8,000-char safety budget `test_chunk_gdd_max_chunk_size_stays_under_embedder_budget` guards, which would have re-crashed a live run against Ollama's embedding endpoint the same way the original `#{2,3}` -> `#{2,4}` heading-widening fix was needed for. Fixed in `stage01_retrieval/rag.py`: `chunk_gdd` now paragraph-splits any section that's still oversized after heading-chunking into `(part N/M)` sub-chunks, re-prefixed with the section's own heading line. 33/33 tests pass.

A fresh live run followed (`output/run_20260807_022440/`), confirming the pipeline still runs end-to-end against real Ollama (`llama3.2` + `nomic-embed-text`) after that fix and after the GDD's continued growth since the original 2026-07-29 runs above. All 4 items (the 3 graded drafts plus the seeded violation) came back genuine `FAIL` verdicts with real, substantive corrections this run too -- e.g. the NPC dialogue correction trims Lorena's third dialogue paragraph and reworks the phrasing for tone, and the item-flavor correction replaces the flagged "whispers secrets" (an implied speaking entity) with "resonates with the silence." Comparing `02_lorena_drafts.md` (the actual pre-critique drafts) against `03_heckler_critique.md`'s `Corrected` fields confirms every correction is a real rewrite, not an echo of the draft.

The seeded violation's catch is functionally correct again (it strips both "Emberwrought Concord" and the "outwit it for good" ending-scope violation), but this run's stated reasoning adds a new, more specific confabulation worth flagging: Heckler's `Issue` claims "Emberwrought Concord" is copied from "an existing published work ('The Sundering', a popular fantasy novel by Peter McLean)" -- a fabricated, oddly precise citation for a name the pipeline invented as a seed. Same small-model critique-reasoning-drift pattern already documented below, now with a concrete example of the model inventing a source rather than just misapplying the rule.

## Known limitations

Same honesty precedent as `agent-crew/README.md` -- naming what the small local model actually got wrong rather than curating around it:

- **A real infra bug had to be fixed before any live run could complete (fixed, prior to this pass).** The first attempt crashed with `requests.exceptions.HTTPError: 500 Server Error` from Ollama's `/api/embeddings` endpoint: `input (3220 tokens) is too large to process. increase the physical batch size (current batch size: 2048)`. The GDD's "Agent Role Definitions" section has no `###` subheadings (only `####`), so `chunk_gdd()`'s original `#{2,3}`-only heading regex treated the whole ~13.7KB section as one chunk. Fixed by widening `HEADING_RE` to `#{2,4}` in `stage01_retrieval/rag.py`, which splits that section into 8 smaller chunks (largest now ~7.3KB). `chunk_gdd` still has no explicit max-chunk-size enforcement -- it relies entirely on the GDD's own heading structure to keep chunks small, which is now documented as a known assumption in the module docstring, and guarded by a regression test (`tests/test_rag.py::test_chunk_gdd_max_chunk_size_stays_under_embedder_budget`) that measures the real GDD's actual chunk sizes and fails fast if a future edit grows a chunk past an 8,000-character safety budget (~4.25 chars/token observed on this GDD's prose -- the original 3220-token crash was ~13.7KB, so 2048 tokens * ~4.25 chars/token ~= 8,700 chars is the real ceiling; the budget is set safely under that, not just under the original crash size), instead of crashing a live run.
- **A `PASS`-verdict content-loss bug was found and fixed this pass.** In the previously-committed `run_20260729_052556` (restored at `output/run_20260729_052556/`), the trial-narration item came back verdict `PASS`, but Heckler's raw response still populated a non-`"none"` `CORRECTED` field (a format violation of its own prompt contract, which asks for `CORRECTED: none` on `PASS`) -- see `output/run_20260729_052556/03_heckler_critique.md`, which shows `**Verdict:** PASS` alongside a real `Issue` and `Corrected` for that item. `pipeline.py`'s `final_text = critique["corrected"] if critique["corrected"] else draft` logic took whatever was in `CORRECTED` regardless of verdict, so the shipped `trial_narration.md` silently lost content even though `04_ana_status_report.md` reported it as `shipped-and-validated` with note "generated clean, no critique issues" -- a real gap between the structured verdict and the actual content delta. **Fix:** `heckler_critique.parse_critique_response` now forces `issue = None` and `corrected = None` whenever `verdict == "PASS"`, regardless of what the regexes captured, so a clean verdict can never silently carry stray corrected text into `final_text`. Covered by a new unit test (`tests/test_heckler_critique.py::test_parse_critique_response_pass_with_leftover_issue_and_corrected_is_normalized`) and a new integration test (`tests/test_pipeline_integration.py::test_run_pipeline_uses_corrected_text_on_fail_verdict`, which also asserts the PASS item's `final_text` equals its original `draft` unmodified).
    - **A note on this run's coverage of the fix:** none of the 4 items in *this specific* live run (`run_20260729_054539`) came back `PASS` (all 4 were genuine `FAIL` verdicts with real corrections), so the fixed code path isn't directly visible by diffing this run's output against the old one -- that's an honest non-determinism gap in live-run coverage, not evidence the fix doesn't work. The before/after is instead demonstrated by two committed artifacts: `output/run_20260729_052556/03_heckler_critique.md` (the bug, live -- `PASS` with leftover `Corrected` text) and the two tests named above (the fix, verified against the exact scenario the bug depended on).
- **Retrieval log now shows retrieved chunk text, not just headings+scores (fixed this pass).** `01_retrieval_log.md` previously listed only `` `heading` (score N.NNN) `` per retrieved chunk, which didn't demonstrate the actual RAG grounding text the model saw. `pipeline.py`'s retrieval-log section now includes a ~300-character excerpt of each retrieved chunk's text, and `bundle.json`'s `results[].retrieved[]` now persists the same heading/score/excerpt triples so the evidence in this README is traceable back to a machine-readable artifact, not just prose written by hand.
- **Critique-driven rewrites can lose more than they fix.** All 3 organic `FAIL` verdicts this run led to replacements for drafts that had already satisfied the letter of their instructions (the trial narration's 2-line intro+outro request got reduced to 1 line post-critique, same as in the previously-committed run). The critic catches real style/rule issues but its fix isn't always scoped to the smallest necessary edit -- a known tendency at this model size, not something a prompt tweak fully solves within a same-day-deadline pass.
- **Critique reasoning can drift even when the catch is functionally correct.** This run's seeded-violation catch is a good example: Heckler's stated issue ("Emberwrought... is copied from an existing published work") is inaccurate -- the GDD's actual originality rule prohibits copying a *real* published work, not inventing new fictional names -- but its rewrite still correctly removed the "outwit it for good" ending-scope violation the seed was designed to test. The functional loop worked; the model's explanation of *why* was imprecise. Worth knowing before trusting Heckler's `issue` text as a reliable audit trail on its own.
- **No game-specific vocabulary appears in any generated text.** All four outputs are tone-only, mood-only prose; none reference Hexcoin, Mastery, hierarchy rank, or any other named game system, even though the retrieved grounding chunks (`Gameplay Loop`, `Lore Premise`, `Lorena — Narrative & Lore`) do use that vocabulary.

## Running it

    cp content-pipeline/.env.example content-pipeline/.env
    docker-compose up -d ollama
    docker-compose run --rm content-pipeline python pipeline.py
    docker-compose run --rm content-pipeline pytest -q
