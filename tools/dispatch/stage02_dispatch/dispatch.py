"""Stage 02: create an isolated worktree per issue, invoke the chosen backend."""

import subprocess
from pathlib import Path

# stage02_dispatch/dispatch.py -> stage02_dispatch/ -> dispatch/ -> tools/ -> repo root
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
WORKTREE_ROOT = _REPO_ROOT / ".worktrees"

_DENYLIST_WARNING = (
    "Do not modify docker-compose.yml, any Dockerfile, package.json, "
    "package-lock.json, .env files, or .github/workflows -- if the fix "
    "genuinely requires one of those, stop and describe why instead of "
    "editing it; a security gate will hard-block the merge otherwise."
)


def build_prompt(issue, agent, agent_md, context_md):
    return (
        f"You are acting as the {agent} agent from this repo's roster.\n\n"
        f"AGENT.md:\n{agent_md}\n\nCONTEXT.md:\n{context_md}\n\n"
        f"Issue #{issue['number']}: {issue['title']}\n\n{issue['body']}\n\n"
        "Implement this issue end to end on the current branch, following "
        "your agent contract's constraints. Self-verify with the Docker "
        "testing contract before finishing.\n\n"
        f"{_DENYLIST_WARNING}"
    )


def create_worktree(issue_number, base="origin/main"):
    branch = f"agent/dispatch-issue-{issue_number}"
    path = WORKTREE_ROOT / f"dispatch-{issue_number}"
    subprocess.run(["git", "fetch", "origin"], check=True)
    subprocess.run(
        ["git", "worktree", "add", str(path), "-b", branch, base], check=True
    )
    return path, branch


def dispatch_issue(issue, agent, agent_md, context_md, backend):
    path, branch = create_worktree(issue["number"])
    prompt = build_prompt(issue, agent, agent_md, context_md)
    result = backend.run(prompt, cwd=str(path))
    return {
        "issue_number": issue["number"],
        "worktree_path": str(path),
        "branch": branch,
        "backend": backend.name,
        "ok": result["ok"],
        "stdout_tail": result["stdout"][-2000:],
    }
