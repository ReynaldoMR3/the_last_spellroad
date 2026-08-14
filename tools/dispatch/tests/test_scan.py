import json
import subprocess

from stage00_scan.scan import scan


def _fake_run_factory(issue_prs):
    """issue_prs: {issue_number: [{"number": n, "state": "OPEN"|"MERGED"|"CLOSED"}]}"""

    def fake_run(cmd, **kwargs):
        if cmd[:3] == ["gh", "issue", "list"]:
            issues = [
                {"number": n, "title": f"Issue {n}", "body": "body", "labels": [], "comments": []}
                for n in issue_prs
            ]
            return subprocess.CompletedProcess(cmd, 0, json.dumps(issues), "")
        if cmd[:3] == ["gh", "pr", "list"]:
            search_arg = cmd[cmd.index("--search") + 1]
            issue_number = int(search_arg.split(" ")[0])
            return subprocess.CompletedProcess(
                cmd, 0, json.dumps(issue_prs[issue_number]), ""
            )
        raise AssertionError(f"unexpected command: {cmd}")

    return fake_run


def test_scan_marks_issue_in_flight_when_open_pr_exists(monkeypatch):
    monkeypatch.setattr(
        subprocess, "run", _fake_run_factory({195: [{"number": 300, "state": "OPEN"}]})
    )
    result = scan()
    assert result == [
        {
            "number": 195,
            "title": "Issue 195",
            "body": "body",
            "labels": [],
            "comments": [],
            "in_flight": True,
        }
    ]


def test_scan_marks_issue_not_in_flight_when_no_pr(monkeypatch):
    monkeypatch.setattr(subprocess, "run", _fake_run_factory({195: []}))
    result = scan()
    assert result[0]["in_flight"] is False


def test_scan_ignores_closed_prs(monkeypatch):
    monkeypatch.setattr(
        subprocess, "run", _fake_run_factory({195: [{"number": 300, "state": "CLOSED"}]})
    )
    result = scan()
    assert result[0]["in_flight"] is False
