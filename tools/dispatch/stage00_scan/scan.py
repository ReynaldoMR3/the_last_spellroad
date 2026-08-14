"""Stage 00: find ready-for-agent issues, flag ones already mid-PR. No LLM call."""

import json
import subprocess


def _list_ready_for_agent_issues():
    result = subprocess.run(
        [
            "gh", "issue", "list", "--state", "open", "--label", "ready-for-agent",
            "--json", "number,title,body,labels,comments",
        ],
        capture_output=True, text=True, check=True,
    )
    return json.loads(result.stdout)


def _is_in_flight(issue_number):
    result = subprocess.run(
        [
            "gh", "pr", "list", "--state", "all",
            "--search", f"{issue_number} in:body",
            "--json", "number,state",
        ],
        capture_output=True, text=True, check=True,
    )
    prs = json.loads(result.stdout)
    return any(pr["state"] in ("OPEN", "MERGED") for pr in prs)


def scan():
    issues = _list_ready_for_agent_issues()
    return [{**issue, "in_flight": _is_in_flight(issue["number"])} for issue in issues]
