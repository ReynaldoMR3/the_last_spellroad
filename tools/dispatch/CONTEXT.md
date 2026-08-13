# Automated Dispatch — Context (Layer 1)

Implements issue #195: an unattended pipeline that dispatches `ready-for-agent`
GitHub issues to the named agent roster, verifies and security-gates the
result, and merges or reports `blocked-with-reason`. Runs directly on the
host (not in Docker) via `launchd`, because it needs the local `codex` CLI's
subscription auth and needs to invoke `docker-compose` itself.

## Stage order

00 scan -> 01 route -> 02 dispatch -> 03 verify -> 04 security -> 05 review
-> 07 merge. (06/preview and the HTML report are a follow-up plan.)

## Running it

    cd tools/dispatch
    source .venv/bin/activate  # pip install -r requirements.txt if new
    python run.py --dry-run    # default; omit only after watching several dry runs

## Running the tests

    cd tools/dispatch && source .venv/bin/activate && python -m pytest -v

## Reference configs

`model_registry.json` — backend availability/cost/reliability tags (Layer 3).
`security_policy.json` — denylist paths and secret-pattern regexes (Layer 3).
