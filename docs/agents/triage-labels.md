# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate this issue |
| `needs-info` | `needs-info` | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified, ready for an AFK agent |
| `ready-for-human` | `ready-for-human` | Requires human implementation |
| `wontfix` | `wontfix` | Will not be actioned |

When a skill mentions a role, use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## `ready-for-agent` must mean actually ready

**`ready-for-agent` requires the issue body to contain no unresolved "needs the developer's
call/decision before dispatch" language.** The label and the body text are not allowed to
disagree — confirmed 2026-08-14 that all 3 currently-open `ready-for-agent` issues (#197,
#198, #199) explicitly said in their own body "needs the developer's call... before dispatch,"
which meant the label was lying about dispatch-readiness and Ana (or any dispatching agent)
had to read every issue's full body to catch it, rather than trusting the label as filed.

Before applying `ready-for-agent` (or before treating an existing one as trustworthy):

1. Read the full issue body, not just the label.
2. If it names an open decision the developer hasn't made yet (a scope choice, a fix-direction
   choice, an ambiguity only the developer can resolve), it is **not** `ready-for-agent` yet —
   use `needs-triage` instead, and say plainly in the label change (an issue comment, or in
   Ana's own status report) what decision is still open and who needs to make it.
3. Once the developer actually makes that call (in conversation, in a comment, in a linked
   design doc), update the issue body itself to record the resolved scope before/when applying
   `ready-for-agent` — don't leave the stale "needs a call" sentence sitting in the body of an
   issue now carrying the ready label. A future reader (human or agent) should never have to
   cross-reference a conversation transcript to find out whether a `ready-for-agent` issue's
   own caveat was actually resolved.
