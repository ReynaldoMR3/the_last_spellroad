import json
from unittest.mock import MagicMock

import run as run_module


def test_run_writes_manifest_and_skips_in_flight_issue(tmp_path, monkeypatch):
    monkeypatch.setattr(run_module, "RUNS_DIR", tmp_path)

    monkeypatch.setattr(
        run_module, "scan",
        lambda: [{"number": 1, "title": "in flight", "body": "b", "labels": [], "comments": [], "in_flight": True}],
    )

    manifest = run_module.run(dry_run=True, run_id="test-run")

    assert manifest["dry_run"] is True
    assert manifest["issues"] == [{"number": 1, "status": "skipped-in-flight"}]
    assert json.loads((tmp_path / "test-run" / "manifest.json").read_text()) == manifest


def test_run_dispatches_and_merges_dry_run_issue(tmp_path, monkeypatch):
    monkeypatch.setattr(run_module, "RUNS_DIR", tmp_path)

    issue = {"number": 2, "title": "Loomwright: fix cone bug", "body": "b", "labels": [], "comments": [], "in_flight": False}
    monkeypatch.setattr(run_module, "scan", lambda: [issue])
    monkeypatch.setattr(run_module, "probe_registry", lambda registry: registry)
    monkeypatch.setattr(run_module, "load_registry", lambda: {"codex": {}, "ollama": {}})

    monkeypatch.setattr(
        run_module, "dispatch_issue",
        lambda issue, agent, agent_md, context_md, backend: {
            "issue_number": 2, "worktree_path": str(tmp_path / "wt-2"),
            "branch": "agent/dispatch-issue-2", "backend": backend.name,
            "ok": True, "stdout_tail": "",
        },
    )
    monkeypatch.setattr(
        run_module, "run_verification",
        lambda cwd: {"typecheck": "pass", "build": "pass", "test": "pass", "all_passed": True, "command_log": ["docker-compose run --rm game npm test"]},
    )
    monkeypatch.setattr(
        run_module, "run_security_gate",
        lambda cwd, command_log, policy: {"passed": True, "violations": []},
    )
    # The mocked worktree_path above doesn't exist as a real directory, and
    # run.py now calls diff_text() for real (deviation 2) -- mock it here too
    # so this test stays focused on the merge-decision flow, not on git.
    # Critical 1b: an empty diff is now treated as a no-op and blocked
    # before verification, so this diff must be non-empty to reach the
    # merge-decision flow this test actually exercises. changed_files is
    # also mocked (Important 4's pre-verification denylist check) since the
    # worktree path isn't a real git repo.
    monkeypatch.setattr(run_module, "diff_text", lambda cwd: "+ const x = 1\n")
    monkeypatch.setattr(run_module, "changed_files", lambda cwd: ["src/scenes/Foo.ts"])
    monkeypatch.setattr(
        run_module, "run_heckler_review",
        # Deviation from brief: run_heckler_review's return dict now includes
        # an "ok" key (propagated from the backend's own `ok` field, added in
        # a Task 8 fix round). merge_gate.decide() treats a missing "ok" as
        # "review didn't run" and blocks -- so this mock must include it to
        # preserve the test's expected "would merge" outcome.
        lambda diff, heckler_agent_md, backend: {
            "backend": "codex", "ok": True, "blocking_findings": [], "minor_findings": [], "raw": "",
        },
    )

    manifest = run_module.run(dry_run=True, run_id="test-run-2")

    assert manifest["issues"][0]["number"] == 2
    assert manifest["issues"][0]["agent"] == "loomwright"
    assert "would merge" in manifest["issues"][0]["action"]


