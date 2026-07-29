# Content Pipeline -- Context (Layer 1)

Course Assignment #4 (Dynamic Content Pipeline) deliverable. Generates
three content types The Last Spellroad needs -- NPC dialogue, item/relic
flavor text, mini-boss/Director trial narration -- grounded in the GDD via
retrieval, using the existing agent roster's Ana/Lorena/Heckler personas.
See `docs/superpowers/specs/2026-07-28-content-pipeline-assignment-04-design.md`
for the full design.

## Stage order

1. `stage00_kickoff/` -- Ana scopes the run (deterministic, no LLM call).
2. `stage01_retrieval/` -- chunk the GDD, embed, retrieve top-k per query.
3. `stage02_generation/` -- Lorena drafts each content item.
4. `stage03_critique/` -- Heckler critiques and corrects.
5. `stage04_status/` -- Ana's closing status report (deterministic).

`pipeline.py` runs all five stages in order and writes every stage's
output plus the graded content files to `output/run_<timestamp>/`.

## Running it

    cp content-pipeline/.env.example content-pipeline/.env   # required even empty
    docker-compose up -d ollama
    docker-compose run --rm content-pipeline python pipeline.py

## Running the tests

    docker-compose run --rm content-pipeline pytest -q

## What does not belong here

Promoting a run's output into shipped game data (`src/data/`) -- that's a
deliberate developer decision, tracked at `docs/agents/ana/backlog.md`
item 4.7, not something this pipeline does automatically.
