# stage07_merge — Context

**Inputs:** `stage03_verify`, `stage04_security`, and `stage05_review`'s
result dicts; the issue number, branch, and worktree path.
**Process:** `decide()` is pure and deterministic -- merge only if all three
gates passed, in that priority order (verification, security, Heckler's
`ok` status and blocking findings). A Heckler review whose backend never
produced output (`ok is False`) blocks exactly like a BLOCKING finding
would -- a dead review backend must never look like a clean review.
`apply()` merges only on an exact `decision["action"] == "merge"`; every
other value, including malformed or missing decisions, blocks. When
merging for real, it pushes the branch (`git push -u origin <branch>`)
before `gh pr create --fill`, then merges. A failure in push/create/merge
propagates as a genuine failure. Once the merge itself has landed, the
post-merge `gh issue comment`/`gh issue close` calls are each wrapped
independently -- a failure there is recorded as a warning in the returned
`message` rather than raised, since the merge already succeeded. `apply()`
posts a `blocked-with-reason` comment (never merging) when blocked, unless
`dry_run` is `True`, in which case it only reports what it would have done
and touches nothing.
**Outputs:** `decide(...) -> dict{action, reason}`,
`apply(...) -> dict{merged, message, dry_run}`.
