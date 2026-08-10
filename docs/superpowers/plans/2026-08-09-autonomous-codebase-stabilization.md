# Autonomous Codebase Stabilization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a trustworthy project baseline, reduce duplicate or stale work, and autonomously resolve every safe high- or medium-priority codebase finding while leaving all remaining work explicitly owned and validated.

**Architecture:** Treat this as bounded checkpoints: reconcile repository/tracker/backlog, establish executable baselines, investigate concrete failures one at a time with defect-specific evidence, then record each outcome in the tracker and Ana's append-only log.

**Tech Stack:** Phaser 3.90, TypeScript 5.5, Vite 5.4, Vitest 2.1, Docker Compose, Python/pytest for `content-pipeline`, GitHub Issues.

## Global Constraints

- Follow `AGENTS.md`, `docs/agents/ana/AGENT.md`, and ADR-0001's status vocabulary.
- Preserve agent ownership and required developer-playtest gates.
- Do not invent mechanics, visual direction, or narrative decisions.
- Do not overwrite unrelated work, deploy, merge, push, or make destructive changes.
- Use Docker Compose for repository validation where supplied.
- Every fix needs a check capable of catching its plausible failure class.

---

### Task 1: Reconcile Work Surfaces

**Files:**
- Read: `docs/agents/ana/backlog.md`
- Read: `docs/agents/ana/log.md`
- Read: `docs/adr/0001-verification-rationale-required-for-shipped-status.md`
- Modify: `docs/agents/ana/log.md`

**Interfaces:**
- Consumes: Open issues/PRs, backlog rows, branch state.
- Produces: One deduplicated inventory grouped as shipped, active, blocked, stale, or newly discovered.

- [x] **Step 1: Confirm checkout state**

Run: `git status --short --branch && git remote -v && git log --oneline --decorate -15`

Expected: Record divergence or changes without rebasing/resetting.

- [x] **Step 2: Fetch open GitHub work**

Use the connected repository `ReynaldoMR3/the_last_spellroad` to list all open issues and PRs with titles, labels, assignees, update times, and enough body text to identify dependencies or duplicates.

- [x] **Step 3: Compare GitHub state to Ana's backlog**

Match each item to a row or explain its absence. Flag closed work still called actionable, cleared blockers still marked blocked, duplicates, and unclear implementation branches.

- [x] **Step 4: Append the checkpoint inventory to Ana's log**

Add a dated entry naming counts, mismatches, and the next checkpoint; never rewrite history.

### Task 2: Establish Executable Baselines

**Files:**
- Read: `package.json`
- Read: `docker-compose.yml`
- Read: `content-pipeline/README.md`
- Modify only if a command exposes a concrete defect.

**Interfaces:**
- Consumes: Declared validation commands.
- Produces: Exact pass/fail evidence for tests, typecheck/build, content validation, and pipeline tests.

- [x] **Step 1: Run TypeScript tests**

Run: `docker-compose run --rm game npm test`

- [x] **Step 2: Run typecheck and build**

Run: `docker-compose run --rm game npm run typecheck && docker-compose run --rm game npm run build`

- [x] **Step 3: Confirm content validation coverage**

Inspect `src/data/validateContent.test.ts` and ensure the full Vitest run exercised every shipped spell and wave fixture.

- [x] **Step 4: Run content-pipeline tests**

Run: `docker-compose run --rm content-pipeline pytest -q`

### Task 3: Diagnose and Resolve Concrete Findings

**Files:**
- Test: closest existing `*.test.ts` or `content-pipeline/tests/test_*.py` file.
- Modify: only the smallest owning module.
- Modify: `docs/agents/ana/log.md` after validation.

**Interfaces:**
- Consumes: One reproducible failure or high/medium-risk static finding at a time.
- Produces: A minimal validated fix or non-duplicate issue with ownership and acceptance criteria.

- [x] **Step 1: State one falsifiable defect hypothesis**

Record observed versus contract behavior and the smallest distinguishing check.

- [x] **Step 2: Add or identify the reproducer**

Use a failing unit test for deterministic logic; use the existing frame-pump/dev-server pattern for lifecycle, timing, audio, or interaction defects and explain why unit tests are insufficient.

- [x] **Step 3: Confirm expected failure**

Run the focused check first and verify it fails at the contract violation.

- [x] **Step 4: Implement the smallest correction**

Change only owning code and directly coupled docs; avoid architecture or mechanic expansion.

- [x] **Step 5: Re-run focused and baseline validation**

Run the reproducer, affected package suite, and typecheck/build for runtime changes; state why the gate catches the plausible defect.

- [x] **Step 6: Record or ticket the outcome**

Append fixed evidence to Ana's log. If not safely fixable, create/update an issue with impact, evidence, acceptance criteria, owner/agent, dependencies, and validation plan; deduplicate first.

### Task 4: Close the Autonomous Checkpoint

**Files:**
- Modify: `docs/agents/ana/log.md`
- Modify: `docs/agents/ana/backlog.md` only where reconciliation proves stale status.

**Interfaces:**
- Consumes: Baselines, fixes, tickets, unresolved findings.
- Produces: A compact handoff in Ana's canonical three-state vocabulary.

- [x] **Step 1: Re-run the complete baseline**

- [x] **Step 2: Confirm no unticketed actionable high/medium findings remain**

- [x] **Step 3: Append final checkpoint status with validation rationale**
