"""Stage 04: hard security gate. Any violation here blocks the merge --
this is a strict superset of issue #195's step-9 guardrail, not a
judgment call."""

import json
import re
import subprocess
from pathlib import Path

_POLICY_PATH = Path(__file__).resolve().parent.parent / "security_policy.json"


def load_policy(path=None):
    return json.loads(Path(path or _POLICY_PATH).read_text())


def changed_files(cwd):
    proc = subprocess.run(
        ["git", "diff", "--name-only", "origin/main..HEAD"],
        cwd=cwd, capture_output=True, text=True, check=True,
    )
    return [line for line in proc.stdout.splitlines() if line]


def diff_text(cwd):
    proc = subprocess.run(
        ["git", "diff", "origin/main..HEAD"],
        cwd=cwd, capture_output=True, text=True, check=True,
    )
    return proc.stdout


def check_denylist(files, policy):
    return [
        f for f in files
        if any(f == denied or f.startswith(denied) for denied in policy["denylist_paths"])
    ]


def check_secrets(diff, policy):
    return [pattern for pattern in policy["secret_patterns"] if re.search(pattern, diff)]


def check_docker_usage(command_log):
    return all(cmd.startswith("docker-compose") for cmd in command_log)


def run_security_gate(cwd, command_log, policy=None):
    policy = policy or load_policy()
    violations = []

    denylist_hits = check_denylist(changed_files(cwd), policy)
    if denylist_hits:
        violations.append({"type": "denylist_path", "files": denylist_hits})

    secret_hits = check_secrets(diff_text(cwd), policy)
    if secret_hits:
        violations.append({"type": "secret_pattern", "patterns": secret_hits})

    if not check_docker_usage(command_log):
        violations.append({"type": "non_containerized_command", "command_log": command_log})

    return {"passed": len(violations) == 0, "violations": violations}
