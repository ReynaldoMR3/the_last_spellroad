import math
import os

from stage01_retrieval.rag import (
    chunk_gdd,
    cosine_similarity,
    retrieve_top_k,
    embed_chunks_with_cache,
)

# Resolve the GDD path the same way pipeline.py does: via GDD_PATH when set
# (docker-compose sets this to an absolute in-container path), falling back
# to the host-relative path when running outside Docker (cwd == content-pipeline/).
REAL_GDD_PATH = os.getenv("GDD_PATH", "../docs/game/the-last-spellroad-design.md")
# ~4.25 chars/token is the observed ratio for this GDD's prose (the original
# crash was a ~13.7KB / 3220-token chunk against Ollama's nomic-embed-text
# 2048-token embedding-batch limit -- 13700 / 3220 ~= 4.25). That puts the
# real safe ceiling at ~2048 * 4.25 ~= 8700 chars, so the budget below is set
# safely under that, not just under the original crash size.
MAX_SAFE_CHUNK_CHARS = 8000


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


def test_chunk_gdd_max_chunk_size_stays_under_embedder_budget():
    """Regression test for finding #3: chunk_gdd has no invariant enforcing
    a max chunk size. It relies entirely on the GDD's own heading structure
    to keep sections small -- widening HEADING_RE to `#{2,4}` fixed the
    original Ollama embedding-batch-limit crash (a section with no `###`
    subheadings, only `####`, was ~13.7KB as one chunk), but chunk-splitting
    itself is still not implemented. This test measures the REAL GDD's
    actual chunk sizes after chunking and fails fast if a future GDD edit
    grows a chunk past a safe character budget, instead of crashing a live
    pipeline run against Ollama's embedding endpoint.
    """
    with open(REAL_GDD_PATH) as f:
        gdd_text = f.read()

    chunks = chunk_gdd(gdd_text)
    assert chunks, "expected the real GDD to produce at least one chunk"

    largest = max(chunks, key=lambda c: len(c["text"]))
    assert len(largest["text"]) < MAX_SAFE_CHUNK_CHARS, (
        f"chunk '{largest['heading']}' is {len(largest['text'])} chars, "
        f">= the {MAX_SAFE_CHUNK_CHARS}-char safety budget -- this GDD "
        "section has grown large enough to risk re-triggering the "
        "embedder batch-size crash chunk_gdd's heading-based invariant "
        "is supposed to prevent. Add subheadings to the GDD section, or "
        "implement chunk-splitting in chunk_gdd."
    )
