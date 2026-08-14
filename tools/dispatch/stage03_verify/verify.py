"""Stage 03: run typecheck/build/test through the repo's Docker testing
contract (docs/agents/_reference/docker-testing-contract.md)."""

import subprocess

_COMMANDS = {
    "typecheck": ["docker-compose", "run", "--rm", "game", "npm", "run", "typecheck"],
    "build": ["docker-compose", "run", "--rm", "game", "npm", "run", "build"],
    "test": ["docker-compose", "run", "--rm", "game", "npm", "test"],
}


def run_verification(cwd):
    results = {}
    command_log = []
    for name, cmd in _COMMANDS.items():
        proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
        command_log.append(" ".join(cmd))
        results[name] = "pass" if proc.returncode == 0 else "fail"
    return {
        **results,
        "all_passed": all(v == "pass" for v in results.values()),
        "command_log": command_log,
    }
