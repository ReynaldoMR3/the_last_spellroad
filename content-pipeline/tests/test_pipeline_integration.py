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

    # Finding #2: the retrieval log must show actual retrieved chunk TEXT
    # (not just headings+scores), and bundle.json's results must persist
    # that text too so the README can quote real retrieved chunks as RAG
    # evidence.
    retrieval_log = (run_dir / "01_retrieval_log.md").read_text()
    assert "The Director traps the mage in the Spellroad." in retrieval_log

    for item in bundle["results"]:
        assert "retrieved" in item
        assert len(item["retrieved"]) > 0
        for chunk in item["retrieved"]:
            assert "heading" in chunk
            assert "score" in chunk
            assert "text_excerpt" in chunk
            assert chunk["text_excerpt"]


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
    gdd_path = tmp_path / "gdd.md"
    gdd_path.write_text(SAMPLE_GDD)
    run_dir = tmp_path / "run_test"

    with patch.object(pipeline, "GDD_PATH", str(gdd_path)), \
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
