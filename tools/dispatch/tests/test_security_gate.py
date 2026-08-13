import subprocess

from stage04_security.security_gate import (
    changed_files,
    check_denylist,
    check_docker_usage,
    check_secrets,
    diff_text,
    load_policy,
    run_security_gate,
)

_POLICY = {
    "denylist_paths": ["docker-compose.yml", ".github/workflows/"],
    "secret_patterns": ["sk-[A-Za-z0-9]{20,}"],
}

_POLICY_FULL = {
    "denylist_paths": [
        "docker-compose.yml",
        ".github/workflows/",
        "Dockerfile",
        "package.json",
        "package-lock.json",
        ".env",
    ],
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


# --- Critical 1: empty command_log must fail closed, not vacuously pass ---


def test_check_docker_usage_false_on_empty_command_log():
    assert check_docker_usage([]) is False


def test_check_docker_usage_false_on_none_command_log():
    assert check_docker_usage(None) is False


def test_run_security_gate_blocks_when_command_log_is_empty(monkeypatch):
    import stage04_security.security_gate as sg

    monkeypatch.setattr(sg, "changed_files", lambda cwd: [])
    monkeypatch.setattr(sg, "diff_text", lambda cwd: "")

    result = run_security_gate("/tmp/worktree", [], _POLICY)
    assert result["passed"] is False
    assert result["violations"] == [
        {"type": "non_containerized_command", "command_log": []}
    ]


# --- Critical 2: nested Dockerfile/.env/package.json must be caught ---


def test_check_denylist_flags_nested_dockerfile_and_env_and_package_json():
    files = [
        "agent-crew/Dockerfile",
        "content-pipeline/Dockerfile",
        "tools/composer/Dockerfile",
        "tools/pixel-gen/Dockerfile",
        "agent-crew/.env.example",
        "content-pipeline/.env.example",
        "some/dir/package.json",
        "src/scenes/Foo.ts",
    ]
    hits = check_denylist(files, _POLICY_FULL)
    assert hits == [
        "agent-crew/Dockerfile",
        "content-pipeline/Dockerfile",
        "tools/composer/Dockerfile",
        "tools/pixel-gen/Dockerfile",
        "agent-crew/.env.example",
        "content-pipeline/.env.example",
        "some/dir/package.json",
    ]


def test_check_denylist_does_not_overmatch_workflow_paths():
    files = ["some/dir/not-a-github-workflows-dir/ci.yml", "src/scenes/Foo.ts"]
    assert check_denylist(files, _POLICY_FULL) == []


# --- Important 3: exercise the real subprocess-shelling functions ---


def test_changed_files_invokes_expected_git_command(monkeypatch):
    captured = {}

    class FakeProc:
        stdout = "src/scenes/Foo.ts\ndocker-compose.yml\n"

    def fake_run(argv, cwd, capture_output, text, check):
        captured["argv"] = argv
        captured["cwd"] = cwd
        captured["capture_output"] = capture_output
        captured["text"] = text
        captured["check"] = check
        return FakeProc()

    monkeypatch.setattr(subprocess, "run", fake_run)

    result = changed_files("/tmp/worktree")

    assert captured["argv"] == ["git", "diff", "--name-only", "origin/main..HEAD"]
    assert captured["cwd"] == "/tmp/worktree"
    assert captured["capture_output"] is True
    assert captured["text"] is True
    assert captured["check"] is True
    assert result == ["src/scenes/Foo.ts", "docker-compose.yml"]


def test_diff_text_invokes_expected_git_command(monkeypatch):
    captured = {}

    class FakeProc:
        stdout = "+ const x = 1\n"

    def fake_run(argv, cwd, capture_output, text, check):
        captured["argv"] = argv
        return FakeProc()

    monkeypatch.setattr(subprocess, "run", fake_run)

    result = diff_text("/tmp/worktree")

    assert captured["argv"] == ["git", "diff", "origin/main..HEAD"]
    assert result == "+ const x = 1\n"


# --- Important 4: the real shipped security_policy.json must load ---


def test_load_policy_loads_real_shipped_policy_by_default():
    policy = load_policy()

    assert "docker-compose.yml" in policy["denylist_paths"]
    assert len(policy["denylist_paths"]) > 0
    assert len(policy["secret_patterns"]) > 0
    assert any(check_secrets("sk-abcdefghijklmnopqrstuvwx", policy))


# --- Important 5: secret and multi-violation paths end-to-end ---


def test_run_security_gate_blocks_on_secret_in_diff(monkeypatch):
    import stage04_security.security_gate as sg

    monkeypatch.setattr(sg, "changed_files", lambda cwd: ["src/scenes/Foo.ts"])
    monkeypatch.setattr(
        sg, "diff_text", lambda cwd: "+ const key = 'sk-abcdefghijklmnopqrstuvwx'"
    )

    result = run_security_gate(
        "/tmp/worktree", ["docker-compose run --rm game npm test"], _POLICY
    )
    assert result["passed"] is False
    assert result["violations"] == [
        {"type": "secret_pattern", "patterns": ["sk-[A-Za-z0-9]{20,}"]}
    ]


def test_run_security_gate_reports_denylist_and_secret_violations_together(monkeypatch):
    import stage04_security.security_gate as sg

    monkeypatch.setattr(sg, "changed_files", lambda cwd: ["docker-compose.yml"])
    monkeypatch.setattr(
        sg, "diff_text", lambda cwd: "+ const key = 'sk-abcdefghijklmnopqrstuvwx'"
    )

    result = run_security_gate(
        "/tmp/worktree", ["docker-compose run --rm game npm test"], _POLICY
    )
    assert result["passed"] is False
    assert result["violations"] == [
        {"type": "denylist_path", "files": ["docker-compose.yml"]},
        {"type": "secret_pattern", "patterns": ["sk-[A-Za-z0-9]{20,}"]},
    ]
