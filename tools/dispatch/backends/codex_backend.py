"""Codex CLI backend -- shells out to the developer's already-authenticated
local `codex` subscription login. No API key: this only works run directly
on this machine, never inside a container (the auth lives in ~/.codex).
"""

import subprocess


class CodexBackend:
    name = "codex"

    def available(self):
        try:
            result = subprocess.run(
                ["codex", "doctor"], capture_output=True, text=True, timeout=15
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    def run(self, prompt, cwd=None):
        result = subprocess.run(
            ["codex", "exec", "--full-auto", prompt],
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=1800,
        )
        return {
            "ok": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }
