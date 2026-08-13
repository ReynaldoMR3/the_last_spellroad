import subprocess
from pathlib import Path

from stage02_dispatch.dispatch import build_prompt, create_worktree, dispatch_issue


def test_build_prompt_includes_issue_and_agent_context():
    prompt = build_prompt(
        issue={"number": 195, "title": "Automate dispatch", "body": "do the thing"},
        agent="ana",
        agent_md="Ana orchestrates.",
        context_md="Ana's contract.",
    )
    assert "Issue #195" in prompt
    assert "Automate dispatch" in prompt
    assert "do the thing" in prompt
    assert "Ana orchestrates." in prompt
    assert "Ana's contract." in prompt
    assert "docker-compose.yml" in prompt  # denylist warning must be in every prompt


def test_create_worktree_runs_expected_git_commands(monkeypatch, tmp_path):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)
    monkeypatch.chdir(tmp_path)

    path, branch = create_worktree(195)

    assert branch == "agent/dispatch-issue-195"
    assert path == Path(".worktrees/dispatch-195")
    assert calls[0] == ["git", "fetch", "origin"]
    assert calls[1] == [
        "git", "worktree", "add", ".worktrees/dispatch-195",
        "-b", "agent/dispatch-issue-195", "origin/main",
    ]


def test_dispatch_issue_wires_worktree_and_backend(monkeypatch, tmp_path):
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kwargs: subprocess.CompletedProcess(cmd, 0, "", ""))
    monkeypatch.chdir(tmp_path)

    class FakeBackend:
        name = "codex"

        def run(self, prompt, cwd):
            assert cwd == str(Path(".worktrees/dispatch-195"))
            return {"ok": True, "stdout": "x" * 3000, "stderr": ""}

    result = dispatch_issue(
        issue={"number": 195, "title": "t", "body": "b"},
        agent="ana",
        agent_md="a",
        context_md="c",
        backend=FakeBackend(),
    )

    assert result["issue_number"] == 195
    assert result["branch"] == "agent/dispatch-issue-195"
    assert result["backend"] == "codex"
    assert result["ok"] is True
    assert len(result["stdout_tail"]) == 2000
