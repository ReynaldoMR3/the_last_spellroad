import math

from stage01_retrieval.corpus import load_canonical_sources
from stage01_retrieval.rag import (
    MAX_CHUNK_CHARS,
    chunk_markdown_sections,
    cosine_similarity,
    retrieve_top_k,
    embed_chunks_with_cache,
)

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


def test_chunk_markdown_sections_splits_on_h2_and_h3_headings():
    chunks = chunk_markdown_sections(SAMPLE_GDD)
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


def test_chunk_markdown_sections_splits_an_oversized_section_with_no_subheadings():
    """Regression test for the live 'Token Budget And Projections' chunk
    that grew to 10,039 chars with no `###`/`####` subheadings and started
    failing test_chunk_markdown_sections_max_chunk_size_stays_under_embedder_budget below.
    A section with no subheadings of its own must now be paragraph-split
    into "(part N/M)" sub-chunks instead of shipped as one oversized chunk."""
    paragraph = "This sentence repeats to pad out one paragraph of the section. " * 20
    oversized_body = "\n\n".join([paragraph] * 10)
    gdd = f"# Title\n\n## Big Section\n\n{oversized_body}\n\n## Next Section\n\nShort.\n"

    chunks = chunk_markdown_sections(gdd)

    big_section_parts = [c for c in chunks if c["heading"].startswith("Big Section")]
    assert len(big_section_parts) > 1, "expected the oversized section to split into parts"
    assert all(len(c["text"]) < MAX_CHUNK_CHARS + 200 for c in big_section_parts)
    assert big_section_parts[0]["heading"] == f"Big Section (part 1/{len(big_section_parts)})"
    assert big_section_parts[0]["text"].startswith("## Big Section (part 1/")
    assert "This sentence repeats" in big_section_parts[0]["text"]

    next_section = next(c for c in chunks if c["heading"] == "Next Section")
    assert "Short." in next_section["text"]


def test_chunk_markdown_sections_max_chunk_size_stays_under_embedder_budget():
    """Regression test for finding #3, now measured across the whole canonical
    corpus rather than the GDD alone: chunking relies on each source's own
    heading structure to keep sections small, plus paragraph-splitting as a
    backstop. Widening HEADING_RE to `#{2,4}` fixed the original Ollama
    embedding-batch-limit crash (a section with no `###` subheadings, only
    `####`, was ~13.7KB as one chunk). This test measures every REAL
    allowlisted source's actual chunk sizes and fails fast if an edit to any
    of them grows a chunk past a safe character budget, instead of crashing a
    live pipeline run against Ollama's embedding endpoint.
    """
    chunks, sources = load_canonical_sources()
    assert chunks, "expected the real canonical corpus to produce at least one chunk"
    assert sources, "expected the real manifest to list at least one source"

    largest = max(chunks, key=lambda c: len(c["text"]))
    assert len(largest["text"]) < MAX_SAFE_CHUNK_CHARS, (
        f"chunk '{largest['heading']}' (source '{largest['source_id']}') is "
        f"{len(largest['text'])} chars, >= the {MAX_SAFE_CHUNK_CHARS}-char safety "
        "budget -- this section has grown large enough to risk re-triggering the "
        "embedder batch-size crash chunk_markdown_sections's heading-based invariant "
        "is supposed to prevent. Add subheadings to that source's section, or "
        "revisit MAX_CHUNK_CHARS."
    )
