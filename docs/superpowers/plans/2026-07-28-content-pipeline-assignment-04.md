# Dynamic Content Pipeline (Course Assignment #4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a RAG content pipeline (`the_last_spellroad/content-pipeline/`) that reads the GDD, generates 3 content types the game genuinely needs (NPC dialogue, item/relic flavor text, trial narration), critiques them with a Heckler-persona critic (catching and correcting at least one lore break, both organically and via a guaranteed seeded test), and produces a graded README — satisfying Course Assignment #4's full rubric.

**Architecture:** Five ICM-staged Python modules (`stage00_kickoff` → `stage01_retrieval` → `stage02_generation` → `stage03_critique` → `stage04_status`), each with one job and a `CONTEXT.md` contract, wired together by `pipeline.py`. Retrieval uses real embeddings (Ollama `nomic-embed-text`) and cosine similarity over GDD chunks; generation/critique use Ollama `llama3.2` via two distinct persona prompts (Lorena generates, Heckler critiques+corrects). Ana's kickoff/status stages are deterministic Python, not LLM calls, matching her GDD-defined "orchestration, not generation" role.

**Tech Stack:** Python 3.11 (matching `agent-crew/Dockerfile`'s base image), `requests` for the Ollama HTTP API, `python-dotenv`, `pytest` for tests. No paid API key — runs against the existing `ollama` service in the repo's root `docker-compose.yml` (already used by Assignment #3's `agent-crew`).

## Global Constraints

- Due 2026-07-30, 11:59 ET — this plan must be fully executable within that window.
- No paid LLM API key available — every generative/embedding call goes through the local Ollama container (`OLLAMA_BASE_URL`, default `http://ollama:11434` in Docker).
- Docker is the preferred boundary for running this pipeline, per the GDD's Phaser And Web Constraints section — `docker-compose run --rm content-pipeline ...` is the canonical way to run it and its tests.
- Colima is already sized to 4 CPU / 7.7GB RAM (confirmed) — sufficient for `llama3.2` (3B) and `nomic-embed-text` (~274MB) side by side.
- **Naming adaptation from the design doc:** the design doc's illustrative folder names (`00-kickoff/`, `01-retrieval/`, etc.) use hyphens, which are not valid Python package name characters. This plan uses `stage00_kickoff/`, `stage01_retrieval/`, `stage02_generation/`, `stage03_critique/`, `stage04_status/` instead — same stage order and one-job-per-folder intent, valid Python identifiers.
- Lorena's constraints (verbatim from `docs/agents/lorena/AGENT.md` and `docs/agents/_reference/lore-premise.md`): never introduce named factions/characters/spells/lore copied from an existing published work; only the "destroy" Director ending is real for this slice; melancholic long-lived-mage tone; output length must respect its UI slot.
- Heckler's constraint (verbatim from `docs/agents/heckler/AGENT.md`): grounded, specific critique — never a vague "this feels off."
- Ana's constraint (verbatim from `docs/agents/ana/AGENT.md`): never edits or paraphrases what another agent reports; every task resolves to exactly one of `shipped-and-validated` / `blocked-with-reason` / `in-progress-with-owner`.
- Promoting any generated content into shipped game data (`src/data/`) is out of scope for this plan — tracked separately at `docs/agents/ana/backlog.md` item 4.7.
- All code changes to `the_last_spellroad` happen on branch `worktree-content-pipeline-assignment-04` (already created, design doc and backlog update already committed there).

---

### Task 1: Scaffold `content-pipeline/` and the shared Ollama client

**Files:**
- Create: `content-pipeline/CONTEXT.md`
- Create: `content-pipeline/stage00_kickoff/CONTEXT.md`
- Create: `content-pipeline/stage01_retrieval/CONTEXT.md`
- Create: `content-pipeline/stage02_generation/CONTEXT.md`
- Create: `content-pipeline/stage03_critique/CONTEXT.md`
- Create: `content-pipeline/stage04_status/CONTEXT.md`
- Create: `content-pipeline/stage00_kickoff/__init__.py` (empty)
- Create: `content-pipeline/stage01_retrieval/__init__.py` (empty)
- Create: `content-pipeline/stage02_generation/__init__.py` (empty)
- Create: `content-pipeline/stage03_critique/__init__.py` (empty)
- Create: `content-pipeline/stage04_status/__init__.py` (empty)
- Create: `content-pipeline/ollama_client.py`
- Create: `content-pipeline/requirements.txt`
- Create: `content-pipeline/pytest.ini`
- Create: `content-pipeline/Dockerfile`
- Create: `content-pipeline/.env.example`
- Create: `content-pipeline/.gitignore`
- Create: `content-pipeline/tests/__init__.py` (empty)
- Create: `content-pipeline/tests/test_ollama_client.py`
- Modify: `docker-compose.yml`

**Interfaces:**
- Produces: `ollama_client.wait_for_ollama(timeout=180)`, `ollama_client.ensure_models_pulled(models=None)`, `ollama_client.embed(text, model=None) -> list[float]`, `ollama_client.generate(prompt, system=None, model=None, temperature=0.7) -> str`. Every later task imports `ollama_client` as a module (`import ollama_client`) and calls these through the module reference, so tests can monkeypatch `ollama_client.embed` / `ollama_client.generate` directly.

- [ ] **Step 1: Write `content-pipeline/requirements.txt`**

```
requests==2.32.3
python-dotenv==1.0.1
pytest==8.3.3
```

- [ ] **Step 1a: Create a local venv for the fast TDD loop**

Every `python3 -m pytest ...` command in Tasks 1-7 runs against this venv, not host Python directly (host is 3.14 with none of the pinned deps; the container's pinned 3.11 is what actually ships). Docker remains the source of truth -- Task 1 Step 18 and Task 10 verify against it directly.

```bash
cd content-pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Add `.venv/` to `content-pipeline/.gitignore` in Step 5 below. Leave the venv activated for the remainder of this task and Tasks 2-7 (or re-run `source content-pipeline/.venv/bin/activate` at the start of each).

- [ ] **Step 2: Write `content-pipeline/pytest.ini`**

```ini
[pytest]
pythonpath = .
```

- [ ] **Step 3: Write `content-pipeline/Dockerfile`**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "pipeline.py"]
```

- [ ] **Step 4: Write `content-pipeline/.env.example`**

```
# Copy to .env and adjust if needed -- even an empty .env is required so
# docker-compose can parse this service.

# Override the generation/embedding models if you've pulled different ones:
# PIPELINE_GENERATION_MODEL=llama3.2
# PIPELINE_EMBEDDING_MODEL=nomic-embed-text

# Only needed if you run pipeline.py outside docker-compose:
# OLLAMA_BASE_URL=http://localhost:11434
# GDD_PATH=../docs/game/the-last-spellroad-design.md
```

- [ ] **Step 5: Write `content-pipeline/.gitignore`**

```
.env
.venv/
__pycache__/
*.pyc
.embeddings_cache.json
.pytest_cache/
```

- [ ] **Step 6: Create empty `__init__.py` files**

```bash
touch content-pipeline/stage00_kickoff/__init__.py
touch content-pipeline/stage01_retrieval/__init__.py
touch content-pipeline/stage02_generation/__init__.py
touch content-pipeline/stage03_critique/__init__.py
touch content-pipeline/stage04_status/__init__.py
touch content-pipeline/tests/__init__.py
```

- [ ] **Step 7: Write `content-pipeline/CONTEXT.md`**

```markdown
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
```

- [ ] **Step 8: Write `content-pipeline/stage00_kickoff/CONTEXT.md`**

```markdown
# Stage 00 -- Kickoff (Layer 2)

**Inputs:** none (this stage's own fixed `CONTENT_REQUESTS` list).

**Process:** deterministic Python, not an LLM call -- Ana orchestrates,
she does not generate (see `docs/agents/ana/AGENT.md`). Assembles the
content gap, Lorena's constraints, and the scoped list of requests
(3 real content items + 1 deliberately seeded violation used to prove
the critic loop works).

**Outputs:** a brief dict consumed by every later stage, and
`00_ana_kickoff_brief.md`.
```

- [ ] **Step 9: Write `content-pipeline/stage01_retrieval/CONTEXT.md`**

```markdown
# Stage 01 -- Retrieval (Layer 2)

**Inputs:** the GDD's full text (`docs/game/the-last-spellroad-design.md`),
and each request's retrieval query from Stage 00.

**Process:** chunk the GDD by `##`/`###` heading; embed each chunk once via
Ollama's `nomic-embed-text` (cached to `.embeddings_cache.json`, keyed by a
hash of the chunk text so it invalidates automatically if the GDD
changes); embed each query the same way; retrieve the top-3 chunks by
cosine similarity.

**Outputs:** `(chunk, vector)` pairs consumed by Stage 02/03, and the
retrieved-chunk list written into `01_retrieval_log.md`.
```

- [ ] **Step 10: Write `content-pipeline/stage02_generation/CONTEXT.md`**

```markdown
# Stage 02 -- Generation (Layer 2)

**Inputs:** a request from Stage 00, its retrieved chunks from Stage 01.

**Process:** Lorena drafts the requested content, grounded in the
retrieved chunks, under the constraints from her `AGENT.md`
(no new named factions/characters/spells, melancholic tone, only the
"destroy" ending, respects the word limit).

**Outputs:** a draft string, handed to Stage 03 for critique -- Lorena
never self-validates her own tone/consistency (see
`docs/agents/lorena/AGENT.md`).
```

- [ ] **Step 11: Write `content-pipeline/stage03_critique/CONTEXT.md`**

```markdown
# Stage 03 -- Critique (Layer 2)

**Inputs:** a draft from Stage 02 (or the seeded validation-test draft
from Stage 00), the same retrieved chunks from Stage 01.

**Process:** Heckler checks the draft against the same constraints
Lorena drafted under, grounded in the same retrieved chunks. Returns a
structured verdict (`PASS`/`FAIL`), the issue found (if any), and a
corrected rewrite (if any) -- catches and corrects in one pass.

**Outputs:** a `{verdict, issue, corrected}` dict, consumed by Stage 04
and written into `03_heckler_critique.md`.
```

- [ ] **Step 12: Write `content-pipeline/stage04_status/CONTEXT.md`**

```markdown
# Stage 04 -- Status (Layer 2)

**Inputs:** every item's result from Stages 00-03 (id, label,
is_validation_test flag, draft, critique verdict).

**Process:** deterministic Python, not an LLM call -- Ana reasons over
Heckler's structured verdicts using the roster's existing three-state
model (`shipped-and-validated` / `blocked-with-reason` /
`in-progress-with-owner`). The seeded validation-test item is judged by
whether Heckler actually caught and corrected it, not by its own content.

**Outputs:** a status report dict and `04_ana_status_report.md` -- Ana's
closing synthesis of the whole run.
```

- [ ] **Step 13: Write the failing test for `ollama_client`**

Create `content-pipeline/tests/test_ollama_client.py`:

```python
from unittest.mock import patch, MagicMock

from ollama_client import embed, generate


def test_embed_sends_model_and_prompt_returns_vector():
    fake_response = MagicMock()
    fake_response.json.return_value = {"embedding": [0.1, 0.2, 0.3]}
    fake_response.raise_for_status.return_value = None
    with patch("ollama_client.requests.post", return_value=fake_response) as mock_post:
        result = embed("some text", model="nomic-embed-text")
    assert result == [0.1, 0.2, 0.3]
    _, kwargs = mock_post.call_args
    assert kwargs["json"] == {"model": "nomic-embed-text", "prompt": "some text"}


def test_generate_sends_system_and_prompt_returns_text():
    fake_response = MagicMock()
    fake_response.json.return_value = {"response": "hello"}
    fake_response.raise_for_status.return_value = None
    with patch("ollama_client.requests.post", return_value=fake_response) as mock_post:
        result = generate("say hi", system="you are Lorena", model="llama3.2")
    assert result == "hello"
    _, kwargs = mock_post.call_args
    assert kwargs["json"]["system"] == "you are Lorena"
    assert kwargs["json"]["prompt"] == "say hi"
    assert kwargs["json"]["stream"] is False
```

- [ ] **Step 14: Run the test to verify it fails**

Run: `cd content-pipeline && python3 -m pytest tests/test_ollama_client.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'ollama_client'`

- [ ] **Step 15: Write `content-pipeline/ollama_client.py`**

```python
"""Shared Ollama HTTP client -- the network boundary every other module in
this pipeline goes through. No paid API key: this hits the same `ollama`
service already defined in the repo's root docker-compose.yml for
Assignment #3's agent-crew.
"""

import json
import os
import time

import requests

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
GENERATION_MODEL = os.getenv("PIPELINE_GENERATION_MODEL", "llama3.2")
EMBEDDING_MODEL = os.getenv("PIPELINE_EMBEDDING_MODEL", "nomic-embed-text")
REQUIRED_MODELS = [GENERATION_MODEL, EMBEDDING_MODEL]


def wait_for_ollama(timeout=180):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5).status_code == 200:
                return
        except requests.exceptions.RequestException:
            pass
        time.sleep(2)
    raise RuntimeError(f"Ollama at {OLLAMA_BASE_URL} did not become ready within {timeout}s")


