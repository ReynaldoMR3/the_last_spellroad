"""Orchestrates stage00 -> stage07 per ready-for-agent issue. Writes one
JSON manifest per run under runs/<run_id>/. Defaults to --dry-run; only
the developer flips that off, and only after watching several dry runs."""

import argparse
import json
import time
from pathlib import Path

from backends.codex_backend import CodexBackend
from backends.ollama_backend import OllamaBackend
from stage00_scan.scan import scan
from stage01_route.route import choose_backend, classify_agent, load_registry, probe_registry, task_type_for
from stage02_dispatch.dispatch import dispatch_issue
from stage03_verify.verify import run_verification
from stage04_security.security_gate import (
    changed_files,
    check_denylist,
    check_secrets,
    diff_text,
    load_policy,
    run_security_gate,
)
from stage05_review.heckler_review import run_heckler_review
from stage07_merge.merge_gate import apply as apply_merge_decision
from stage07_merge.merge_gate import decide as decide_merge

RUNS_DIR = Path(__file__).resolve().parent / "runs"

_BACKEND_CLASSES = {"codex": CodexBackend, "ollama": OllamaBackend}


def _get_backend(name):
    return _BACKEND_CLASSES[name]()


def _repo_root():
    # tools/dispatch/run.py -> tools/ -> repo root
    return Path(__file__).resolve().parent.parent.parent


def _read_agent_doc(agent, filename):
    """Read a target agent's contract doc from docs/agents/<agent>/<filename>.

    Missing docs degrade gracefully (empty string) rather than crashing the
    whole run -- a gap in the context store should only weaken that one
    dispatch, not take down the pipeline.
    """
    path = _repo_root() / "docs" / "agents" / agent / filename
    try:
        return path.read_text()
    except FileNotFoundError:
        return ""


def _blocked_outcome(
    issue, agent, backend_name, dispatch_record, reason, dry_run,
    verify_record=None, security_record=None, review_record=None,
):
    """Build a manifest entry for an issue that never reaches decide_merge --
    an early-blocked dispatch (failed backend, empty diff, or a
    pre-verification denylist/secret hit). Always routed through
    merge_gate.apply so the manifest's "action" message stays consistent
    with the normal full-gate path (e.g. "blocked-with-reason: ...")."""
    decision = {"action": "block", "reason": reason}
    merge_record = apply_merge_decision(
        decision, issue["number"], dispatch_record["branch"],
        dispatch_record["worktree_path"], dry_run=dry_run,
    )
    return {
        "number": issue["number"],
        "agent": agent,
        "backend": backend_name,
        "action": merge_record["message"],
        "verify": verify_record,
        "security": security_record,
        "review": review_record,
    }


def _process_issue(issue, dry_run):
    agent = classify_agent(issue)
    task_type = task_type_for(agent)
    registry = probe_registry(load_registry())
    backend_name = choose_backend(task_type, registry)
    backend = _get_backend(backend_name)

    agent_md = _read_agent_doc(agent, "AGENT.md")
    context_md = _read_agent_doc(agent, "CONTEXT.md")

    dispatch_record = dispatch_issue(
        issue, agent=agent, agent_md=agent_md, context_md=context_md, backend=backend
    )

    # Critical 2: a backend that errored, timed out, or was rate-limited
    # must never flow into verification/security/review as if it succeeded.
    # Check this before even looking at the diff -- a failed dispatch is a
    # distinct failure mode from an empty diff, even though it can also
    # produce one.
    if not dispatch_record["ok"]:
        return _blocked_outcome(
            issue, agent, backend_name, dispatch_record,
            reason=f"dispatch backend failed: {dispatch_record.get('stdout_tail', '')}",
            dry_run=dry_run,
        )

    # Reused below for Heckler's review too -- compute once.
    diff = diff_text(dispatch_record["worktree_path"])

    # Critical 1b: a no-op dispatch (e.g. a backend with no file-edit
    # capability) must never be reported as mergeable. Skip
    # verify/security/review/decide entirely for an empty diff.
    if not diff or not diff.strip():
        return _blocked_outcome(
            issue, agent, backend_name, dispatch_record,
            reason="dispatch produced no changes",
            dry_run=dry_run,
        )

    # Important 4: run the denylist/secret checks before verification, not
    # just before merge -- otherwise an agent-authored denylisted file (e.g.
    # a docker-compose.override.yml or an edited .claude/settings.json)
    # could execute via run_verification's docker-compose invocation before
    # anyone checks the diff. This is additive defense-in-depth; the full
    # run_security_gate() call (including the containerization check) still
    # runs afterward in its normal position.
    policy = load_policy()
    early_denylist_hits = check_denylist(changed_files(dispatch_record["worktree_path"]), policy)
    early_secret_hits = check_secrets(diff, policy)
    if early_denylist_hits or early_secret_hits:
        violations = []
        if early_denylist_hits:
            violations.append({"type": "denylist_path", "files": early_denylist_hits})
        if early_secret_hits:
            violations.append({"type": "secret_pattern", "patterns": early_secret_hits})
        return _blocked_outcome(
            issue, agent, backend_name, dispatch_record,
            reason=f"pre-verification security check failed: {violations}",
            dry_run=dry_run,
            security_record={"passed": False, "violations": violations},
        )

    verify_record = run_verification(dispatch_record["worktree_path"])
    security_record = run_security_gate(
        dispatch_record["worktree_path"], verify_record["command_log"], policy
    )
    heckler_agent_md = _read_agent_doc("heckler", "AGENT.md")
    review_record = run_heckler_review(
        diff=diff, heckler_agent_md=heckler_agent_md, backend=_get_backend("codex")
    )

    decision = decide_merge(verify_record, security_record, review_record)
    merge_record = apply_merge_decision(
        decision, issue["number"], dispatch_record["branch"],
        dispatch_record["worktree_path"], dry_run=dry_run,
    )

    return {
        "number": issue["number"],
        "agent": agent,
        "backend": backend_name,
        "action": merge_record["message"],
        "verify": verify_record,
        "security": security_record,
        "review": review_record,
    }


def run(dry_run=True, run_id=None):
    run_id = run_id or time.strftime("%Y%m%dT%H%M%S")
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    issues = scan()
    (run_dir / "00_scan.json").write_text(json.dumps(issues, indent=2))

    manifest = {"run_id": run_id, "dry_run": dry_run, "issues": []}
    for issue in issues:
        if issue["in_flight"]:
            manifest["issues"].append({"number": issue["number"], "status": "skipped-in-flight"})
            continue
        try:
            manifest["issues"].append(_process_issue(issue, dry_run))
        except Exception as exc:
            manifest["issues"].append(
                {"number": issue["number"], "status": "error", "error": str(exc)}
            )

    (run_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", dest="dry_run", action="store_true", default=True)
    parser.add_argument("--no-dry-run", dest="dry_run", action="store_false")
    args = parser.parse_args()

    result = run(dry_run=args.dry_run)
    print(json.dumps(result, indent=2))