def test_process_issue_loads_real_agent_docs_and_diff(tmp_path, monkeypatch):
    # Deviation from brief: _process_issue must load real AGENT.md/CONTEXT.md
    # content (via _read_agent_doc) instead of passing "" to dispatch_issue,
    # and must pass the real post-dispatch diff (via diff_text) to
    # run_heckler_review instead of "". Otherwise the backend never receives
    # the target agent's contract and Heckler always critiques an empty diff.
    monkeypatch.setattr(run_module, "RUNS_DIR", tmp_path)

    issue = {"number": 3, "title": "Loomwright: fix cone bug", "body": "b", "labels": [], "comments": [], "in_flight": False}
    monkeypatch.setattr(run_module, "scan", lambda: [issue])
    monkeypatch.setattr(run_module, "probe_registry", lambda registry: registry)
    monkeypatch.setattr(run_module, "load_registry", lambda: {"codex": {}, "ollama": {}})

    monkeypatch.setattr(
        run_module, "_read_agent_doc",
        lambda agent, filename: f"FIXTURE-{agent}-{filename}",
    )
    monkeypatch.setattr(run_module, "diff_text", lambda cwd: "FIXTURE-DIFF")
    # Important 4's pre-verification denylist check runs changed_files()
    # against the (non-real) worktree path -- mock it clean so this test
    # stays focused on doc/diff plumbing, not on git.
    monkeypatch.setattr(run_module, "changed_files", lambda cwd: [])

    dispatch_calls = []
    heckler_calls = []

    def fake_dispatch_issue(issue, agent, agent_md, context_md, backend):
        dispatch_calls.append({"agent_md": agent_md, "context_md": context_md})
        return {
            "issue_number": issue["number"], "worktree_path": str(tmp_path / "wt-3"),
            "branch": "agent/dispatch-issue-3", "backend": backend.name,
            "ok": True, "stdout_tail": "",
        }

    def fake_run_heckler_review(diff, heckler_agent_md, backend):
        heckler_calls.append({"diff": diff, "heckler_agent_md": heckler_agent_md})
        return {"backend": "codex", "ok": True, "blocking_findings": [], "minor_findings": [], "raw": ""}

    monkeypatch.setattr(run_module, "dispatch_issue", fake_dispatch_issue)
    monkeypatch.setattr(
        run_module, "run_verification",
        lambda cwd: {"typecheck": "pass", "build": "pass", "test": "pass", "all_passed": True, "command_log": ["docker-compose run --rm game npm test"]},
    )
    monkeypatch.setattr(
        run_module, "run_security_gate",
        lambda cwd, command_log, policy: {"passed": True, "violations": []},
    )
    monkeypatch.setattr(run_module, "run_heckler_review", fake_run_heckler_review)

    run_module.run(dry_run=True, run_id="test-run-3")

    assert dispatch_calls[0]["agent_md"] == "FIXTURE-loomwright-AGENT.md"
    assert dispatch_calls[0]["context_md"] == "FIXTURE-loomwright-CONTEXT.md"
    assert heckler_calls[0]["diff"] == "FIXTURE-DIFF"
    assert heckler_calls[0]["heckler_agent_md"] == "FIXTURE-heckler-AGENT.md"


def test_run_continues_and_writes_manifest_when_one_issue_errors(tmp_path, monkeypatch):
    # One bad issue (e.g. diff_text() raising because its worktree is missing
    # or origin/main doesn't exist) must not abort the whole run -- the
    # manifest should still be written and cover every issue attempted.
    monkeypatch.setattr(run_module, "RUNS_DIR", tmp_path)

    issue_bad = {"number": 10, "title": "bad issue", "body": "b", "labels": [], "comments": [], "in_flight": False}
    issue_good = {"number": 11, "title": "good issue", "body": "b", "labels": [], "comments": [], "in_flight": False}
    monkeypatch.setattr(run_module, "scan", lambda: [issue_bad, issue_good])

    def fake_process_issue(issue, dry_run):
        if issue["number"] == 10:
            raise RuntimeError("boom: git diff failed")
        return {"number": issue["number"], "agent": "loomwright", "backend": "codex", "action": "would merge"}

    monkeypatch.setattr(run_module, "_process_issue", fake_process_issue)

    manifest = run_module.run(dry_run=True, run_id="test-run-error")

    assert manifest["issues"] == [
        {"number": 10, "status": "error", "error": "boom: git diff failed"},
        {"number": 11, "agent": "loomwright", "backend": "codex", "action": "would merge"},
    ]

    written = json.loads((tmp_path / "test-run-error" / "manifest.json").read_text())
    assert written == manifest


