# Dynamic Content Pipeline (Course Assignment #4) — Design

**Status:** Approved, ready for implementation.
**Branch:** `content-pipeline-assignment-04`

## Context

Course Assignment #4 ("Dynamic Content Pipeline") requires a RAG pipeline that reads the student's GDD as its knowledge base and generates content the game actually needs, with a critic-agent consistency-check loop shown (not just claimed) catching and correcting at least one lore break or tone drift. Rubric: Game-Anchored Source (2.0), Content Fit (2.5), RAG Implementation (2.0), Consistency Checking (2.0), Voice Judgment (1.5). Due 2026-07-30, 11:59 ET.

Per the repo-boundary convention (`multi-agent-ai-in-game-development/docs/submissions/context.md`), code-based assignments (#3 onward) get a short pointer file in the course repo; the real deliverable lives in this game repo. This mirrors Assignment #3's `agent-crew/`.

**The named content gap:** the GDD's own Token Budget table (`docs/game/the-last-spellroad-design.md`, "Token Budget And Projections") lists Lorena's narrative/flavor-text pass as **not started** — scheduled for Phase 4, no content shipped yet. The game has mechanical data (`src/data/spells/spells.json`, `src/data/waves/*.json`) but no in-world text: no rescuable-NPC dialogue, no item/relic descriptions, no trial narration. This is a real, pre-existing gap, not a contrived one.

## The three content types (Content Fit)

All three are named directly in the GDD as Lorena's job (Lore Premise §261, Agent Role Definitions §369) and are currently unwritten:

1. **NPC dialogue** — 3 lines for trapped-adventurer rescue encounters (Gameplay Loop step 5).
2. **Item/relic flavor text** — 3 short descriptions, UI-length-bound (not a paragraph).
3. **Trial narration** — intro/outro lines for the mini-boss/Director trial (the one ending built for the vertical slice: "destroy").

## Architecture

Runnable code lives at `the_last_spellroad/content-pipeline/` (top-level, parallel to `agent-crew/` — consistent with this repo's existing convention that runnable deliverables live at repo root while `docs/agents/` holds contracts-only). Internally structured as ICM numbered stage folders, one job per stage, each with a `CONTEXT.md` Inputs/Process/Outputs contract:

```
content-pipeline/
  CONTEXT.md                    # Layer 1: pipeline purpose, stage order, how to run it
  00-kickoff/
    CONTEXT.md
    ana_kickoff.py               # Ana: names the content gap, briefs Lorena + Heckler with scoped constraints
  01-retrieval/
    CONTEXT.md
    rag.py                       # chunk GDD, embed (nomic-embed-text), retrieve top-k per query
  02-generation/
    CONTEXT.md
    lorena_generate.py           # Lorena drafts, using Ana's brief + retrieved chunks
  03-critique/
    CONTEXT.md
    heckler_critique.py          # Heckler critiques + corrects, against Ana's brief + retrieved chunks
  04-status/
    CONTEXT.md
    ana_status.py                # Ana's closing report: what shipped, what Heckler caught/corrected
  pipeline.py                    # thin runner: 00 -> 01 -> 02 -> 03 -> 04, in order
  requirements.txt
  Dockerfile                     # reuses the existing `ollama` service from docker-compose.yml (Assignment #3)
  output/run_<timestamp>/
    00_ana_kickoff_brief.md
    01_retrieval_log.md          # query -> retrieved chunk -> output, per item (RAG Implementation evidence)
    02_lorena_drafts.md
    03_heckler_critique.md       # organic pass + seeded self-test, before/after for anything corrected
    04_ana_status_report.md
    npc_dialogue.md
    item_flavor.md
    trial_narration.md
  README.md                      # graded ReadMe deliverable
```

## Personas (reusing the existing roster, not generic roles)

- **Ana (orchestrator)** — brackets the run exactly as she brackets `agent-crew` runs: `00-kickoff` writes a scoped brief naming the content gap and handing Lorena/Heckler their constraints (pulled verbatim from `docs/agents/lorena/AGENT.md` and `docs/agents/heckler/AGENT.md`); `04-status` is her closing report, synthesizing what Lorena produced and what Heckler caught, using the same three-state model (`shipped-and-validated` / `blocked-with-reason` / `in-progress-with-owner`) as her other work.
- **Lorena (generator)** — drafts each of the 3 content types. Prompt constraints come straight from her `AGENT.md`: no new named factions/characters/spells, melancholic long-lived-mage tone, only the "destroy" ending is resolvable, output length matches the UI slot. Retrieved GDD chunks are injected as grounding context.
- **Heckler (critic)** — validates Lorena's output against the same constraints and the same retrieved chunks, per her existing "extends to Lorena's narrative/dialogue output" scope. Not self-validated by Lorena, matching the GDD's generator/validator split exactly.

## RAG mechanics (RAG Implementation criterion)

- GDD chunked by `##`/`###` heading (matches the doc's own structure, ~20-30 chunks).
- Each chunk embedded once via Ollama's `nomic-embed-text` (pulled into the existing `ollama` container alongside `llama3.2`), cached to a local JSON so re-runs don't re-embed.
- Each of the 3 content requests becomes a natural-language query (e.g. *"tone and rules for trapped NPC dialogue"*), embedded the same way, top-3 chunks retrieved by cosine similarity.
- `01_retrieval_log.md` shows query -> retrieved chunk text -> final output for all 3 items, side by side — the rubric's explicit demonstration requirement.

## Consistency-check loop (Consistency Checking criterion)

Two demonstration paths, both included so the loop's functionality doesn't depend on luck with a small (3B) local model:

1. **Organic pass** — real critique of the 3 actual generated items, reported honestly whether Heckler flagged anything or passed clean (same honesty precedent as `agent-crew/README.md`'s "Known limitations" section).
2. **Guaranteed functional-loop proof** — one deliberately seeded draft with an injected violation (e.g. invents a new named faction, or breaks the UI-length constraint) run through Heckler as an explicit self-test. Clearly labeled in `03_heckler_critique.md` as a validation test, not one of the 3 graded outputs. Satisfies the assignment's "ensure your consistency check loop is fully functional before submission" instruction and the rubric's "correction is shown, not just claimed" bar unconditionally.

## README (Voice Judgment criterion)

Covers: what was generated, side-by-side retrieval evidence pointer, self-assessment of whether the output sounds like the game, what Heckler caught (organic + seeded), and at least one concrete prompt/retrieval tweak made along the way (e.g. adjusting query wording after a bad initial retrieval, or tightening Lorena's length constraint after an overlong first draft).

## Repo placement

- `the_last_spellroad/content-pipeline/` — the real deliverable (this design).
- `multi-agent-ai-in-game-development/docs/submissions/assignment-04-content-pipeline.md` — short pointer file, same convention as Assignment #3's pointer.

## Out of scope

- Promoting any generated content into shipped game data (`src/data/`) — that's a separate, deliberate developer decision, same precedent as `agent-crew`'s output.
- A general-purpose vector database — an in-memory/JSON-cached embedding store is sufficient at this corpus size (~20-30 chunks).
- Re-running or fixing the pre-existing uncommitted Assignment #3 pointer-file work sitting in the course repo's `assignment-02-token-budget-timeline` branch — flagged to the developer separately, not part of this design.
