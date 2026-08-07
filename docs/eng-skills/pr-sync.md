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

If you know of other open branches touching the same file(s) as the PR that just merged,
proactively sync them too instead of waiting for their own pre-merge check to catch it. This
is the step that was skipped the one time this actually caused a conflict (2026-08-06 —
three independent tickets, two touching `SpellroadScene.ts` and one touching `Enemy.ts`, all
three branched from the same `main` commit and merged in sequence without re-syncing the
later ones in between).

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
