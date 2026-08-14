# PR sync: keep parallel branches from drifting

This repo is worked by many tool sessions in parallel (Claude Code, Codex, or another
LLM coding tool — see `AGENTS.md`), each usually on its own branch/worktree for one ticket or
a small cluster of related tickets. Several branches can independently touch the same file
(most often `SpellroadScene.ts`/`Enemy.ts`) without knowing about each other. Left alone until
merge time, that drift turns into a real conflict to resolve instead of a small one.

## Why not stacked PRs

GitHub's native stacked-PR feature (`gh stack`, public preview) is for decomposing *one*
person's sequential work into a reviewable chain — each branch deliberately built on the one
below it. That's not this repo's actual pattern: tickets are independent, dispatched to
whichever session/tool is free, and merged in whatever order finishes first. Forcing them into
an artificial dependency chain would add coordination overhead (shared local stack state
across sessions/tools that don't know about each other) without a real dependency to justify
it. Don't reach for `gh stack` here — use the sync habit below instead.

## The habit

Sync the branch against `origin/main` at two points, not just once at the start:

1. **Right before opening a PR** — `git fetch origin && git merge origin/main` in the
   branch/worktree, resolve anything that comes up while it's still small, then push.
2. **Right before merging a PR** — repeat the same fetch+merge. Time may have passed since
   step 1, and another PR may have merged in the meantime.

Check mergeability explicitly rather than assuming a clean push means a clean merge:

```
gh pr view <number> --json mergeable,mergeStateStatus
```

If `mergeable` is `CONFLICTING`, sync now — don't leave it for whoever reviews the PR next.

## After a PR merges

**Explicit rule, not a manual-noticing habit: every finished PR gets its worktree removed, its
branch deleted, and any sibling branches resynced — every time, not just when someone happens
to notice the pile.** Concretely, the moment a PR merges:

1. `git fetch origin`
2. Remove the worktree that built it: `git worktree remove <path>` (add `--force` only if the
   worktree is confirmed clean — check `git -C <path> status --porcelain` first; never discard
   uncommitted work silently).
3. Delete its local branch: `git branch -d <branch>` (confirm first with
   `git branch -r --merged origin/main | grep <branch>` if `-d`'s fast-forward check
   complains — a squash/rebase merge often still leaves git unsure it's "merged" even though
   the remote tracking branch confirms it is).
4. Resync any other open worktree/branch known to touch the same file(s) as the just-merged PR
   (the existing rule below).

This closes a gap this repo actually hit: by 2026-08-14, 20 of 25 registered worktrees were
sitting on already-merged, already-clean branches with nothing removing them — none of them
individually harmful, but compounding indefinitely because no step in the pipeline ever revisits
a worktree once its PR merges. Don't wait for a cleanup pass to notice this again; do steps 1-3
as part of closing out the PR itself, the same session that merges it.

If you know of other open branches touching the same file(s) as the PR that just merged,
proactively sync them too instead of waiting for their own pre-merge check to catch it. This
is the step that was skipped the one time this actually caused a conflict (2026-08-06 —
three independent tickets, two touching `SpellroadScene.ts` and one touching `Enemy.ts`, all
three branched from the same `main` commit and merged in sequence without re-syncing the
later ones in between).

### The predictable case: Ana's own parallel dispatch batches

`docs/agents/ana/backlog.md` and each agent's own `docs/agents/<name>/log.md` are append-only
files that almost every dispatch touches, by design — so whenever Ana dispatches 2+ agents in
parallel in one session, expect a conflict on *these specific files* even when every agent's
actual code/asset changes are completely disjoint. This isn't a signal that the tickets were
badly scoped; it's structural. Ana's dispatch procedure (`docs/agents/ana/AGENT.md`, step 7)
requires a sync sweep across the whole batch the moment any one of its PRs merges — don't wait
for each PR's own pre-merge check.

The resolution is mechanical and low-risk: both sides of the conflict are almost always
whole, independent, dated log entries appended near the same tail. Keep both entries in full,
in the order they'd naturally appear (earlier dispatch first), and just delete the conflict
markers — there is normally nothing to actually reconcile between them. Confirmed 2026-08-09:
two PRs (#156, #158) conflicted purely on `backlog.md`/`heckler/log.md`/`composer/log.md`
after two sibling PRs from the same batch merged first; both resolved by concatenating the
dated entries, re-running typecheck/test/build, and re-pushing — no content from either PR was
dropped or altered.

## Prefer not to conflict in the first place

When scoping or triaging tickets (e.g. via `/to-tickets`, backlog grooming, or Ana's dispatch
procedure — `docs/agents/ana/AGENT.md`), bundle tickets already known to touch the same
file/area into one branch instead of splitting them into parallel PRs. This repo's own branch
history already does this (e.g. `loomwright/fix-freeze-lane-mana-52-53-54` bundles three
issues, `ana/close-76-80` bundles five) — it's cheaper than syncing two branches against each
other later.

## When a skill says "finish the branch"

The `finishing-a-development-branch` flow's push-and-create-PR step isn't complete until the
sync check above has been run once against the current `origin/main` — a green local test
suite doesn't prove the branch merges cleanly, only that it worked against the commit it
happened to fork from.
