from stage04_status.ana_status import build_status_report, format_status_report_markdown


def _result(id, label, verdict, issue=None, corrected=None, is_validation_test=False):
    return {
        "id": id,
        "label": label,
        "is_validation_test": is_validation_test,
        "critique": {"verdict": verdict, "issue": issue, "corrected": corrected},
    }


def test_pass_item_is_shipped_and_validated():
    report = build_status_report([_result("a", "A", "PASS")])
    assert report["items"][0]["status"] == "shipped-and-validated"


def test_fail_with_correction_is_shipped_and_validated():
    report = build_status_report(
        [_result("a", "A", "FAIL", issue="too long", corrected="a shorter version")]
    )
    assert report["items"][0]["status"] == "shipped-and-validated"
    assert "too long" in report["items"][0]["note"]


def test_fail_without_correction_is_blocked_with_reason():
    report = build_status_report([_result("a", "A", "FAIL", issue="unparseable", corrected=None)])
    assert report["items"][0]["status"] == "blocked-with-reason"


def test_validation_test_caught_is_shipped_and_validated():
    report = build_status_report(
        [
            _result(
                "seeded_selftest",
                "Seeded violation",
                "FAIL",
                issue="named faction",
                corrected="fixed text",
                is_validation_test=True,
            )
        ]
    )
    assert report["items"][0]["status"] == "shipped-and-validated"


def test_validation_test_not_caught_is_blocked_with_reason():
    report = build_status_report(
        [_result("seeded_selftest", "Seeded violation", "PASS", is_validation_test=True)]
    )
    assert report["items"][0]["status"] == "blocked-with-reason"


def _retrieval_probe_result(retrieved_source_ids):
    return {
        "id": "opening_experience_retrieval_check",
        "label": "Canonical-corpus retrieval check",
        "is_validation_test": True,
        "validation_mode": "retrieval_probe",
        "expected_source_id": "opening-experience-brief",
        "critique": {"verdict": "NOT-CRITIQUED", "issue": None, "corrected": None},
        "retrieved": [
            {"heading": f"Section {i}", "source_id": source_id, "score": 0.5 + i / 100}
            for i, source_id in enumerate(retrieved_source_ids)
        ],
    }


def test_retrieval_probe_that_reached_its_source_is_shipped_and_validated():
    report = build_status_report(
        [_retrieval_probe_result(["gdd", "opening-experience-brief", "gdd"])]
    )
    item = report["items"][0]
    assert item["status"] == "shipped-and-validated"
    assert "opening-experience-brief" in item["note"]
    # The best-scoring hit is the one reported, not just the first one seen.
    assert "Section 1" in item["note"]


def test_retrieval_probe_that_missed_its_source_is_blocked_with_reason():
    """A silently-missing source is the failure this probe exists to catch --
    it must not be reported as validated just because nothing errored."""
    report = build_status_report([_retrieval_probe_result(["gdd", "gdd", "gdd"])])
    item = report["items"][0]
    assert item["status"] == "blocked-with-reason"
    assert "did NOT reach" in item["note"]
    assert "blocked-with-reason" in build_status_report(
        [_retrieval_probe_result(["gdd"])]
    )["summary"]


def test_summary_reflects_all_shipped_vs_blocked():
    all_pass = build_status_report([_result("a", "A", "PASS")])
    assert "confirmed functional" in all_pass["summary"]

    one_blocked = build_status_report(
        [_result("a", "A", "PASS"), _result("b", "B", "FAIL", issue="x", corrected=None)]
    )
    assert "blocked-with-reason" in one_blocked["summary"]


def test_format_status_report_markdown_includes_table_rows():
    report = build_status_report([_result("a", "Item A", "PASS")])
    markdown = format_status_report_markdown(report)
    assert "Item A" in markdown
    assert "shipped-and-validated" in markdown
