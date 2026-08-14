"""Stage 07: apply issue #195's merge guardrails. Never merges unless
verification, the security gate, and Heckler's review all clear."""

import subprocess


def decide(verify_result, security_result, review_result):
    if not verify_result["all_passed"]:
        return {"action": "block", "reason": f"verification failed: {verify_result}"}
    if not security_result["passed"]:
        return {"action": "block", "reason": f"security gate failed: {security_result['violations']}"}
    if review_result.get("ok") is not True:
        return {"action": "block", "reason": f"Heckler review did not complete: {review_result}"}
    if review_result["blocking_findings"]:
        joined = "; ".join(review_result["blocking_findings"])
        return {"action": "block", "reason": f"Heckler BLOCKING findings: {joined}"}
    return {"action": "merge", "reason": "all gates passed"}


def apply(decision, issue_number, branch, cwd, dry_run=True):
    # Invert polarity deliberately: merge only on an exact, explicit
    # "merge" action. Anything else -- a typo, None, a malformed dict from
    # a future caller -- must block, never fall through to a real merge.
    if decision.get("action") != "merge":
        reason = decision.get("reason", "unknown")
        message = f"blocked-with-reason: {reason}"
        if not dry_run:
            subprocess.run(
                ["gh", "issue", "comment", str(issue_number), "--body", message],
                cwd=cwd, check=True,
            )
        return {"merged": False, "message": message, "dry_run": dry_run}

    if dry_run:
        return {
            "merged": False,
            "message": f"dry-run: would merge ({decision['reason']})",
            "dry_run": True,
        }

    # Steps that determine whether the code actually landed: let any
    # failure here propagate as a genuine, visible failure.
    subprocess.run(["git", "push", "-u", "origin", branch], cwd=cwd, check=True)
    subprocess.run(["gh", "pr", "create", "--fill"], cwd=cwd, check=True)
    subprocess.run(["gh", "pr", "merge", "--squash", "--delete-branch"], cwd=cwd, check=True)

    message = decision["reason"]
    # Post-merge bookkeeping: the merge already succeeded, so a failure in
    # either of these must not look like a total failure to the
    # orchestrator. Each is wrapped independently so a comment failure
    # doesn't prevent the close attempt (and vice versa).
    try:
        subprocess.run(
            ["gh", "issue", "comment", str(issue_number), "--body",
             f"shipped-and-validated: {decision['reason']}"],
            cwd=cwd, check=True,
        )
    except subprocess.CalledProcessError as exc:
        message = f"{message} (warning: post-merge comment/close failed: {exc})"

    try:
        subprocess.run(["gh", "issue", "close", str(issue_number)], cwd=cwd, check=True)
    except subprocess.CalledProcessError as exc:
        message = f"{message} (warning: post-merge comment/close failed: {exc})"

    return {"merged": True, "message": message, "dry_run": False}