def ensure_models_pulled(models=None):
    models = models or REQUIRED_MODELS
    have_full = {
        m["name"]
        for m in requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=10).json().get("models", [])
    }
    have_base = {name.split(":")[0] for name in have_full}
    for model in models:
        present = model in have_full or (":" not in model and model in have_base)
        if present:
            print(f"[ollama] {model} already present")
            continue
        print(f"[ollama] pulling {model} (first run only, can take a few minutes)...")
        resp = requests.post(
            f"{OLLAMA_BASE_URL}/api/pull", json={"name": model}, stream=True, timeout=None
        )
        last_status = None
        for line in resp.iter_lines():
            if not line:
                continue
            try:
                status = json.loads(line).get("status", "")
            except ValueError:
                continue
            if status != last_status:
                print(f"  [{model}] {status}")
                last_status = status
        print(f"[ollama] {model} ready")


def embed(text, model=None):
    model = model or EMBEDDING_MODEL
    resp = requests.post(
        f"{OLLAMA_BASE_URL}/api/embeddings",
        json={"model": model, "prompt": text},
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]


def generate(prompt, system=None, model=None, temperature=0.7):
    model = model or GENERATION_MODEL
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature},
    }
    if system:
        payload["system"] = system
    resp = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=300)
    resp.raise_for_status()
    return resp.json()["response"]
```

- [ ] **Step 16: Run the test to verify it passes**

Run: `cd content-pipeline && python3 -m pytest tests/test_ollama_client.py -v`
Expected: PASS (2 tests)

- [ ] **Step 17: Add the `content-pipeline` service to `docker-compose.yml`**

Modify `docker-compose.yml`, adding this service after the existing `agent-crew` service (before the `volumes:` block):

```yaml
  content-pipeline:
    build:
      context: ./content-pipeline
    working_dir: /app
    env_file:
      - ./content-pipeline/.env
    environment:
      OLLAMA_BASE_URL: http://ollama:11434
      GDD_PATH: /app/gdd/the-last-spellroad-design.md
    volumes:
      - ./content-pipeline:/app
      - ./docs/game:/app/gdd:ro
    depends_on:
      - ollama
```

- [ ] **Step 18: Verify the Docker build works**

Run: `docker-compose build content-pipeline`
Expected: build succeeds (installs `requests`, `python-dotenv`, `pytest`)

- [ ] **Step 19: Commit**

```bash
git add content-pipeline docker-compose.yml
git commit -m "$(cat <<'EOF'
content-pipeline: scaffold ICM stage folders + shared Ollama client

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Retrieval — GDD chunking, embedding cache, cosine-similarity retrieval

