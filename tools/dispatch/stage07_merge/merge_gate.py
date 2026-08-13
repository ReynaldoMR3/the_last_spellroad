"""Stage 07: apply issue #195's merge guardrails. Never merges unless
verification, the security gate, and Heckler's review all clear."""

import subprocess


def decide(verify_result, security_result, review_result):
    if not verify_result["all_passed"]:
        return {"action": "block", "reason": f"verification failed: {verify_result}"}
    if not security_result["passed"]:
        return {"action": "block", "reason": f"security gate failed: {security_result['violations']}"}
    if review_result["blocking_findings"]:
        joined = "; ".join(review_result["blocking_findings"])
        return {"action": "block", "reason": f"Heckler BLOCKING findings: {joined}"}
    return {"action": "merge", "reason": "all gates passed"}


def apply(decision, issue_number, branch, cwd, dry_run=True):
    if decision["action"] == "block":
        message = f"blocked-with-reason: {decision['reason']}"
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

    subprocess.run(["gh", "pr", "create", "--fill"], cwd=cwd, check=True)
    subprocess.run(["gh", "pr", "merge", "--squash", "--delete-branch"], cwd=cwd, check=True)
    subprocess.run(
        ["gh", "issue", "comment", str(issue_number), "--body",
         f"shipped-and-validated: {decision['reason']}"],
        cwd=cwd, check=True,
    )
    subprocess.run(["gh", "issue", "close", str(issue_number)], cwd=cwd, check=True)
    return {"merged": True, "message": decision["reason"], "dry_run": False}
