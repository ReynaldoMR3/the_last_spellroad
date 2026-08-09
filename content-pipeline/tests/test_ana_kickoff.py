from stage00_kickoff.ana_kickoff import (
    build_kickoff_brief,
    format_kickoff_brief_markdown,
    write_kickoff_brief,
)


def test_build_kickoff_brief_has_three_graded_requests_and_two_non_graded_checks():
    brief = build_kickoff_brief()
    assert len(brief["requests"]) == 5

    graded = [r for r in brief["requests"] if not r["is_validation_test"]]
    assert len(graded) == 3, "the 3 graded content items must stay graded"

    validation_tests = [r for r in brief["requests"] if r["is_validation_test"]]
    assert len(validation_tests) == 2
    assert all(r["preset_draft"] for r in validation_tests)
    assert {r["validation_mode"] for r in validation_tests} == {
        "seeded_violation",
        "retrieval_probe",
    }


def test_retrieval_probe_request_names_the_source_it_must_reach():
    """The probe is only meaningful if it declares which canonical source it
    expects retrieval to surface -- stage04 grades it against that id."""
    brief = build_kickoff_brief()
    probe = next(
        r for r in brief["requests"] if r.get("validation_mode") == "retrieval_probe"
    )
    assert probe["expected_source_id"] == "opening-experience-brief"
    assert probe["instruction"] is None, "a probe must not be sent to the generator"
    assert probe["query"]


def test_format_kickoff_brief_markdown_marks_the_retrieval_probe_as_non_graded():
    markdown = format_kickoff_brief_markdown(build_kickoff_brief())
    assert "Retrieval check, not a graded output" in markdown
    assert "opening-experience-brief" in markdown


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