**Files:**
- Create: `content-pipeline/stage01_retrieval/rag.py`
- Create: `content-pipeline/tests/test_rag.py`

**Interfaces:**
- Consumes: nothing from other tasks (pure logic + an injectable `embed_fn`).
- Produces: `rag.chunk_gdd(text) -> list[{"heading": str, "text": str}]`, `rag.cosine_similarity(a, b) -> float`, `rag.retrieve_top_k(query_vector, chunk_vectors, k=3) -> list[{"heading": str, "text": str, "score": float}]`, `rag.embed_chunks_with_cache(chunks, cache_path, embed_fn) -> list[(chunk, vector)]`. `pipeline.py` (Task 7) imports all four.

- [ ] **Step 1: Write the failing tests**

Create `content-pipeline/tests/test_rag.py`:

```python
import math

from stage01_retrieval.rag import (
    chunk_gdd,
    cosine_similarity,
    retrieve_top_k,
    embed_chunks_with_cache,
)


SAMPLE_GDD = """# Title

## Summary

This is the summary section.

## Lore Premise

The Director traps the mage.

### Hexcoin

A currency.
"""


def test_chunk_gdd_splits_on_h2_and_h3_headings():
    chunks = chunk_gdd(SAMPLE_GDD)
    headings = [c["heading"] for c in chunks]
    assert headings == ["Summary", "Lore Premise", "Hexcoin"]
    assert "Director traps the mage" in chunks[1]["text"]
    assert "A currency" in chunks[2]["text"]


def test_cosine_similarity_identical_vectors_is_one():
    assert math.isclose(cosine_similarity([1, 0, 0], [1, 0, 0]), 1.0)


def test_cosine_similarity_orthogonal_vectors_is_zero():
    assert math.isclose(cosine_similarity([1, 0], [0, 1]), 0.0)


def test_cosine_similarity_zero_vector_does_not_raise():
    assert cosine_similarity([0, 0], [1, 1]) == 0.0


def test_retrieve_top_k_returns_closest_chunks_first():
    chunk_vectors = [
        ({"heading": "far", "text": "far"}, [0, 1]),
        ({"heading": "near", "text": "near"}, [1, 0.01]),
        ({"heading": "mid", "text": "mid"}, [0.7, 0.7]),
    ]
    results = retrieve_top_k([1, 0], chunk_vectors, k=2)
    assert [r["heading"] for r in results] == ["near", "mid"]


def test_embed_chunks_with_cache_only_calls_embed_fn_once_per_unique_chunk(tmp_path):
    cache_path = tmp_path / "cache.json"
    chunks = [{"heading": "a", "text": "hello"}, {"heading": "b", "text": "world"}]
    calls = []

    def fake_embed(text):
        calls.append(text)
        return [float(len(text) % 7), 0.0]

    embed_chunks_with_cache(chunks, str(cache_path), fake_embed)
    embed_chunks_with_cache(chunks, str(cache_path), fake_embed)

    assert calls == ["hello", "world"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd content-pipeline && python3 -m pytest tests/test_rag.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'stage01_retrieval.rag'`

- [ ] **Step 3: Write `content-pipeline/stage01_retrieval/rag.py`**

