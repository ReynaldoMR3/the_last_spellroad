import hashlib
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

SAMPLE_OPENING_BRIEF = """# Level 1 Opening Experience Brief

## Shared target

The art direction is Runes Awake at Arcane Momentum intensity.

## Narrative and musical direction

Favor fast plucked strings, celesta, and an ascending magical motif.
"""


def fake_embed(text):
    return [float(len(text) % 7), float(len(text) % 5)]


def fake_generate(prompt, system=None, model=None, temperature=None):
    if "Heckler" in (system or ""):
        return "VERDICT: PASS\nISSUE: none\nCORRECTED: none"
    return "A generated line of flavor text."


def _write_temp_corpus(tmp_path):
    """Stand up a temp docs tree + manifest so the integration suite exercises
    the same manifest-loading entry point production uses, instead of a single
    hard-coded GDD path."""
    docs_root = tmp_path / "docs"
    (docs_root / "game").mkdir(parents=True)
    (docs_root / "agents" / "_reference").mkdir(parents=True)
    (docs_root / "game" / "gdd.md").write_text(SAMPLE_GDD)
    (docs_root / "agents" / "_reference" / "opening.md").write_text(SAMPLE_OPENING_BRIEF)

    manifest_path = tmp_path / "canonical_sources.json"
    manifest_path.write_text(
        json.dumps(
            {
                "sources": [
                    {"id": "gdd", "path": "game/gdd.md"},
                    {
                        "id": "opening-experience-brief",
                        "path": "agents/_reference/opening.md",
                    },
                ]
            }
        )
    )
    return str(manifest_path), str(docs_root)


def test_run_pipeline_writes_all_expected_output_files(tmp_path):
    manifest_path, docs_root = _write_temp_corpus(tmp_path)
    run_dir = tmp_path / "run_test"

    with patch.object(pipeline, "CANONICAL_SOURCES_PATH", manifest_path), \
         patch.object(pipeline, "DOCS_ROOT", docs_root), \
         patch.object(pipeline.ollama_client, "embed", side_effect=fake_embed), \
         patch.object(pipeline.ollama_client, "generate", side_effect=fake_generate), \
         patch.object(pipeline, "EMBEDDINGS_CACHE_PATH", str(tmp_path / "cache.json")):
        results, status_report = pipeline.run_pipeline(str(run_dir))

    assert len(results) == 5
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
    assert not os.path.exists(run_dir / "opening_experience_retrieval_check.md")

    bundle = json.loads((run_dir / "bundle.json").read_text())
    assert bundle["status_report"]["summary"]

    # Finding #2: the retrieval log must show actual retrieved chunk TEXT
    # (not just headings+scores), and bundle.json's results must persist
    # that text too so the README can quote real retrieved chunks as RAG
    # evidence.
    retrieval_log = (run_dir / "01_retrieval_log.md").read_text()
    assert "The Director traps the mage in the Spellroad." in retrieval_log
    # ...and now which canonical source each chunk came from.
    assert "source `gdd`" in retrieval_log

    for item in bundle["results"]:
        assert "retrieved" in item
        assert len(item["retrieved"]) > 0
        for chunk in item["retrieved"]:
            assert "heading" in chunk
            assert "score" in chunk
            assert "text_excerpt" in chunk
            assert chunk["text_excerpt"]


def test_bundle_records_the_canonical_corpus_snapshot_and_output_hashes(tmp_path):
    """Issue #130: a finished bundle has to be able to name the exact corpus
    snapshot, models, prompts/params, retrieval results, and output hashes it
    was produced from -- otherwise a run's grounding claim isn't auditable
    after the fact."""
    manifest_path, docs_root = _write_temp_corpus(tmp_path)
    run_dir = tmp_path / "run_test"

    with patch.object(pipeline, "CANONICAL_SOURCES_PATH", manifest_path), \
         patch.object(pipeline, "DOCS_ROOT", docs_root), \
         patch.object(pipeline.ollama_client, "embed", side_effect=fake_embed), \
         patch.object(pipeline.ollama_client, "generate", side_effect=fake_generate), \
         patch.object(pipeline, "EMBEDDINGS_CACHE_PATH", str(tmp_path / "cache.json")):
        results, _ = pipeline.run_pipeline(str(run_dir))

    bundle = json.loads((run_dir / "bundle.json").read_text())
    provenance = bundle["provenance"]

    assert provenance["embedding_model"] == pipeline.ollama_client.EMBEDDING_MODEL
    assert provenance["generation_model"] == pipeline.ollama_client.GENERATION_MODEL
    assert provenance["generation_temperature"] == pipeline.ollama_client.DEFAULT_TEMPERATURE
    assert provenance["retrieval_k"] == pipeline.RETRIEVAL_K
    assert provenance["docs_root"] == docs_root
    assert provenance["canonical_sources_manifest"] == manifest_path
    assert len(provenance["corpus_hash"]) == 64
    assert provenance["total_chunks"] > 0

    snapshot = {s["id"]: s for s in provenance["sources"]}
    assert set(snapshot) == {"gdd", "opening-experience-brief"}
    assert snapshot["gdd"]["path"] == "game/gdd.md"
    assert snapshot["gdd"]["content_hash"] == hashlib.sha256(
        SAMPLE_GDD.encode("utf-8")
    ).hexdigest()
    assert snapshot["opening-experience-brief"]["content_hash"] == hashlib.sha256(
        SAMPLE_OPENING_BRIEF.encode("utf-8")
    ).hexdigest()

    for item in bundle["results"]:
        assert item["query"]
        assert item["output_hash"] == hashlib.sha256(
            item["final_text"].encode("utf-8")
        ).hexdigest()
        for chunk in item["retrieved"]:
            assert chunk["source_id"] in snapshot
            assert chunk["source_path"] == snapshot[chunk["source_id"]]["path"]
            assert len(chunk["chunk_hash"]) == 64

    graded = [item for item in bundle["results"] if not item["is_validation_test"]]
    assert graded, "expected at least one graded (non-validation) request"
    for item in graded:
        assert item["instruction"]
        assert item["generation"]["model"] == pipeline.ollama_client.GENERATION_MODEL
        assert item["generation"]["temperature"] == pipeline.ollama_client.DEFAULT_TEMPERATURE
        assert item["generation"]["system_prompt"]
        # The generation prompt has to carry the retrieved grounding, or the
        # recorded prompt wouldn't actually explain the recorded output.
        assert item["retrieved"][0]["heading"] in item["generation"]["prompt"]


