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


def test_parse_critique_response_issue_starting_with_nonexistent():
    """Verify exact-match fix: 'Nonexistent...' is NOT treated as 'none'."""
    text = "VERDICT: FAIL\nISSUE: Nonexistent named faction referenced\nCORRECTED: Use generic terms"
    result = parse_critique_response(text)
    assert result["verdict"] == "FAIL"
    assert result["issue"] == "Nonexistent named faction referenced"
    assert result["corrected"] == "Use generic terms"


def test_parse_critique_response_lowercase_verdict():
    """Verify case-insensitive verdict parsing."""
    text = "verdict: pass\nISSUE: none\nCORRECTED: none"
    result = parse_critique_response(text)
    assert result["verdict"] == "PASS"
    assert result["issue"] is None
    assert result["corrected"] is None


def test_parse_critique_response_pass_with_leftover_issue_and_corrected_is_normalized():
    """A PASS verdict must normalize issue/corrected to None even if the
    model left stray leftover text in those fields (real observed
    behavior, not just a hypothetical) -- otherwise pipeline.py's
    final_text logic silently ships the leftover 'corrected' text over
    the actual draft despite a clean verdict.
    """
    text = (
        "VERDICT: PASS\n"
        "ISSUE: some leftover issue text\n"
        "CORRECTED: some leftover corrected text"
    )
    result = parse_critique_response(text)
    assert result == {"verdict": "PASS", "issue": None, "corrected": None}


def test_parse_critique_response_verdict_passable_not_matched():
    """Verify word-boundary anchoring: 'PASSABLE' does NOT match 'PASS'."""
    text = "VERDICT: PASSABLE\nISSUE: tone is not melancholic\nCORRECTED: rewritten"
    result = parse_critique_response(text)
    # Since 'PASSABLE' doesn't match the word-boundary anchored regex, falls back to FAIL
    assert result["verdict"] == "FAIL"
    assert result["issue"] == "Unparseable critic response"
    assert result["corrected"] is None
