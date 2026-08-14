# stage02_dispatch — Context

**Inputs:** an issue dict, the classified agent name, that agent's
`AGENT.md`/`CONTEXT.md` text, and a chosen backend (from `stage01_route`).
**Process:** create a fresh `git worktree` under `.worktrees/` for the issue
(never touches the shared main working tree); build a prompt embedding the
agent's own contract plus a hard warning about denylisted paths; invoke the
backend inside that worktree.
**Outputs:** `dispatch_issue(...) -> dict` — worktree path, branch name,
backend used, and whether the backend reported success.
