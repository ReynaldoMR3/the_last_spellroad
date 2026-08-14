# stage03_verify — Context

**Inputs:** the worktree path from `stage02_dispatch`.
**Process:** run typecheck, build, and test through
`docker-compose run --rm game ...`, per
`docs/agents/_reference/docker-testing-contract.md` — never a bare host
command.
**Outputs:** `run_verification(cwd) -> dict` with each check's pass/fail,
an `all_passed` summary, and the exact command log — the command log is
what `stage04_security` checks to confirm everything ran containerized.
