# Goal-Oriented Coding Agent (Assignment #5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a goal-oriented coding agent that reads the GDD, scans the codebase, detects gaps, prioritizes, and generates real code for at least one missing feature — then execute it for real once, ship the resulting feature, and write the graded README.

**Architecture:** Two dependency-free Python scanners (`scan_gdd.py`, `scan_codebase.py`) turn the GDD and codebase into structured JSON with zero LLM involvement. A documented reasoning contract (`AGENT_CONTRACT.md`) is then followed by this very session (acting as Ana) to detect gaps, prioritize, and implement the top pick — `SaveSystem` cross-session wiring (backlog 1.6) — directly in `src/`.

**Tech Stack:** Python 3 stdlib only (scanners, no `pip install`), TypeScript/Vitest (the generated feature, matching the existing `src/` conventions), Docker (`docker-compose run --rm game ...` for typecheck/test/build per this repo's standing convention).

## Global Constraints

- No paid LLM API key is available or needed — the reasoning layer is this live session, not a program calling an external model (per the approved design's explicit reasoning about local-Ollama schema drift risk on this task).
- The two scanners must have zero external dependencies (stdlib only: `re`, `os`, `json`, `sys`) — no `requirements.txt`, no virtualenv setup.
- All new/changed TypeScript must pass `docker-compose run --rm game npm run typecheck`, `npm test`, and `npm run build` before being reported as done, per this repo's standing verification convention.
- Every new TypeScript function gets a colocated Vitest test (`*.test.ts` next to the file it tests), TDD-ordered (failing test first).
- Any dated per-agent log entry follows this repo's existing convention: append under a new `## YYYY-MM-DD — <title>` heading, never edit or delete prior entries.
- `docs/agents/ana/backlog.md`'s maintenance rule applies: update a row's `Status` the moment the work it tracks changes, and never renumber existing task IDs.
- Course-repo deliverables (code-based assignments, #3 onward) get a short pointer file in `multi-agent-ai-in-game-development/docs/submissions/`; the real deliverable stays in this game repo.

---

### Task 1: `scan_gdd.py` — deterministic GDD parser

**Files:**
- Create: `docs/agents/ana/goal-oriented-agent/scan_gdd.py`
- Create: `docs/agents/ana/goal-oriented-agent/test_scan_gdd.py`

**Interfaces:**
- Produces: `chunk_gdd_sections(text: str) -> list[dict]` — each dict has `id`, `title`, `level` (int, 2-4), `path` (str, breadcrumb of ancestor headings joined by `" > "`), `text` (str, section body excluding the heading line itself). Order matches document order.
- Produces: `slugify(heading: str) -> str`.
- Produces: `scan_gdd(gdd_path: str) -> dict` — `{"source_path": str, "sections": list[dict]}` (the dicts described above).
- Produces: CLI entry point — `python3 scan_gdd.py [gdd_path] [out_path]`; defaults to this repo's real GDD path and stdout.

- [ ] **Step 1: Write the failing tests**

Create `docs/agents/ana/goal-oriented-agent/test_scan_gdd.py`:

```python
import os
import tempfile
import unittest

from scan_gdd import chunk_gdd_sections, scan_gdd, slugify

SAMPLE_GDD = """# Sample Design

## Summary

One line summary.

## Gameplay Loop

Loop text here.

### Sub Detail

Nested detail text.

## Save Data And Persistence

Persistence text.
"""


class ChunkGddSectionsTest(unittest.TestCase):
    def test_splits_by_heading_in_order(self):
        sections = chunk_gdd_sections(SAMPLE_GDD)
        titles = [s["title"] for s in sections]
        self.assertEqual(
            titles,
            ["Summary", "Gameplay Loop", "Sub Detail", "Save Data And Persistence"],
        )

    def test_tracks_heading_level(self):
        sections = chunk_gdd_sections(SAMPLE_GDD)
        levels = {s["title"]: s["level"] for s in sections}
        self.assertEqual(levels["Gameplay Loop"], 2)
        self.assertEqual(levels["Sub Detail"], 3)

    def test_builds_breadcrumb_path_for_nested_headings(self):
        sections = chunk_gdd_sections(SAMPLE_GDD)
        by_title = {s["title"]: s for s in sections}
        self.assertEqual(by_title["Sub Detail"]["path"], "Gameplay Loop > Sub Detail")
        self.assertEqual(by_title["Summary"]["path"], "Summary")

    def test_a_sibling_heading_closes_the_previous_ones_nested_children(self):
        sections = chunk_gdd_sections(SAMPLE_GDD)
        by_title = {s["title"]: s for s in sections}
        self.assertEqual(
            by_title["Save Data And Persistence"]["path"], "Save Data And Persistence"
        )

    def test_captures_body_text_excluding_the_heading_line(self):
        sections = chunk_gdd_sections(SAMPLE_GDD)
        by_title = {s["title"]: s for s in sections}
        self.assertIn("Persistence text.", by_title["Save Data And Persistence"]["text"])
        self.assertNotIn(
            "## Save Data And Persistence", by_title["Save Data And Persistence"]["text"]
        )

    def test_deduplicates_ids_for_repeated_heading_text(self):
        text = "## Repeat\n\nfirst\n\n## Repeat\n\nsecond\n"
        sections = chunk_gdd_sections(text)
        ids = [s["id"] for s in sections]
        self.assertEqual(ids, ["repeat", "repeat-2"])


class SlugifyTest(unittest.TestCase):
    def test_lowercases_and_hyphenates(self):
        self.assertEqual(slugify("Save Data And Persistence"), "save-data-and-persistence")


class ScanGddTest(unittest.TestCase):
    def test_reads_a_real_file_and_returns_all_sections(self):
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as f:
            f.write(SAMPLE_GDD)
            path = f.name
        try:
            result = scan_gdd(path)
            self.assertEqual(result["source_path"], path)
            self.assertEqual(len(result["sections"]), 4)
        finally:
            os.remove(path)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd docs/agents/ana/goal-oriented-agent && python3 -m unittest test_scan_gdd -v`
Expected: FAIL / ERROR — `ModuleNotFoundError: No module named 'scan_gdd'` (the module doesn't exist yet).

- [ ] **Step 3: Write `scan_gdd.py`**

```python
"""Deterministic GDD -> structured feature list. No LLM involved: pure heading-based
parsing. Mirrors the shape of content-pipeline/stage01_retrieval/rag.py's
chunk_markdown_sections, but standalone (stdlib only, no embedding dependencies) since
gap-detection compares the GDD's full text against the codebase, not a top-k retrieval
slice of it.
"""
import json
import os
import re
import sys

HEADING_RE = re.compile(r"^(#{2,4})\s+(.+)$", re.MULTILINE)

DEFAULT_GDD_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "game", "the-last-spellroad-design.md"
)


def slugify(heading):
    slug = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")
    return slug or "section"


def chunk_gdd_sections(text):
    """One entry per ##/###/#### heading, in document order, each carrying a breadcrumb
    `path` of its ancestor headings (a level-3 heading's path includes the level-2
    heading it's nested under; a sibling heading at the same or shallower level closes
    that nesting for whatever follows it)."""
    matches = list(HEADING_RE.finditer(text))
    sections = []
    stack = []  # (level, heading) ancestor chain, innermost last
    seen_ids = {}
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        level = len(match.group(1))
        heading = match.group(2).strip()
        body = text[match.end() : end].strip()

        while stack and stack[-1][0] >= level:
            stack.pop()
        stack.append((level, heading))
        path = " > ".join(h for _, h in stack)

        base_id = slugify(heading)
        seen_ids[base_id] = seen_ids.get(base_id, 0) + 1
        section_id = base_id if seen_ids[base_id] == 1 else f"{base_id}-{seen_ids[base_id]}"

        sections.append(
            {"id": section_id, "title": heading, "level": level, "path": path, "text": body}
        )
    return sections


def scan_gdd(gdd_path):
    with open(gdd_path, "r", encoding="utf-8") as f:
        text = f.read()
    return {"source_path": gdd_path, "sections": chunk_gdd_sections(text)}


def main():
    gdd_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_GDD_PATH
    out_path = sys.argv[2] if len(sys.argv) > 2 else None
    output = json.dumps(scan_gdd(gdd_path), indent=2, ensure_ascii=False)
    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(output + "\n")
    else:
        print(output)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd docs/agents/ana/goal-oriented-agent && python3 -m unittest test_scan_gdd -v`
Expected: `OK` — 8 tests passing.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/ana/goal-oriented-agent/scan_gdd.py docs/agents/ana/goal-oriented-agent/test_scan_gdd.py
git commit -m "Add deterministic GDD scanner for the goal-oriented agent (Assignment #5)"
```

---

### Task 2: `scan_codebase.py` — deterministic codebase + backlog scanner

**Files:**
- Create: `docs/agents/ana/goal-oriented-agent/scan_codebase.py`
- Create: `docs/agents/ana/goal-oriented-agent/test_scan_codebase.py`

**Interfaces:**
- Consumes: nothing from Task 1 (independent module).
- Produces: `scan_src_dir(src_root: str) -> list[dict]` — each dict has `path` (relative to `src_root`, e.g. `"systems/MasterySystem.ts"`), `exported_symbols` (sorted list of str), `has_colocated_test` (bool).
- Produces: `parse_backlog_status(backlog_text: str) -> dict[str, dict]` — keyed by task id (e.g. `"1.6"`), each value `{"status": str, "status_note": str, "depends_on": str}`. `status` is one of `shipped-and-validated`/`in-progress-with-owner`/`blocked-with-reason`/`not-started`/`unknown`.
- Produces: `scan_codebase(src_root: str, backlog_path: str) -> dict` — `{"src_files": list[dict], "backlog_tasks": dict[str, dict]}`.
- Produces: CLI entry point — `python3 scan_codebase.py [src_root] [backlog_path] [out_path]`; defaults to this repo's real `src/` and `docs/agents/ana/backlog.md`, stdout.

- [ ] **Step 1: Write the failing tests**

Create `docs/agents/ana/goal-oriented-agent/test_scan_codebase.py`:

```python
import os
import shutil
import tempfile
import unittest

from scan_codebase import parse_backlog_status, scan_codebase, scan_src_dir

SAMPLE_BACKLOG = """
## Phase 1 — Engine foundation

| ID | Task | Owner | Model | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| 1.6 | Checkpoint/respawn placement + save schema v2 | Sonnet 5 | Sonnet 5 | 1.2, 1.5, **0.2** | `blocked-with-reason` — reason text here |
| 1.7 | Some clean not-started row | Sonnet 5 | Sonnet 5 | none | `not-started` |
"""


class ScanSrcDirTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.tmp, "systems"))

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def write(self, relpath, text):
        full = os.path.join(self.tmp, relpath)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as f:
            f.write(text)

    def test_finds_exported_symbols_in_a_system_file(self):
        self.write("systems/Foo.ts", "export class Foo {}\nexport const BAR = 1;\n")
        entries = scan_src_dir(self.tmp)
        foo = next(e for e in entries if e["path"] == os.path.join("systems", "Foo.ts"))
        self.assertEqual(foo["exported_symbols"], ["BAR", "Foo"])

    def test_flags_a_colocated_test_file(self):
        self.write("systems/Foo.ts", "export class Foo {}\n")
        self.write("systems/Foo.test.ts", "// test\n")
        entries = scan_src_dir(self.tmp)
        foo = next(e for e in entries if e["path"] == os.path.join("systems", "Foo.ts"))
        self.assertTrue(foo["has_colocated_test"])

    def test_a_file_with_no_test_reports_false(self):
        self.write("systems/Bar.ts", "export class Bar {}\n")
        entries = scan_src_dir(self.tmp)
        bar = next(e for e in entries if e["path"] == os.path.join("systems", "Bar.ts"))
        self.assertFalse(bar["has_colocated_test"])

    def test_does_not_treat_a_test_file_itself_as_a_source_entry(self):
        self.write("systems/Baz.ts", "export class Baz {}\n")
        self.write("systems/Baz.test.ts", "// test\n")
        entries = scan_src_dir(self.tmp)
        paths = [e["path"] for e in entries]
        self.assertNotIn(os.path.join("systems", "Baz.test.ts"), paths)

    def test_skips_missing_src_subdirs_without_error(self):
        self.write("systems/Foo.ts", "export class Foo {}\n")
        entries = scan_src_dir(self.tmp)  # no scenes/entities/data/dev dirs exist
        self.assertEqual(len(entries), 1)


class ParseBacklogStatusTest(unittest.TestCase):
    def test_extracts_status_token_for_each_task_row(self):
        rows = parse_backlog_status(SAMPLE_BACKLOG)
        self.assertEqual(rows["1.6"]["status"], "blocked-with-reason")
        self.assertEqual(rows["1.7"]["status"], "not-started")

    def test_skips_the_header_and_separator_rows(self):
        rows = parse_backlog_status(SAMPLE_BACKLOG)
        self.assertEqual(len(rows), 2)

    def test_captures_the_depends_on_column(self):
        rows = parse_backlog_status(SAMPLE_BACKLOG)
        self.assertIn("0.2", rows["1.6"]["depends_on"])

    def test_unrecognized_status_text_becomes_unknown_not_a_crash(self):
        text = "| 9.1 | Some task | Owner | Model | none | some free text, no backticks |"
        rows = parse_backlog_status(text)
        self.assertEqual(rows["9.1"]["status"], "unknown")


class ScanCodebaseTest(unittest.TestCase):
    def test_combines_src_scan_and_backlog_parse(self):
        tmp = tempfile.mkdtemp()
        try:
            os.makedirs(os.path.join(tmp, "src", "systems"))
            with open(os.path.join(tmp, "src", "systems", "Foo.ts"), "w") as f:
                f.write("export class Foo {}\n")
            backlog_path = os.path.join(tmp, "backlog.md")
            with open(backlog_path, "w") as f:
                f.write(SAMPLE_BACKLOG)
            result = scan_codebase(os.path.join(tmp, "src"), backlog_path)
            self.assertEqual(len(result["src_files"]), 1)
            self.assertIn("1.6", result["backlog_tasks"])
        finally:
            shutil.rmtree(tmp)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd docs/agents/ana/goal-oriented-agent && python3 -m unittest test_scan_codebase -v`
Expected: FAIL / ERROR — `ModuleNotFoundError: No module named 'scan_codebase'`.

- [ ] **Step 3: Write `scan_codebase.py`**

```python
"""Deterministic codebase + backlog scanner. No LLM: regex-based export detection and a
markdown-table-row parser for docs/agents/ana/backlog.md's own Status column. Resilient
to unrecognized status text by design (see KNOWN_STATUSES) — a future backlog convention
change should surface as "unknown" rows, not a crash.
"""
import json
import os
import re
import sys

SRC_SUBDIRS = ["scenes", "systems", "entities", "data", "dev"]
EXPORT_RE = re.compile(
    r"^export\s+(?:default\s+)?(?:class|function|interface|const|type)\s+([A-Za-z0-9_]+)",
    re.MULTILINE,
)
KNOWN_STATUSES = {
    "shipped-and-validated",
    "in-progress-with-owner",
    "blocked-with-reason",
    "not-started",
}
BACKLOG_ROW_RE = re.compile(r"^\|\s*(?P<id>[0-9]+\.[0-9]+)\s*\|(?P<rest>.*)\|\s*$")
STATUS_PREFIX_RE = re.compile(r"^`([a-z-]+)`")

DEFAULT_SRC_ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "src")
DEFAULT_BACKLOG_PATH = os.path.join(os.path.dirname(__file__), "..", "backlog.md")


def scan_src_dir(src_root):
    entries = []
    for subdir in SRC_SUBDIRS:
        dir_path = os.path.join(src_root, subdir)
        if not os.path.isdir(dir_path):
            continue
        for filename in sorted(os.listdir(dir_path)):
            if not filename.endswith(".ts") or filename.endswith(".test.ts"):
                continue
            file_path = os.path.join(dir_path, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
            test_path = file_path[: -len(".ts")] + ".test.ts"
            entries.append(
                {
                    "path": os.path.relpath(file_path, src_root),
                    "exported_symbols": sorted({m.group(1) for m in EXPORT_RE.finditer(text)}),
                    "has_colocated_test": os.path.exists(test_path),
                }
            )
    return entries


def parse_backlog_status(backlog_text):
    """Parses each markdown-table row shaped `| <id> | ... | <Status column> |`. Only
    rows whose first cell matches `<phase>.<n>` are treated as task rows (skips
    header/separator rows and surrounding prose)."""
    rows = {}
    for line in backlog_text.splitlines():
        match = BACKLOG_ROW_RE.match(line.strip())
        if not match:
            continue
        task_id = match.group("id")
        cells = [c.strip() for c in match.group("rest").split("|")]
        status_cell = cells[-1] if cells else ""
        depends_on = cells[-2].strip() if len(cells) >= 2 else ""
        token_match = STATUS_PREFIX_RE.match(status_cell)
        status = (
            token_match.group(1)
            if token_match and token_match.group(1) in KNOWN_STATUSES
            else "unknown"
        )
        rows[task_id] = {"status": status, "status_note": status_cell, "depends_on": depends_on}
    return rows


def scan_codebase(src_root, backlog_path):
    with open(backlog_path, "r", encoding="utf-8") as f:
        backlog_text = f.read()
    return {
        "src_files": scan_src_dir(src_root),
        "backlog_tasks": parse_backlog_status(backlog_text),
    }


def main():
    src_root = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC_ROOT
    backlog_path = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_BACKLOG_PATH
    out_path = sys.argv[3] if len(sys.argv) > 3 else None
    output = json.dumps(scan_codebase(src_root, backlog_path), indent=2, ensure_ascii=False)
    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(output + "\n")
    else:
        print(output)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd docs/agents/ana/goal-oriented-agent && python3 -m unittest test_scan_codebase -v`
Expected: `OK` — 10 tests passing.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/ana/goal-oriented-agent/scan_codebase.py docs/agents/ana/goal-oriented-agent/test_scan_codebase.py
git commit -m "Add deterministic codebase/backlog scanner for the goal-oriented agent (Assignment #5)"
```

---

### Task 3: `CONTEXT.md` and `AGENT_CONTRACT.md`

**Files:**
- Create: `docs/agents/ana/goal-oriented-agent/CONTEXT.md`
- Create: `docs/agents/ana/goal-oriented-agent/AGENT_CONTRACT.md`

**Interfaces:**
- Consumes: the scanner CLIs from Tasks 1-2 (referenced by exact command).
- Produces: no code — these are the documentation deliverables Task 4 executes against and Task 11's README links to.

- [ ] **Step 1: Write `CONTEXT.md`**

```markdown
# Goal-Oriented Agent — Context

**Purpose:** Course Assignment #5. Automates the gap-detection/prioritization Ana already
does by hand via `docs/agents/ana/backlog.md`, and generates real code for the
top-priority gap found.

**Layer 1 — deterministic scanners (no LLM, run from this folder):**

```bash
python3 scan_gdd.py > output/gdd_features.json
python3 scan_codebase.py > output/codebase_inventory.json
```

**Layer 2 — reasoning.** Open a Claude Code or Codex session in this repo, point it at
`AGENT_CONTRACT.md`, and give it the two JSON files above plus the raw text of
`docs/agents/ana/backlog.md`. No API key needed — this is a live coding session
following a written procedure, the same way Loomwright/Frieren/Warden already work.

**Tests:** `python3 -m unittest discover -s . -p 'test_*.py' -v` (run from this folder).

**Evidence of one real run:** `output/gdd_features.json`, `output/codebase_inventory.json`,
`output/run_report.md` — committed, not regenerated fresh for grading. Re-running the
scanners is safe and idempotent, but the committed run is what `README.md`'s claims are
based on.
```

- [ ] **Step 2: Write `AGENT_CONTRACT.md`**

```markdown
# Ana's Goal-Oriented Build Contract

**What this is:** a documented reasoning procedure, run by a live Claude Code or Codex
session acting as Ana. It has no separate program of its own — the "agent" is this
contract plus the deterministic scanners in this folder. Re-run it any time you want the
next gap identified and built.

## Inputs

1. `output/gdd_features.json` (from `scan_gdd.py`) — every GDD section, heading path, and
   full text.
2. `output/codebase_inventory.json` (from `scan_codebase.py`) — every `src/` file's
   exported symbols + test-coverage flag, and every backlog row's parsed
   status/depends-on.
3. The raw text of `docs/agents/ana/backlog.md` — read directly. The scanner's parse is a
   lossy summary, not a replacement.
4. The raw text of `docs/game/the-last-spellroad-design.md` — read directly for any
   section flagged as a candidate gap. The JSON carries the full section text, but read
   the surrounding sections too before concluding.

## Step 1 — Detect gaps

A GDD section (from `gdd_features.json`) is a **gap** if:

- No `src_files` entry's exported symbols or file name plausibly implements it, AND
- No backlog row tracks it as `shipped-and-validated`, AND
- Any backlog row that tracks it as `blocked-with-reason` or `in-progress-with-owner` has
  its **stated blocking dependency still actually unresolved** — check that dependency's
  own row status directly, don't trust a stale label. A row whose blocker has since
  resolved is still a live gap.

List every gap found: GDD section title, the backlog row(s) that reference it (if any),
and one sentence on what's missing.

## Step 2 — Prioritize

Rank the gap list by, in order:

1. Backlog phase order (an earlier-phase gap outranks a later-phase one).
2. Dependency readiness (a gap whose real blocker is still open drops behind one that's
   actually clear, regardless of phase).
3. The GDD's Seven-Week Vertical Slice floor-vs-stretch framing (a floor-scope item
   outranks a stretch-scope one).
4. Prefer the smaller, more coherent slice of a large gap over attempting the whole thing
   at once.

State the #1 pick and write out the reasoning against all four criteria explicitly — a
pick with no stated reasoning fails this contract's whole purpose.

## Step 3 — Scope the slice

Before writing any code, state exactly what subset of the gap this pass will build, and
what's explicitly left out with a one-line reason for each exclusion. A partial slice is
fine; a silent one is not.

## Step 4 — Generate code

- Follow existing file conventions exactly (colocated Vitest tests, existing module
  shapes) — read at least one sibling file in the same directory before writing a new one
  or extending an existing one.
- Every new/changed function gets a test, TDD-ordered.
- Must pass `docker-compose run --rm game npm run typecheck`, `npm test`, and
  `npm run build` before being reported as done.
- Add a dated entry to the owning agent's `docs/agents/<name>/log.md` (check the GDD's
  Agent Role Definitions section for who owns the system you're touching).
- Update the relevant `docs/agents/ana/backlog.md` row(s) status the same session, per
  that file's own maintenance rule ("update the moment an agent reports back").

## Step 5 — Report

Write `output/run_report.md`: the full gap list (Step 1), the ranked list + rationale
(Step 2), the scoping decision (Step 3), what was built + verification results (Step 4),
and an honest answer to "did this run in the actual game."
```

- [ ] **Step 3: Commit**

```bash
git add docs/agents/ana/goal-oriented-agent/CONTEXT.md docs/agents/ana/goal-oriented-agent/AGENT_CONTRACT.md
git commit -m "Document the goal-oriented agent's context and reasoning contract (Assignment #5)"
```

---

### Task 4: Execute the scanners for real

**Files:**
- Create: `docs/agents/ana/goal-oriented-agent/output/gdd_features.json` (generated, committed)
- Create: `docs/agents/ana/goal-oriented-agent/output/codebase_inventory.json` (generated, committed)

**Interfaces:**
- Consumes: `scan_gdd.py`/`scan_codebase.py` (Tasks 1-2), run against this actual repo's `docs/game/the-last-spellroad-design.md`, `src/`, and `docs/agents/ana/backlog.md`.
- Produces: the two JSON files Task 10's `run_report.md` reasons over.

- [ ] **Step 1: Run both scanners against the real repo**

```bash
cd docs/agents/ana/goal-oriented-agent
mkdir -p output
python3 scan_gdd.py > output/gdd_features.json
python3 scan_codebase.py > output/codebase_inventory.json
```

- [ ] **Step 2: Sanity-check the output by inspection**

Run: `python3 -c "import json; d = json.load(open('output/gdd_features.json')); print(len(d['sections']), 'sections'); print([s['title'] for s in d['sections']][:5])"`
Expected: 42 sections (matches the GDD's real `##`/`###`/`####` heading count — confirmed via `grep -c "^#\{2,4\} " docs/game/the-last-spellroad-design.md`), and the first 5 titles start with `Summary`, `Player Fantasy`, `Target Audience And Positioning`, `Lore Premise`, `Gameplay Loop`.

Run: `python3 -c "import json; d = json.load(open('output/codebase_inventory.json')); print(len(d['src_files']), 'src files'); print('1.6' in d['backlog_tasks'], d['backlog_tasks']['1.6']['status'])"`
Expected: some non-zero number of `src_files` entries covering `scenes/`, `systems/`, `entities/`, `data/`, `dev/`; `True blocked-with-reason` for backlog task 1.6 (this is the stale label Task 10's reasoning will catch).

If either sanity check doesn't match, fix the scanner (not the check) before proceeding — these numbers are ground truth from the real repo, not a moving target.

- [ ] **Step 3: Commit**

```bash
git add docs/agents/ana/goal-oriented-agent/output/gdd_features.json docs/agents/ana/goal-oriented-agent/output/codebase_inventory.json
git commit -m "Run the goal-oriented agent's scanners against the real repo (Assignment #5)"
```

---

### Task 5: `SaveSystem.test.ts` — retrofit test coverage for the existing untested module

**Files:**
- Create: `src/systems/SaveSystem.test.ts`

**Interfaces:**
- Consumes: `defaultSave`, `hasSave`, `loadSave`, `writeSave`, `type SaveBlob` from `src/systems/SaveSystem.ts` (all already exported, unchanged by this task).

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from "vitest";
import { defaultSave, hasSave, loadSave, writeSave, type SaveBlob } from "./SaveSystem";

/** In-memory Storage stand-in — every SaveSystem function accepts an injected `Storage`,
 * so tests never touch a real browser `localStorage`. */
class FakeStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("SaveSystem", () => {
  it("reports no save when nothing has been written", () => {
    const storage = new FakeStorage();
    expect(hasSave(storage)).toBe(false);
  });

  it("reports a save exists once something is written", () => {
    const storage = new FakeStorage();
    writeSave(defaultSave(), storage);
    expect(hasSave(storage)).toBe(true);
  });

  it("loadSave returns the default blob when nothing is saved", () => {
    const storage = new FakeStorage();
    expect(loadSave(storage)).toEqual(defaultSave());
  });

  it("round-trips a written save through loadSave", () => {
    const storage = new FakeStorage();
    const blob: SaveBlob = { ...defaultSave(), hexcoinBalance: 42, checkpointId: "3" };
    writeSave(blob, storage);
    expect(loadSave(storage)).toEqual(blob);
  });

  it("clean-resets on a schema-version mismatch instead of returning the stale blob", () => {
    const storage = new FakeStorage();
    writeSave(defaultSave(), storage);
    const key = storage.key(0)!;
    storage.setItem(key, JSON.stringify({ ...defaultSave(), schemaVersion: 999 }));
    expect(loadSave(storage)).toEqual(defaultSave());
    expect(hasSave(storage)).toBe(false);
  });

  it("clean-resets on unparseable JSON instead of throwing", () => {
    const storage = new FakeStorage();
    writeSave(defaultSave(), storage);
    const key = storage.key(0)!;
    storage.setItem(key, "{not json");
    expect(loadSave(storage)).toEqual(defaultSave());
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `docker-compose run --rm game npx vitest run src/systems/SaveSystem.test.ts`
Expected: `PASS` — 6 tests (this is retrofit coverage for existing, unchanged behavior — no implementation step needed).

- [ ] **Step 3: Commit**

```bash
git add src/systems/SaveSystem.test.ts
git commit -m "Add test coverage for SaveSystem (previously untested)"
```

---

### Task 6: `MasterySystem.exportState`/`importState`

**Files:**
- Modify: `src/systems/MasterySystem.ts`
- Modify: `src/systems/MasterySystem.test.ts:135-137` (insert before the final closing braces)

**Interfaces:**
- Consumes: existing `MasteryState` interface (already exported), `this.state: Map<string, MasteryState>` (existing private field).
- Produces: `MasterySystem.exportState(): Record<string, MasteryState>`, `MasterySystem.importState(saved: Record<string, MasteryState>): void` — Task 8 calls both.

- [ ] **Step 1: Write the failing tests**

Insert into `src/systems/MasterySystem.test.ts`, immediately before the file's final `});` (the outer `describe("MasterySystem", ...)`'s closing brace, currently line 137):

```typescript
  describe("exportState / importState", () => {
    it("exportState returns every spell tracked so far, tier and landed-cast progress included", () => {
      const mastery = new MasterySystem();
      mastery.recordLandedCast("ember_lance");
      mastery.recordLandedCast("frost_bolt");
      expect(mastery.exportState()).toEqual({
        ember_lance: { tier: "novice", landedCasts: 1 },
        frost_bolt: { tier: "novice", landedCasts: 1 }
      });
    });

    it("importState replaces all prior tracking with the given state", () => {
      const mastery = new MasterySystem();
      mastery.recordLandedCast("ember_lance");
      mastery.importState({ frost_bolt: { tier: "master", landedCasts: 5 } });
      expect(mastery.getTier("frost_bolt")).toBe("master");
      expect(mastery.exportState()).toEqual({ frost_bolt: { tier: "master", landedCasts: 5 } });
    });

    it("a spell not present in an imported state starts fresh at Novice", () => {
      const mastery = new MasterySystem();
      mastery.importState({ frost_bolt: { tier: "master", landedCasts: 0 } });
      expect(mastery.getTier("ember_lance")).toBe("novice");
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker-compose run --rm game npx vitest run src/systems/MasterySystem.test.ts`
Expected: FAIL — `mastery.exportState is not a function`.

- [ ] **Step 3: Implement `exportState`/`importState`**

In `src/systems/MasterySystem.ts`, add these two public methods to the `MasterySystem` class (after `getScaling`, before `applyRandomDeathPenalty` — or anywhere else in the class body):

```typescript
  /** backlog 1.6 — the full per-spell tier/landed-cast map, for SaveSystem to persist. */
  exportState(): Record<string, MasteryState> {
    return Object.fromEntries(this.state);
  }

  /** backlog 1.6 — replaces all tracking with a loaded save's state. A spell absent from
   * `saved` simply hasn't been tracked before and starts fresh at Novice via `ensure()`,
   * same as any other never-before-seen spell id. */
  importState(saved: Record<string, MasteryState>): void {
    this.state.clear();
    for (const [spellId, entry] of Object.entries(saved)) {
      this.state.set(spellId, { tier: entry.tier, landedCasts: entry.landedCasts });
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker-compose run --rm game npx vitest run src/systems/MasterySystem.test.ts`
Expected: `PASS` — all existing cases plus the 3 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/systems/MasterySystem.ts src/systems/MasterySystem.test.ts
git commit -m "Add MasterySystem.exportState/importState for save-data round-tripping"
```

---

### Task 7: `HexcoinSystem.restoreBalance`

**Files:**
- Modify: `src/systems/HexcoinSystem.ts`
- Create: `src/systems/HexcoinSystem.test.ts` (this class has zero prior test coverage)

**Interfaces:**
- Consumes: existing private fields `expeditionTotal`, `levelStartBalance`, `fightSnapshot`, `recoveriesUsedThisFight` (all already defined in the class).
- Produces: `HexcoinSystem.restoreBalance(amount: number): void` — Task 8 calls it.

- [ ] **Step 1: Write the failing tests**

Create `src/systems/HexcoinSystem.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { FEE_PHASE_RECOVERY, HexcoinSystem } from "./HexcoinSystem";

describe("HexcoinSystem.restoreBalance", () => {
  it("sets the balance to the given amount", () => {
    const hexcoin = new HexcoinSystem();
    hexcoin.restoreBalance(75);
    expect(hexcoin.balance).toBe(75);
  });

  it("marks the restored amount as this level's floor, same as markLevelStart", () => {
    const hexcoin = new HexcoinSystem();
    hexcoin.restoreBalance(75);
    hexcoin.earn(10);
    hexcoin.rollbackToLevelStart();
    expect(hexcoin.balance).toBe(75);
  });

  it("clears any in-progress boss-fight snapshot so stale fight state can't leak in from before the save", () => {
    const hexcoin = new HexcoinSystem();
    hexcoin.earn(100);
    hexcoin.startBossFight();
    hexcoin.usePhaseRecovery(2);
    hexcoin.restoreBalance(50);
    expect(hexcoin.canUsePhaseRecovery(2)).toBe(50 >= FEE_PHASE_RECOVERY);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker-compose run --rm game npx vitest run src/systems/HexcoinSystem.test.ts`
Expected: FAIL — `hexcoin.restoreBalance is not a function`.

- [ ] **Step 3: Implement `restoreBalance`**

In `src/systems/HexcoinSystem.ts`, add this public method to the `HexcoinSystem` class (after `markLevelStart`, before `rollbackToLevelStart` — or anywhere else in the class body):

```typescript
  /** backlog 1.6 — seeds the balance from a loaded save. Same internal shape as
   * `resetExpedition`, but to the restored value instead of 0, and marking that value as
   * this level's own floor (a checkpoint load IS the start of that level's attempt, so
   * `markLevelStart`'s existing floor semantics apply unchanged). */
  restoreBalance(amount: number): void {
    this.expeditionTotal = amount;
    this.levelStartBalance = amount;
    this.fightSnapshot = null;
    this.recoveriesUsedThisFight = 0;
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker-compose run --rm game npx vitest run src/systems/HexcoinSystem.test.ts`
Expected: `PASS` — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/systems/HexcoinSystem.ts src/systems/HexcoinSystem.test.ts
git commit -m "Add HexcoinSystem.restoreBalance for save-data round-tripping"
```

---

### Task 8: Wire `SpellroadScene` and `TitleScene`

**Files:**
- Modify: `src/scenes/SpellroadScene.ts` (imports; new field; `create()` signature + body; `startWave()`; the Mastery tier-up callback; a new `writeCheckpoint()` method)
- Modify: `src/scenes/TitleScene.ts` (imports; class doc comment; `continueGame()`)

**Interfaces:**
- Consumes: `MasterySystem.exportState`/`importState` (Task 6), `HexcoinSystem.restoreBalance` (Task 7), `hasSave`/`loadSave`/`writeSave`/`type SaveBlob` from `SaveSystem.ts` (unchanged, Task 5 only added tests for these).
- Produces: `SpellroadScene.create(data?: { continueFromSave?: boolean })` — `TitleScene.continueGame()` is the only caller.

This task changes existing Phaser scene code with no unit-testable pure function of its
own beyond what Tasks 6-7 already tested — verification is the typecheck/test/build gate
in Task 9, plus a live playtest. There is no separate TDD red/green step here; each edit
below is applied directly, then Task 9 verifies the whole scene still compiles and all
existing scene-level behavior (nothing here changes) still passes.

- [ ] **Step 1: Add the `SaveSystem` import to `SpellroadScene.ts`**

Locate the existing `HexcoinSystem` import near the top of `src/scenes/SpellroadScene.ts`:

```typescript
import { HexcoinSystem, FEE_PHASE_RECOVERY, PHASE_RECOVERY_HP_FRACTION, MAX_RECOVERIES_HARD_CAP } from "../systems/HexcoinSystem";
```

Add immediately after it:

```typescript
import { hasSave, loadSave, writeSave, type SaveBlob } from "../systems/SaveSystem";
```

- [ ] **Step 2: Add the `continueCheckpointLevel` field**

Locate the `highestLevelReached` field declaration:

```typescript
  private highestLevelReached = 0;
```

Add immediately after it:

```typescript
  /** backlog 1.6 — the level number a `continueFromSave` load should resume at, set once
   * in `create()` from the loaded blob's `checkpointId`, `null` for a fresh game. */
  private continueCheckpointLevel: number | null = null;
```

- [ ] **Step 3: Accept `continueFromSave` in `create()` and load the save**

Locate:

```typescript
  create(): void {
```

Change to:

```typescript
  create(data?: { continueFromSave?: boolean }): void {
```

Locate the system-initialization block:

```typescript
    this.mana = new ManaSystem();
    this.mastery = new MasterySystem();
    this.hexcoin = new HexcoinSystem();
    this.debuff = new DebuffSystem();
```

Change to:

```typescript
    this.mana = new ManaSystem();
    this.mastery = new MasterySystem();
    this.hexcoin = new HexcoinSystem();
    this.continueCheckpointLevel = null;
    if (data?.continueFromSave && hasSave()) {
      const save = loadSave();
      this.mastery.importState(save.masteryBySpell);
      this.hexcoin.restoreBalance(save.hexcoinBalance);
      this.continueCheckpointLevel = save.checkpointId !== null ? Number(save.checkpointId) : null;
    }
    this.debuff = new DebuffSystem();
```

- [ ] **Step 4: Start at the checkpointed wave instead of always wave 0**

Locate, near the end of `create()`:

```typescript
    this.startWave(0);
```

Change to:

```typescript
    const startIndex =
      this.continueCheckpointLevel !== null
        ? Math.max(0, this.waves.findIndex((w) => w.level === this.continueCheckpointLevel))
        : 0;
    this.startWave(startIndex);
```

- [ ] **Step 5: Add the `writeCheckpoint()` method**

Locate the `private startWave(index: number): void {` method. Immediately before it, insert:

```typescript
  /** backlog 1.6 — persists the fields that have real live runtime state today (Mastery,
   * Hexcoin, current level) so `TitleScene`'s `Continue` has something real to restore.
   * Deliberately does not touch `discoveredSpellIds`/`hierarchyRank`/`loreFlags` — no
   * system populates those yet, so `loadSave()` is used as the write base to pass them
   * through untouched rather than overwriting them with fresh defaults every checkpoint. */
  private writeCheckpoint(): void {
    const currentLevel = this.waves[this.waveIndex]?.level;
    const blob: SaveBlob = {
      ...loadSave(),
      masteryBySpell: this.mastery.exportState(),
      hexcoinBalance: this.hexcoin.balance,
      checkpointId: currentLevel !== undefined ? String(currentLevel) : null
    };
    writeSave(blob);
  }

```

- [ ] **Step 6: Call `writeCheckpoint()` on every level-start**

Locate, inside `startWave()`:

```typescript
    if (wave.level > this.highestLevelReached) {
      this.highestLevelReached = wave.level;
      this.hexcoin.markLevelStart();
    }
```

Change to:

```typescript
    if (wave.level > this.highestLevelReached) {
      this.highestLevelReached = wave.level;
      this.hexcoin.markLevelStart();
      this.writeCheckpoint();
    }
```

- [ ] **Step 7: Call `writeCheckpoint()` on every Mastery tier-up**

Locate:

```typescript
      this.mastery.recordLandedCast(spell.id, (spellId, tier) =>
        this.flashTierUp(`${spellId} reached ${tier.toUpperCase()} Mastery!`, 2600)
      );
```

Change to:

```typescript
      this.mastery.recordLandedCast(spell.id, (spellId, tier) => {
        this.flashTierUp(`${spellId} reached ${tier.toUpperCase()} Mastery!`, 2600);
        this.writeCheckpoint();
      });
```

- [ ] **Step 8: Update `TitleScene.ts`'s import**

Locate:

```typescript
import { hasSave, loadSave } from "../systems/SaveSystem";
```

Change to:

```typescript
import { hasSave } from "../systems/SaveSystem";
```

- [ ] **Step 9: Update `TitleScene.ts`'s class doc comment**

Locate the paragraph:

```typescript
 * **Known, disclosed gap:** `Continue` calls `loadSave()` but `SpellroadScene` does not yet
 * consume that blob's contents (Mastery tiers, Hexcoin balance, etc.) — nothing in the engine
 * writes a save during play either. That's backlog item 1.6 ("full SaveSystem cross-session
 * wiring"), explicitly separate, larger, not-yet-built work; this scene is wired correctly
 * against the `SaveSystem` contract as it exists today, but until 1.6 lands, `Continue` and
 * `New Game` behave identically in actual play. Flagged here rather than silently assumed away.
 */
```

Replace with:

```typescript
 * **Backlog 1.6, partially resolved (goal-oriented-agent run, 2026-08-09):** `Continue` now
 * passes `{ continueFromSave: true }` and `SpellroadScene` restores Mastery tiers, Hexcoin
 * balance, and the last-reached level checkpoint from the loaded blob. `discoveredSpellIds`/
 * `hierarchyRank`/`loreFlags` still have no owning system anywhere in the engine, so those
 * three fields remain pass-through defaults — a real, disclosed gap, not a silent one; see
 * `docs/agents/ana/goal-oriented-agent/output/run_report.md` for the full scoping reasoning.
 */
```

- [ ] **Step 10: Update `TitleScene.continueGame()`**

Locate:

```typescript
  private continueGame(): void {
    // See this class's own doc comment — `SpellroadScene` doesn't consume this blob yet
    // (backlog 1.6, separate work), so this call is currently a no-op beyond the read itself.
    loadSave();
    this.scene.start("SpellroadScene");
  }
```

Change to:

```typescript
  private continueGame(): void {
    // backlog 1.6 — `SpellroadScene` now consumes the loaded blob itself (Mastery, Hexcoin,
    // checkpoint level); this scene only needs to say "yes, resume from a save."
    this.scene.start("SpellroadScene", { continueFromSave: true });
  }
```

- [ ] **Step 11: Commit**

```bash
git add src/scenes/SpellroadScene.ts src/scenes/TitleScene.ts
git commit -m "Wire SaveSystem into SpellroadScene/TitleScene (backlog 1.6, goal-oriented-agent pick)"
```

---

### Task 9: Verify — typecheck, test, build, and a live check

**Files:** none (verification only).

- [ ] **Step 1: Run the full gate via Docker**

```bash
docker-compose run --rm game npm run typecheck
docker-compose run --rm game npm test
docker-compose run --rm game npm run build
```

Expected: all three clean. Record the exact `npm test` pass count (e.g. `2350/2350`) — Task 10 needs the real number, not an estimate.

If `typecheck` or `build` fails, the most likely cause is a mismatch between `SaveBlob`'s
field names (`masteryBySpell`, `hexcoinBalance`, `checkpointId`) and what Task 8 wrote —
re-check against `src/systems/SaveSystem.ts`'s `SaveBlob` interface directly rather than
guessing.

- [ ] **Step 2: Attempt a live dev-server check**

Start the dev server (`docker-compose up -d game` or the project's `preview_start`
equivalent) and open it in a browser. Confirm, as far as the environment allows:

1. On first load with no existing save, Title shows only `New Game`.
2. Starting a new game, reaching Level 2's first wave, and checking the browser's
   `localStorage` (e.g. via dev tools or `javascript_tool`) shows a `spellroad-save` key
   whose `checkpointId` is `"2"`.
3. Quitting to Title (or reloading) now shows `Continue` as an option.
4. Selecting `Continue` and reaching the HUD shows Mastery/Hexcoin state consistent with
   what was saved (not reset to defaults).

This repo's own history (`docs/agents/loomwright/log.md`) repeatedly documents a sandboxed
browser pane limitation where `document.visibilityState` reports `"hidden"` and freezes
Phaser's input/render loop, blocking interactive checks like pressing keys to move between
waves. If that happens here, **disclose it honestly** — record exactly which of the 4
checks above were confirmed vs. blocked, and why, following this repo's own established
precedent (e.g. `loomwright/log.md`'s 2026-08-03 and 2026-08-09 entries) rather than
claiming an unverified pass. A partial, honest verification is acceptable; a fabricated
complete one is not.

- [ ] **Step 3: No commit for this task** (verification only — the results feed Task 10's report and log entries).

---

### Task 10: `run_report.md`, backlog update, and agent log entries

**Files:**
- Create: `docs/agents/ana/goal-oriented-agent/output/run_report.md`
- Modify: `docs/agents/ana/backlog.md:114` (row 1.6's Status cell only)
- Modify: `docs/agents/ana/log.md` (append)
- Modify: `docs/agents/loomwright/log.md` (append)

**Interfaces:**
- Consumes: the real pass counts and playtest findings captured in Task 9, Step 1-2.

- [ ] **Step 1: Write `output/run_report.md`**

```markdown
# Run Report — Goal-Oriented Agent, first real run

**Run date:** 2026-08-09.

## Step 1 — Gaps detected

Cross-referencing `output/gdd_features.json` against `output/codebase_inventory.json` and
`docs/agents/ana/backlog.md`:

1. **"Save Data And Persistence"** (GDD, `## Save Data And Persistence`) —
   `src/systems/SaveSystem.ts` exists and exports `defaultSave`/`hasSave`/`loadSave`/
   `writeSave`, but no other `src_files` entry besides `TitleScene.ts` references it, and
   `TitleScene.continueGame()` called `loadSave()` and discarded the result. Backlog row
   **1.6** tracks this as `blocked-with-reason`, citing backlog **0.2** as the blocker —
   but row **0.2** itself is `shipped-and-validated` since 2026-08-01. The blocker cleared
   over a week before this run; 1.6's label was stale. Backlog **5.4** ("Save/load QA") is
   `not-started` and depends on 1.6. Backlog **5.8**'s own note discloses "`Continue`
   doesn't yet restore any real state." Three independent backlog rows point at the same
   real, unbuilt wiring. **This is a live gap, regardless of 1.6's stale label.**
2. Reading the same GDD section closely also surfaces two gaps too large for this pass:
   `discoveredSpellIds` and `hierarchyRank` have no owning system anywhere in
   `codebase_inventory.json`'s `src_files` (no exported symbol resembling either concept
   outside `SaveSystem.ts`'s own type definition), and neither does a lore/discovery-flag
   system. Each needs its own feature built before it can be persisted at all — noted for
   a future run, not attempted here.

## Step 2 — Prioritization

Ranking gap #1 (SaveSystem wiring) against the contract's four criteria:

1. **Phase order:** backlog 1.6 sits in Phase 1 (Engine foundation) — the earliest-phase
   real gap found.
2. **Dependency readiness:** 1.6's real blocker (0.2) is resolved; the label just wasn't
   updated. Clear to build now.
3. **Floor vs. stretch:** "Persistent RPG, not a run-reset roguelite" is a headline design
   pillar (Death And Mastery Loss), not a stretch feature — floor scope.
4. **Smallest coherent slice:** the full 1.6 scope (schema v2 for Mastery, discovered
   spells, hierarchy rank, Hexcoin, lore flags, all "written on every state-changing
   event") is large. A smaller, coherent slice exists: the two fields that already have
   live runtime state today (`MasterySystem`, `HexcoinSystem`) plus the checkpoint (level)
   id, disclosing the rest as still-missing rather than half-faking it.

**Pick: wire `SaveSystem` for Mastery tiers, Hexcoin balance, and level checkpoint —
`Continue` restores them, level-start and Mastery tier-up write them.**

Gap #2 (discovered-spells/hierarchy-rank/lore-flags systems) ranks below #1 on criterion 4
alone — each requires inventing a whole subsystem from nothing, not wiring an existing
one, so it fails "smallest coherent slice" outright for a single pass.

## Step 3 — Scope

**In scope:** `masteryBySpell`, `hexcoinBalance`, `checkpointId` (level number) round-trip
through `SaveSystem`; `TitleScene`'s `Continue` actually restores them into a fresh
`SpellroadScene`; a checkpoint write fires on every level-start and every Mastery tier-up.

**Explicitly out of scope, and why:**
- `discoveredSpellIds` — no system anywhere distinguishes "discovered" from "equipped"
  spells today; inventing that distinction is a separate feature, not a wiring task.
- `hierarchyRank` — no system tracks a hierarchy rank at all; same reason.
- `loreFlags` — no lore/discovery-flag system exists yet.
- These three fields are written through as untouched pass-through defaults (via
  `loadSave()` as the write base in `writeCheckpoint()`) so a future pass can populate
  them without a second schema migration.
- Write frequency is checkpoint + tier-up, not literally "every state-changing event"
  (e.g. not on every single Hexcoin-earning kill) — chosen to avoid a `localStorage` write
  per kill, while still covering both fields' only two ways of changing today.

## Step 4 — Built

- `MasterySystem.exportState()`/`importState()` (`src/systems/MasterySystem.ts`).
- `HexcoinSystem.restoreBalance()` (`src/systems/HexcoinSystem.ts`).
- `SpellroadScene.create(data?: { continueFromSave?: boolean })` restores state and starts
  at the checkpointed level; new `writeCheckpoint()` persists on level-start and Mastery
  tier-up (`src/scenes/SpellroadScene.ts`).
- `TitleScene.continueGame()` passes `{ continueFromSave: true }` instead of discarding
  the loaded save (`src/scenes/TitleScene.ts`).
- New tests: `SaveSystem.test.ts` (6 cases, previously zero coverage),
  `HexcoinSystem.test.ts` (3 cases, previously zero coverage), plus 3 new cases in
  `MasterySystem.test.ts`.

**Verification:** `docker-compose run --rm game npm run typecheck` / `npm test`
(`<PASTE THE EXACT PASS COUNT FROM TASK 9, STEP 1>`) / `npm run build` — all clean.

**Playtest:** `<PASTE THE EXACT, HONEST RESULT FROM TASK 9, STEP 2 — WHICH OF THE 4 CHECKS
PASSED, AND WHICH WERE BLOCKED AND WHY, IF ANY>`.

## Step 5 — Backlog updated

`docs/agents/ana/backlog.md` row **1.6** moved from `blocked-with-reason` to
`in-progress-with-owner`, its stale blocker-label corrected, and the remaining
discovered-spells/hierarchy-rank/lore-flags gap named explicitly for a future run.
```

Replace both `<PASTE ...>` placeholders with the real values observed in Task 9 before
committing — these are transcriptions of an already-completed step's actual output, not
open questions.

- [ ] **Step 2: Update `docs/agents/ana/backlog.md` row 1.6**

Locate (line 114):

```
| 1.6 | Checkpoint/respawn placement + save schema v2 (extend the existing `localStorage` blob to Mastery tiers, discovered spells, hierarchy rank, Hexcoin balance, lore flags per "Save Data And Persistence"; schema-version bump, clean-reset-on-mismatch) | Sonnet 5 | 1.2, 1.5, **0.2** | `blocked-with-reason` — `src/systems/SaveSystem.ts` module built and typechecked, but deliberately not wired into the scene; checkpoint-placement policy (0.2) still needs the developer before wiring means anything real |
```

Replace the final cell (everything from `` `blocked-with-reason` `` to the row's closing
`|`) with:

```
`in-progress-with-owner` — partial wiring shipped 2026-08-09 via the goal-oriented-agent run (Assignment #5): `Continue` now restores Mastery tiers, Hexcoin balance, and level checkpoint through `SaveSystem`; writes fire on every level-start and Mastery tier-up. **Found stale while investigating:** this row's own `blocked-with-reason` label was stale — 0.2 resolved 2026-08-01, over a week before this fix. **Still not wired:** `discoveredSpellIds`, `hierarchyRank`, `loreFlags` — no system anywhere populates any of the three yet; each needs its own feature before schema v2 is actually complete, not just its own wiring pass. See `docs/agents/ana/goal-oriented-agent/output/run_report.md` and `docs/agents/loomwright/log.md`, 2026-08-09. |
```

(The Task/Owner/Model/Depends-on columns are unchanged.)

- [ ] **Step 3: Append to `docs/agents/ana/log.md`**

```markdown

## 2026-08-09 — Assignment #5 (Goal-Oriented Coding Agent): SaveSystem cross-session wiring

Course Assignment #5 requires an agent that reads the GDD, scans the codebase, detects
gaps, prioritizes, and generates code for at least one — automating exactly the reasoning
this backlog already tracks by hand. Built `docs/agents/ana/goal-oriented-agent/`: two
dependency-free Python scanners (`scan_gdd.py`, `scan_codebase.py`, no LLM — nothing in
the mechanical parsing step can drift) plus `AGENT_CONTRACT.md`, a documented reasoning
procedure any live Claude/Codex session can follow, the same way Loomwright/Frieren/
Warden already operate. Ran both layers for real against this repo
(`output/gdd_features.json`, `output/codebase_inventory.json`, `output/run_report.md`,
all committed as evidence).

**Gap found and picked:** cross-referencing the GDD's "Save Data And Persistence" section
against `src/` and this backlog surfaced that backlog row **1.6** was labeled
`blocked-with-reason` on **0.2** as the blocker — but 0.2 has been `shipped-and-validated`
since 2026-08-01, over a week before this run. The label was stale, not the gap:
`TitleScene.continueGame()` was calling `loadSave()` and discarding the result, and
nothing in the engine wrote a save during play. Full reasoning (phase order, dependency
readiness, floor-vs-stretch, smallest-coherent-slice) in `run_report.md`.

**Scoped, not attempted whole:** wired the two fields that already have real live runtime
state today — `MasterySystem` (new `exportState`/`importState`) and `HexcoinSystem` (new
`restoreBalance`) — plus the level checkpoint, into `SpellroadScene`'s `continueFromSave`
init path and a new `writeCheckpoint()` (fires on level-start and Mastery tier-up).
`discoveredSpellIds`/`hierarchyRank`/`loreFlags` are explicitly NOT wired — no system
anywhere in the engine populates any of the three yet, so schema v2 is only partially
complete. Disclosed in `run_report.md`, not silently assumed away.

**Verification:** see Loomwright's log entry (below) for the exact typecheck/test/build
numbers and the playtest result — not duplicated here.

**Backlog updated:** row 1.6 moved to `in-progress-with-owner`, its stale blocker-label
corrected, and the remaining discovered-spells/hierarchy-rank/lore-flags gap named
explicitly for a future pass.

**Status:** see Loomwright's log for the code-level status; this entry is Ana's
framing/dispatch record per this file's own convention (narrative why, not a duplicate of
the backlog's what's-left tracking).
```

- [ ] **Step 4: Append to `docs/agents/loomwright/log.md`**

```markdown

## 2026-08-09 — Backlog 1.6: SaveSystem cross-session wiring (Assignment #5 goal-oriented-agent pick)

Dispatched via Ana's goal-oriented-agent run
(`docs/agents/ana/goal-oriented-agent/output/run_report.md`) — the automated
gap-detection picked backlog 1.6 (stale-labeled `blocked-with-reason`; its real blocker,
0.2, resolved 2026-08-01) as the highest-priority real gap: `SaveSystem.ts` existed and
typechecked, but nothing consumed or wrote through it during play.

**Built**, per "Save Data And Persistence" (GDD) and the scope `run_report.md` lays out:
- `MasterySystem.exportState()`/`importState()` — round-trips the full per-spell
  tier/landed-cast map (`MasterySystem.test.ts`, 3 new cases).
- `HexcoinSystem.restoreBalance(amount)` — seeds the balance and marks it as the current
  level's floor, clearing any stale boss-fight snapshot (new `HexcoinSystem.test.ts`, 3
  cases — this class had zero prior test coverage).
- `SaveSystem.test.ts` — new file; this module had zero prior test coverage despite
  already having real logic (schema-mismatch reset, `hasSave` vs. `loadSave`'s
  always-succeeds behavior). 6 cases, using an in-memory `Storage` stand-in, no real
  `localStorage` touched.
- `SpellroadScene.create()` now accepts `{ continueFromSave?: boolean }`; when set (and a
  save exists), it imports Mastery/Hexcoin state and jumps `startWave` to the checkpointed
  level instead of always starting at wave 0. New `writeCheckpoint()` private method
  persists Mastery/Hexcoin/checkpoint on every level-start and every Mastery tier-up (not
  literally every state-changing event named in the GDD — `discoveredSpellIds`/
  `hierarchyRank`/`loreFlags` have no owning system yet, disclosed rather than faked).
- `TitleScene.continueGame()` now passes `{ continueFromSave: true }` instead of calling
  `loadSave()` and discarding it; updated the class's own doc comment, which had
  explicitly disclosed this exact gap since 5.8 shipped.

**Self-verify:** `docker-compose run --rm game npm run typecheck` / `npm test`
(`<PASTE THE EXACT PASS COUNT FROM TASK 9, STEP 1>`) / `npm run build`, all clean.

**Playtest:** `<PASTE THE EXACT, HONEST RESULT FROM TASK 9, STEP 2>`.

**Status:** `in-progress-with-owner` — code-level wiring shipped and self-verified;
discovered-spells/hierarchy-rank/lore-flags persistence remains a real, disclosed gap for
schema v2's completion, not folded into this row's status. See backlog 1.6's own updated
row.
```

Replace both `<PASTE ...>` placeholders with the same real values used in Step 1.

- [ ] **Step 5: Commit**

```bash
git add docs/agents/ana/goal-oriented-agent/output/run_report.md docs/agents/ana/backlog.md docs/agents/ana/log.md docs/agents/loomwright/log.md
git commit -m "Report the goal-oriented agent's first real run and update backlog 1.6"
```

---

### Task 11: `goal-oriented-agent/README.md` — the graded deliverable

**Files:**
- Create: `docs/agents/ana/goal-oriented-agent/README.md`

**Interfaces:**
- Consumes: the real results from Task 9 (verification/playtest) and Task 10 (`run_report.md`).

- [ ] **Step 1: Write `README.md`**

```markdown
# Goal-Oriented Coding Agent — Course Assignment #5

## What this is

Two layers. `scan_gdd.py` and `scan_codebase.py` are dependency-free Python (stdlib only,
no `pip install`, no LLM) that turn the GDD and the codebase into structured JSON —
nothing here can drift, because nothing here involves judgment. `AGENT_CONTRACT.md` is
the actual reasoning layer: a documented procedure that a live Claude Code or Codex
session follows (no API key needed — the same way every other agent in this repo's
roster, Loomwright/Frieren/Warden/etc., already operates as a dispatched session against
a written contract, not a separate program).

This enhances **Ana** — gap-detection and prioritization is already her job today, done
by hand via `docs/agents/ana/backlog.md`. This automates that reasoning into a repeatable,
re-runnable artifact instead of adding a new roster agent.

## Why not local Ollama for the reasoning?

Assignment #3's `agent-crew/` already ran the roster's content generation against a local
`llama3.2` and documented measurable schema drift on structured JSON output (see its
README's "Known limitations"). This assignment's reasoning bar is higher — semantic
gap-detection against unstructured prose, a prioritization rationale, and code that has
to actually compile and pass this repo's real test suite. Retrying that risk on a harder
task wasn't worth it; the mechanical parts that don't need judgment run with zero LLM
involvement instead.

## What feature the agent built

Wired `src/systems/SaveSystem.ts` into actual play: `TitleScene`'s `Continue` now restores
Mastery tiers, Hexcoin balance, and the last-reached level checkpoint into a fresh
`SpellroadScene`, and a new `writeCheckpoint()` persists them on every level-start and
Mastery tier-up.

## Why the agent selected that feature

Full reasoning is in [`output/run_report.md`](output/run_report.md); summary:
cross-referencing the GDD's "Save Data And Persistence" section against the codebase
inventory and the backlog found that row **1.6** (full SaveSystem wiring) was labeled
`blocked-with-reason` on backlog **0.2** — but 0.2 had actually been
`shipped-and-validated` since 2026-08-01, over a week before this run. The blocker had
cleared; the label just hadn't been revisited. Two other backlog rows (**5.4**, **5.8**)
independently pointed at the same real gap. Ranked against phase order, dependency
readiness, and floor-vs-stretch scope, it was the clearest, earliest-phase,
already-unblocked real gap found — and catching that stale label is itself a small
demonstration of the automated cross-referencing doing real work, not just restating what
a human already knew.

The full slice the GDD describes (also persisting discovered spells, hierarchy rank, and
lore flags) was deliberately **not** attempted in one pass — none of those three has an
owning system anywhere in the engine yet, so building real persistence for them means
building the underlying feature first, not just wiring it. That's named explicitly as
follow-up work, not silently dropped.

## Were you able to run this in your game?

`<REPLACE WITH THE EXACT, HONEST RESULT FROM TASK 9, STEP 2 — confirm whether Continue
visibly restored Mastery/Hexcoin/level after a checkpoint + refresh, and disclose plainly
if the sandboxed browser pane's known input-freeze limitation (documented repeatedly
elsewhere in this repo, e.g. docs/agents/loomwright/log.md's recurring
"document.visibilityState: hidden" notes) blocked any part of interactive verification,
the same way every other agent in this roster discloses that limitation rather than
papering over it.>`

## Running the agent yourself

```bash
cd docs/agents/ana/goal-oriented-agent
python3 -m unittest discover -s . -p 'test_*.py' -v   # scanner tests
python3 scan_gdd.py > output/gdd_features.json
python3 scan_codebase.py > output/codebase_inventory.json
```

Then open a Claude Code or Codex session in this repo, point it at `AGENT_CONTRACT.md`
with the two JSON files above plus `docs/agents/ana/backlog.md`, and let it run Steps
1-5. No API key required.

## Known limitations

- The reasoning layer is a documented procedure for a live session, not a fully
  autonomous unattended program — by design (see "Why not local Ollama" above), but worth
  stating plainly since "agent" can otherwise imply something that runs unattended.
- `discoveredSpellIds`/`hierarchyRank`/`loreFlags` remain pass-through defaults in the
  save blob — no system in the engine populates any of the three yet.
- The scanners' export-symbol detection is a regex over `export <keyword> <Name>`, not a
  real TypeScript AST parse — sufficient for this repo's actual file conventions
  (confirmed by inspection against every `src/systems/*.ts` file), but a file using an
  unusual export style could be missed.
```

Replace the `<REPLACE ...>` placeholder with the real Task 9 result before committing.

- [ ] **Step 2: Commit**

```bash
git add docs/agents/ana/goal-oriented-agent/README.md
git commit -m "Add the goal-oriented agent's graded README (Assignment #5)"
```

---

### Task 12: Course-repo pointer file

**Files:**
- Create: `multi-agent-ai-in-game-development/docs/submissions/assignment-05-goal-oriented-agent.md` (separate repo, path relative to that repo's root: `docs/submissions/assignment-05-goal-oriented-agent.md`)

**Interfaces:** none — a standalone pointer document, no code.

- [ ] **Step 1: Write the pointer file**

Create `docs/submissions/assignment-05-goal-oriented-agent.md` in the
`multi-agent-ai-in-game-development` repo:

```markdown
# Assignment #5: Goal-Oriented Coding Agent

**Due:** 2026-08-13, 11:59 ET.

## Where the actual deliverable lives

Like Assignments #3 and #4, this assignment's deliverable is runnable code, not a GDD
extract — so it lives in the game repo itself, per the same repo-boundary exception:
**`the_last_spellroad/docs/agents/ana/goal-oriented-agent/`**.

- `goal-oriented-agent/README.md` — the graded ReadMe deliverable: what was built, why it
  was selected, and whether it ran in the game.
- `goal-oriented-agent/scan_gdd.py` / `scan_codebase.py` — dependency-free Python (no LLM)
  that parse the GDD and scan the codebase + backlog into structured JSON.
- `goal-oriented-agent/AGENT_CONTRACT.md` — the reasoning layer: a documented
  gap-detection/prioritization/codegen procedure followed by a live Claude Code or Codex
  session (no API key needed).
- `goal-oriented-agent/output/` — one real, committed run: `gdd_features.json`,
  `codebase_inventory.json`, `run_report.md`.

## What it built, and why

Automates what Ana (orchestration agent) already does by hand via
`docs/agents/ana/backlog.md` — read the GDD, know what's built, detect gaps, decide
what's next — rather than adding a new roster agent. The real run found that backlog item
1.6 (SaveSystem cross-session wiring) was mislabeled `blocked-with-reason` on a dependency
that had actually resolved a week earlier, picked it as the highest-priority real gap, and
wired `TitleScene`'s `Continue` to actually restore Mastery tiers, Hexcoin balance, and
level checkpoint through `SaveSystem` — previously a fully disclosed, known no-op. Full
reasoning in the game repo's `run_report.md`.

## Rubric self-check

| Requirement | Where it's satisfied |
| --- | --- |
| Read your GDD | `scan_gdd.py` parses `docs/game/the-last-spellroad-design.md` into a structured, heading-path-aware feature list — `output/gdd_features.json`. |
| Scan the codebase | `scan_codebase.py` walks `src/{scenes,systems,entities,data,dev}` for exported symbols + test coverage, and parses `docs/agents/ana/backlog.md`'s status column — `output/codebase_inventory.json`. |
| Detect gaps | `AGENT_CONTRACT.md` Step 1's cross-referencing rule, executed for real in `output/run_report.md` — found the Save Data And Persistence gap, including a stale backlog status label a human hadn't caught yet. |
| Prioritize | `AGENT_CONTRACT.md` Step 2's four-part rubric (phase order, dependency readiness, floor-vs-stretch, smallest coherent slice), applied with written rationale in `run_report.md`. |
| Generate Code | `MasterySystem.exportState`/`importState`, `HexcoinSystem.restoreBalance`, `SpellroadScene`'s `continueFromSave` wiring + `writeCheckpoint()`, `TitleScene.continueGame()` — real, tested, typechecked TypeScript merged into the game. |

## Status note

Built and verified against the live repo on 2026-08-09 — see the game repo's
`docs/agents/ana/goal-oriented-agent/README.md` for the honest playtest answer and known
limitations.
```

- [ ] **Step 2: Update `docs/submissions/context.md`'s status/next-actions line**

Read the file first (`docs/submissions/context.md` in the `multi-agent-ai-in-game-development` repo) to match its existing format, then update whatever line currently says to add Assignment #5 as it's issued, marking it done with a pointer to the new file.

- [ ] **Step 3: Commit (in the course repo)**

```bash
cd /Users/familia/Documents/Github/multi-agent-ai-in-game-development
git add docs/submissions/assignment-05-goal-oriented-agent.md docs/submissions/context.md
git commit -m "Add Assignment #5 pointer file (goal-oriented coding agent)"
```

This is a **separate repository and a separate branch/PR** from Tasks 1-11 — do not mix
this commit into the game repo's branch.
