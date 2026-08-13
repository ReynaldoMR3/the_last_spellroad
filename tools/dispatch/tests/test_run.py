import json

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
    monkeypatch.setattr(run_module, "diff_text", lambda cwd: "")
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
        heckler_calls.append({"diff": diff})
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


def test_read_agent_doc_returns_empty_string_when_missing(tmp_path, monkeypatch):
    monkeypatch.setattr(
        run_module, "_repo_root", lambda: tmp_path
    )
    assert run_module._read_agent_doc("nonexistent-agent", "AGENT.md") == ""
