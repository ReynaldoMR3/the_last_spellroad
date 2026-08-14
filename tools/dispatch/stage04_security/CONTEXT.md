# stage04_security — Context

**Inputs:** the worktree path and `stage03_verify`'s command log.
**Process:** three hard checks, any one failing blocks the merge outright:
(1) the diff touches nothing in `security_policy.json`'s denylist
(docker-compose*, CI workflows, Dockerfiles, dependency manifests, .env
files, anything under `.claude`/`.codex`); (2) no secret-shaped string
appears in the diff; (3) every command `stage03_verify` ran was actually
`docker-compose run`-prefixed, confirming containerized execution.
**Outputs:** `run_security_gate(...) -> dict{passed, violations}`.

**Scope of the containerization guarantee:** check (3) above covers only
the commands `stage03_verify` runs (typecheck/build/test). It does NOT
cover stage02 (dispatch) -- the agent backend itself runs directly on the
host by design, because Codex's auth lives in `~/.codex` and requires host
execution. Nothing in this pipeline confirms the agent's own edits were
made inside a container; only the subsequent verification commands are
checked.
