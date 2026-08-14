import subprocess

from stage03_verify.verify import run_verification


def test_run_verification_all_pass(monkeypatch):
    monkeypatch.setattr(
        subprocess, "run",
        lambda cmd, **kwargs: subprocess.CompletedProcess(cmd, 0, "", ""),
    )
    result = run_verification("/tmp/worktree")

    assert result["typecheck"] == "pass"
    assert result["build"] == "pass"
    assert result["test"] == "pass"
    assert result["all_passed"] is True
    assert all(cmd.startswith("docker-compose") for cmd in result["command_log"])


def test_run_verification_reports_failure(monkeypatch):
    def fake_run(cmd, **kwargs):
        returncode = 1 if "test" in cmd else 0
        return subprocess.CompletedProcess(cmd, returncode, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)
    result = run_verification("/tmp/worktree")

    assert result["test"] == "fail"
    assert result["all_passed"] is False


def test_run_verification_passes_cwd_through(monkeypatch):
    captured_cwds = []

    def fake_run(cmd, **kwargs):
        captured_cwds.append(kwargs.get("cwd"))
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)
    run_verification("/tmp/worktree")

    assert all(cwd == "/tmp/worktree" for cwd in captured_cwds)