def test_retrieval_probe_is_graded_on_reaching_its_expected_source(tmp_path):
    """The opening-experience probe exists to prove the allowlist widened the
    corpus. It must be graded on the retrieval result itself, not on Heckler,
    and a manifest that no longer reaches the brief must show up as
    blocked-with-reason rather than passing quietly."""
    manifest_path, docs_root = _write_temp_corpus(tmp_path)
    run_dir = tmp_path / "run_test"

    with patch.object(pipeline, "CANONICAL_SOURCES_PATH", manifest_path), \
         patch.object(pipeline, "DOCS_ROOT", docs_root), \
         patch.object(pipeline.ollama_client, "embed", side_effect=fake_embed), \
         patch.object(pipeline.ollama_client, "generate", side_effect=fake_generate), \
         patch.object(pipeline, "EMBEDDINGS_CACHE_PATH", str(tmp_path / "cache.json")):
        results, status_report = pipeline.run_pipeline(str(run_dir))

    probe = next(r for r in results if r["id"] == "opening_experience_retrieval_check")
    assert probe["expected_source_id"] == "opening-experience-brief"
    assert probe["critique"]["verdict"] == "NOT-CRITIQUED", (
        "a retrieval probe must not spend a critic call on a placeholder draft"
    )

    probe_status = next(
        item for item in status_report["items"] if item["id"] == "opening_experience_retrieval_check"
    )
    # Whether the fake embedder happens to rank the brief into top-3 is not the
    # point; that the status is derived from the retrieval result is.
    reached = any(
        chunk["source_id"] == "opening-experience-brief" for chunk in probe["retrieved"]
    )
    if reached:
        assert probe_status["status"] == "shipped-and-validated"
        assert "opening-experience-brief" in probe_status["note"]
    else:
        assert probe_status["status"] == "blocked-with-reason"
        assert "did NOT reach" in probe_status["note"]


def fake_critique_draft_fail_for_trial_narration(draft, request, retrieved_chunks):
    """A smarter fake critic (monkeypatches critique_draft directly, as
    finding #4 suggests): returns a real FAIL+CORRECTED for the
    trial_narration item and PASS/none/none for everything else, so the
    integration suite exercises the code path bug #1 lived in (final_text
    must pick up the corrected text on a genuine FAIL, and must NOT pick
    up leftover corrected text on a PASS).
    """
    if request["id"] == "trial_narration":
        return {
            "verdict": "FAIL",
            "issue": "tone is not melancholic enough",
            "corrected": "A truly corrected, melancholic replacement line.",
        }
    return {"verdict": "PASS", "issue": None, "corrected": None}


def test_run_pipeline_uses_corrected_text_on_fail_verdict(tmp_path):
    """Finding #4: no prior integration test exercised the FAIL+CORRECTED
    path through pipeline.py's final_text logic -- the fake critic always
    returned PASS/none/none. This directly covers that path.
    """
    manifest_path, docs_root = _write_temp_corpus(tmp_path)
    run_dir = tmp_path / "run_test"

    with patch.object(pipeline, "CANONICAL_SOURCES_PATH", manifest_path), \
         patch.object(pipeline, "DOCS_ROOT", docs_root), \
         patch.object(pipeline.ollama_client, "embed", side_effect=fake_embed), \
         patch.object(pipeline.ollama_client, "generate", side_effect=fake_generate), \
         patch.object(pipeline, "critique_draft", side_effect=fake_critique_draft_fail_for_trial_narration), \
         patch.object(pipeline, "EMBEDDINGS_CACHE_PATH", str(tmp_path / "cache.json")):
        results, status_report = pipeline.run_pipeline(str(run_dir))

    trial_narration_text = (run_dir / "trial_narration.md").read_text()
    assert "A truly corrected, melancholic replacement line." in trial_narration_text
    assert "A generated line of flavor text." not in trial_narration_text

    trial_result = next(r for r in results if r["id"] == "trial_narration")
    assert trial_result["critique"]["verdict"] == "FAIL"
    assert trial_result["final_text"] == "A truly corrected, melancholic replacement line."

    npc_result = next(r for r in results if r["id"] == "npc_dialogue")
    assert npc_result["critique"]["verdict"] == "PASS"
    assert npc_result["final_text"] == npc_result["draft"]
