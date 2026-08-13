# stage07_merge — Context

**Inputs:** `stage03_verify`, `stage04_security`, and `stage05_review`'s
result dicts; the issue number, branch, and worktree path.
**Process:** `decide()` is pure and deterministic -- merge only if all three
gates passed, in that priority order (verification, security, Heckler).
`apply()` posts a `blocked-with-reason` comment (never merging) when
blocked, or opens+merges+closes-with-`shipped-and-validated` when clear --
unless `dry_run` is `True`, in which case it only reports what it would
have done and touches nothing.
**Outputs:** `decide(...) -> dict{action, reason}`,
`apply(...) -> dict{merged, message, dry_run}`.