```python
"""GDD chunking, embedding (via Ollama), and cosine-similarity retrieval.

Chunk boundaries follow the GDD's own `##`/`###` heading structure, so a
chunk's grounding text always matches a real section of the design doc --
this is what makes the retrieval log's query -> chunk -> output triples a
faithful RAG demonstration rather than an arbitrary text window.
"""

import hashlib
import json
import math
import os
import re

HEADING_RE = re.compile(r"^(#{2,3})\s+(.+)$", re.MULTILINE)


def chunk_gdd(text):
    matches = list(HEADING_RE.finditer(text))
    chunks = []
    preamble = text[: matches[0].start()].strip() if matches else text.strip()
    if preamble:
        chunks.append({"heading": "(front matter)", "text": preamble})
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chunks.append({"heading": match.group(2).strip(), "text": text[start:end].strip()})
    return chunks


def cosine_similarity(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def retrieve_top_k(query_vector, chunk_vectors, k=3):
    scored = [
        (cosine_similarity(query_vector, vec), chunk)
        for chunk, vec in chunk_vectors
    ]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [{"score": score, **chunk} for score, chunk in scored[:k]]


def _chunk_key(chunk):
    return hashlib.sha256(chunk["text"].encode("utf-8")).hexdigest()


def embed_chunks_with_cache(chunks, cache_path, embed_fn):
    cache = {}
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            cache = json.load(f)

    chunk_vectors = []
    changed = False
    for chunk in chunks:
        key = _chunk_key(chunk)
        if key not in cache:
            cache[key] = embed_fn(chunk["text"])
            changed = True
        chunk_vectors.append((chunk, cache[key]))

    if changed:
        with open(cache_path, "w") as f:
            json.dump(cache, f)

    return chunk_vectors
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd content-pipeline && python3 -m pytest tests/test_rag.py -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add content-pipeline/stage01_retrieval/rag.py content-pipeline/tests/test_rag.py
git commit -m "$(cat <<'EOF'
content-pipeline: GDD chunking + cached embedding retrieval (stage 01)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Kickoff — Ana's deterministic brief

**Files:**
- Create: `content-pipeline/stage00_kickoff/ana_kickoff.py`
- Create: `content-pipeline/tests/test_ana_kickoff.py`

**Interfaces:**
- Consumes: nothing (fixed constants).
- Produces: `ana_kickoff.CONTENT_REQUESTS` (list of 4 request dicts: `id`, `label`, `query`, `instruction`, `max_words`, `is_validation_test`, and `preset_draft` only on the validation-test entry), `ana_kickoff.build_kickoff_brief() -> {"content_gap": str, "lorena_constraints": str, "requests": list}`, `ana_kickoff.write_kickoff_brief(brief, path)`. `pipeline.py` (Task 7) imports `build_kickoff_brief` and `write_kickoff_brief`; each request dict's `id`/`label`/`query`/`instruction`/`max_words`/`is_validation_test`/`preset_draft` keys are relied on by Tasks 4, 5, 7.

- [ ] **Step 1: Write the failing tests**

Create `content-pipeline/tests/test_ana_kickoff.py`:

```python
from stage00_kickoff.ana_kickoff import (
    build_kickoff_brief,
    format_kickoff_brief_markdown,
    write_kickoff_brief,
)


def test_build_kickoff_brief_has_four_requests_one_validation_test():
    brief = build_kickoff_brief()
    assert len(brief["requests"]) == 4
    validation_tests = [r for r in brief["requests"] if r["is_validation_test"]]
    assert len(validation_tests) == 1
    assert validation_tests[0]["preset_draft"]


def test_format_kickoff_brief_markdown_includes_content_gap_and_all_requests():
    brief = build_kickoff_brief()
    markdown = format_kickoff_brief_markdown(brief)
    assert brief["content_gap"] in markdown
    for req in brief["requests"]:
        assert req["label"] in markdown


def test_write_kickoff_brief_writes_file(tmp_path):
    brief = build_kickoff_brief()
    out_path = tmp_path / "00_ana_kickoff_brief.md"
    write_kickoff_brief(brief, str(out_path))
    content = out_path.read_text()
    assert "Ana -- Kickoff Brief" in content
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd content-pipeline && python3 -m pytest tests/test_ana_kickoff.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'stage00_kickoff.ana_kickoff'`

- [ ] **Step 3: Write `content-pipeline/stage00_kickoff/ana_kickoff.py`**

```python
"""Ana's kickoff stage -- deterministic, not an LLM call. Ana orchestrates
and routes (see docs/agents/ana/AGENT.md); she does not generate content
herself, so this stage is plain Python that assembles the scoped brief
Lorena and Heckler work against, per the GDD's own "Ana (orchestration,
not generation)" role definition.
"""

CONTENT_GAP = (
    "The GDD's own Token Budget table lists Lorena's narrative/flavor-text pass "
    "as not started (Phase 4, scheduled Week 5-6). The game has mechanical data "
    "(spells.json, waves/*.json) but no in-world text: no rescuable-NPC dialogue, "
    "no item/relic descriptions, no trial narration."
)

LORENA_CONSTRAINTS = (
    "Never introduce named factions, characters, spells, or lore that copies an "
    "existing published work. Stay inside the locked ending scope for this slice "
    "-- only the \"destroy\" Director ending is real; never write content implying "
    "\"outwitted\" or \"transformed\" is resolvable in the vertical slice. Tone must "
    "match the Lore Premise's melancholic, long-lived-mage mood. Output length must "
    "respect the UI space it's tagged for -- an item description is not a paragraph."
)

CONTENT_REQUESTS = [
    {
        "id": "npc_dialogue",
        "label": "NPC dialogue (rescuable adventurer)",
        "query": "tone and rules for a trapped adventurer NPC the player can rescue",
        "instruction": (
            "Write 3 short spoken lines for a trapped adventurer NPC the player "
            "meets and can rescue mid-expedition (Gameplay Loop step 5). The NPC "
            "has been in the Spellroad a long time and is not certain rescue is "
            "wanted."
        ),
        "max_words": 60,
        "is_validation_test": False,
    },
    {
        "id": "item_flavor",
        "label": "Item/relic flavor text",
        "query": "how item and relic flavor text should read, UI length constraint",
        "instruction": (
            "Write a short flavor-text description for a recovered spell-fragment "
            "relic the player picks up mid-expedition (Gameplay Loop step 3)."
        ),
        "max_words": 30,
        "is_validation_test": False,
    },
    {
        "id": "trial_narration",
        "label": "Mini-boss/Director trial narration",
        "query": "the mini-boss Director trial and the destroy ending scope lock",
        "instruction": (
            "Write one intro line spoken as the mage enters the mini-boss/Director "
            "trial (Gameplay Loop step 7), and one outro line for defeating it."
        ),
        "max_words": 50,
        "is_validation_test": False,
    },
    {
        "id": "seeded_selftest",
        "label": "Seeded violation (functional-loop proof, not a graded output)",
        "query": "originality requirement -- no named factions or lore copied from published work",
        "instruction": None,
        "preset_draft": (
            "The trapped mage speaks of the Emberwrought Concord, the ancient "
            "order who first bound the Director inside the Hollow Spire, and "
            "swears their oath will one day outwit it for good."
        ),
        "max_words": 60,
        "is_validation_test": True,
    },
]


def build_kickoff_brief():
    return {
        "content_gap": CONTENT_GAP,
        "lorena_constraints": LORENA_CONSTRAINTS,
        "requests": CONTENT_REQUESTS,
    }


def format_kickoff_brief_markdown(brief):
    lines = [
        "# Ana -- Kickoff Brief",
        "",
        "## Content gap",
        "",
        brief["content_gap"],
        "",
        "## Constraints handed to Lorena and Heckler",
        "",
        brief["lorena_constraints"],
        "",
        "## Scoped requests",
        "",
    ]
    for req in brief["requests"]:
        lines.append(f"### {req['label']} (`{req['id']}`)")
        lines.append("")
        if req["is_validation_test"]:
            lines.append(
                "**Validation test, not a graded output** -- a deliberately seeded "
                "draft, used to prove Heckler's critic loop actually catches and "
                "corrects a real violation."
            )
        else:
            lines.append(f"Retrieval query: *{req['query']}*")
            lines.append("")
            lines.append(req["instruction"])
        lines.append("")
    return "\n".join(lines)


def write_kickoff_brief(brief, path):
    with open(path, "w") as f:
        f.write(format_kickoff_brief_markdown(brief))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd content-pipeline && python3 -m pytest tests/test_ana_kickoff.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add content-pipeline/stage00_kickoff/ana_kickoff.py content-pipeline/tests/test_ana_kickoff.py
git commit -m "$(cat <<'EOF'
content-pipeline: Ana's deterministic kickoff brief (stage 00)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Generation — Lorena drafts

**Files:**
- Create: `content-pipeline/stage02_generation/lorena_generate.py`
- Create: `content-pipeline/tests/test_lorena_generate.py`

**Interfaces:**
- Consumes: a request dict shaped like `ana_kickoff.CONTENT_REQUESTS` entries (`instruction`, `max_words`), and a list of retrieved chunks shaped like `rag.retrieve_top_k`'s return (`heading`, `text`, `score`); calls `ollama_client.generate`.
- Produces: `lorena_generate.build_lorena_prompt(request, retrieved_chunks) -> str`, `lorena_generate.generate_draft(request, retrieved_chunks) -> str`. `pipeline.py` (Task 7) imports `generate_draft`.

- [ ] **Step 1: Write the failing tests**

Create `content-pipeline/tests/test_lorena_generate.py`:

```python
from unittest.mock import patch

from stage02_generation.lorena_generate import build_lorena_prompt, generate_draft


SAMPLE_REQUEST = {
    "id": "npc_dialogue",
    "instruction": "Write 3 lines for a trapped NPC.",
    "max_words": 60,
}
SAMPLE_CHUNKS = [{"heading": "Lore Premise", "text": "The Director traps the mage.", "score": 0.9}]


def test_build_lorena_prompt_includes_grounding_and_instruction():
    prompt = build_lorena_prompt(SAMPLE_REQUEST, SAMPLE_CHUNKS)
    assert "Lore Premise" in prompt
    assert "The Director traps the mage." in prompt
    assert SAMPLE_REQUEST["instruction"] in prompt
    assert "60 words" in prompt


def test_generate_draft_calls_ollama_client_generate_with_system_prompt():
    with patch("stage02_generation.lorena_generate.ollama_client.generate") as mock_generate:
        mock_generate.return_value = "a drafted line"
        result = generate_draft(SAMPLE_REQUEST, SAMPLE_CHUNKS)
    assert result == "a drafted line"
    args, kwargs = mock_generate.call_args
    assert "Write 3 lines for a trapped NPC." in args[0]
    assert "Lorena" in kwargs["system"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd content-pipeline && python3 -m pytest tests/test_lorena_generate.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'stage02_generation.lorena_generate'`

- [ ] **Step 3: Write `content-pipeline/stage02_generation/lorena_generate.py`**

```python
"""Lorena's generation stage -- drafts flavor text/dialogue grounded in
retrieved GDD chunks, per her AGENT.md constraints.
"""

import ollama_client

LORENA_SYSTEM_PROMPT = (
    "You are Lorena, the narrative and lore agent for the game The Last "
    "Spellroad. You write flavor text and dialogue. Never introduce named "
    "factions, characters, spells, or lore that copies an existing "
    "published work. Only the \"destroy\" Director ending is real for this "
    "slice -- never write content implying \"outwitted\" or \"transformed\" "
    "is resolvable. Match a melancholic, long-lived-mage tone. Respect the "
    "requested word limit -- an item description is not a paragraph. "
    "Output only the requested text, no preamble, no explanation."
)


def build_lorena_prompt(request, retrieved_chunks):
    grounding = "\n\n".join(
        f"[GDD -- {chunk['heading']}]\n{chunk['text']}" for chunk in retrieved_chunks
    )
    return (
        f"Grounding context from the game design document:\n\n{grounding}\n\n"
        f"Task: {request['instruction']}\n"
        f"Keep it under {request['max_words']} words."
    )


def generate_draft(request, retrieved_chunks):
    prompt = build_lorena_prompt(request, retrieved_chunks)
    return ollama_client.generate(prompt, system=LORENA_SYSTEM_PROMPT)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd content-pipeline && python3 -m pytest tests/test_lorena_generate.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add content-pipeline/stage02_generation/lorena_generate.py content-pipeline/tests/test_lorena_generate.py
git commit -m "$(cat <<'EOF'
content-pipeline: Lorena's grounded generation stage (stage 02)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Critique — Heckler catches and corrects

**Files:**
- Create: `content-pipeline/stage03_critique/heckler_critique.py`
- Create: `content-pipeline/tests/test_heckler_critique.py`

**Interfaces:**
- Consumes: a draft string, a request dict (`max_words`), retrieved chunks shaped like `rag.retrieve_top_k`'s return; calls `ollama_client.generate`.
- Produces: `heckler_critique.build_heckler_prompt(draft, request, retrieved_chunks) -> str`, `heckler_critique.parse_critique_response(text) -> {"verdict": "PASS"|"FAIL", "issue": str|None, "corrected": str|None}`, `heckler_critique.critique_draft(draft, request, retrieved_chunks) -> dict` (same shape as `parse_critique_response`'s return). `pipeline.py` (Task 7) and `stage04_status/ana_status.py` (Task 6) both rely on this exact `{"verdict", "issue", "corrected"}` dict shape.

- [ ] **Step 1: Write the failing tests**

Create `content-pipeline/tests/test_heckler_critique.py`:

```python
from unittest.mock import patch

from stage03_critique.heckler_critique import (
    build_heckler_prompt,
    parse_critique_response,
    critique_draft,
)


SAMPLE_REQUEST = {"max_words": 60}
SAMPLE_CHUNKS = [{"heading": "Lore Premise", "text": "Only destroy is real.", "score": 0.9}]


def test_build_heckler_prompt_includes_grounding_and_draft():
    prompt = build_heckler_prompt("a draft line", SAMPLE_REQUEST, SAMPLE_CHUNKS)
    assert "Only destroy is real." in prompt
    assert "a draft line" in prompt


def test_parse_critique_response_pass():
    text = "VERDICT: PASS\nISSUE: none\nCORRECTED: none"
    result = parse_critique_response(text)
    assert result == {"verdict": "PASS", "issue": None, "corrected": None}


def test_parse_critique_response_fail_with_correction():
    text = (
        "VERDICT: FAIL\n"
        "ISSUE: invents a named faction, the Emberwrought Concord\n"
        "CORRECTED: The trapped mage speaks only of an order long since forgotten."
    )
    result = parse_critique_response(text)
    assert result["verdict"] == "FAIL"
    assert "Emberwrought Concord" in result["issue"]
    assert "forgotten" in result["corrected"]


def test_parse_critique_response_malformed_defaults_to_fail():
    result = parse_critique_response("the model rambled and never gave a verdict")
    assert result["verdict"] == "FAIL"
    assert result["issue"] == "Unparseable critic response"
    assert result["corrected"] is None


def test_critique_draft_calls_ollama_client_generate():
    with patch("stage03_critique.heckler_critique.ollama_client.generate") as mock_generate:
        mock_generate.return_value = "VERDICT: PASS\nISSUE: none\nCORRECTED: none"
        result = critique_draft("a draft", SAMPLE_REQUEST, SAMPLE_CHUNKS)
    assert result["verdict"] == "PASS"
    args, kwargs = mock_generate.call_args
    assert "a draft" in args[0]
    assert "Heckler" in kwargs["system"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd content-pipeline && python3 -m pytest tests/test_heckler_critique.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'stage03_critique.heckler_critique'`

- [ ] **Step 3: Write `content-pipeline/stage03_critique/heckler_critique.py`**

```python
"""Heckler's critique stage -- checks Lorena's drafts (and one seeded
violation) against the same constraints and retrieved chunks, and
corrects on failure. Not self-validated by Lorena, per the GDD's
generator/validator split.
"""

import re

import ollama_client

HECKLER_SYSTEM_PROMPT = (
    "You are Heckler, the adversarial critic for the game The Last "
    "Spellroad. You check narrative/dialogue drafts against these rules: "
    "never a named faction, character, spell, or lore copied from an "
    "existing published work; only the \"destroy\" Director ending is "
    "real, never imply \"outwitted\" or \"transformed\" is resolvable; "
    "tone must be melancholic and long-lived-mage; length must respect "
    "the stated word limit. Respond in exactly this format:\n"
    "VERDICT: PASS or FAIL\n"
    "ISSUE: <one sentence, or 'none' if PASS>\n"
    "CORRECTED: <a rewritten version fixing the issue, or 'none' if PASS>"
)

_VERDICT_RE = re.compile(r"VERDICT:\s*(PASS|FAIL)", re.IGNORECASE)
_ISSUE_RE = re.compile(r"ISSUE:\s*(.+)", re.IGNORECASE)
_CORRECTED_RE = re.compile(r"CORRECTED:\s*(.+)", re.IGNORECASE | re.DOTALL)


def build_heckler_prompt(draft, request, retrieved_chunks):
    grounding = "\n\n".join(
        f"[GDD -- {chunk['heading']}]\n{chunk['text']}" for chunk in retrieved_chunks
    )
    return (
        f"Grounding context from the game design document:\n\n{grounding}\n\n"
        f"Draft to critique (word limit was {request['max_words']}):\n\n{draft}"
    )


def parse_critique_response(text):
    verdict_match = _VERDICT_RE.search(text)
    if not verdict_match:
        return {"verdict": "FAIL", "issue": "Unparseable critic response", "corrected": None}

    verdict = verdict_match.group(1).upper()
    issue_match = _ISSUE_RE.search(text)
    issue = issue_match.group(1).strip() if issue_match else None
    if issue and issue.lower().startswith("none"):
        issue = None

    corrected_match = _CORRECTED_RE.search(text)
    corrected = corrected_match.group(1).strip() if corrected_match else None
    if corrected and corrected.lower().startswith("none"):
        corrected = None

    return {"verdict": verdict, "issue": issue, "corrected": corrected}


def critique_draft(draft, request, retrieved_chunks):
    prompt = build_heckler_prompt(draft, request, retrieved_chunks)
    response_text = ollama_client.generate(prompt, system=HECKLER_SYSTEM_PROMPT)
    return parse_critique_response(response_text)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd content-pipeline && python3 -m pytest tests/test_heckler_critique.py -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add content-pipeline/stage03_critique/heckler_critique.py content-pipeline/tests/test_heckler_critique.py
git commit -m "$(cat <<'EOF'
content-pipeline: Heckler's catch-and-correct critique stage (stage 03)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Status — Ana's deterministic closing report

**Files:**
- Create: `content-pipeline/stage04_status/ana_status.py`
- Create: `content-pipeline/tests/test_ana_status.py`

**Interfaces:**
- Consumes: a list of result dicts, each shaped `{"id": str, "label": str, "is_validation_test": bool, "critique": {"verdict": "PASS"|"FAIL", "issue": str|None, "corrected": str|None}}` (matches Task 5's `critique_draft` output plus the `id`/`label`/`is_validation_test` fields `pipeline.py` (Task 7) attaches).
- Produces: `ana_status.build_status_report(results) -> {"items": [{"id", "label", "status", "note"}], "summary": str}`, `ana_status.format_status_report_markdown(report) -> str`. `pipeline.py` (Task 7) imports both.

- [ ] **Step 1: Write the failing tests**

Create `content-pipeline/tests/test_ana_status.py`:

```python
from stage04_status.ana_status import build_status_report, format_status_report_markdown


def _result(id, label, verdict, issue=None, corrected=None, is_validation_test=False):
    return {
        "id": id,
        "label": label,
        "is_validation_test": is_validation_test,
        "critique": {"verdict": verdict, "issue": issue, "corrected": corrected},
    }


def test_pass_item_is_shipped_and_validated():
    report = build_status_report([_result("a", "A", "PASS")])
    assert report["items"][0]["status"] == "shipped-and-validated"


def test_fail_with_correction_is_shipped_and_validated():
    report = build_status_report(
        [_result("a", "A", "FAIL", issue="too long", corrected="a shorter version")]
    )
    assert report["items"][0]["status"] == "shipped-and-validated"
    assert "too long" in report["items"][0]["note"]


def test_fail_without_correction_is_blocked_with_reason():
    report = build_status_report([_result("a", "A", "FAIL", issue="unparseable", corrected=None)])
    assert report["items"][0]["status"] == "blocked-with-reason"


def test_validation_test_caught_is_shipped_and_validated():
    report = build_status_report(
        [
            _result(
                "seeded_selftest",
                "Seeded violation",
                "FAIL",
                issue="named faction",
                corrected="fixed text",
                is_validation_test=True,
            )
        ]
    )
    assert report["items"][0]["status"] == "shipped-and-validated"


def test_validation_test_not_caught_is_blocked_with_reason():
    report = build_status_report(
        [_result("seeded_selftest", "Seeded violation", "PASS", is_validation_test=True)]
    )
    assert report["items"][0]["status"] == "blocked-with-reason"


def test_summary_reflects_all_shipped_vs_blocked():
    all_pass = build_status_report([_result("a", "A", "PASS")])
    assert "confirmed functional" in all_pass["summary"]

    one_blocked = build_status_report(
        [_result("a", "A", "PASS"), _result("b", "B", "FAIL", issue="x", corrected=None)]
    )
    assert "blocked-with-reason" in one_blocked["summary"]


def test_format_status_report_markdown_includes_table_rows():
    report = build_status_report([_result("a", "Item A", "PASS")])
    markdown = format_status_report_markdown(report)
    assert "Item A" in markdown
    assert "shipped-and-validated" in markdown
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd content-pipeline && python3 -m pytest tests/test_ana_status.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'stage04_status.ana_status'`

- [ ] **Step 3: Write `content-pipeline/stage04_status/ana_status.py`**

```python
"""Ana's closing-status stage -- deterministic, not an LLM call. Reasons
over Heckler's structured verdicts using the GDD's own three-state model
(shipped-and-validated / blocked-with-reason / in-progress-with-owner).
"""


def build_status_report(results):
    items = []
    for result in results:
        critique = result["critique"]
        verdict = critique["verdict"]
        corrected = critique["corrected"]

        if result["is_validation_test"]:
            caught = verdict == "FAIL" and bool(corrected)
            status = "shipped-and-validated" if caught else "blocked-with-reason"
            note = (
                "seeded violation caught and corrected -- critic loop confirmed functional"
                if caught
                else "seeded violation NOT caught -- critic loop needs review before submission"
            )
        elif verdict == "PASS":
            status = "shipped-and-validated"
            note = "generated clean, no critique issues"
        elif corrected:
            status = "shipped-and-validated"
            note = f"Heckler flagged and corrected: {critique['issue']}"
        else:
            status = "blocked-with-reason"
            note = f"Heckler flagged with no usable correction: {critique['issue'] or 'unparseable critique'}"

        items.append({"id": result["id"], "label": result["label"], "status": status, "note": note})

    all_shipped = all(item["status"] == "shipped-and-validated" for item in items)
    summary = (
        "All content items shipped-and-validated; consistency-check loop confirmed functional."
        if all_shipped
        else "One or more items blocked-with-reason -- see notes above before submission."
    )
    return {"items": items, "summary": summary}


def format_status_report_markdown(report):
    lines = [
        "# Ana -- Closing Status Report",
        "",
        report["summary"],
        "",
        "| Item | Status | Note |",
        "| --- | --- | --- |",
    ]
    for item in report["items"]:
        lines.append(f"| {item['label']} | `{item['status']}` | {item['note']} |")
    return "\n".join(lines)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd content-pipeline && python3 -m pytest tests/test_ana_status.py -v`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add content-pipeline/stage04_status/ana_status.py content-pipeline/tests/test_ana_status.py
git commit -m "$(cat <<'EOF'
content-pipeline: Ana's deterministic closing status report (stage 04)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Orchestrator — wire all five stages together

**Files:**
- Create: `content-pipeline/pipeline.py`
- Create: `content-pipeline/tests/test_pipeline_integration.py`

**Interfaces:**
- Consumes: `ollama_client` (Task 1), `stage00_kickoff.ana_kickoff.build_kickoff_brief`/`write_kickoff_brief` (Task 3), `stage01_retrieval.rag.chunk_gdd`/`embed_chunks_with_cache`/`retrieve_top_k` (Task 2), `stage02_generation.lorena_generate.generate_draft` (Task 4), `stage03_critique.heckler_critique.critique_draft` (Task 5), `stage04_status.ana_status.build_status_report`/`format_status_report_markdown` (Task 6).
- Produces: `pipeline.run_pipeline(run_dir) -> (results: list[dict], status_report: dict)`, `pipeline.main()`. Writes `00_ana_kickoff_brief.md`, `01_retrieval_log.md`, `02_lorena_drafts.md`, `03_heckler_critique.md`, `04_ana_status_report.md`, `bundle.json`, and one `<id>.md` per non-validation-test request into `run_dir`.

- [ ] **Step 1: Write the failing integration test**

Create `content-pipeline/tests/test_pipeline_integration.py`:

```python
import json
import os
from unittest.mock import patch

import pipeline


SAMPLE_GDD = """# Title

