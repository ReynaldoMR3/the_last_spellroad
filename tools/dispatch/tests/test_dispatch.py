import subprocess
from pathlib import Path

from stage02_dispatch.dispatch import _REPO_ROOT, build_prompt, create_worktree, dispatch_issue, WORKTREE_ROOT


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
    # Deliberately chdir somewhere unrelated to the repo: this is the
    # regression check for the original bug (WORKTREE_ROOT resolving
    # relative to the caller's cwd instead of the repo root).
    monkeypatch.chdir(tmp_path)

    path, branch = create_worktree(195)

    expected_path = _REPO_ROOT / ".worktrees" / "dispatch-195"
    assert branch == "agent/dispatch-issue-195"
    assert path == expected_path
    assert path.is_absolute()
    assert calls[0] == ["git", "fetch", "origin"]
    assert calls[1] == [
        "git", "worktree", "add", str(expected_path),
        "-b", "agent/dispatch-issue-195", "origin/main",
    ]


def test_worktree_root_resolves_to_repo_root():
    """Regression test: WORKTREE_ROOT must be an absolute path anchored at
    the repo root (a sibling of AGENTS.md and .worktrees), not a relative
    path that depends on the invoking process's cwd. This is the exact bug
    that made `cd tools/dispatch && python run.py` create worktrees under
    tools/dispatch/.worktrees/ instead of the repo-root .worktrees/."""
    assert WORKTREE_ROOT.is_absolute()
    assert WORKTREE_ROOT == _REPO_ROOT / ".worktrees"
    assert (_REPO_ROOT / "AGENTS.md").exists()


def test_dispatch_issue_wires_worktree_and_backend(monkeypatch, tmp_path):
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kwargs: subprocess.CompletedProcess(cmd, 0, "", ""))
    monkeypatch.chdir(tmp_path)

    class FakeBackend:
        name = "codex"

        def run(self, prompt, cwd):
            assert cwd == str(_REPO_ROOT / ".worktrees" / "dispatch-195")
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
