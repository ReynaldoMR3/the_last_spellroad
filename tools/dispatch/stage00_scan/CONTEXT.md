# stage00_scan — Context

**Inputs:** none (calls the live `gh` CLI against this repo).
**Process:** list open `ready-for-agent` issues; for each, check whether any
PR (open or merged) already references it in its body, to skip re-dispatching
work already in flight or shipped from a prior cycle.
**Outputs:** `scan() -> list[dict]` — each issue plus an `in_flight: bool`.
