"""Tests for the canonical-source allowlist (issue #130).

Three properties matter here, and each has a test that would actually fail
if the property broke:

1. The corpus is exactly the manifest -- allowlisted files are chunked, and
   files sitting right next to them in the docs tree (research, agent logs,
   pipeline output) are not.
2. Editing one source invalidates only that source's affected cached chunks.
3. The real checked-in manifest resolves, includes the approved
   opening-experience reference, and lists nothing from the excluded classes.
"""

import json

import pytest

from stage01_retrieval.corpus import (
    corpus_hash,
    load_canonical_sources,
    load_manifest,
    sha256_text,
)
from stage01_retrieval.rag import embed_chunks_with_cache

ALLOWED_A = """# Allowed A

## Alpha Section

Alpha body text about the mage.

## Beta Section

Beta body text about the Director.
"""

ALLOWED_B = """# Allowed B

## Gamma Section

Gamma body text about the opening road.
"""

NOT_ALLOWED = """# Raw Research Notes

## Scratch Section

SECRET_RESEARCH_MARKER -- half-finished notes that must never ground a
generated line.
"""


def _write_corpus(tmp_path):
    """A temp docs tree with two allowlistable sources and three files that
    represent the excluded classes the ticket names."""
    (tmp_path / "game").mkdir(parents=True)
    (tmp_path / "research").mkdir(parents=True)
    (tmp_path / "agents").mkdir(parents=True)
    (tmp_path / "game" / "a.md").write_text(ALLOWED_A)
    (tmp_path / "game" / "b.md").write_text(ALLOWED_B)
    (tmp_path / "research" / "notes.md").write_text(NOT_ALLOWED)
    (tmp_path / "agents" / "log.md").write_text(NOT_ALLOWED)
    (tmp_path / "generated-output.md").write_text(NOT_ALLOWED)
    return tmp_path


def _write_manifest(tmp_path, sources):
    manifest_path = tmp_path / "canonical_sources.json"
    manifest_path.write_text(json.dumps({"sources": sources}))
    return str(manifest_path)


def test_only_allowlisted_files_are_loaded_into_the_corpus(tmp_path):
    docs_root = _write_corpus(tmp_path / "docs")
    manifest_path = _write_manifest(
        tmp_path,
        [{"id": "a", "path": "game/a.md"}, {"id": "b", "path": "game/b.md"}],
    )

    chunks, sources = load_canonical_sources(manifest_path, str(docs_root))

    assert {s["id"] for s in sources} == {"a", "b"}
    assert {c["source_id"] for c in chunks} == {"a", "b"}
    assert [c["heading"] for c in chunks] == ["Alpha Section", "Beta Section", "Gamma Section"]
    # The excluded files sit in the same docs tree and are still never read.
    assert not any("SECRET_RESEARCH_MARKER" in c["text"] for c in chunks)
    assert not any(
        c["source_path"] in ("research/notes.md", "agents/log.md", "generated-output.md")
        for c in chunks
    )


def test_removing_a_source_from_the_manifest_removes_its_chunks(tmp_path):
    """The inclusion test above passes trivially if chunking ignored the
    manifest and globbed everything under game/. This one pins the manifest
    as the actual decider: same docs tree, one fewer allowlist entry."""
    docs_root = _write_corpus(tmp_path / "docs")
    manifest_path = _write_manifest(tmp_path, [{"id": "a", "path": "game/a.md"}])

    chunks, sources = load_canonical_sources(manifest_path, str(docs_root))

    assert [s["id"] for s in sources] == ["a"]
    assert {c["source_id"] for c in chunks} == {"a"}
    assert not any("Gamma body text" in c["text"] for c in chunks)


def test_manifest_cannot_traverse_out_of_docs_root(tmp_path):
    """`../content-pipeline/output/run_x/bundle.json` is exactly how generated
    output would get silently promoted into its own grounding corpus."""
    docs_root = _write_corpus(tmp_path / "docs")
    manifest_path = _write_manifest(
        tmp_path, [{"id": "sneaky", "path": "../generated-output.md"}]
    )

    with pytest.raises(ValueError, match="traverses out of DOCS_ROOT"):
        load_canonical_sources(manifest_path, str(docs_root))


def test_manifest_rejects_absolute_paths(tmp_path):
    docs_root = _write_corpus(tmp_path / "docs")
    manifest_path = _write_manifest(
        tmp_path, [{"id": "sneaky", "path": "/etc/hosts"}]
    )

    with pytest.raises(ValueError, match="absolute path"):
        load_canonical_sources(manifest_path, str(docs_root))


def test_manifest_rejects_duplicate_source_ids(tmp_path):
    manifest_path = _write_manifest(
        tmp_path,
        [{"id": "a", "path": "game/a.md"}, {"id": "a", "path": "game/b.md"}],
    )

    with pytest.raises(ValueError, match="duplicate canonical source id"):
        load_manifest(manifest_path)