## Summary

The Director traps the mage in the Spellroad.

## Lore Premise

Only destroy is real. Never invent a named faction.
"""


def fake_embed(text):
    return [float(len(text) % 7), float(len(text) % 5)]


def fake_generate(prompt, system=None, model=None, temperature=0.7):
    if "Heckler" in (system or ""):
        return "VERDICT: PASS\nISSUE: none\nCORRECTED: none"
    return "A generated line of flavor text."


def test_run_pipeline_writes_all_expected_output_files(tmp_path):
    gdd_path = tmp_path / "gdd.md"
    gdd_path.write_text(SAMPLE_GDD)
    run_dir = tmp_path / "run_test"

    with patch.object(pipeline, "GDD_PATH", str(gdd_path)), \
         patch.object(pipeline.ollama_client, "embed", side_effect=fake_embed), \
         patch.object(pipeline.ollama_client, "generate", side_effect=fake_generate), \
         patch.object(pipeline, "EMBEDDINGS_CACHE_PATH", str(tmp_path / "cache.json")):
        results, status_report = pipeline.run_pipeline(str(run_dir))

    assert len(results) == 4
    for filename in [
        "00_ana_kickoff_brief.md",
        "01_retrieval_log.md",
        "02_lorena_drafts.md",
        "03_heckler_critique.md",
        "04_ana_status_report.md",
        "bundle.json",
        "npc_dialogue.md",
        "item_flavor.md",
        "trial_narration.md",
    ]:
        assert os.path.exists(run_dir / filename), f"missing {filename}"

    assert not os.path.exists(run_dir / "seeded_selftest.md")

    bundle = json.loads((run_dir / "bundle.json").read_text())
    assert bundle["status_report"]["summary"]
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd content-pipeline && python3 -m pytest tests/test_pipeline_integration.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'pipeline'`

- [ ] **Step 3: Write `content-pipeline/pipeline.py`**

```python
"""Orchestrator: 00-kickoff -> 01-retrieval -> 02-generation -> 03-critique
-> 04-status, in order. Writes every stage's output plus the 3 graded
content files to output/run_<timestamp>/.
"""

import datetime
import json
import os

from dotenv import load_dotenv

load_dotenv()

import ollama_client
from stage00_kickoff.ana_kickoff import build_kickoff_brief, write_kickoff_brief
from stage01_retrieval.rag import chunk_gdd, embed_chunks_with_cache, retrieve_top_k
from stage02_generation.lorena_generate import generate_draft
from stage03_critique.heckler_critique import critique_draft
from stage04_status.ana_status import build_status_report, format_status_report_markdown

GDD_PATH = os.getenv("GDD_PATH", "../docs/game/the-last-spellroad-design.md")
OUTPUT_DIR = os.getenv("PIPELINE_OUTPUT_DIR", "output")
EMBEDDINGS_CACHE_PATH = os.getenv("PIPELINE_EMBEDDINGS_CACHE", ".embeddings_cache.json")
RETRIEVAL_K = 3


def run_pipeline(run_dir):
    os.makedirs(run_dir, exist_ok=True)

    brief = build_kickoff_brief()
    write_kickoff_brief(brief, os.path.join(run_dir, "00_ana_kickoff_brief.md"))

    with open(GDD_PATH) as f:
        gdd_text = f.read()
    chunks = chunk_gdd(gdd_text)
    chunk_vectors = embed_chunks_with_cache(chunks, EMBEDDINGS_CACHE_PATH, ollama_client.embed)

    retrieval_log_lines = ["# Retrieval Log", ""]
    lorena_lines = ["# Lorena -- Drafts", ""]
    heckler_lines = ["# Heckler -- Critique", ""]
    results = []

    for request in brief["requests"]:
        query_vector = ollama_client.embed(request["query"])
        retrieved = retrieve_top_k(query_vector, chunk_vectors, k=RETRIEVAL_K)

        if request["is_validation_test"]:
            draft = request["preset_draft"]
        else:
            draft = generate_draft(request, retrieved)

        critique = critique_draft(draft, request, retrieved)
        final_text = critique["corrected"] if critique["corrected"] else draft

        results.append(
            {
                "id": request["id"],
                "label": request["label"],
                "is_validation_test": request["is_validation_test"],
                "draft": draft,
                "critique": critique,
                "final_text": final_text,
            }
        )

        retrieval_log_lines += [
            f"## {request['label']}",
            "",
            f"**Query:** {request['query']}",
            "",
            "**Retrieved chunks:**",
            "",
        ]
        for chunk in retrieved:
            retrieval_log_lines.append(f"- `{chunk['heading']}` (score {chunk['score']:.3f})")
        retrieval_log_lines += ["", "**Output:**", "", final_text, ""]

        lorena_lines += [f"## {request['label']}", "", draft, ""]
        heckler_lines += [
            f"## {request['label']}",
            "",
            f"**Verdict:** {critique['verdict']}",
            f"**Issue:** {critique['issue'] or 'none'}",
            f"**Corrected:** {critique['corrected'] or 'none'}",
            "",
        ]

        if not request["is_validation_test"]:
            with open(os.path.join(run_dir, f"{request['id']}.md"), "w") as f:
                f.write(final_text)

    with open(os.path.join(run_dir, "01_retrieval_log.md"), "w") as f:
        f.write("\n".join(retrieval_log_lines))
    with open(os.path.join(run_dir, "02_lorena_drafts.md"), "w") as f:
        f.write("\n".join(lorena_lines))
    with open(os.path.join(run_dir, "03_heckler_critique.md"), "w") as f:
        f.write("\n".join(heckler_lines))

    status_report = build_status_report(results)
    with open(os.path.join(run_dir, "04_ana_status_report.md"), "w") as f:
        f.write(format_status_report_markdown(status_report))

    with open(os.path.join(run_dir, "bundle.json"), "w") as f:
        json.dump({"results": results, "status_report": status_report}, f, indent=2)

    return results, status_report


def main():
    ollama_client.wait_for_ollama()
    ollama_client.ensure_models_pulled()
    run_dir = os.path.join(OUTPUT_DIR, f"run_{datetime.datetime.now():%Y%m%d_%H%M%S}")
    results, status_report = run_pipeline(run_dir)
    print(f"\nDone. Wrote {len(results)} content items to {run_dir}/")
    print(status_report["summary"])


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd content-pipeline && python3 -m pytest tests/test_pipeline_integration.py -v`
Expected: PASS (1 test)

- [ ] **Step 5: Run the full test suite**

Run: `cd content-pipeline && python3 -m pytest -v`
Expected: PASS (all tests across every task so far, ~18 tests total)

- [ ] **Step 6: Commit**

```bash
git add content-pipeline/pipeline.py content-pipeline/tests/test_pipeline_integration.py
git commit -m "$(cat <<'EOF'
content-pipeline: wire all five stages together in pipeline.py

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Commit Assignment #3's pre-existing loose end (course repo, separate PR)

This is pre-existing, already-drafted work from a prior session that was never committed anywhere — not part of Assignment #4 itself, but a prerequisite so Assignment #4's pointer file (Task 9) doesn't make the submissions table skip from #2 to #4. Per the developer's explicit decision, this ships as its own small PR, independent of Assignment #4.

**Files (in `/Users/familia/Documents/Github/multi-agent-ai-in-game-development`):**
- Already present, uncommitted: `docs/submissions/assignment-03-agent-crew.md`
- Already present, uncommitted: `docs/submissions/context.md` (modified)

- [ ] **Step 1: Verify the uncommitted state matches expectations**

Run: `git -C /Users/familia/Documents/Github/multi-agent-ai-in-game-development status`
Expected: `docs/submissions/context.md` modified, `docs/submissions/assignment-03-agent-crew.md` untracked, nothing else uncommitted (aside from `.DS_Store` files). If anything else appears, stop and confirm with the developer before proceeding — do not silently include unrelated changes.

- [ ] **Step 2: Branch from the current state (carries the existing uncommitted work forward)**

```bash
cd /Users/familia/Documents/Github/multi-agent-ai-in-game-development
git checkout -b assignment-03-pointer-file
```

- [ ] **Step 3: Stage and commit**

```bash
git add docs/submissions/assignment-03-agent-crew.md docs/submissions/context.md
git commit -m "$(cat <<'EOF'
Add Assignment #3 pointer file (Build an Agent Crew)

The real deliverable is agent-crew/ in the game repo (code, not a GDD
extract) -- this is a pointer, per the repo-boundary exception for
code-based assignments.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Push and open a PR**

```bash
git push -u origin assignment-03-pointer-file
gh pr create --title "Add Assignment #3 pointer file (Agent Crew)" --body "$(cat <<'EOF'
## Summary
- Adds the Assignment #3 pointer file (the real deliverable lives in `the_last_spellroad/agent-crew/`, per the code-based-assignment repo-boundary exception).
- Updates `docs/submissions/context.md`'s table and Next Actions accordingly.

This work was drafted in an earlier session but never committed. Submitting it now, on its own, before Assignment #4's pointer file (which depends on this row existing in the table).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Checkpoint — wait for the developer to review and merge this PR before starting Task 9.**

---

### Task 9: Add Assignment #4 pointer file (course repo, separate PR)

**Files (in `/Users/familia/Documents/Github/multi-agent-ai-in-game-development`, branched fresh from `origin/main` after Task 8's PR is merged):**
- Create: `docs/submissions/assignment-04-content-pipeline.md`
- Modify: `docs/submissions/context.md`

- [ ] **Step 1: Fetch and branch from the now-updated main**

```bash
cd /Users/familia/Documents/Github/multi-agent-ai-in-game-development
git fetch origin
git checkout -b assignment-04-content-pipeline origin/main
```

- [ ] **Step 2: Write `docs/submissions/assignment-04-content-pipeline.md`**

```markdown
# Assignment #4: Dynamic Content Pipeline

**Due:** 2026-07-30, 11:59 ET.

## Where the actual deliverable lives

Like Assignment #3, this assignment's deliverable is runnable code, not a GDD extract -- so it lives in the game repo itself, per the same repo-boundary exception (confirmed with the developer 2026-07-28): **`the_last_spellroad/content-pipeline/`**.

- `content-pipeline/README.md` -- what was generated, the RAG evidence, the consistency-check catch, and the voice self-assessment (the graded "ReadMe" deliverable).
- `content-pipeline/stage00_kickoff/` through `stage04_status/` -- the five-stage RAG pipeline: Ana scopes the run, retrieval chunks+embeds+retrieves from the GDD, Lorena drafts, Heckler critiques and corrects, Ana closes with a status report.
- `content-pipeline/output/run_<timestamp>/` -- a real, captured run's output (evidence for the RAG Implementation and Consistency Checking rubric items).

Runs locally against Ollama (`llama3.2` + `nomic-embed-text`) via the same `ollama` service already used by Assignment #3's `agent-crew` in that repo's `docker-compose.yml` -- no paid API key.

## Rubric self-check

| Criterion | Where it's satisfied |
| --- | --- |
| Game-Anchored Source | The sole knowledge base is `docs/game/the-last-spellroad-design.md`, mounted read-only into the pipeline container -- no placeholder lore. |
| Content Fit | The three content types are named directly from a real, GDD-documented gap (Lorena's Phase-4 narrative pass, confirmed "not started" in the GDD's own Token Budget table): NPC dialogue, item/relic flavor text, mini-boss/Director trial narration. |
| RAG Implementation | `content-pipeline/output/run_<timestamp>/01_retrieval_log.md` shows query -> retrieved GDD chunk -> generated output, side by side, for every item. |
| Consistency Checking | `content-pipeline/output/run_<timestamp>/03_heckler_critique.md` -- an organic critique pass over the 3 real items, plus one deliberately seeded lore-break shown caught and corrected. |
| Voice Judgment | `content-pipeline/README.md` -- self-assessment of whether the output sounds like the game, plus a concrete prompt/retrieval tweak made along the way. |
```

- [ ] **Step 3: Update `docs/submissions/context.md`**

Read the file first, then add a new table row after the Assignment #3 row and update the "Next Actions" line — following the exact same pattern as the Assignment #3 row added in Task 8.

- [ ] **Step 4: Commit, push, open PR**

```bash
git add docs/submissions/assignment-04-content-pipeline.md docs/submissions/context.md
git commit -m "$(cat <<'EOF'
Add Assignment #4 pointer file (Dynamic Content Pipeline)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
git push -u origin assignment-04-content-pipeline
gh pr create --title "Add Assignment #4 pointer file (Content Pipeline)" --body "$(cat <<'EOF'
## Summary
- Adds the Assignment #4 pointer file (the real deliverable lives in `the_last_spellroad/content-pipeline/`).
- Updates `docs/submissions/context.md`'s table and Next Actions accordingly.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

### Task 10: Live run against real Ollama, capture evidence, write the README

**Files (in `the_last_spellroad`, on branch `worktree-content-pipeline-assignment-04`):**
- Create: `content-pipeline/output/run_<real-timestamp>/*` (committed as evidence, per the `agent-crew` precedent)
- Create: `content-pipeline/README.md`

- [ ] **Step 1: Bring up Ollama and pull the two required models**

```bash
cp content-pipeline/.env.example content-pipeline/.env
docker-compose up -d ollama
docker-compose run --rm content-pipeline python pipeline.py
```

This pulls `llama3.2` and `nomic-embed-text` on first run (a few minutes each) and writes a real run to `content-pipeline/output/run_<timestamp>/`.

- [ ] **Step 2: Inspect the real output**

Open, in order: `00_ana_kickoff_brief.md`, `01_retrieval_log.md`, `02_lorena_drafts.md`, `03_heckler_critique.md`, `04_ana_status_report.md`, and the three `<id>.md` files. Confirm:
- `01_retrieval_log.md` shows a real query, a real retrieved GDD chunk, and a real generated output for all 4 items (including the seeded one).
- `03_heckler_critique.md` shows the seeded `seeded_selftest` item's verdict. If it's `FAIL` with a `corrected` rewrite, the consistency-check loop worked as designed. **If it came back `PASS`** (the 3B model missed the seeded violation), do not treat this as a blocker — this is exactly the honest-limitations situation `agent-crew/README.md` already documents for this same model. Note it plainly in the README (Step 4) rather than re-running until it happens to catch it.

- [ ] **Step 3: If retrieval or generation quality looks weak, make one concrete tweak and re-run**

Likely candidates, pick whichever the real output actually shows a problem with:
- If a retrieval query surfaced an irrelevant chunk (check the `score` values in `01_retrieval_log.md`), reword that request's `query` string in `content-pipeline/stage00_kickoff/ana_kickoff.py` to use more GDD-specific vocabulary, then re-run.
- If a Lorena draft ran over its word limit, tighten `LORENA_SYSTEM_PROMPT` in `content-pipeline/stage02_generation/lorena_generate.py` (e.g. add an explicit "count your words before responding" instruction), then re-run.

Whatever tweak is actually made (there must be at least one, per the Voice Judgment rubric criterion), keep the before/after — this goes into the README's self-assessment section.

- [ ] **Step 4: Write `content-pipeline/README.md`**

Structure (fill every section with the real content from the actual run directory — do not fabricate example output):

```markdown
# Content Pipeline -- The Last Spellroad (Assignment #4)

## What this generates

[1 paragraph: the 3 content types, and the real GDD gap they fill --
copy the content_gap text from 00_ana_kickoff_brief.md]

## RAG evidence

[For each of the 3 real content items: the query, the top retrieved
chunk heading + a short excerpt, and the final output -- copied from
this run's 01_retrieval_log.md. Link to the full file.]

Full retrieval log: `output/run_<timestamp>/01_retrieval_log.md`

## Consistency check: what Heckler caught

[Report the seeded self-test's actual verdict from this run's
03_heckler_critique.md -- caught-and-corrected, or missed. Quote the
before/after if corrected. Also report whether the 3 organic items
passed clean or were flagged, honestly.]

## Does it sound like the game?

[Genuine self-assessment: read the 3 final outputs against the Lore
Premise's melancholic tone and the destroy-ending-only scope lock --
does it hold up? Where does a 3B local model's prose fall short of what
a larger model would produce?]

## A concrete tweak made

[The specific query-wording or prompt change from Step 3, with the
before/after it produced.]

## Known limitations

[Same honesty precedent as agent-crew/README.md -- name anything the
small local model got wrong, rather than curating around it.]

## Running it

    cp content-pipeline/.env.example content-pipeline/.env
    docker-compose up -d ollama
    docker-compose run --rm content-pipeline python pipeline.py
    docker-compose run --rm content-pipeline pytest -q
```

- [ ] **Step 5: Commit the real run and the README**

```bash
cd /Users/familia/Documents/Github/the_last_spellroad/.claude/worktrees/content-pipeline-assignment-04
git add content-pipeline/output content-pipeline/README.md
# If Step 3's tweak touched ana_kickoff.py or lorena_generate.py, add those too:
git add content-pipeline/stage00_kickoff/ana_kickoff.py content-pipeline/stage02_generation/lorena_generate.py
git commit -m "$(cat <<'EOF'
content-pipeline: real run + README (Assignment #4 graded deliverable)

Captured a real, uncurated run against local Ollama (llama3.2 +
nomic-embed-text) as evidence -- not cherry-picked. README documents
the RAG retrieval evidence, the consistency-check catch, and an honest
voice self-assessment.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Push and open a PR (the_last_spellroad repo)**

```bash
git push -u origin worktree-content-pipeline-assignment-04
gh pr create --title "Assignment #4: Dynamic Content Pipeline" --body "$(cat <<'EOF'
## Summary
- New `content-pipeline/` -- a 5-stage RAG pipeline (Ana kickoff -> retrieval -> Lorena generation -> Heckler critique+correction -> Ana status) that reads the GDD and generates 3 content types the game needs: NPC dialogue, item/relic flavor text, and mini-boss/Director trial narration.
- Runs against the existing local Ollama service (no paid API key), reusing Assignment #3's `agent-crew` infrastructure.
- `docs/agents/ana/backlog.md`: notes `content-pipeline` as a candidate-content source for backlog items 4.4/4.5, with new item 4.7 tracking developer-selected integration into shipped game data.
- Design doc: `docs/superpowers/specs/2026-07-28-content-pipeline-assignment-04-design.md`.

## Test plan
- [ ] `docker-compose run --rm content-pipeline pytest -q` passes
- [ ] `docker-compose run --rm content-pipeline python pipeline.py` produces a real run under `content-pipeline/output/`
- [ ] `content-pipeline/README.md` reviewed for accuracy against that run

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 7: Checkpoint — report the PR URL to the developer for review.**