def test_read_agent_doc_returns_empty_string_when_missing(tmp_path, monkeypatch):
    monkeypatch.setattr(
        run_module, "_repo_root", lambda: tmp_path
    )
    assert run_module._read_agent_doc("nonexistent-agent", "AGENT.md") == ""


def _setup_common(tmp_path, monkeypatch, issue):
    monkeypatch.setattr(run_module, "RUNS_DIR", tmp_path)
    monkeypatch.setattr(run_module, "scan", lambda: [issue])
    monkeypatch.setattr(run_module, "probe_registry", lambda registry: registry)
    monkeypatch.setattr(run_module, "load_registry", lambda: {"codex": {}, "ollama": {}})


# --- Critical 1b: a no-op (empty diff) dispatch must block, not merge ---


def test_run_blocks_on_empty_diff_without_running_downstream_gates(tmp_path, monkeypatch):
    issue = {"number": 20, "title": "Loomwright: fix cone bug", "body": "b", "labels": [], "comments": [], "in_flight": False}
    _setup_common(tmp_path, monkeypatch, issue)

    monkeypatch.setattr(
        run_module, "dispatch_issue",
        lambda issue, agent, agent_md, context_md, backend: {
            "issue_number": 20, "worktree_path": str(tmp_path / "wt-20"),
            "branch": "agent/dispatch-issue-20", "backend": backend.name,
            "ok": True, "stdout_tail": "",
        },
    )
    monkeypatch.setattr(run_module, "diff_text", lambda cwd: "")

    verify_mock = MagicMock(name="run_verification")
    security_mock = MagicMock(name="run_security_gate")
    review_mock = MagicMock(name="run_heckler_review")
    monkeypatch.setattr(run_module, "run_verification", verify_mock)
    monkeypatch.setattr(run_module, "run_security_gate", security_mock)
    monkeypatch.setattr(run_module, "run_heckler_review", review_mock)

    manifest = run_module.run(dry_run=True, run_id="test-empty-diff")

    entry = manifest["issues"][0]
    assert entry["number"] == 20
    assert "no changes" in entry["action"]
    verify_mock.assert_not_called()
    security_mock.assert_not_called()
    review_mock.assert_not_called()


# --- Critical 2: dispatch_record["ok"] is False must block, not proceed ---


def test_run_blocks_on_dispatch_failure_without_running_downstream_gates(tmp_path, monkeypatch):
    issue = {"number": 21, "title": "Loomwright: fix cone bug", "body": "b", "labels": [], "comments": [], "in_flight": False}
    _setup_common(tmp_path, monkeypatch, issue)

    monkeypatch.setattr(
        run_module, "dispatch_issue",
        lambda issue, agent, agent_md, context_md, backend: {
            "issue_number": 21, "worktree_path": str(tmp_path / "wt-21"),
            "branch": "agent/dispatch-issue-21", "backend": backend.name,
            "ok": False, "stdout_tail": "rate limited",
        },
    )

    diff_mock = MagicMock(name="diff_text")
    verify_mock = MagicMock(name="run_verification")
    security_mock = MagicMock(name="run_security_gate")
    review_mock = MagicMock(name="run_heckler_review")
    monkeypatch.setattr(run_module, "diff_text", diff_mock)
    monkeypatch.setattr(run_module, "run_verification", verify_mock)
    monkeypatch.setattr(run_module, "run_security_gate", security_mock)
    monkeypatch.setattr(run_module, "run_heckler_review", review_mock)

    manifest = run_module.run(dry_run=True, run_id="test-dispatch-fail")

    entry = manifest["issues"][0]
    assert entry["number"] == 21
    assert "dispatch backend failed" in entry["action"]
    assert "rate limited" in entry["action"]
    diff_mock.assert_not_called()
    verify_mock.assert_not_called()
    security_mock.assert_not_called()
    review_mock.assert_not_called()


