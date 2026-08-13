import subprocess

from stage07_merge.merge_gate import apply, decide

_OK_VERIFY = {"all_passed": True}
_BAD_VERIFY = {"all_passed": False, "typecheck": "fail"}
_OK_SECURITY = {"passed": True, "violations": []}
_BAD_SECURITY = {"passed": False, "violations": [{"type": "denylist_path", "files": ["docker-compose.yml"]}]}
_CLEAN_REVIEW = {"ok": True, "blocking_findings": [], "minor_findings": []}
_BLOCKED_REVIEW = {"ok": True, "blocking_findings": ["HP never resets"], "minor_findings": []}
_DEAD_BACKEND_REVIEW = {"ok": False, "blocking_findings": [], "minor_findings": []}


def test_decide_merges_when_all_gates_pass():
    decision = decide(_OK_VERIFY, _OK_SECURITY, _CLEAN_REVIEW)
    assert decision["action"] == "merge"


def test_decide_blocks_on_verification_failure():
    decision = decide(_BAD_VERIFY, _OK_SECURITY, _CLEAN_REVIEW)
    assert decision["action"] == "block"
    assert "verification" in decision["reason"]


def test_decide_blocks_on_security_failure():
    decision = decide(_OK_VERIFY, _BAD_SECURITY, _CLEAN_REVIEW)
    assert decision["action"] == "block"
    assert "security" in decision["reason"]


def test_decide_blocks_on_heckler_blocking_finding():
    decision = decide(_OK_VERIFY, _OK_SECURITY, _BLOCKED_REVIEW)
    assert decision["action"] == "block"
    assert "HP never resets" in decision["reason"]


def test_decide_blocks_when_heckler_backend_never_ran():
    decision = decide(_OK_VERIFY, _OK_SECURITY, _DEAD_BACKEND_REVIEW)
    assert decision["action"] == "block"
    assert "did not complete" in decision["reason"]


def test_decide_blocks_when_heckler_review_missing_ok_key():
    # If review_result is missing the "ok" key entirely (rather than explicit ok: False),
    # decide() must block — this is the fail-open gap fix. The gate blocks unless
    # "ok" is explicitly True.
    review_result_no_ok = {"blocking_findings": [], "minor_findings": []}
    decision = decide(_OK_VERIFY, _OK_SECURITY, review_result_no_ok)
    assert decision["action"] == "block"
    assert "did not complete" in decision["reason"]


def test_apply_dry_run_never_calls_gh(monkeypatch):
    calls = []
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kwargs: calls.append(cmd))

    decision = {"action": "merge", "reason": "all gates passed"}
    result = apply(decision, 195, "agent/dispatch-issue-195", "/tmp/worktree", dry_run=True)

    assert calls == []
    assert len(calls) == 0
    assert result["merged"] is False
    assert result["dry_run"] is True
    assert "would merge" in result["message"]


def test_apply_real_merge_calls_gh_pr_and_issue_commands(monkeypatch):
    calls = []
    branch = "agent/dispatch-issue-195"

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)

    decision = {"action": "merge", "reason": "all gates passed"}
    result = apply(decision, 195, branch, "/tmp/worktree", dry_run=False)

    assert len(calls) == 5
    assert calls[0] == ["git", "push", "-u", "origin", branch]
    assert calls[1] == ["gh", "pr", "create", "--fill"]
    assert calls[2] == ["gh", "pr", "merge", "--squash", "--delete-branch"]
    assert calls[3][:3] == ["gh", "issue", "comment"]
    assert "shipped-and-validated" in calls[3][-1]
    assert calls[4] == ["gh", "issue", "close", "195"]
    assert result["merged"] is True


def test_apply_block_posts_comment_when_not_dry_run(monkeypatch):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)

    decision = {"action": "block", "reason": "security gate failed: [...]"}
    result = apply(decision, 195, "agent/dispatch-issue-195", "/tmp/worktree", dry_run=False)

    assert len(calls) == 1
    assert calls[0][:3] == ["gh", "issue", "comment"]
    assert "blocked-with-reason" in calls[0][-1]
    assert result["merged"] is False


def test_apply_block_with_dry_run_makes_no_calls(monkeypatch):
    calls = []
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kwargs: calls.append(cmd))

    decision = {"action": "block", "reason": "security gate failed: [...]"}
    result = apply(decision, 195, "some-branch", "/tmp/worktree", dry_run=True)

    assert calls == []
    assert len(calls) == 0
    assert result["dry_run"] is True
    assert result["merged"] is False


def test_apply_fails_open_safe_on_malformed_decision(monkeypatch):
    calls = []
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kwargs: calls.append(cmd))

    # A decision dict that is neither "merge" nor "block" (typo, None,
    # missing key, or output from some future non-decide() caller) must
    # never fall through to the merge sequence.
    for decision in [{"action": "Merge"}, {"action": None}, {}, {"action": "merg"}]:
        calls.clear()
        result = apply(decision, 195, "agent/dispatch-issue-195", "/tmp/worktree", dry_run=True)
        assert calls == []
        assert result["merged"] is False
        assert "unknown" in result["message"] or decision.get("reason") in result["message"]


def test_apply_real_merge_pushes_branch_first(monkeypatch):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)

    branch = "agent/dispatch-issue-195"
    decision = {"action": "merge", "reason": "all gates passed"}
    apply(decision, 195, branch, "/tmp/worktree", dry_run=False)

    assert calls[0] == ["git", "push", "-u", "origin", branch]
    assert calls[1] == ["gh", "pr", "create", "--fill"]
    assert calls[2] == ["gh", "pr", "merge", "--squash", "--delete-branch"]
    assert calls[3][:3] == ["gh", "issue", "comment"]
    assert calls[4] == ["gh", "issue", "close", "195"]


def test_apply_real_merge_survives_post_merge_close_failure(monkeypatch):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        if cmd[:3] == ["gh", "issue", "close"]:
            raise subprocess.CalledProcessError(1, cmd, output="", stderr="issue closed already")
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)

    decision = {"action": "merge", "reason": "all gates passed"}
    result = apply(decision, 195, "agent/dispatch-issue-195", "/tmp/worktree", dry_run=False)

    assert result["merged"] is True
    assert "warning" in result["message"]
    assert "post-merge comment/close failed" in result["message"]
    # comment call still happened before the close failure
    assert any(cmd[:3] == ["gh", "issue", "comment"] for cmd in calls)
