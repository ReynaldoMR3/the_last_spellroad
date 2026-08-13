# stage04_security — Context

**Inputs:** the worktree path and `stage03_verify`'s command log.
**Process:** three hard checks, any one failing blocks the merge outright:
(1) the diff touches nothing in `security_policy.json`'s denylist
(docker-compose.yml, CI workflows, Dockerfiles, dependency manifests, .env
files); (2) no secret-shaped string appears in the diff; (3) every command
`stage03_verify` ran was actually `docker-compose run`-prefixed, confirming
containerized execution rather than a bare host command.
**Outputs:** `run_security_gate(...) -> dict{passed, violations}`.