# --- Important 4: an early denylist hit must block before run_verification ---


def test_run_blocks_early_on_denylist_violation_before_verification(tmp_path, monkeypatch):
    issue = {"number": 22, "title": "Loomwright: fix cone bug", "body": "b", "labels": [], "comments": [], "in_flight": False}
    _setup_common(tmp_path, monkeypatch, issue)

    monkeypatch.setattr(
        run_module, "dispatch_issue",
        lambda issue, agent, agent_md, context_md, backend: {
            "issue_number": 22, "worktree_path": str(tmp_path / "wt-22"),
            "branch": "agent/dispatch-issue-22", "backend": backend.name,
            "ok": True, "stdout_tail": "",
        },
    )
    monkeypatch.setattr(run_module, "diff_text", lambda cwd: "+ real change to .claude/settings.json")
    monkeypatch.setattr(run_module, "changed_files", lambda cwd: [".claude/settings.json"])
    monkeypatch.setattr(run_module, "check_denylist", lambda files, policy: [".claude/settings.json"])

    verify_mock = MagicMock(name="run_verification")
    security_mock = MagicMock(name="run_security_gate")
    review_mock = MagicMock(name="run_heckler_review")
    monkeypatch.setattr(run_module, "run_verification", verify_mock)
    monkeypatch.setattr(run_module, "run_security_gate", security_mock)
    monkeypatch.setattr(run_module, "run_heckler_review", review_mock)

    manifest = run_module.run(dry_run=True, run_id="test-early-denylist")

    entry = manifest["issues"][0]
    assert entry["number"] == 22
    assert "blocked-with-reason" in entry["action"]
    assert ".claude/settings.json" in entry["action"]
    verify_mock.assert_not_called()
    security_mock.assert_not_called()
    review_mock.assert_not_called()


# --- Important 8: full-gate manifest entries nest the stage result dicts ---


def test_run_manifest_entry_nests_verify_security_review_records(tmp_path, monkeypatch):
    issue = {"number": 23, "title": "Loomwright: fix cone bug", "body": "b", "labels": [], "comments": [], "in_flight": False}
    _setup_common(tmp_path, monkeypatch, issue)

    monkeypatch.setattr(
        run_module, "dispatch_issue",
        lambda issue, agent, agent_md, context_md, backend: {
            "issue_number": 23, "worktree_path": str(tmp_path / "wt-23"),
            "branch": "agent/dispatch-issue-23", "backend": backend.name,
            "ok": True, "stdout_tail": "",
        },
    )
    monkeypatch.setattr(run_module, "diff_text", lambda cwd: "+ const x = 1\n")
    monkeypatch.setattr(run_module, "changed_files", lambda cwd: ["src/scenes/Foo.ts"])

    verify_record = {"typecheck": "pass", "build": "pass", "test": "pass", "all_passed": True, "command_log": ["docker-compose run --rm game npm test"]}
    security_record = {"passed": True, "violations": []}
    review_record = {"backend": "codex", "ok": True, "blocking_findings": [], "minor_findings": [], "raw": ""}
    monkeypatch.setattr(run_module, "run_verification", lambda cwd: verify_record)
    monkeypatch.setattr(run_module, "run_security_gate", lambda cwd, command_log, policy: security_record)
    monkeypatch.setattr(run_module, "run_heckler_review", lambda diff, heckler_agent_md, backend: review_record)

    manifest = run_module.run(dry_run=True, run_id="test-manifest-nesting")

    entry = manifest["issues"][0]
    assert entry["verify"] == verify_record
    assert entry["security"] == security_record
    assert entry["review"] == review_record
