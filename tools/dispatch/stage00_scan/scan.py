"""Stage 00: find ready-for-agent issues, flag ones already mid-PR. No LLM call."""

import json
import re
import subprocess

# A PR only counts as implementing an issue if it actually links it via
# GitHub's closing-keyword convention (matches this repo's own "Closes #N"
# dispatch-PR convention -- see stage02_dispatch's prompt). A bare mention
# of the issue number anywhere in a PR body (e.g. a routing-fix PR that
# merely *discusses* issue #222 as an example) must not count -- that
# false positive would mark the issue in-flight forever, since a merged
# PR never ages out of search.
#
# Includes the present-continuous forms ("closing #198") -- confirmed live
# against this repo's real merged PR #221 ("...closing #198.") -- alongside
# GitHub's own recognized keyword set. A negative lookbehind excludes "not
# close #N"/"not fix #N"/etc (this repo's PRs use exactly this phrasing --
# "Related to (does not close) #191" -- to link a *related but unresolved*
# issue without claiming to implement it).
_CLOSING_KEYWORDS = r"close[sd]?|closing|fix(?:e[sd])?|fixing|resolve[sd]?|resolving"


def _closes_issue(body, issue_number):
    pattern = rf"\b(?<!not\s)(?:{_CLOSING_KEYWORDS})\s+#{issue_number}\b"
    return re.search(pattern, body or "", re.IGNORECASE) is not None


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
    # --search still narrows the candidate set server-side (cheap); the
    # real in-flight decision is the precise regex check below, not this
    # substring search alone.
    result = subprocess.run(
        [
            "gh", "pr", "list", "--state", "all",
            "--search", f"{issue_number} in:body",
            "--json", "number,state,body",
        ],
        capture_output=True, text=True, check=True,
    )
    prs = json.loads(result.stdout)
    return any(
        pr["state"] in ("OPEN", "MERGED") and _closes_issue(pr.get("body"), issue_number)
        for pr in prs
    )


def scan():
    issues = _list_ready_for_agent_issues()
    return [{**issue, "in_flight": _is_in_flight(issue["number"])} for issue in issues]