def test_missing_allowlisted_file_fails_loudly(tmp_path):
    docs_root = _write_corpus(tmp_path / "docs")
    manifest_path = _write_manifest(tmp_path, [{"id": "gone", "path": "game/gone.md"}])

    with pytest.raises(FileNotFoundError, match="listed in the manifest but missing"):
        load_canonical_sources(manifest_path, str(docs_root))


def test_source_snapshot_records_path_and_whole_file_content_hash(tmp_path):
    docs_root = _write_corpus(tmp_path / "docs")
    manifest_path = _write_manifest(tmp_path, [{"id": "a", "path": "game/a.md"}])

    _, sources = load_canonical_sources(manifest_path, str(docs_root))

    assert sources[0]["path"] == "game/a.md"
    assert sources[0]["content_hash"] == sha256_text(ALLOWED_A)
    assert sources[0]["chunk_count"] == 2


def test_corpus_hash_changes_on_edit_and_ignores_manifest_ordering(tmp_path):
    docs_root = _write_corpus(tmp_path / "docs")
    both = [{"id": "a", "path": "game/a.md"}, {"id": "b", "path": "game/b.md"}]
    manifest_path = _write_manifest(tmp_path, both)
    _, sources = load_canonical_sources(manifest_path, str(docs_root))
    baseline = corpus_hash(sources)

    assert corpus_hash(list(reversed(sources))) == baseline, "ordering must not change the hash"

    (docs_root / "game" / "b.md").write_text(ALLOWED_B + "\n## Delta Section\n\nNew text.\n")
    _, edited_sources = load_canonical_sources(manifest_path, str(docs_root))
    assert corpus_hash(edited_sources) != baseline


def test_editing_one_source_only_re_embeds_that_sources_changed_chunks(tmp_path):
    """Per-chunk cache invalidation, per source. Cache keys are sha256 of the
    chunk text, so an edit to source B must not cost a single re-embed of
    source A's chunks."""
    docs_root = _write_corpus(tmp_path / "docs")
    manifest_path = _write_manifest(
        tmp_path,
        [{"id": "a", "path": "game/a.md"}, {"id": "b", "path": "game/b.md"}],
    )
    cache_path = str(tmp_path / "cache.json")
    embedded = []

    def fake_embed(text):
        embedded.append(text)
        return [float(len(text) % 7), float(len(text) % 5)]

    chunks, _ = load_canonical_sources(manifest_path, str(docs_root))
    embed_chunks_with_cache(chunks, cache_path, fake_embed)
    first_pass_count = len(embedded)
    assert first_pass_count == 3
    embedded.clear()

    # Edit source B only: rewrite its one section's body, and add a section.
    (docs_root / "game" / "b.md").write_text(
        "# Allowed B\n\n## Gamma Section\n\nGamma body text, rewritten.\n"
        "\n## Delta Section\n\nDelta body text.\n"
    )
    chunks, _ = load_canonical_sources(manifest_path, str(docs_root))
    embed_chunks_with_cache(chunks, cache_path, fake_embed)

    assert len(embedded) == 2, f"expected only source b's 2 chunks re-embedded, got {embedded}"
    assert all("Alpha body text" not in text for text in embedded)
    assert all("Beta body text" not in text for text in embedded)
    assert any("Gamma body text, rewritten." in text for text in embedded)
    assert any("Delta body text." in text for text in embedded)


def test_real_checked_in_manifest_loads_and_includes_the_opening_experience_brief():
    """The real corpus, resolved the same way pipeline.py resolves it."""
    chunks, sources = load_canonical_sources()

    by_id = {s["id"]: s for s in sources}
    assert "gdd" in by_id, "the GDD must stay in the canonical corpus"
    assert by_id["gdd"]["path"] == "game/the-last-spellroad-design.md"

    brief = by_id.get("opening-experience-brief")
    assert brief, "issue #130 requires the approved opening-experience reference in the corpus"
    assert brief["path"] == "agents/_reference/opening-experience-brief.md"
    assert brief["chunk_count"] >= 1
    assert len(brief["content_hash"]) == 64

    brief_chunks = [c for c in chunks if c["source_id"] == "opening-experience-brief"]
    assert any("Runes Awake" in c["text"] for c in brief_chunks), (
        "the brief's approved art direction must be present in its chunk text -- this is "
        "the text the opening-experience retrieval probe is supposed to find"
    )


def test_real_manifest_excludes_research_logs_and_pipeline_output():
    """Guards the ticket's exclusion rule against a future careless promotion."""
    forbidden_markers = ("log.md", "backlog.md", "/output/", "output/run_", "research/")
    for entry in load_manifest():
        path = entry["path"]
        for marker in forbidden_markers:
            assert marker not in path, (
                f"canonical source {entry['id']!r} ({path}) looks like an agent log, "
                "backlog, research note, or pipeline output -- those are excluded from the "
                "RAG corpus unless deliberately promoted, and a promotion needs its own "
                "review, not a silent manifest edit"
            )
