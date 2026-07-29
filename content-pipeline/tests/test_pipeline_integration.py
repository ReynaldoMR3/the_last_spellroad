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
