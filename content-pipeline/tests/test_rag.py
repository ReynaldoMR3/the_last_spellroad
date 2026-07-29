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
