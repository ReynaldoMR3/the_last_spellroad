# Content Pipeline -- Context (Layer 1)

Course Assignment #4 (Dynamic Content Pipeline) deliverable. Generates
three content types The Last Spellroad needs -- NPC dialogue, item/relic
flavor text, mini-boss/Director trial narration -- grounded in the
project's canonical design sources via retrieval, using the existing agent
roster's Ana/Lorena/Heckler personas.
See `docs/superpowers/specs/2026-07-28-content-pipeline-assignment-04-design.md`
for the full design.

## Stage order

1. `stage00_kickoff/` -- Ana scopes the run (deterministic, no LLM call).
2. `stage01_retrieval/` -- load the allowlisted canonical sources, chunk
   each one by its own headings, embed, retrieve top-k per query.
3. `stage02_generation/` -- Lorena drafts each content item.
4. `stage03_critique/` -- Heckler critiques and corrects.
5. `stage04_status/` -- Ana's closing status report (deterministic).

`pipeline.py` runs all five stages in order and writes every stage's
output plus the graded content files to `output/run_<timestamp>/`.

## Inputs: the canonical-source allowlist

`canonical_sources.json` is the *only* thing that decides what retrieval
may ground in -- there is no directory scan. Each entry has an `id` and a
`path` resolved under `DOCS_ROOT` (`/app/docs` under docker-compose, where
the repo's `docs/` tree is mounted read-only; `../docs` when run from
`content-pipeline/` on the host). Absolute paths and `..` traversal are
rejected, so an entry can't escape the docs tree.

Currently allowlisted: the GDD (`gdd`) and the approved Level 1
opening-experience reference (`opening-experience-brief`). Glossary, ADR,
spec, and other role-scoped references can be added the same way -- one
manifest entry each.

Deliberately *not* in the corpus, and never auto-promoted: raw research
notes, agent logs and backlogs (`docs/agents/*/log.md`,
`docs/agents/*/backlog.md`), this pipeline's own `output/run_*/` bundles,
and throwaway prototypes. Promoting anything is a reviewable edit to
`canonical_sources.json` by a human, guarded by
`tests/test_corpus.py::test_real_manifest_excludes_research_logs_and_pipeline_output`.

## Outputs: provenance per run

`output/run_<timestamp>/bundle.json` carries a `provenance` block naming
the exact corpus snapshot the run used -- every source's path and
whole-file sha256, its chunk count, a single `corpus_hash` over all of
them, the embedding/generation model ids, temperature, and `retrieval_k`.
Each result additionally records its query, instruction, the generation
prompt/system prompt actually sent, a `chunk_hash` per retrieved chunk,
and an `output_hash` of the shipped text. `01_retrieval_log.md` opens with
the same corpus table in human-readable form, and every retrieved chunk in
it names its `source_id`.

Ana's brief also carries one non-graded `retrieval_probe` request
(`opening_experience_retrieval_check`) that generates nothing: stage 04
marks it `blocked-with-reason` unless retrieval actually reached the
canonical source it names, so a broken manifest/chunking/retrieval path
fails loudly in a live run instead of quietly narrowing the corpus.

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
