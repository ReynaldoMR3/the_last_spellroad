import subprocess

from stage04_security.security_gate import (
    check_denylist,
    check_docker_usage,
    check_secrets,
    run_security_gate,
)

_POLICY = {
    "denylist_paths": ["docker-compose.yml", ".github/workflows/"],
    "secret_patterns": ["sk-[A-Za-z0-9]{20,}"],
}


def test_check_denylist_flags_exact_and_prefix_matches():
    files = ["src/scenes/Foo.ts", "docker-compose.yml", ".github/workflows/ci.yml"]
    assert check_denylist(files, _POLICY) == ["docker-compose.yml", ".github/workflows/ci.yml"]


def test_check_denylist_clean_diff_has_no_hits():
    assert check_denylist(["src/scenes/Foo.ts"], _POLICY) == []


def test_check_secrets_flags_matching_pattern():
    diff = "+ const key = 'sk-abcdefghijklmnopqrstuvwx'"
    assert check_secrets(diff, _POLICY) == ["sk-[A-Za-z0-9]{20,}"]


def test_check_secrets_clean_diff_has_no_hits():
    assert check_secrets("+ const x = 1", _POLICY) == []


def test_check_docker_usage_true_when_all_commands_containerized():
    assert check_docker_usage(["docker-compose run --rm game npm test"]) is True


def test_check_docker_usage_false_on_bare_host_command():
    assert check_docker_usage(["npm test"]) is False


def test_run_security_gate_passes_on_clean_diff(monkeypatch):
    import stage04_security.security_gate as sg

    monkeypatch.setattr(sg, "changed_files", lambda cwd: ["src/scenes/Foo.ts"])
    monkeypatch.setattr(sg, "diff_text", lambda cwd: "+ const x = 1")

    result = run_security_gate("/tmp/worktree", ["docker-compose run --rm game npm test"], _POLICY)
    assert result == {"passed": True, "violations": []}


def test_run_security_gate_blocks_on_denylisted_file(monkeypatch):
    import stage04_security.security_gate as sg

    monkeypatch.setattr(sg, "changed_files", lambda cwd: ["docker-compose.yml"])
    monkeypatch.setattr(sg, "diff_text", lambda cwd: "+ services: {}")

    result = run_security_gate("/tmp/worktree", ["docker-compose run --rm game npm test"], _POLICY)
    assert result["passed"] is False
    assert result["violations"] == [{"type": "denylist_path", "files": ["docker-compose.yml"]}]


def test_run_security_gate_blocks_on_non_containerized_command(monkeypatch):
    import stage04_security.security_gate as sg

    monkeypatch.setattr(sg, "changed_files", lambda cwd: [])
    monkeypatch.setattr(sg, "diff_text", lambda cwd: "")

    result = run_security_gate("/tmp/worktree", ["npm test"], _POLICY)
    assert result["passed"] is False
    assert result["violations"] == [
        {"type": "non_containerized_command", "command_log": ["npm test"]}
    ]
