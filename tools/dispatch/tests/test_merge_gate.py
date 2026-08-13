import subprocess

from stage07_merge.merge_gate import apply, decide

_OK_VERIFY = {"all_passed": True}
_BAD_VERIFY = {"all_passed": False, "typecheck": "fail"}
_OK_SECURITY = {"passed": True, "violations": []}
_BAD_SECURITY = {"passed": False, "violations": [{"type": "denylist_path", "files": ["docker-compose.yml"]}]}
_CLEAN_REVIEW = {"blocking_findings": [], "minor_findings": []}
_BLOCKED_REVIEW = {"blocking_findings": ["HP never resets"], "minor_findings": []}


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


def test_apply_dry_run_never_calls_gh(monkeypatch):
    calls = []
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kwargs: calls.append(cmd))

    decision = {"action": "merge", "reason": "all gates passed"}
    result = apply(decision, 195, "agent/dispatch-issue-195", "/tmp/worktree", dry_run=True)

    assert calls == []
    assert result["merged"] is False
    assert result["dry_run"] is True
    assert "would merge" in result["message"]


def test_apply_real_merge_calls_gh_pr_and_issue_commands(monkeypatch):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)

    decision = {"action": "merge", "reason": "all gates passed"}
    result = apply(decision, 195, "agent/dispatch-issue-195", "/tmp/worktree", dry_run=False)

    assert calls[0] == ["gh", "pr", "create", "--fill"]
    assert calls[1] == ["gh", "pr", "merge", "--squash", "--delete-branch"]
    assert calls[2][:3] == ["gh", "issue", "comment"]
    assert calls[3] == ["gh", "issue", "close", "195"]
    assert result["merged"] is True


def test_apply_block_posts_comment_when_not_dry_run(monkeypatch):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)

    decision = {"action": "block", "reason": "security gate failed: [...]"}
    result = apply(decision, 195, "agent/dispatch-issue-195", "/tmp/worktree", dry_run=False)

    assert calls[0][:3] == ["gh", "issue", "comment"]
    assert "blocked-with-reason" in calls[0][-1]
    assert result["merged"] is False
