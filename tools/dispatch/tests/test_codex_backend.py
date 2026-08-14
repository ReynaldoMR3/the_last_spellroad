import subprocess

from backends.codex_backend import CodexBackend


def test_available_true_when_doctor_exits_zero(monkeypatch):
    def fake_run(cmd, **kwargs):
        assert cmd == ["codex", "doctor"]
        return subprocess.CompletedProcess(cmd, returncode=0, stdout="ok", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    assert CodexBackend().available() is True


def test_available_false_when_codex_missing(monkeypatch):
    def fake_run(cmd, **kwargs):
        raise FileNotFoundError("codex not found")

    monkeypatch.setattr(subprocess, "run", fake_run)
    assert CodexBackend().available() is False


def test_run_invokes_codex_exec_and_returns_ok(monkeypatch):
    captured = {}

    def fake_run(cmd, **kwargs):
        captured["cmd"] = cmd
        captured["cwd"] = kwargs.get("cwd")
        return subprocess.CompletedProcess(cmd, returncode=0, stdout="done", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    result = CodexBackend().run("implement issue 195", cwd="/tmp/worktree")

    assert captured["cmd"] == ["codex", "exec", "--full-auto", "--", "implement issue 195"]
    assert captured["cwd"] == "/tmp/worktree"
    assert result == {"ok": True, "stdout": "done", "stderr": ""}


def test_run_includes_end_of_options_separator_for_prompts_starting_with_dash(monkeypatch):
    # Regression: every AGENT.md in this repo starts with a YAML
    # frontmatter "---" line, and Heckler's review prompt embeds one at
    # position 0. Without a `--` separator, codex's own arg parser reads a
    # leading "-" as an unknown flag and never sees the prompt at all.
    captured = {}

    def fake_run(cmd, **kwargs):
        captured["cmd"] = cmd
        return subprocess.CompletedProcess(cmd, returncode=0, stdout="ok", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    CodexBackend().run("---\nname: heckler\n\ncritique this diff", cwd="/tmp/worktree")

    assert captured["cmd"][:4] == ["codex", "exec", "--full-auto", "--"]


def test_run_reports_failure_on_nonzero_exit(monkeypatch):
    def fake_run(cmd, **kwargs):
        return subprocess.CompletedProcess(cmd, returncode=1, stdout="", stderr="boom")

    monkeypatch.setattr(subprocess, "run", fake_run)
    result = CodexBackend().run("prompt", cwd="/tmp/worktree")

    assert result == {"ok": False, "stdout": "", "stderr": "boom"}
