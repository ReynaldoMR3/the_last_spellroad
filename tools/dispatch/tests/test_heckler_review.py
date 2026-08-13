from stage05_review.heckler_review import (
    build_heckler_prompt,
    parse_findings,
    run_heckler_review,
)


def test_build_heckler_prompt_includes_diff_and_agent_md():
    prompt = build_heckler_prompt("+ const x = 1", "Heckler critiques grounded in specifics.")
    assert "+ const x = 1" in prompt
    assert "Heckler critiques grounded in specifics." in prompt
    assert "BLOCKING:" in prompt
    assert "MINOR:" in prompt


def test_parse_findings_splits_blocking_and_minor():
    raw = (
        "BLOCKING: HP is never reset between waves\n"
        "MINOR: cooldown text could be clearer\n"
        "BLOCKING: master-tier discount applied twice\n"
    )
    findings = parse_findings(raw)
    assert findings == {
        "blocking": ["HP is never reset between waves", "master-tier discount applied twice"],
        "minor": ["cooldown text could be clearer"],
    }


def test_parse_findings_handles_no_findings():
    assert parse_findings("Looks clean, no issues found.") == {"blocking": [], "minor": []}


def test_run_heckler_review_wires_backend_and_parses_output():
    class FakeBackend:
        name = "codex"

        def run(self, prompt, cwd):
            return {"ok": True, "stdout": "BLOCKING: real bug here\n", "stderr": ""}

    result = run_heckler_review("+ diff", "heckler contract", FakeBackend())

    assert result["backend"] == "codex"
    assert result["blocking_findings"] == ["real bug here"]
    assert result["minor_findings"] == []
    assert result["raw"] == "BLOCKING: real bug here\n"
