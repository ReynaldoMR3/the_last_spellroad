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
