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
        # The trailing `--` tells codex's own arg parser that everything
        # after it is positional, not a flag. Without it, a prompt whose
        # first character is "-" (every AGENT.md in this repo starts with
        # a YAML frontmatter "---" line, so Heckler's review prompt always
        # did) gets misread as an unknown option -- codex prints its own
        # usage text to stderr and exits non-zero before ever seeing the
        # prompt. Confirmed live: this silently broke every Heckler review
        # this pipeline ever ran.
        result = subprocess.run(
            ["codex", "exec", "--full-auto", "--", prompt],
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
