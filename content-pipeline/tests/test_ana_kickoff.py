from stage00_kickoff.ana_kickoff import (
    build_kickoff_brief,
    format_kickoff_brief_markdown,
    write_kickoff_brief,
)


def test_build_kickoff_brief_has_four_requests_one_validation_test():
    brief = build_kickoff_brief()
    assert len(brief["requests"]) == 4
    validation_tests = [r for r in brief["requests"] if r["is_validation_test"]]
    assert len(validation_tests) == 1
    assert validation_tests[0]["preset_draft"]


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
